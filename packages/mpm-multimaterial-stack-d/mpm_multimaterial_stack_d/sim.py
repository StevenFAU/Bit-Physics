"""SimRunner adapter -- mpm-multimaterial Stack-D canonical + diagnostic captures.

DETERMINISM STRATEGY (charter section 1.4.1 / conventions doc section F.1 --
load-bearing; cited in the stage1b commit footer):

1. **P2G atomic-scatter serialised at cpu_max_num_threads=1 (Stage-0 posture (i),
   LOAD-BEARING).** ``p2g_with_stress`` scatters per-particle mass + momentum into
   shared grid nodes via ``ti.atomic_add``. ``set_taichi_deterministic`` pins
   ``cpu_max_num_threads=1``, so the particle ``for p in range(n)`` loop runs in
   index order on one thread and the per-node accumulation order matches the
   Phase-1 numba reference's sequential ``+=`` -- run-to-run bit-exact (Stage-0
   Task 0.3: threads=1 bit-exact; threads=8 NOT bit-exact -> the parallel
   atomic-scatter surface is the IC-15 deferred aspect #3, serialised away here).

2. **f64 accumulator seeds (Stage-0 + LBM banked).** ``set_taichi_deterministic``
   does NOT set ``default_fp=ti.f64``; every in-kernel accumulator in
   ``reference.mls_mpm_taichi`` (P2G scatter operands, the G2P velocity + APIC-C
   reductions, the neo-Hookean stress 3x3 terms, the deformation-gradient multiply)
   is seeded ``ti.f64(0.0)`` reading from f64 ``ti.types.ndarray`` views.

3. **Fixed lex iteration order.** The 27-cell P2G/G2P stencil iterates fixed
   ``(di, dj, dk)`` lex order (R-MPM-1 parity); ``ti.ndrange`` is row-major;
   base-node convention ``base = floor(p/dx + 0.5) - 1`` (golden-pinned; R-MPM-3).

4. **RNG threading (substantively seeded; NOT cosmetic -- S-M4).** Particle ICs
   use ``numpy.random.default_rng(seed)`` for the uniform-in-sphere blob rejection
   sampler; different seeds produce different particle clouds (unlike LBM's
   analytic ICs). The runners thread ``seed`` correctly AND interpolate it into the
   descriptor (``drop-impact-128cube-seed{seed}-step500``) -- a clean contract on
   the NEW Stack-D code (the Phase-1 reference hard-coded ``seed42``; NOT a defect
   -- D7 closed-as-not-a-defect; this is the clean-contract improvement). bare
   ``numpy.random.*`` global-state APIs are BANNED.

5. **Same-stack posture: ``bit-exact-same-hw`` at arch="cpu"** (posture (i)). The
   spec ``determinism.md`` declares ``epsilon-same-stack-same-hw`` because the
   canonical Stack-D Taichi P2G atomic scatter-add breaks bit-exactness under
   parallelism; the serialised posture (i) over-achieves to bit-exact (gate-10
   ``test_run_twice_epsilon_diff`` witnesses it at the diagnostic tier).
   ``determinism.atomic_ops = True`` (ti.atomic_add IS used, serialised).

6. **Phase-2+ deferred:** GPU-arch determinism; parallel-scatter posture (ii)
   (empirically present per Stage-0 Task 0.3; serialised away here); FMA fusion;
   multi-material constitutive table (single-material neo-Hookean at this scope).
"""

import json
import time
from collections.abc import Iterable
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

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
from .reference.mls_mpm_taichi import _ensure_taichi

