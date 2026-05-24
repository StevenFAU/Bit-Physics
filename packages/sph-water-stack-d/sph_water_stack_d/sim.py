"""SimRunner adapters for the Stack-D Taichi-DSL sph-water DFSPH port.

================================================================================
DETERMINISM STRATEGY DECLARATION (charter § 1.4.1 + conventions doc § F.1)
================================================================================
Cited from the Stage 1b commit footer.

1. **Reduction-ordering posture.** No in-kernel reductions in the inner
   per-particle density loop: each ``ti.ndrange`` thread ``p`` writes only its
   own ``rho[p]`` (and integrates only its own ``pos[p]`` / ``vel[p]``); there is
   no cross-particle scatter-add. The ONLY ``ti.atomic_add`` is the spatial-hash
   cell-insertion counter, which is serialised by ``cpu_max_num_threads=1`` so
   insertion order == particle-id order (Stage-0 R-S2 derisk) -> deterministic.
   This is NOT an epsilon-class atomic-scatter source (spec § 2.5); the manifest
   ``determinism.atomic_ops`` flag is therefore ``False``.
2. **Index-sorting / iteration-order pinning.** ``ti.ndrange`` is row-major;
   ``cpu_max_num_threads=1`` (set by ``set_taichi_deterministic``) serialises it.
3. **RNG threading.** RNG entry is exclusively NumPy ``numpy.random.default_rng``
   for the dam-break IC perturbation (matches the Phase-1 reference IC bit-for-bit);
   the Taichi kernels consume no ``ti.random`` surface.
4. **DFSPH iteration.** The Phase-1 reference *trajectory* is explicit-Euler
   free-fall under gravity with the SPH continuity computed as a discarded
   per-step side-effect (``_canonical_step``); there is NO iterative pressure
   solve in the capture-producing path. The combined density/divergence-solver
   iteration count per step is therefore structurally **1** (a single density
   pass), NOT the k~10-50 the Stage-0 R-S3 model assumed for a hypothetical
   iterative DFSPH. Instrumented in :func:`_evolve` per the Stage-0 R-S3 banked
   requirement.
5. **f64 precision.** Achieved via f64-typed ``ti.types.ndarray`` kernel args +
   direct f64-ndarray accumulation (RD-2D Stack-D pattern); ``default_fp`` is NOT
   altered (no IC-11 edit). Stage-0 banked f64 requirement satisfied.
6. **No BLAS / FMA path inside the kernels.** Scalar f64 arithmetic only.
7. **Phase-2+ deferred.** GPU arch determinism (ti.cuda / ti.vulkan / ti.metal);
   FMA fusion posture; subgroup-collectives. The port runs exclusively under
   ``arch="cpu"`` (docs/common/taichi.md § 2.1 + § 4.4).

Resulting claim: ``bit-exact-same-hw`` at ``arch="cpu"`` (the zero-tolerance
same-stack special case of IC-13); witnessed by gate-10 ``run_twice_and_diff``.
================================================================================
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference.dfsph_taichi import (
    SIGMA_3D,
    _build_grid,
    _compute_density,
    _ensure_taichi,
    _integrate,
    canonical_params,
    neighbor_lists,
)

# Canonical descriptor — identical to the Phase-1 NumPy-reference frozen capture
# (probe § 1 + § 5; D4 full canonical step-1000 horizon). The gate-14 (Stage 1c)
# cross-stack partner is captures/sph-water-ref/<this>.{h5,json}.
CANONICAL_DESCRIPTOR: Final[str] = "dam-break-100K-particles-seed42-step1000"
CANONICAL_N_PARTICLES: Final[int] = 100_000
CANONICAL_STEP_COUNT: Final[int] = 1000
CANONICAL_CAPTURE_INTERVAL: Final[int] = 100
# Smoothing length for the 100K-particle uniform-cube IC (matches the Phase-1
# reference canonical-tier override CANONICAL_H = 0.026; ~50 neighbors).
CANONICAL_H: Final[float] = 0.026
CANONICAL_MASS: Final[float] = 1.0e-3

_DIAGNOSTIC_N_PARTICLES: Final[int] = 64
_DIAGNOSTIC_N_STEPS: Final[int] = 8
_DIAGNOSTIC_DESCRIPTOR: Final[str] = "dam-break-stack-d-diagnostic-64particles-step8"
_MAX_PER_CELL: Final[int] = 256


def _seeded_initial_state(seed: int, n_particles: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Seeded uniform-random dam-break IC over [0, 1]^3 (matches the Phase-1 reference)."""
    rng = np.random.default_rng(int(seed))
    positions = rng.uniform(0.0, 1.0, size=(int(n_particles), 3))
    velocities = np.zeros((int(n_particles), 3), dtype=np.float64)
    masses = np.ones((int(n_particles),), dtype=np.float64) * CANONICAL_MASS
    return positions, velocities, masses


