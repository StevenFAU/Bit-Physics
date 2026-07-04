"""SimRunner adapter — pic-flip canonical capture + diagnostics surface.

================================================================================
DETERMINISM STRATEGY DECLARATION (spec-ref § 8 — LOAD-BEARING)
================================================================================

Claim: ``bit-exact-same-hw`` for the Python NumPy reference. Clauses:

1. **Lex-order particle + stencil iteration; no atomic scatter.** Every
   hot kernel in ``pic_flip.reference.apic`` /
   ``pic_flip.reference.regularizers`` is single-threaded
   ``@njit(fastmath=False, cache=True)`` (``docs/common/numba.md``)
   iterating particles in id order and the 9/27-node stencil in lex
   (di, dj[, dk]) order — fixed accumulation order, bit-identical FP
   residual across same-hardware runs (the MPM pattern).
2. **Fixed-iteration-cap masked Jacobi** — no tolerance early-stop
   branch (``pic_flip.reference.poisson_masked``, P24 pattern). The cap
   is per-canonical, chosen by measured hydrostatic convergence
   (spec-ref § 6.3), then pinned below.
3. **Deterministic regularizers** — push-apart is a sequential
   Gauss-Seidel sweep in particle-id order over reverse-insertion cell
   linked lists (pure function of input ordering); the drift source is
   vectorized NumPy.
4. **CFL substep count** is a deterministic function of the state
   (``ceil``), never wall-clock adaptive.
5. **RNG at IC synthesis only** via ``numpy.random.default_rng(seed)``;
   bare ``numpy.random.*`` global state is banned in ``reference`` /
   ``sim``. No Hypothesis leakage outside the PBT module.
6. **No BLAS path inside the step** — elementwise NumPy only in the
   projection/extrapolation sweeps; no ``numpy.dot`` reductions.
7. **Deferred (web/WGSL)**: fixed-point i32 atomic P2G determinism is
   the frontend's contract (spec-ref § 9); n/a in this reference.

================================================================================
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference.apic import (
    MODE_APIC,
    advect_rk2_2d,
    apic_step_3d,
    count_particles_2d,
    count_particles_3d,
    default_params_3d,
    g2p_2d,
    grid_velocity_from_momentum,
    p2g_2d,
)
from .reference.poisson_masked import (
    FLUID,
    classify_cells_2d,
    classify_cells_3d,
    default_solid_mask_2d,
    default_solid_mask_3d,
)
from .reference.regularizers import (
    measure_rest_density,
    scatter_unit_density_3d,
)

__all__ = [
    "CANONICAL_DESCRIPTOR",
    "canonical_params_3d",
    "diagnostic_params_3d",
    "seeded_dam_break_3d",
    "seeded_dam_break_2d",
    "make_rotating_disk_2d",
    "transfer_cycle_step_2d",
    "kinetic_energy",
    "total_momentum",
    "total_angular_momentum_2d",
    "total_angular_momentum_3d",
    "fluid_volume_metrics_2d",
    "fluid_volume_metrics_3d",
    "run_dam_break_3d",
    "sim_runner_seeded",
    "sim_runner_diagnostic",
]

# Canonical 3D dam break (the shippable scene; 3D per the spec-ref § 1
# dimensionality decision — the web demo reuses sph-water's 3D SSFR).
CANONICAL_DESCRIPTOR: Final[str] = "dam-break-3d-apic-24cube-seed42-step120"
CANONICAL_STEP_COUNT: Final[int] = 120
CANONICAL_CAPTURE_INTERVAL: Final[int] = 20
# n_jacobi pinned by measured hydrostatic convergence at the canonical
# fluid depth (spec-ref § 6.3 protocol; witnessed by
# tests/test_mms_poisson_masked.py::test_pinned_canonical_n_jacobi_is_converged).
# Measured on the 24-grid 15-deep column (2026-07-04): 20 sweeps retain
# 100% of g*dt (the GPU Gems 3 ch. 30 sinking failure), 2000 retain
# 0.55%, 4000 retain < 0.01% with dP/dy = -9.810 exactly; 3000 sits in
# the < 0.1% band.
CANONICAL_N_JACOBI: Final[int] = 3000

_DIAGNOSTIC_DESCRIPTOR: Final[str] = "dam-break-3d-apic-12cube-diagnostic-step8"
_DIAGNOSTIC_N_STEPS: Final[int] = 8


def canonical_params_3d() -> dict[str, Any]:
    """Pinned canonical 3D dam-break parameters (regularizers ON, declared)."""
    params = default_params_3d()
    params.update(
        {
            "nx": 24,
            "ny": 24,
            "nz": 24,
            "dx": 1.0 / 24.0,
            "dt": 2.0e-3,
            "n_jacobi": CANONICAL_N_JACOBI,
            "mode": MODE_APIC,
            "regularizers": True,
        }
    )
    return params


def diagnostic_params_3d() -> dict[str, Any]:
    """Small 3D dam break for gate-level tests (shallow => small n_jacobi)."""
    params = default_params_3d()
    params.update(
        {
            "nx": 12,
            "ny": 12,
            "nz": 12,
            "dx": 1.0 / 12.0,
            "dt": 2.0e-3,
            # 8-wide interior: 600 Jacobi sweeps are fully converged at
            # this diagnostic scale (spectral-radius estimate + measured).
            "n_jacobi": 600,
            "mode": MODE_APIC,
            "regularizers": True,
        }
    )
    return params


def _lattice_block(
    lo: np.ndarray,
    hi: np.ndarray,
    spacing: float,
    jitter: float,
    rng: np.random.Generator,
) -> np.ndarray:
    """Uniform lattice of particles in the box [lo, hi), spacing per axis,
    with seeded jitter of ``jitter * spacing`` (deterministic)."""
    axes = [np.arange(lo[a] + 0.5 * spacing, hi[a], spacing) for a in range(len(lo))]
    mesh = np.meshgrid(*axes, indexing="ij")
    pos = np.stack([m.ravel() for m in mesh], axis=-1).astype(np.float64)
    if jitter > 0.0:
        pos = pos + rng.uniform(-jitter * spacing, jitter * spacing, size=pos.shape)
    return pos


def seeded_dam_break_3d(
    seed: int, params: dict[str, Any], jitter: float = 0.2
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Seeded dam-break IC: a particle column in the -x corner.

    2 particles per cell axis (8 per cell). Returns
    ``(pos, vel, mass, affine_c)``.
    """
    rng = np.random.default_rng(int(seed))
    nx, ny, nz = int(params["nx"]), int(params["ny"]), int(params["nz"])
    dx = float(params["dx"])
    n_wall = int(params.get("n_wall", 2))
    lo = np.array([n_wall * dx] * 3)
    hi = np.array(
        [
            n_wall * dx + 0.40 * (nx - 2 * n_wall) * dx,
            n_wall * dx + 0.75 * (ny - 2 * n_wall) * dx,
            n_wall * dx + 0.40 * (nz - 2 * n_wall) * dx,
        ]
    )
    # Gravity acts along -z (apic_step_3d); make the column tall in z.
    hi[1], hi[2] = hi[2], hi[1]
    pos = _lattice_block(lo, hi, 0.5 * dx, jitter, rng)
    vel = np.zeros_like(pos)
    mass = np.ones((pos.shape[0],), dtype=np.float64)
    affine_c = np.zeros((pos.shape[0], 3, 3), dtype=np.float64)
    return pos, vel, mass, affine_c


