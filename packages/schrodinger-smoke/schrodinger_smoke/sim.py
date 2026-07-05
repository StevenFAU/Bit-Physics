"""SimRunner adapter — schrodinger-smoke canonical captures.

Determinism strategy (spec-ref.md § 8; conventions doc § F):

1. **Pure grid solver.** The gated state is FFT (grid->grid), pointwise
   normalize, FFT Poisson gauge, and a gather velocity readout. There is NO
   particle->grid scatter (tracers are web-side, passive, downstream of the
   gated state) — no atomics, no reduction-order nondeterminism.
2. **No global RNG state.** Every canonical IC is analytic (slab phase
   imprint + fixed settling-projection count); ``seed`` is kept in the runner
   signature only for SimRunner Protocol parity.
3. **Fixed iteration counts.** IC settling runs a fixed 8 projections; the
   pressure solve is a single exact FFT solve (no iterative tolerance branch
   — one solve, not a Jacobi cadence, so no P24-class early-stop surface).
4. **Periodic BCs via np.roll**; explicit axis order everywhere
   (``indexing="ij"``); elementwise NumPy only (FFT via pocketfft — the
   cross-BUILD caveat is numeric-equivalence, not byte-identity, per the
   R-CPPB2 posture; same-build same-hw is bit-exact and witnessed).
5. **Capture ordering deterministic** — step-index order at a fixed cadence.

The Python NumPy reference achieves ``bit-exact-same-stack-same-hw``
(witnessed by ``test_run_twice_epsilon_diff`` AND by the ``run_isf`` internal
2-run witness); the WGSL frontend's declared boundary is device-scoped
bit-exact / cross-device distributional (spec-ref.md § 8).
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference.isf import (
    IsfConfig,
    continuous_laplacian_eigenvalues,
    discrete_laplacian_eigenvalues,
    free_step,
    kinetic_energy,
    make_scene,
    normalize,
    pressure_project,
    velocity_cell_centered,
    velocity_faces,
)

CANONICAL_DESCRIPTOR: Final[str] = "translating-ring-64cube-hbar0.05-step96"
CANONICAL_SEED: Final[int] = 42
CANONICAL_N: Final[int] = 64
CANONICAL_HBAR: Final[float] = 0.05
CANONICAL_DT: Final[float] = 1.0 / 24.0
CANONICAL_STEP_COUNT: Final[int] = 96
_CANONICAL_CAPTURE_INTERVAL: Final[int] = 8


def canonical_config(n: int | None = None, steps: int | None = None) -> IsfConfig:
    """The canonical translating-vortex-ring scene (spec-ref.md § 9 —
    laminar, non-chaotic over the capture window, so pointwise comparison
    is physically meaningful; the 3D-TG-blows-up lesson)."""
    return IsfConfig(
        n=CANONICAL_N if n is None else n,
        hbar=CANONICAL_HBAR,
        dt=CANONICAL_DT,
        steps=CANONICAL_STEP_COUNT if steps is None else steps,
        scheme="lie",
        scene="translating-ring",
    )


def _build_manifest(
    *,
    descriptor: str,
    seed: int,
    cfg: IsfConfig,
    capture_interval: int,
    wall_clock_seconds: float,
    tier: str,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "schrodinger-smoke",
            "category": "volumetric-grid",
            "variant": "chern-isf-split-step",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "phase-6-schrodinger-smoke",
        },
        config={
            "tier": tier,
            "dims": [cfg.n, cfg.n, cfg.n],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "hbar": cfg.hbar,
                "dt": cfg.dt,
                "dx": 1.0 / cfg.n,
                "n": cfg.n,
                "ring_radius": cfg.ring_radius,
                "ring_thickness": cfg.ring_thickness,
                "settle_iterations": cfg.settle_iterations,
            },
        },
        run={
            "step_count": int(cfg.steps),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-07-05T00:00:00Z",
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


def _evolve_to_states(cfg: IsfConfig, capture_interval: int) -> list[StepState]:
    """Lie-split evolution of the canonical scene, capturing the cell-centred
    velocity field (parent-capture parity) plus scalar diagnostics."""
    dx = 1.0 / cfg.n
    shape = (cfg.n, cfg.n, cfg.n)
    lam_cont = continuous_laplacian_eigenvalues(shape, dx)
    lam_disc = discrete_laplacian_eigenvalues(shape, dx)
    psi = make_scene(cfg, lam_disc)

    def state_at(step: int) -> StepState:
        ux, uy, uz = velocity_cell_centered(velocity_faces(psi, cfg.hbar, dx))
        return StepState(
            step=step,
            state={"u": ux.copy(), "v": uy.copy(), "w": uz.copy()},
            diagnostics={
                "norm_l2": float(np.sum(np.abs(psi) ** 2)),
                "energy": kinetic_energy(psi, cfg.hbar, dx),
            },
        )

    states = [state_at(0)]
    for i in range(1, cfg.steps + 1):
        psi = free_step(psi, cfg.hbar, cfg.dt, lam_cont)
        psi = normalize(psi)
        psi = pressure_project(psi, dx, lam_disc)
        if i % capture_interval == 0 or i == cfg.steps:
            states.append(state_at(i))
    return states


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — the canonical translating-ring capture.

    Descriptor: ``translating-ring-64cube-hbar0.05-step96`` (paper Table 2
    grid/dt class: 64^3, dt = 1/24 s, hbar = 0.05). Analytic IC — seed unused
    but kept for Protocol parity. 13 frames at cadence 8.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = canonical_config()
    t0 = time.perf_counter()
    states = _evolve_to_states(cfg, _CANONICAL_CAPTURE_INTERVAL)
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=CANONICAL_DESCRIPTOR,
        seed=seed,
        cfg=cfg,
        capture_interval=_CANONICAL_CAPTURE_INTERVAL,
        wall_clock_seconds=wall,
        tier="test",
    )
    return write_capture(states, manifest, out_dir)


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic-tier SimRunner — 32^3 x 12 steps for gate-11 cost (the
    run_twice_and_diff harness invokes the runner twice; sub-second each)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = canonical_config(n=32, steps=12)
    t0 = time.perf_counter()
    states = _evolve_to_states(cfg, capture_interval=6)
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor="translating-ring-32cube-hbar0.05-step12-diagnostic",
        seed=seed,
        cfg=cfg,
        capture_interval=6,
        wall_clock_seconds=wall,
        tier="diagnostic",
    )
    return write_capture(states, manifest, out_dir)


def compute_canonical_trajectory(
    *,
    n: int | None = None,
    steps: int | None = None,
    capture_interval: int = _CANONICAL_CAPTURE_INTERVAL,
) -> tuple[list[int], list[np.ndarray], list[np.ndarray], list[np.ndarray]]:
    """In-memory canonical trajectory (no I/O): (steps, u, v, w histories)."""
    cfg = canonical_config(n=n, steps=steps)
    states = _evolve_to_states(cfg, capture_interval)
    idx = [s.step for s in states]
    u = [s.state["u"] for s in states]
    v = [s.state["v"] for s in states]
    w = [s.state["w"] for s in states]
    return idx, u, v, w


__all__ = [
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_DT",
    "CANONICAL_HBAR",
    "CANONICAL_N",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT",
    "canonical_config",
    "compute_canonical_trajectory",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
]
