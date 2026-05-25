"""SimRunner adapter -- mpm-multimaterial Stack-E canonical + diagnostic captures.

DETERMINISM STRATEGY (charter § 6 / Stage-0 findings -- load-bearing; cited in
the stage-1a commit footer):

1. **Warp CPU serial launch is the determinism mechanism (D5 / banked #8).**
   ``common_warp.init("cpu", deterministic=True)`` selects the CPU backend, on
   which ``wp.launch`` executes serially over the launch dimension in a single
   thread. The P2G ``wp.atomic_add`` accumulation order is therefore fixed and
   bit-exact run-to-run -- the Warp analog of Taichi ``cpu_max_num_threads=1`` /
   numba ``parallel=False``. No serialisation knob is needed (Stage-0 Task 0.6:
   the P2G atomic-scatter kernel reproduced 6/6 bit-identical, digest
   ``a8f6e654...07ff1fe1``). ``determinism.atomic_ops = True`` (``wp.atomic_add``
   IS used, serialised).

2. **f64 throughout (D15 / R-MPME-F64).** All ``wp.array`` are
   ``dtype=wp.float64``; every in-kernel literal is seeded ``wp.float64(...)``
   (banked #7 extended to pure-literal @wp.kernel constants, § L.4). common-warp
   ``Particles`` / ``Grids`` are f32-pinned and are NOT consumed; the port owns
   its f64 arrays (warp.md § 6 LBM-precedent).

3. **Socket-only common-warp consumption (D10 / S-ME1).** Runtime
   (``init``) + Capture (``Capture`` / ``write_capture``) + Determinism
   (``set_warp_deterministic`` / ``deterministic_context``). HashGrid is NOT used
   (MPM is a fixed 27-cell stencil, not neighbor-search).

4. **RNG threading.** Particle ICs use ``numpy.random.default_rng(seed)`` for the
   uniform-in-sphere blob rejection sampler (host-side; stack-agnostic -- Warp's
   own ``wp.rand_init`` is NOT used for the IC, mirroring the Phase-1 reference);
   ``seed`` is threaded into the descriptor (clean contract). bare
   ``numpy.random.*`` global-state APIs are BANNED.

5. **Same-stack posture: ``bit-exact-same-hw`` at device="cpu".** The spec
   ``determinism.md`` declares ``epsilon-same-stack-same-hw`` (a faithful GPU
   atomic-scatter port breaks bit-exactness under parallelism); the serialised
   CPU posture over-achieves to bit-exact (gate-10 witnesses it at the diagnostic
   tier).

6. **Phase-2+ deferred:** GPU-arch determinism; the full 128cube canonical
   capture (Stage 1b); multi-material constitutive table (single-material
   neo-Hookean at this scope).
"""

import time
from collections.abc import Iterable
from pathlib import Path
from typing import Final

import common_warp
import numpy as np
from common_warp.capture.model import diagnostics_key, state_key
from common_warp.warp_harness import deterministic_context, set_warp_deterministic

from .reference import (
    CANONICAL_BLOB_CENTER,
    CANONICAL_BLOB_RADIUS,
    CANONICAL_BLOB_VELOCITY_Z,
    CANONICAL_CAPTURE_INTERVAL,
    CANONICAL_DT,
    CANONICAL_FLOOR_Z_INDEX,
    CANONICAL_GRAVITY_Z,
    CANONICAL_GRID_N,
    CANONICAL_LAMBDA,
    CANONICAL_MU,
    CANONICAL_N_PARTICLES,
    CANONICAL_N_STEPS,
    CANONICAL_YOUNGS_MODULUS,
    advect_particles,
    compute_particle_stresses,
    deformation_update,
    g2p,
    grid_update,
    p2g_with_stress,
)

DIAGNOSTIC_GRID_N: Final[int] = 16
DIAGNOSTIC_N_PARTICLES: Final[int] = 5_000
DIAGNOSTIC_N_STEPS: Final[int] = 50
DIAGNOSTIC_CAPTURE_INTERVAL: Final[int] = 10

_STACK: Final[dict[str, str]] = {
    "name": "warp-stack-e",
    "version": common_warp.__version__,
    "build_id": "sub-phase-mpm-multimaterial-stack-e",
}