def _evolve(
    *,
    seed: int,
    n_particles: int,
    n_steps: int,
    h: float,
    capture_interval: int,
    instrument: bool = False,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, list[int], dict[str, float]]:
    """Taichi-DSL evolution: explicit-Euler free-fall + per-step SPH density.

    Returns (p_hist, v_hist, rho_hist, step_indices, info). ``info`` carries the
    R-S3 instrumentation (per-step wall-clock, combined iters/step = 1).
    """
    _ensure_taichi()
    cell = 2.0 * float(h)
    sigma_inv_h3 = float(SIGMA_3D / (h * h * h))
    g_z = float(canonical_params()["g_z"])
    dt = float(canonical_params()["dt"])

    pos, vel, masses = _seeded_initial_state(seed, n_particles)
    # Grid extent: x,y in [0,1]; the cloud free-falls rigidly so its per-axis
    # extent is invariant. ncell sized from the IC bounding box + margin.
    extent = float((pos.max(axis=0) - pos.min(axis=0)).max())
    ncell = int(np.ceil(extent / cell)) + 3
    cell_count = np.zeros((ncell * ncell * ncell,), dtype=np.int32)
    cell_part = np.zeros((ncell * ncell * ncell, _MAX_PER_CELL), dtype=np.int32)
    rho = np.zeros((int(n_particles),), dtype=np.float64)

    p_hist: list[np.ndarray] = []
    v_hist: list[np.ndarray] = []
    rho_hist: list[np.ndarray] = []
    step_indices: list[int] = []

    def _density_pass() -> None:
        origin = pos.min(axis=0) - cell
        _build_grid(
            pos,
            cell_count,
            cell_part,
            float(origin[0]),
            float(origin[1]),
            float(origin[2]),
            cell,
            ncell,
            int(n_particles),
            _MAX_PER_CELL,
        )
        _compute_density(
            pos,
            masses,
            rho,
            cell_count,
            cell_part,
            float(origin[0]),
            float(origin[1]),
            float(origin[2]),
            cell,
            float(h),
            sigma_inv_h3,
            ncell,
            int(n_particles),
            _MAX_PER_CELL,
        )

    # Frame 0 (IC).
    _density_pass()
    p_hist.append(pos.copy())
    v_hist.append(vel.copy())
    rho_hist.append(rho.copy())
    step_indices.append(0)

    per_step_times: list[float] = []
    max_cell_occupancy = int(cell_count.max())
    for step in range(1, int(n_steps) + 1):
        t0 = time.perf_counter()
        _integrate(pos, vel, g_z, dt, int(n_particles))
        _density_pass()  # per-step surface exercise (matches the reference)
        per_step_times.append(time.perf_counter() - t0)
        max_cell_occupancy = max(max_cell_occupancy, int(cell_count.max()))
        if step % int(capture_interval) == 0 or step == int(n_steps):
            p_hist.append(pos.copy())
            v_hist.append(vel.copy())
            rho_hist.append(rho.copy())
            step_indices.append(int(step))

    info: dict[str, float] = {
        "combined_iters_per_step": 1.0,  # explicit Euler: a single density pass
        "mean_per_step_seconds": float(np.mean(per_step_times)) if per_step_times else 0.0,
        "max_cell_occupancy": float(max_cell_occupancy),
        "max_per_cell": float(_MAX_PER_CELL),
    }
    if instrument:
        info["instrumented_steps"] = float(len(per_step_times))
    return (
        np.stack(p_hist, axis=0),
        np.stack(v_hist, axis=0),
        np.stack(rho_hist, axis=0),
        step_indices,
        info,
    )


