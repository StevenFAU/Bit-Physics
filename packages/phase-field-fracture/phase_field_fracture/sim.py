"""SimRunner adapter — phase-field-fracture canonical captures.

Determinism strategy (spec-ref.md § 6.1 G-runtwice; conventions doc § F):

1. **Pure grid solver.** Nodal Q1 gathers/scatters are fixed-slice NumPy
   ops — no particle scatter, no atomics, no reduction-order
   nondeterminism.
2. **No global RNG state.** The canonical scene is the deterministic SENT
   geometry (void-notch slit in the material field); ``seed`` is kept in
   the runner signature only for SimRunner Protocol parity.
3. **Fixed step counts, fixed capture cadence** (step-index order).
4. Same-build same-hw bit-exactness is witnessed by the internal 2-run
   comparison in ``run_canonical`` (heat-equation pattern).

The canonical scene is the SENT benchmark (spec-ref.md § 4 A): Miehe steel
groups, void-notch slit, KE/IE-disciplined tension to past the peak. The
gradient-flow damage kernel (the browser baseline) is the captured path;
the converged-elliptic f64 solve is exercised by the G-Gammav gate test,
not the capture.
"""

from __future__ import annotations

import hashlib
import time
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .solver import FractureConfig, TraceResult, run_trace

# The canonical capture IS the web-gate scene (spec-ref.md § 6.2): one
# committed SENT scenario small enough for the live f64 re-run inside
# verify.py and for the run-twice CI witness, big enough that the crack
# burst and the f32 browser path are exercised end to end.
CANONICAL_DESCRIPTOR: Final[str] = "sent-void-96sq-m1"
CANONICAL_SEED: Final[int] = 42
CANONICAL_N: Final[int] = 96
CANONICAL_MOBILITY_M: Final[float] = 1.0
CANONICAL_CAPTURE_INTERVAL: Final[int] = 2000

GATE_DESCRIPTOR: Final[str] = CANONICAL_DESCRIPTOR
GATE_N: Final[int] = CANONICAL_N
GATE_CAPTURE_INTERVAL: Final[int] = CANONICAL_CAPTURE_INTERVAL


def canonical_config(n: int | None = None) -> FractureConfig:
    return FractureConfig(
        n=CANONICAL_N if n is None else n,
        mobility_m=CANONICAL_MOBILITY_M,
        capture_every=CANONICAL_CAPTURE_INTERVAL,
    )


def gate_config() -> FractureConfig:
    return canonical_config()


def _witness_sha256(res: TraceResult) -> str:
    h = hashlib.sha256()
    for st in res.captures:
        for arr in (st.ux, st.uy, st.vx, st.vy, st.d, st.h_field):
            h.update(arr.tobytes())
    return h.hexdigest()


def run_canonical(cfg: FractureConfig | None = None) -> tuple[TraceResult, str]:
    """Run the scene TWICE and assert bit-identity before returning (the
    determinism witness — the witness run IS the capture run)."""
    cfg = cfg or canonical_config()
    r1 = run_trace(cfg)
    r2 = run_trace(cfg)
    for s1, s2 in zip(r1.captures, r2.captures, strict=True):
        for a, b in (
            (s1.ux, s2.ux),
            (s1.uy, s2.uy),
            (s1.d, s2.d),
            (s1.h_field, s2.h_field),
        ):
            if not np.array_equal(a, b):
                raise AssertionError("run-twice bit-identity violated on same build/hw")
    return r1, _witness_sha256(r1)


def peak_reaction(res: TraceResult) -> tuple[float, float]:
    """(peak reaction force, applied displacement at peak) in non-dim units."""
    forces = np.array([d.reaction for d in res.diagnostics])
    i = int(np.argmax(forces))
    return float(forces[i]), float(res.diagnostics[i].u_applied)


def _states_from_result(res: TraceResult) -> list[StepState]:
    states: list[StepState] = []
    diag_by_step = {d.step: d for d in res.diagnostics}
    for step, st in zip(res.capture_steps, res.captures, strict=True):
        d = diag_by_step[step]
        ke_over_ie = d.ke / d.ie if d.ie > 0.0 else 0.0
        diags: dict[str, float] = {
            "u_applied": d.u_applied,
            "reaction": d.reaction,
            "ke": d.ke,
            "ie": d.ie,
            "e_frac": d.e_frac,
            "w_ext": d.w_ext,
            "d_damp": d.d_damp,
            "d_gf": d.d_gf,
            "d_max": d.d_max,
            "ke_over_ie": ke_over_ie,
            "sim_time": d.t,
        }
        states.append(
            StepState(
                step=step,
                state={
                    "ux": st.ux,
                    "uy": st.uy,
                    "d": st.d,
                    "h_field": st.h_field,
                },
                diagnostics=diags,
            )
        )
    return states


def _build_manifest(
    *,
    descriptor: str,
    seed: int,
    cfg: FractureConfig,
    wall_clock_seconds: float,
    tier: str,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "phase-field-fracture",
            "category": "fracture",
            "variant": "at2-hybrid-miehe-split-gradient-flow",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "phase-6-phase-field-fracture",
        },
        config={
            "tier": tier,
            "dims": [cfg.n, cfg.n],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "n": cfg.n,
                "l_domain": cfg.l_domain,
                "e_tilde": cfg.e_tilde,
                "nu": cfg.nu,
                "u_end": cfg.u_end,
                "vload_frac": cfg.vload_frac,
                "t_ramp": cfg.t_ramp,
                "cfl": cfg.cfl,
                "c_damp": cfg.c_damp,
                "mobility_m": cfg.mobility_m,
                "dt": cfg.dt,
                "h": cfg.h,
                "notch": cfg.notch,
                "damage_mode": cfg.damage_mode,
            },
        },
        run={
            "step_count": int(cfg.step_count),
            "capture_interval": int(cfg.capture_every),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-07-09T00:00:00Z",
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
    """SimRunner Protocol — the canonical SENT capture.

    Descriptor ``sent-void-96sq-m1``: 96^2, Miehe steel groups, void-notch
    SENT loaded past the peak under KE/IE discipline. Geometry is
    deterministic — seed unused but kept for Protocol parity.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = canonical_config()
    t0 = time.perf_counter()
    res, _witness = run_canonical(cfg)
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
    """Diagnostic-tier SimRunner — 48^2 for gate-11 cost (the
    run_twice_and_diff harness invokes the runner twice)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = FractureConfig(n=48, capture_every=2000, diag_every=200)
    t0 = time.perf_counter()
    res, _witness = run_canonical(cfg)
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor="sent-void-48sq-diagnostic",
        seed=seed,
        cfg=cfg,
        wall_clock_seconds=wall,
        tier="diagnostic",
    )
    return write_capture(_states_from_result(res), manifest, out_dir)


def compute_gate_trajectory() -> tuple[TraceResult, str]:
    """In-memory web-gate trajectory (no I/O) + determinism witness sha."""
    return run_canonical(gate_config())


__all__ = [
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_MOBILITY_M",
    "CANONICAL_N",
    "CANONICAL_SEED",
    "GATE_CAPTURE_INTERVAL",
    "GATE_DESCRIPTOR",
    "GATE_N",
    "canonical_config",
    "compute_gate_trajectory",
    "gate_config",
    "peak_reaction",
    "run_canonical",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
]