DIAGNOSTIC_GRID_N: Final[int] = 16
DIAGNOSTIC_N_PARTICLES: Final[int] = 5_000
DIAGNOSTIC_N_STEPS: Final[int] = 50
DIAGNOSTIC_CAPTURE_INTERVAL: Final[int] = 10


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
    from a seeded :class:`numpy.random.Generator` (substantively seeded -- S-M4).
    Ported verbatim from the Phase-1 reference for cross-stack IC parity.
    """
    rng = np.random.default_rng(int(seed))
    extra = max(2, int(np.ceil(2.0 * n_particles)))
    cx, cy, cz = center
    pos_list: list[np.ndarray] = []
    accepted = 0
    while accepted < n_particles:
        batch = rng.uniform(-radius, radius, size=(extra, 3))
        r2 = (batch * batch).sum(axis=1)
        mask = r2 < radius * radius
        good = batch[mask]
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
    """Tier 1 + Tier 2 (particle IC-5 + vector_field IC-6) diagnostics.

    Schema mirrors the Phase-1 reference verbatim (4 keys) -- gate-14
    ``compare_captures`` diffs only state fields, but keeping the diagnostics
    identical preserves the diagnostics-test contract + capture parity.
    """
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
    capture_dir: Path,
    seed: int,
    grid_n: int,
    n_particles: int,
    n_steps: int,
    capture_interval: int,
    dt: float,
    tier: str,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "mpm-multimaterial",
            "category": "hybrid-pg",
            "variant": "mls-mpm-hu-2018-multimaterial",
        },
        stack={
            "name": "taichi-stack-d",
            "version": "0.0.1",
            "build_id": "sub-phase-mpm-multimaterial-stack-d",
        },
        config={
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
        run={
            "step_count": int(n_steps),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-23T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": (capture_dir / f"{descriptor}.h5").name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": True,
            "subgroup_ops": False,
        },
    )


def _evolve_to_step_states(
    *,
    grid_n: int,
    n_particles: int,
    n_steps: int,
    capture_interval: int,
    dt: float,
    seed: int,
    log_jdet: bool = False,
) -> Iterable[StepState]:
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

    yield StepState(
        step=0,
        state={
            "particle_pos": pos.copy().astype(np.float64),
            "particle_vel": vel.copy().astype(np.float64),
            "particle_material_id": material_id.copy().astype(np.int32),
            "grid_mom": grid_mom.copy().astype(np.float64),
        },
        diagnostics=_compute_step_diagnostics(pos, vel, mass, grid_mom, initial_momentum, grid_dx),
    )

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
            if log_jdet:
                # R-M2 instrumentation (informational; NOT in the capture): the
                # j_det<=0 non-smooth stress branch is the cross-stack
                # amplification candidate over the 500-step drop-impact horizon.
                jdets = np.linalg.det(F)
                n_inv = int((jdets <= 0.0).sum())
                print(
                    f"[R-M2] step {step}: j_det min={float(jdets.min()):.6e} "
                    f"max={float(jdets.max()):.6e} n(j_det<=0)={n_inv}",
                    flush=True,
                )
            yield StepState(
                step=step,
                state={
                    "particle_pos": pos.copy().astype(np.float64),
                    "particle_vel": vel.copy().astype(np.float64),
                    "particle_material_id": material_id.copy().astype(np.int32),
                    "grid_mom": grid_mom.copy().astype(np.float64),
                },
                diagnostics=_compute_step_diagnostics(
                    pos, vel, mass, grid_mom, initial_momentum, grid_dx
                ),
            )


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
    log_jdet: bool = False,
) -> Path:
    _ensure_taichi()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t_start = time.perf_counter()
    states = _evolve_to_step_states(
        grid_n=grid_n,
        n_particles=n_particles,
        n_steps=n_steps,
        capture_interval=capture_interval,
        dt=dt,
        seed=seed,
        log_jdet=log_jdet,
    )
    manifest = _build_manifest(
        descriptor=descriptor,
        capture_dir=out_dir,
        seed=seed,
        grid_n=grid_n,
        n_particles=n_particles,
        n_steps=n_steps,
        capture_interval=capture_interval,
        dt=dt,
        tier=tier,
    )
    manifest_path = write_capture(states, manifest, out_dir)
    elapsed = time.perf_counter() - t_start
    with manifest_path.open() as fh:
        m = json.load(fh)
    m["run"]["wall_clock_seconds"] = elapsed
    with manifest_path.open("w") as fh:
        json.dump(m, fh, indent=2, sort_keys=True)
    return manifest_path


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Run the canonical drop-impact capture (128^3 x 1M particles x 500 steps).

    Descriptor ``drop-impact-128cube-seed{seed}-step500`` (seed interpolated --
    clean contract per S-M4); cadence-50 (11 frames; ~1.05 GiB). Returns the
    manifest JSON path. R-M2 j_det logging ON.
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
        log_jdet=True,
    )


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic small-grid run (16^3 x 5K particles x 50 steps).

    Used by ``test_diagnostics`` / ``test_determinism`` at a fast scale. Threads
    ``seed`` correctly into the blob sampler + descriptor (S-M4 clean contract).
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
    "sim_runner_diagnostic",
    "sim_runner_seeded",
]
