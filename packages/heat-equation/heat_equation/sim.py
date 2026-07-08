"""SimRunner adapter — heat-equation canonical captures.

Determinism strategy (spec-ref.md § 8; conventions doc § F):

1. **Pure grid solver.** Both gated paths are grid->grid (FTCS: np.roll
   stencil; spectral: FFT -> per-mode multiply -> IFFT). NO particle
   scatter, no atomics, no reduction-order nondeterminism.
2. **No global RNG state.** The canonical IC is analytic (a pinned
   three-mode Fourier superposition); ``seed`` is kept in the runner
   signature only for SimRunner Protocol parity.
3. **Fixed step counts, fixed capture cadence** (step-index order).
4. **Periodic BCs via np.roll**; elementwise NumPy only. The FFT is
   pocketfft — the cross-BUILD caveat is numeric-equivalence, not
   byte-identity (R-CPPB2 posture); same-build same-hw is bit-exact and
   witnessed by the internal 2-run comparison in ``run_canonical``.

The canonical scene evolves the SAME analytic IC through BOTH solvers:
``t_ftcs`` (the on-screen path, gated against the live f64 re-run) and
``t_spec`` (the machine-exact path). Their difference is the FTCS
truncation error — itself a captured diagnostic, never hidden.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference import (
    fourier_mode,
    l2_norm,
    sinsin_amplitude,
    stability_bound_dt,
    stability_margin,
    total_heat,
)
from .spectral import (
    continuous_laplacian_eigenvalues,
    decay_factors,
    parseval_rel_err,
    spectral_step_hat,
)

CANONICAL_DESCRIPTOR: Final[str] = "fourier-multi-256sq-alpha0.02-step1024"
CANONICAL_SEED: Final[int] = 42
CANONICAL_N: Final[int] = 256
CANONICAL_ALPHA: Final[float] = 0.02
CANONICAL_STEP_COUNT: Final[int] = 1024
_CANONICAL_CAPTURE_INTERVAL: Final[int] = 128
CANONICAL_SAFETY: Final[float] = 0.8  # dt = 0.8 * von-Neumann bound -> r_x + r_y = 0.4

# Web-gate scene (spec-ref.md § 13.1): small enough for a browser + the live
# f64 re-run inside verify.py, big enough that f32 accumulation is exercised.
GATE_DESCRIPTOR: Final[str] = "fourier-multi-128sq-alpha0.02-step512"
GATE_N: Final[int] = 128
GATE_STEP_COUNT: Final[int] = 512
GATE_CAPTURE_INTERVAL: Final[int] = 128

# The pinned three-mode IC: T = 1 + sum_i amp_i * sin(2 pi m x) sin(2 pi n y).
# Modes chosen for decay-rate spread over the capture window (§ 5.4 Fourier
# lab): (1,1) survives, (5,3) decays ~4e-4, (2,7) dies into the f32 floor.
CANONICAL_MODES: Final[tuple[tuple[int, int], ...]] = ((1, 1), (5, 3), (2, 7))
CANONICAL_AMPLITUDES: Final[tuple[float, ...]] = (0.5, 0.25, 0.125)
CANONICAL_OFFSET: Final[float] = 1.0
# Per-checkpoint mode diagnostics track the two modes that stay resolvable
# above the f32 floor across the whole gate window.
DIAG_MODES: Final[tuple[tuple[int, int], ...]] = ((1, 1), (5, 3))


@dataclass(frozen=True)
class HeatConfig:
    n: int = CANONICAL_N
    alpha: float = CANONICAL_ALPHA
    steps: int = CANONICAL_STEP_COUNT
    safety: float = CANONICAL_SAFETY
    capture_every: int = _CANONICAL_CAPTURE_INTERVAL

    @property
    def dx(self) -> float:
        return 1.0 / self.n

    @property
    def dt(self) -> float:
        return self.safety * stability_bound_dt(self.alpha, self.dx, self.dx)


@dataclass
class HeatResult:
    config: HeatConfig
    capture_steps: list[int] = field(default_factory=list)
    captures_ftcs: list[np.ndarray] = field(default_factory=list)
    captures_spec: list[np.ndarray] = field(default_factory=list)
    determinism_witness_sha256: str = ""


def canonical_config(n: int | None = None, steps: int | None = None) -> HeatConfig:
    return HeatConfig(
        n=CANONICAL_N if n is None else n,
        steps=CANONICAL_STEP_COUNT if steps is None else steps,
    )


def gate_config() -> HeatConfig:
    return HeatConfig(
        n=GATE_N, steps=GATE_STEP_COUNT, capture_every=GATE_CAPTURE_INTERVAL
    )


def make_canonical_ic(n: int) -> np.ndarray:
    """The pinned analytic IC (no RNG): offset + three sin*sin modes."""
    t = np.full((n, n), CANONICAL_OFFSET, dtype=np.float64)
    for (m, k), amp in zip(CANONICAL_MODES, CANONICAL_AMPLITUDES, strict=True):
        t = t + amp * fourier_mode(n, n, m, k)
    return t


def _evolve(cfg: HeatConfig) -> HeatResult:
    """Evolve the canonical IC through FTCS and spectral side by side,
    capturing both fields at the fixed cadence."""
    from .reference import ftcs_step  # local import keeps the hot loop tight

    dx = cfg.dx
    dt = cfg.dt
    lam = continuous_laplacian_eigenvalues(cfg.n, cfg.n)
    decay = decay_factors(lam, cfg.alpha, dt)

    t_ftcs = make_canonical_ic(cfg.n)
    t_spec_hat = np.fft.fft2(t_ftcs)

    res = HeatResult(config=cfg)

    def capture(step: int) -> None:
        t_spec = np.real(np.fft.ifft2(t_spec_hat))
        res.capture_steps.append(step)
        res.captures_ftcs.append(t_ftcs.copy())
        res.captures_spec.append(t_spec)

    capture(0)
    for i in range(1, cfg.steps + 1):
        t_ftcs = ftcs_step(t_ftcs, cfg.alpha, dt, dx, dx)
        t_spec_hat = spectral_step_hat(t_spec_hat, decay)
        if i % cfg.capture_every == 0 or i == cfg.steps:
            capture(i)
    return res


def run_canonical(cfg: HeatConfig | None = None) -> HeatResult:
    """Run the canonical scene TWICE and assert bit-identity before returning
    (the § 8 determinism witness — the witness run IS the capture run)."""
    cfg = cfg or canonical_config()
    r1 = _evolve(cfg)
    r2 = _evolve(cfg)
    for a, b in zip(r1.captures_ftcs, r2.captures_ftcs, strict=True):
        if not np.array_equal(a, b):
            raise AssertionError(
                "FTCS run-twice bit-identity violated on same build/hw"
            )
    for a, b in zip(r1.captures_spec, r2.captures_spec, strict=True):
        if not np.array_equal(a, b):
            raise AssertionError(
                "spectral run-twice bit-identity violated on same build/hw"
            )
    h = hashlib.sha256()
    for arr in r1.captures_ftcs:
        h.update(arr.tobytes())
    for arr in r1.captures_spec:
        h.update(arr.tobytes())
    r1.determinism_witness_sha256 = h.hexdigest()
    return r1


def _states_from_result(res: HeatResult) -> list[StepState]:
    cfg = res.config
    dx = cfg.dx
    states: list[StepState] = []
    for step, tf, ts in zip(
        res.capture_steps, res.captures_ftcs, res.captures_spec, strict=True
    ):
        t_elapsed = step * cfg.dt
        diags: dict[str, float] = {
            "total_heat_ftcs": total_heat(tf, dx, dx),
            "total_heat_spec": total_heat(ts, dx, dx),
            "l2_ftcs": l2_norm(tf, dx, dx),
            "t_min": float(np.min(tf)),
            "t_max": float(np.max(tf)),
            "stability_margin": stability_margin(cfg.alpha, cfg.dt, dx, dx),
            "parseval_rel_err": parseval_rel_err(ts),
            "ftcs_spec_max_abs": float(np.max(np.abs(tf - ts))),
            "sim_time": t_elapsed,
        }
        for m, k in DIAG_MODES:
            diags[f"amp_ftcs_{m}_{k}"] = sinsin_amplitude(tf, m, k)
            diags[f"amp_spec_{m}_{k}"] = sinsin_amplitude(ts, m, k)
        states.append(
            StepState(step=step, state={"t_ftcs": tf, "t_spec": ts}, diagnostics=diags)
        )
    return states


def _build_manifest(
    *,
    descriptor: str,
    seed: int,
    cfg: HeatConfig,
    wall_clock_seconds: float,
    tier: str,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "heat-equation",
            "category": "volumetric-grid",
            "variant": "ftcs-plus-spectral-etd1",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "phase-6-heat-equation",
        },
        config={
            "tier": tier,
            "dims": [cfg.n, cfg.n],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "alpha": cfg.alpha,
                "dt": cfg.dt,
                "dx": cfg.dx,
                "n": cfg.n,
                "safety": cfg.safety,
                "modes": [list(m) for m in CANONICAL_MODES],
                "amplitudes": list(CANONICAL_AMPLITUDES),
                "offset": CANONICAL_OFFSET,
            },
        },
        run={
            "step_count": int(cfg.steps),
            "capture_interval": int(cfg.capture_every),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-07-08T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": f"{descriptor}.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — the canonical fourier-multi capture.

    Descriptor ``fourier-multi-256sq-alpha0.02-step1024``: 256^2, dt at 0.8 of
    the von Neumann bound (r_x + r_y = 0.4), 9 frames at cadence 128. Analytic
    IC — seed unused but kept for Protocol parity.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = canonical_config()
    t0 = time.perf_counter()
    res = run_canonical(cfg)
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=CANONICAL_DESCRIPTOR,
        seed=seed,
        cfg=cfg,
        wall_clock_seconds=wall,
        tier="test",
    )
    return write_capture(_states_from_result(res), manifest, out_dir)


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic-tier SimRunner — 64^2 x 64 steps for gate-11 cost (the
    run_twice_and_diff harness invokes the runner twice; sub-second each)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = HeatConfig(n=64, steps=64, capture_every=32)
    t0 = time.perf_counter()
    res = run_canonical(cfg)
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor="fourier-multi-64sq-alpha0.02-step64-diagnostic",
        seed=seed,
        cfg=cfg,
        wall_clock_seconds=wall,
        tier="diagnostic",
    )
    return write_capture(_states_from_result(res), manifest, out_dir)


def compute_gate_trajectory() -> tuple[list[int], list[np.ndarray], list[np.ndarray]]:
    """In-memory web-gate trajectory (no I/O): (steps, t_ftcs, t_spec)
    histories at the gate checkpoints [0, 128, 256, 384, 512]."""
    res = run_canonical(gate_config())
    return res.capture_steps, res.captures_ftcs, res.captures_spec


__all__ = [
    "CANONICAL_ALPHA",
    "CANONICAL_AMPLITUDES",
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_MODES",
    "CANONICAL_N",
    "CANONICAL_OFFSET",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT",
    "DIAG_MODES",
    "GATE_CAPTURE_INTERVAL",
    "GATE_DESCRIPTOR",
    "GATE_N",
    "GATE_STEP_COUNT",
    "HeatConfig",
    "HeatResult",
    "canonical_config",
    "compute_gate_trajectory",
    "gate_config",
    "make_canonical_ic",
    "run_canonical",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
]