def seeded_dam_break_2d(
    seed: int, params: dict[str, Any], jitter: float = 0.2
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """2D dam-break IC (column in the -x corner, tall in y)."""
    rng = np.random.default_rng(int(seed))
    nx, ny = int(params["nx"]), int(params["ny"])
    dx = float(params["dx"])
    n_wall = int(params.get("n_wall", 2))
    lo = np.array([n_wall * dx] * 2)
    hi = np.array(
        [
            n_wall * dx + 0.40 * (nx - 2 * n_wall) * dx,
            n_wall * dx + 0.75 * (ny - 2 * n_wall) * dx,
        ]
    )
    pos = _lattice_block(lo, hi, 0.5 * dx, jitter, rng)
    vel = np.zeros_like(pos)
    mass = np.ones((pos.shape[0],), dtype=np.float64)
    affine_c = np.zeros((pos.shape[0], 2, 2), dtype=np.float64)
    return pos, vel, mass, affine_c


def make_rotating_disk_2d(
    n_grid: int = 32,
    omega: float = 2.0,
    radius_frac: float = 0.3,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, float, np.ndarray]:
    """Rigid-rotation disk IC (the Jiang 2017 § 6.1 calculation-validation
    scene, spec-ref § 6.4): particles on an unjittered lattice inside a
    centered disk, ``v = omega x r``, ``C`` set to the consistent spin
    matrix ``[[0, -omega], [omega, 0]]``.

    Returns ``(pos, vel, mass, affine_c, dx, center)``.
    """
    dx = 1.0 / n_grid
    center = np.array([0.5, 0.5])
    radius = radius_frac
    lo = np.array([2 * dx, 2 * dx])
    hi = np.array([1.0 - 2 * dx, 1.0 - 2 * dx])
    axes = [np.arange(lo[a] + 0.25 * dx, hi[a], 0.5 * dx) for a in range(2)]
    mesh = np.meshgrid(*axes, indexing="ij")
    pos = np.stack([m.ravel() for m in mesh], axis=-1).astype(np.float64)
    keep = np.linalg.norm(pos - center, axis=1) <= radius
    pos = pos[keep]
    rel = pos - center
    vel = np.stack([-omega * rel[:, 1], omega * rel[:, 0]], axis=-1)
    mass = np.ones((pos.shape[0],), dtype=np.float64)
    affine_c = np.zeros((pos.shape[0], 2, 2), dtype=np.float64)
    affine_c[:, 0, 1] = -omega
    affine_c[:, 1, 0] = omega
    return pos, vel, mass, affine_c, dx, center


def transfer_cycle_step_2d(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    affine_c: np.ndarray,
    dx: float,
    dt: float,
    nx: int,
    ny: int,
    mode: str,
) -> None:
    """One transfer-only cycle: P2G -> G2P(mode) -> RK2 advect.

    No gravity, no projection, no regularizers — isolates the transfer
    dissipation (the rotating-disk angular-momentum diagnostic and the
    Burgers-protocol advection OOA both use this cycle; spec-ref
    §§ 6.1/6.4). Mutates ``pos``/``vel``/``affine_c``.
    """
    if mode not in ("pic", "flip", MODE_APIC):
        raise ValueError(f"unknown transfer mode {mode!r} (expected pic/flip/apic)")
    grid_mass = np.zeros((nx, ny), dtype=np.float64)
    grid_mom = np.zeros((nx, ny, 2), dtype=np.float64)
    c_for_p2g = affine_c if mode == MODE_APIC else np.zeros_like(affine_c)
    p2g_2d(pos, vel, mass, c_for_p2g, grid_mass, grid_mom, dx)
    grid_vel = grid_velocity_from_momentum(grid_mass, grid_mom)
    vel_new = np.empty_like(vel)
    c_new = np.empty_like(affine_c)
    if mode == MODE_APIC:
        g2p_2d(pos, grid_vel, dx, True, vel_new, c_new)
    else:
        g2p_2d(pos, grid_vel, dx, False, vel_new, c_new)
        if mode == "flip":
            # Transfer-only cycle has no grid force: S(new) == S(old),
            # so FLIP reduces to carrying the old particle velocity.
            vel_new = vel.copy()
    vel[:] = vel_new
    affine_c[:] = c_new
    advect_rk2_2d(pos, grid_vel, dt, dx, 1, 2 * dx, (nx - 3) * dx, (ny - 3) * dx)


# -- Diagnostics (spec-ref § 10) -------------------------------------------


def kinetic_energy(vel: np.ndarray, mass: np.ndarray) -> float:
    return float(0.5 * np.sum(mass * np.sum(vel * vel, axis=-1)))


def total_momentum(vel: np.ndarray, mass: np.ndarray) -> np.ndarray:
    return np.sum(mass[:, None] * vel, axis=0)


def total_angular_momentum_2d(
    pos: np.ndarray,
    vel: np.ndarray,
    affine_c: np.ndarray,
    mass: np.ndarray,
    dx: float,
    center: np.ndarray | None = None,
) -> float:
    """Total L (scalar, 2D) incl. the APIC spin term.

    ``L = sum m (x-c) x v + sum m axial(B)`` with ``B = C Dp =
    (1/4) dx^2 C`` and ``axial(B) = B21 - B12`` (golden-table
    definition, ``tools/testkit/golden/tables/particle-fluids/
    apic-angular-momentum.json``).
    """
    rel = pos if center is None else pos - center
    orbital = np.sum(mass * (rel[:, 0] * vel[:, 1] - rel[:, 1] * vel[:, 0]))
    spin = np.sum(mass * 0.25 * dx * dx * (affine_c[:, 1, 0] - affine_c[:, 0, 1]))
    return float(orbital + spin)


def total_angular_momentum_3d(
    pos: np.ndarray,
    vel: np.ndarray,
    affine_c: np.ndarray,
    mass: np.ndarray,
    dx: float,
    center: np.ndarray | None = None,
) -> np.ndarray:
    rel = pos if center is None else pos - center
    orbital = np.sum(mass[:, None] * np.cross(rel, vel), axis=0)
    b = 0.25 * dx * dx * affine_c
    axial = np.stack(
        [
            b[:, 2, 1] - b[:, 1, 2],
            b[:, 0, 2] - b[:, 2, 0],
            b[:, 1, 0] - b[:, 0, 1],
        ],
        axis=-1,
    )
    spin = np.sum(mass[:, None] * axial, axis=0)
    return np.asarray(orbital + spin, dtype=np.float64)


def fluid_volume_metrics_2d(
    pos: np.ndarray, nx: int, ny: int, dx: float, n_wall: int
) -> dict[str, float]:
    """Volume/water-level diagnostics (spec-ref § 10, the drift readout)."""
    count = np.zeros((nx, ny), dtype=np.int64)
    count_particles_2d(pos, nx, ny, dx, count)
    labels = classify_cells_2d(count, default_solid_mask_2d(nx, ny, n_wall))
    fluid = labels == FLUID
    heights = np.where(
        fluid.any(axis=1), fluid.shape[1] - 1 - np.argmax(fluid[:, ::-1], axis=1), 0
    )
    return {
        "fluid_node_count": float(np.sum(fluid)),
        "max_column_height": float(np.max(heights)) if heights.size else 0.0,
    }


def fluid_volume_metrics_3d(
    pos: np.ndarray, nx: int, ny: int, nz: int, dx: float, n_wall: int
) -> dict[str, float]:
    count = np.zeros((nx, ny, nz), dtype=np.int64)
    count_particles_3d(pos, nx, ny, nz, dx, count)
    labels = classify_cells_3d(count, default_solid_mask_3d(nx, ny, nz, n_wall))
    fluid = labels == FLUID
    any_z = fluid.any(axis=2)
    heights = np.where(
        any_z, fluid.shape[2] - 1 - np.argmax(fluid[:, :, ::-1], axis=2), 0
    )
    return {
        "fluid_node_count": float(np.sum(fluid)),
        "max_column_height": float(np.max(heights)) if heights.size else 0.0,
    }


# -- Canonical capture -------------------------------------------------------


def run_dam_break_3d(
    seed: int,
    params: dict[str, Any],
    n_steps: int,
    capture_interval: int,
) -> tuple[list[dict[str, np.ndarray]], list[int], list[dict[str, float]], float]:
    """Run the 3D dam break; returns (frames, step indices, diagnostics, rho0).

    Frame-0 rest density is measured once (regularizer #2 threshold,
    spec-ref § 3 step 6) and passed to every step.
    """
    nx, ny, nz = int(params["nx"]), int(params["ny"]), int(params["nz"])
    dx = float(params["dx"])
    n_wall = int(params.get("n_wall", 2))
    pos, vel, mass, affine_c = seeded_dam_break_3d(seed, params)
    den = np.zeros((nx, ny, nz), dtype=np.float64)
    scatter_unit_density_3d(pos, dx, den)
    count = np.zeros((nx, ny, nz), dtype=np.int64)
    count_particles_3d(pos, nx, ny, nz, dx, count)
    labels0 = classify_cells_3d(count, default_solid_mask_3d(nx, ny, nz, n_wall))
    rho_rest = measure_rest_density(den, labels0)

    frames: list[dict[str, np.ndarray]] = []
    step_indices: list[int] = []
    diags: list[dict[str, float]] = []

    def _capture(step: int, info: dict[str, Any] | None) -> None:
        frames.append(
            {
                "position": pos.copy(),
                "velocity": vel.copy(),
                "affine_c": affine_c.copy().reshape(pos.shape[0], 9),
            }
        )
        step_indices.append(step)
        vol = fluid_volume_metrics_3d(pos, nx, ny, nz, dx, n_wall)
        diags.append(
            {
                "kinetic_energy": kinetic_energy(vel, mass),
                "max_speed": float(np.max(np.abs(vel))) if vel.size else 0.0,
                "max_div_fluid": float(info["max_div_fluid"]) if info else 0.0,
                **vol,
            }
        )

    _capture(0, None)
    for step in range(1, n_steps + 1):
        info = apic_step_3d(pos, vel, mass, affine_c, params, rho_rest=rho_rest)
        if step % capture_interval == 0 or step == n_steps:
            _capture(step, info)
    return frames, step_indices, diags, rho_rest


def _build_manifest(
    *,
    descriptor: str,
    params: dict[str, Any],
    n_particles: int,
    seed: int,
    step_count: int,
    capture_interval: int,
    rho_rest: float,
    wall_clock_seconds: float,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "pic-flip",
            "category": "particle-fluids",
            "variant": "apic-jiang-2015-collocated",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "phase-6-lane-c-pic-flip",
        },
        config={
            "tier": "test",
            "dims": [int(n_particles), 3],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "nx": int(params["nx"]),
                "ny": int(params["ny"]),
                "nz": int(params["nz"]),
                "dx": float(params["dx"]),
                "dt": float(params["dt"]),
                "gravity": float(params["gravity"]),
                "mode": str(params["mode"]),
                "n_jacobi": int(params["n_jacobi"]),
                "n_particles": int(n_particles),
                # Regularizers ON for canonicals — declared, not hidden
                # (spec-ref § 3 step 6 provenance rule).
                "regularizers": bool(params["regularizers"]),
                "push_apart_radius_factor": float(params["push_apart_radius_factor"]),
                "drift_k": float(params["drift_k"]),
                "rho_rest_measured_frame0": float(rho_rest),
            },
        },
        run={
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-07-04T00:00:00Z",
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


def _write_capture(
    *,
    descriptor: str,
    params: dict[str, Any],
    seed: int,
    n_steps: int,
    capture_interval: int,
    out_dir: Path,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    frames, step_indices, diags, rho_rest = run_dam_break_3d(
        seed, params, n_steps, capture_interval
    )
    wall = time.perf_counter() - t0
    rows = [
        StepState(step=int(step), state=frame, diagnostics=diag)
        for frame, step, diag in zip(frames, step_indices, diags)
    ]
    n_particles = frames[0]["position"].shape[0]
    manifest = _build_manifest(
        descriptor=descriptor,
        params=params,
        n_particles=n_particles,
        seed=seed,
        step_count=n_steps,
        capture_interval=capture_interval,
        rho_rest=rho_rest,
        wall_clock_seconds=wall,
    )
    return write_capture(rows, manifest, out_dir)


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — the canonical 3D dam-break capture."""
    return _write_capture(
        descriptor=CANONICAL_DESCRIPTOR,
        params=canonical_params_3d(),
        seed=seed,
        n_steps=CANONICAL_STEP_COUNT,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        out_dir=out_dir,
    )


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — diagnostic-tier capture for gate-11 determinism."""
    return _write_capture(
        descriptor=_DIAGNOSTIC_DESCRIPTOR,
        params=diagnostic_params_3d(),
        seed=seed,
        n_steps=_DIAGNOSTIC_N_STEPS,
        capture_interval=max(1, _DIAGNOSTIC_N_STEPS // 4),
        out_dir=out_dir,
    )