def compute_diagnostic_trajectory(
    *,
    seed: int = 42,
    n_particles: int = _DIAGNOSTIC_N_PARTICLES,
    n_steps: int = _DIAGNOSTIC_N_STEPS,
    capture_interval: int = 1,
) -> tuple[np.ndarray, np.ndarray, list[int]]:
    """Diagnostic-tier in-memory trajectory (no I/O) for gate-5/6 tests."""
    h = float(canonical_params()["h"])
    p_hist, v_hist, _rho, step_indices, _info = _evolve(
        seed=seed,
        n_particles=n_particles,
        n_steps=n_steps,
        h=h,
        capture_interval=capture_interval,
    )
    return p_hist, v_hist, step_indices


def neighbor_lists_at(positions: np.ndarray, *, h: float | None = None) -> list[list[int]]:
    """Diagnostic helper — neighbor lists at a positions snapshot (IC-5 gate-6)."""
    if h is None:
        h = float(canonical_params()["h"])
    return neighbor_lists(np.asarray(positions, dtype=np.float64), float(h))


def _build_manifest(
    *,
    descriptor: str,
    n_particles: int,
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
) -> CaptureManifest:
    params = canonical_params()
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "sph-water",
            "category": "particle-fluids",
            "variant": "dfsph-bender-koschier-2015",
        },
        stack={
            "name": "taichi-stack-d",
            "version": "0.0.1",
            "build_id": "sub-phase-sph-water-stack-d",
        },
        config={
            "tier": "test",
            "dims": [int(n_particles), 3],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "h": params["h"],
                "rho_0": params["rho_0"],
                "dt": params["dt"],
                "g_z": params["g_z"],
                "n_particles": int(n_particles),
            },
        },
        run={
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-24T00:00:00Z",
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


def _trajectory_to_step_states(
    p_hist: np.ndarray,
    v_hist: np.ndarray,
    rho_hist: np.ndarray,
    step_indices: list[int],
) -> list[StepState]:
    rows: list[StepState] = []
    for idx, step in enumerate(step_indices):
        positions = p_hist[idx]
        velocities = v_hist[idx]
        rho = rho_hist[idx]
        speed = np.linalg.norm(velocities, axis=-1)
        rows.append(
            StepState(
                step=int(step),
                state={
                    "position": np.asarray(positions, dtype=np.float64).copy(),
                    "velocity": np.asarray(velocities, dtype=np.float64).copy(),
                    "density": np.asarray(rho, dtype=np.float64).copy(),
                },
                diagnostics={
                    "max_speed": float(speed.max()) if speed.size else 0.0,
                    "mean_density": float(np.mean(rho)) if rho.size else 0.0,
                },
            )
        )
    return rows


def _write_capture(
    *,
    descriptor: str,
    n_particles: int,
    seed: int,
    n_steps: int,
    capture_interval: int,
    h: float,
    out_dir: Path,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    p_hist, v_hist, rho_hist, step_indices, _info = _evolve(
        seed=seed,
        n_particles=n_particles,
        n_steps=n_steps,
        h=h,
        capture_interval=capture_interval,
    )
    wall = time.perf_counter() - t0
    rows = _trajectory_to_step_states(p_hist, v_hist, rho_hist, step_indices)
    manifest = _build_manifest(
        descriptor=descriptor,
        n_particles=int(n_particles),
        seed=seed,
        step_count=n_steps,
        capture_interval=capture_interval,
        wall_clock_seconds=wall,
    )
    return write_capture(rows, manifest, out_dir)


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — canonical 100K-particle Stack-D capture (gate 9)."""
    return _write_capture(
        descriptor=CANONICAL_DESCRIPTOR,
        n_particles=CANONICAL_N_PARTICLES,
        seed=seed,
        n_steps=CANONICAL_STEP_COUNT,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        h=CANONICAL_H,
        out_dir=out_dir,
    )


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — diagnostic-tier capture for gate-10 determinism.

    Seed-propagating diagnostic runner (D7 banked-defect fix-precedent): the
    ``seed`` argument is threaded into the IC so ``run_twice_and_diff`` exercises
    seed-determined determinism, NOT a hard-coded seed.
    """
    return _write_capture(
        descriptor=_DIAGNOSTIC_DESCRIPTOR,
        n_particles=_DIAGNOSTIC_N_PARTICLES,
        seed=seed,
        n_steps=_DIAGNOSTIC_N_STEPS,
        capture_interval=max(1, _DIAGNOSTIC_N_STEPS // 4),
        h=float(canonical_params()["h"]),
        out_dir=out_dir,
    )
