"""SimRunner adapter — Lorenz canonical trajectory.

Spec descriptor (Appendix D § D.2.3): ``lorenz-trajectory-seed42-step10000``.

The canonical IC is ``(1, 1, 1)`` (the textbook small starting point);
``seed`` adds a tiny per-component jitter so distinct seeds yield
distinct captures (driving ``test_cross_seed_distinct``) while
``seed = 42`` is reproducible and the basis for
``run_twice_and_diff`` bit-equality.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .integrator import rk4_evolve
from .reference.lorenz import lorenz_field

CANONICAL_DESCRIPTOR: Final[str] = "lorenz-trajectory-seed42-step10000"
CANONICAL_STEP_COUNT: Final[int] = 10000
CANONICAL_DT: Final[float] = 0.01
CANONICAL_CAPTURE_INTERVAL: Final[int] = 1000
CANONICAL_SIGMA: Final[float] = 10.0
CANONICAL_RHO: Final[float] = 28.0
CANONICAL_BETA: Final[float] = 8.0 / 3.0
CANONICAL_IC: Final[tuple[float, float, float]] = (1.0, 1.0, 1.0)
_IC_JITTER_SCALE: Final[float] = 1e-6


def _seeded_initial_condition(seed: int) -> np.ndarray:
    rng = np.random.default_rng(int(seed))
    jitter = _IC_JITTER_SCALE * rng.standard_normal(3)
    return np.asarray(CANONICAL_IC, dtype=np.float64) + jitter


def _lorenz_canonical(state: np.ndarray) -> np.ndarray:
    return lorenz_field(
        state, sigma=CANONICAL_SIGMA, rho=CANONICAL_RHO, beta=CANONICAL_BETA
    )


def _build_manifest(
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
    payload_name: str,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "strange-attractors",
            "category": "closed-form",
            "variant": "lorenz",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-closed-form",
        },
        config={
            "tier": "test",
            "dims": [3],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "sigma": CANONICAL_SIGMA,
                "rho": CANONICAL_RHO,
                "beta": CANONICAL_BETA,
                "dt": CANONICAL_DT,
                "ic_jitter_scale": _IC_JITTER_SCALE,
            },
        },
        run={
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-20T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": payload_name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _trajectory_steps(
    initial_state: np.ndarray,
    n_steps: int,
    capture_interval: int,
) -> list[StepState]:
    traj = rk4_evolve(
        _lorenz_canonical,
        initial_state,
        dt=CANONICAL_DT,
        n_steps=n_steps,
        capture_interval=capture_interval,
    )
    # rk4_evolve returns the IC as row 0, then one row per capture
    # boundary plus the final step.
    step_indices: list[int] = [0]
    for i in range(1, n_steps + 1):
        if i % capture_interval == 0 or i == n_steps:
            step_indices.append(i)
    rows: list[StepState] = []
    for idx, step_n in enumerate(step_indices):
        pos = traj[idx]
        radius = float(np.linalg.norm(pos))
        rows.append(
            StepState(
                step=int(step_n),
                state={"position": np.asarray(pos, dtype=np.float64).copy()},
                diagnostics={"radius": radius},
            )
        )
    return rows


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produces the canonical Lorenz capture.

    Always integrates the canonical-parameter Lorenz field from
    ``CANONICAL_IC + _IC_JITTER_SCALE * rng(seed).standard_normal(3)``
    for ``CANONICAL_STEP_COUNT`` RK4 steps at ``dt = CANONICAL_DT``,
    capturing every ``CANONICAL_CAPTURE_INTERVAL`` steps plus the final.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    initial = _seeded_initial_condition(seed)
    t0 = time.perf_counter()
    rows = _trajectory_steps(initial, CANONICAL_STEP_COUNT, CANONICAL_CAPTURE_INTERVAL)
    wall = time.perf_counter() - t0
    payload_name = f"{CANONICAL_DESCRIPTOR}.h5"
    manifest = _build_manifest(
        seed=seed,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        wall_clock_seconds=wall,
        payload_name=payload_name,
    )
    manifest_path: Path = write_capture(rows, manifest, out_dir)
    return manifest_path


def compute_canonical_trajectory(
    seed: int = 42,
    *,
    n_steps: int = CANONICAL_STEP_COUNT,
    capture_interval: int = CANONICAL_CAPTURE_INTERVAL,
) -> np.ndarray:
    """Run the canonical Lorenz integration in-memory (no I/O).

    Convenience used by ``test_diagnostics`` to inspect the trajectory
    without round-tripping through HDF5.
    """
    return rk4_evolve(
        _lorenz_canonical,
        _seeded_initial_condition(seed),
        dt=CANONICAL_DT,
        n_steps=n_steps,
        capture_interval=capture_interval,
    )


def parameter_sweep_final_z(
    rho_values: np.ndarray,
    *,
    seed: int = 42,
    n_steps: int = 2000,
    dt: float = CANONICAL_DT,
) -> np.ndarray:
    """Sweep over Lorenz ``rho``; return the final-z coordinate per value.

    Used by ``test_diagnostics``'s output-stability check — Lorenz's
    final-z is a continuous function of ``rho`` (modulo the chaotic
    regime above ``rho ~= 24.74``).
    """
    initial = _seeded_initial_condition(seed)
    out = np.empty_like(np.asarray(rho_values, dtype=np.float64))
    for i, rho in enumerate(np.asarray(rho_values, dtype=np.float64)):

        def field(state: np.ndarray, *, _rho: float = float(rho)) -> np.ndarray:
            return lorenz_field(
                state, sigma=CANONICAL_SIGMA, rho=_rho, beta=CANONICAL_BETA
            )

        traj = rk4_evolve(
            field, initial, dt=dt, n_steps=n_steps, capture_interval=n_steps
        )
        out[i] = float(traj[-1, 2])
    return out


def precision_pair_at_canonical(
    *, seed: int = 42, n_steps: int = 1000
) -> tuple[np.ndarray, np.ndarray]:
    """Return (f32_traj, f64_traj) for the canonical Lorenz IC.

    Used by ``test_diagnostics``'s precision-sensitivity check. Same RK4
    arithmetic; only the working precision differs.
    """
    initial = _seeded_initial_condition(seed)

    def f64_field(state: np.ndarray) -> np.ndarray:
        return _lorenz_canonical(state)

    def f32_field(state: np.ndarray) -> np.ndarray:
        s = np.asarray(state, dtype=np.float32)
        out = np.empty_like(s)
        sigma = np.float32(CANONICAL_SIGMA)
        rho = np.float32(CANONICAL_RHO)
        beta = np.float32(CANONICAL_BETA)
        out[0] = sigma * (s[1] - s[0])
        out[1] = s[0] * (rho - s[2]) - s[1]
        out[2] = s[0] * s[1] - beta * s[2]
        return out.astype(np.float64)

    # f32 path: cast state down each step
    state32 = initial.astype(np.float32)
    dt32 = np.float32(CANONICAL_DT)
    traj32: list[np.ndarray] = [state32.copy()]
    for _ in range(n_steps):
        k1 = f32_field(state32).astype(np.float32)
        k2 = f32_field((state32 + np.float32(0.5) * dt32 * k1)).astype(np.float32)
        k3 = f32_field((state32 + np.float32(0.5) * dt32 * k2)).astype(np.float32)
        k4 = f32_field((state32 + dt32 * k3)).astype(np.float32)
        state32 = state32 + (dt32 / np.float32(6.0)) * (
            k1 + np.float32(2.0) * k2 + np.float32(2.0) * k3 + k4
        )
        traj32.append(state32.copy())
    traj64 = rk4_evolve(
        f64_field, initial, dt=CANONICAL_DT, n_steps=n_steps, capture_interval=1
    )
    return np.stack(traj32, axis=0).astype(np.float64), traj64


def short_run(
    initial_state: tuple[float, float, float] | np.ndarray,
    *,
    n_steps: int = 500,
    dt: float = CANONICAL_DT,
) -> np.ndarray:
    """Run a short canonical-Lorenz trajectory from a caller-supplied IC.

    Used by PBT invariants that need to evaluate divergence on an
    arbitrary point along a trajectory.
    """
    state = np.asarray(initial_state, dtype=np.float64).copy()
    return rk4_evolve(
        _lorenz_canonical, state, dt=dt, n_steps=n_steps, capture_interval=1
    )


__all__ = [
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_DT",
    "CANONICAL_IC",
    "CANONICAL_STEP_COUNT",
    "compute_canonical_trajectory",
    "parameter_sweep_final_z",
    "precision_pair_at_canonical",
    "short_run",
    "sim_runner_seeded",
]


# Silence the unused-import lint without breaking IDE attribution.
_ = Any