def _sample_blob_particles(
    n_particles: int,
    center: tuple[float, float, float],
    radius: float,
    initial_vz: float,
    seed: int,
    grid_n: int,
    grid_dx: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Deterministic blob sampler -- uniform-in-sphere by rejection.

    Returns ``(pos, vel, mass, material_id)``. Sampled in deterministic order
    from a seeded :class:`numpy.random.Generator`. Re-derived verbatim from the
    Phase-1 reference for cross-stack IC parity (gate-14).
    """
    rng = np.random.default_rng(int(seed))
    extra = max(2, int(np.ceil(2.0 * n_particles)))
    cx, cy, cz = center
    pos_list: list[np.ndarray] = []
    accepted = 0
    while accepted < n_particles:
        batch = rng.uniform(-radius, radius, size=(extra, 3))
        r2 = (batch * batch).sum(axis=1)
        good = batch[r2 < radius * radius]
        need = n_particles - accepted
        take = good[:need]
        pos_list.append(take)
        accepted += int(take.shape[0])
    pos_local = np.concatenate(pos_list, axis=0)[:n_particles]
    pos = pos_local.copy()
    pos[:, 0] += cx
    pos[:, 1] += cy
    pos[:, 2] += cz
    lo = 2.0 * grid_dx
    hi = (grid_n - 2) * grid_dx
    np.clip(pos, lo, hi, out=pos)
    pos = np.ascontiguousarray(pos, dtype=np.float64)
    vel = np.zeros_like(pos)
    vel[:, 2] = float(initial_vz)
    material_id = np.zeros(n_particles, dtype=np.int32)
    mass = np.full(n_particles, 1.0 / n_particles, dtype=np.float64)
    return pos, vel, mass, material_id


def _compute_step_diagnostics(
    pos: np.ndarray,
    vel: np.ndarray,
    mass: np.ndarray,
    grid_mom: np.ndarray,
    initial_momentum: np.ndarray,
    grid_dx: float,
) -> dict[str, float]:
    """Tier 1 + Tier 2 (particle IC-5 + vector_field IC-6) diagnostics."""
    health_ok = (
        np.all(np.isfinite(pos))
        and np.all(np.isfinite(vel))
        and np.all(np.isfinite(mass))
        and np.all(np.isfinite(grid_mom))
    )
    n_particles = pos.shape[0]
    p_total = (mass[:, None] * vel).sum(axis=0)
    abs_drift = np.abs(p_total - initial_momentum)
    max_abs_drift = float(abs_drift.max()) if abs_drift.size else 0.0
    grid_mom_l1 = float(np.abs(grid_mom).sum() * grid_dx**3)
    return {
        "check_health": 0.0 if health_ok else 1.0,
        "check_count_invariance": float(n_particles),
        "check_momentum_conservation_drift": max_abs_drift,
        "check_circulation_grid_mom_l1": grid_mom_l1,
    }


def _build_manifest(
    *,
    descriptor: str,
    seed: int,
    grid_n: int,
    n_particles: int,
    n_steps: int,
    capture_interval: int,
    dt: float,
    wall_clock_seconds: float,
    tier: str,
) -> dict[str, object]:
    return {
        "schema_version": "1.0.0",
        "sim": {
            "name": "mpm-multimaterial",
            "category": "hybrid-pg",
            "variant": "mls-mpm-hu-2018-multimaterial",
        },
        "stack": dict(_STACK),
        "config": {
            "tier": tier,
            "dims": [grid_n, grid_n, grid_n],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "descriptor": descriptor,
                "n_particles": int(n_particles),
                "dt": float(dt),
                "gravity_z": float(CANONICAL_GRAVITY_Z),
                "youngs_modulus": float(CANONICAL_YOUNGS_MODULUS),
                "poisson_ratio": 0.3,
                "blob_center": list(CANONICAL_BLOB_CENTER),
                "blob_radius": float(CANONICAL_BLOB_RADIUS),
                "blob_initial_vz": float(CANONICAL_BLOB_VELOCITY_Z),
                "floor_z_index": int(CANONICAL_FLOOR_Z_INDEX),
                "boundary": "sticky-floor-at-z-index-4-axis-clamp-walls",
                "constitutive": "neo-hookean-single-material",
                "material_count": 1,
                "shape_function": "quadratic-b-spline-3-node",
            },
        },
        "run": {
            "step_count": int(n_steps),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-25T00:00:00Z",
        },
        "payload": {
            "format": "hdf5",
            "path": f"{descriptor}.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        "determinism": {
            "claimed": "bit-exact-same-hw",
            "atomic_ops": True,
            "subgroup_ops": False,
        },
    }


def _evolve_to_frames(
    *,
    grid_n: int,
    n_particles: int,
    n_steps: int,
    capture_interval: int,
    dt: float,
    seed: int,
) -> Iterable[tuple[int, dict[str, np.ndarray], dict[str, float]]]:
    grid_dx = 1.0 / grid_n
    pos, vel, mass, material_id = _sample_blob_particles(
        n_particles=n_particles,
        center=CANONICAL_BLOB_CENTER,
        radius=CANONICAL_BLOB_RADIUS,
        initial_vz=CANONICAL_BLOB_VELOCITY_Z,
        seed=seed,
        grid_n=grid_n,
        grid_dx=grid_dx,
    )
    affine_c = np.zeros((n_particles, 3, 3), dtype=np.float64)
    F = np.zeros((n_particles, 3, 3), dtype=np.float64)
    for d in range(3):
        F[:, d, d] = 1.0
    stress = np.zeros((n_particles, 3, 3), dtype=np.float64)
    blob_volume = (4.0 / 3.0) * np.pi * CANONICAL_BLOB_RADIUS**3
    volume_p = np.full(n_particles, blob_volume / n_particles, dtype=np.float64)

    grid_mass = np.zeros((grid_n, grid_n, grid_n), dtype=np.float64)
    grid_mom = np.zeros((grid_n, grid_n, grid_n, 3), dtype=np.float64)
    vel_new = np.zeros_like(vel)
    affine_c_new = np.zeros_like(affine_c)
    initial_momentum = (mass[:, None] * vel).sum(axis=0).copy()

    def _frame(step: int) -> tuple[int, dict[str, np.ndarray], dict[str, float]]:
        return (
            step,
            {
                "particle_pos": pos.copy().astype(np.float64),
                "particle_vel": vel.copy().astype(np.float64),
                "particle_material_id": material_id.copy().astype(np.int32),
                "grid_mom": grid_mom.copy().astype(np.float64),
            },
            _compute_step_diagnostics(pos, vel, mass, grid_mom, initial_momentum, grid_dx),
        )

    yield _frame(0)

    for step in range(1, n_steps + 1):
        compute_particle_stresses(F, material_id, CANONICAL_MU, CANONICAL_LAMBDA, stress)
        grid_mass.fill(0.0)
        grid_mom.fill(0.0)
        p2g_with_stress(
            pos, vel, mass, affine_c, stress, volume_p, grid_mass, grid_mom, grid_dx, dt
        )
        grid_update(grid_mass, grid_mom, CANONICAL_GRAVITY_Z, dt, CANONICAL_FLOOR_Z_INDEX)
        g2p(pos, vel_new, affine_c_new, grid_mom, grid_mass, grid_dx)
        vel[:] = vel_new
        affine_c[:] = affine_c_new
        deformation_update(F, affine_c, dt)
        advect_particles(pos, vel, dt, grid_n, grid_dx)
        if step % capture_interval == 0 or step == n_steps:
            yield _frame(step)


def _write_capture(
    *,
    descriptor: str,
    seed: int,
    out_dir: Path,
    grid_n: int,
    n_particles: int,
    n_steps: int,
    capture_interval: int,
    dt: float,
    tier: str,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    common_warp.init("cpu", deterministic=True)
    set_warp_deterministic(int(seed), device="cpu")

    payload: dict[str, np.ndarray] = {}
    t_start = time.perf_counter()
    with deterministic_context():
        for step, state, diagnostics in _evolve_to_frames(
            grid_n=grid_n,
            n_particles=n_particles,
            n_steps=n_steps,
            capture_interval=capture_interval,
            dt=dt,
            seed=seed,
        ):
            for name, arr in state.items():
                payload[state_key(step, name)] = arr
            for check, val in diagnostics.items():
                payload[diagnostics_key(step, check)] = np.float64(val)
    elapsed = time.perf_counter() - t_start

    manifest = _build_manifest(
        descriptor=descriptor,
        seed=seed,
        grid_n=grid_n,
        n_particles=n_particles,
        n_steps=n_steps,
        capture_interval=capture_interval,
        dt=dt,
        wall_clock_seconds=elapsed,
        tier=tier,
    )
    capture = common_warp.Capture(manifest=manifest, payload=payload)
    common_warp.write_capture(capture, out_dir / descriptor)
    return out_dir / f"{descriptor}.json"


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Run the canonical drop-impact capture (128^3 x 1M particles x 500 steps).

    Descriptor ``drop-impact-128cube-seed{seed}-step500``; cadence-50 (11 frames).
    Returns the manifest JSON path. (Stage 1b emits this canonical capture; at
    Stage 1a the diagnostic-tier runner is the GREEN-gate witness.)
    """
    descriptor = f"drop-impact-128cube-seed{int(seed)}-step500"
    return _write_capture(
        descriptor=descriptor,
        seed=seed,
        out_dir=out_dir,
        grid_n=CANONICAL_GRID_N,
        n_particles=CANONICAL_N_PARTICLES,
        n_steps=CANONICAL_N_STEPS,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        dt=CANONICAL_DT,
        tier="ref",
    )


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic small-grid run (16^3 x 5K particles x 50 steps).

    Used by ``test_diagnostics`` / ``test_determinism`` at a fast scale. Threads
    ``seed`` into the blob sampler + descriptor.
    """
    descriptor = f"drop-impact-16cube-seed{int(seed)}-step50"
    return _write_capture(
        descriptor=descriptor,
        seed=seed,
        out_dir=out_dir,
        grid_n=DIAGNOSTIC_GRID_N,
        n_particles=DIAGNOSTIC_N_PARTICLES,
        n_steps=DIAGNOSTIC_N_STEPS,
        capture_interval=DIAGNOSTIC_CAPTURE_INTERVAL,
        dt=CANONICAL_DT,
        tier="diagnostic",
    )


__all__ = [
    "DIAGNOSTIC_CAPTURE_INTERVAL",
    "DIAGNOSTIC_GRID_N",
    "DIAGNOSTIC_N_PARTICLES",
    "DIAGNOSTIC_N_STEPS",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
]
