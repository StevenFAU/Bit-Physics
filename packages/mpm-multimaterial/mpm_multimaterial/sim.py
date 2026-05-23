"""SimRunner adapter — mpm-multimaterial canonical + diagnostic captures.

Determinism strategy (charter § 4.2 step 1 / conventions doc § F.1 —
load-bearing; cited in the ``mpm-multimaterial-stage1`` commit message
footer; first hybrid particle-grid sim in the project — determinism
story has concerns from BOTH lineages):

1. **Sorted-particle iteration (P24 inheritance from sub-phase-particle-
   fluids-sph-water).** Particles are initialised in a deterministic
   lex-by-(z, y, x) order and the `pos`/`vel`/`mass`/`affine_c`/`F`/
   `material_id` arrays are NEVER re-sorted across timesteps. Every
   per-particle loop in :mod:`.reference.mls_mpm` iterates over
   ``range(n_particles)`` in array order — bit-identical accumulation
   across runs.

2. **Deterministic 27-cell P2G stencil ordering.** The grid contribution
   from each particle is scattered into the 3×3×3 = 27 neighbouring
   grid cells in a fixed lexicographic order ``(di, dj, dk) ∈ (0, 1, 2)
   × (0, 1, 2) × (0, 1, 2)``. Both ``p2g`` and ``p2g_with_stress``
   use the same nested-loop order; ``g2p`` interpolates back using
   the same 27-cell order. Mitigates **R-MPM-1** (P2G stencil
   ordering mismatch between numba-jitted and Python reference;
   plan § 9 P26 cause-1).

3. **No atomic-scatter-add.** The numba ``@njit(fastmath=False,
   cache=True)`` decoration on ``p2g`` / ``p2g_with_stress`` /
   ``g2p`` / ``grid_update`` / ``deformation_update`` /
   ``compute_particle_stresses`` / ``advect_particles`` defaults to
   ``parallel=False``: a single thread accumulates into
   ``grid_mass`` and ``grid_mom`` in deterministic particle-order ×
   stencil-order. The spec ``determinism.md`` declares
   ``epsilon-same-stack-same-hw`` for Stack-D Taichi (which uses
   atomic scatter-add and breaks bit-exact even on identical
   hardware); the Stack-D Python NumPy + numba reference at this
   sub-phase OVER-ACHIEVES to bit-exact-same-stack-same-hw per
   conventions doc § F.4. Recorded informational in gate-11 commit
   footer.

4. **Matched G2P interpolation order.** ``g2p`` reads from the
   same grid cells in the same 27-cell lex order that ``p2g`` /
   ``p2g_with_stress`` write to; floating-point accumulation residual
   is bit-identical to the P2G write. Mitigates **R-MPM-1**.

5. **Lex-order grid_update over (i, j, k).** Grid-cell sweeps
   (gravity, floor BC, wall clamping) iterate ``range(grid_n)`` in
   ``i``, then ``j``, then ``k`` — fixed order; per-cell
   contributions independent of order, but the deterministic
   declaration is explicit.

6. **Multimaterial volume-fraction tracking.** Each particle carries
   a fixed ``material_id`` (0 at this sub-phase — single-material
   drop-impact per algebraic.md § 3 "Phase 2+ implementation phase
   populates the constitutive-model table; Phase 1 declares the
   surface only"). The ``material_id`` array is initialised in
   sorted-particle order at sim-init and is NEVER mutated;
   accumulation of per-material volume-fractions across the canonical
   trajectory is deterministic by construction. Mitigates **R-MPM-2**
   (multimaterial volume-fraction drift; plan § 9 P26 cause-4).

7. **Fixed quadratic-B-spline base-node convention.**
   ``base = floor(particle_pos / dx - 0.5)`` per the golden table's
   ``base_node_convention`` field at
   ``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json``;
   the convention is duplicated verbatim inside the numba-jitted
   bodies (R-MPM-3 mitigation — silent off-by-one with no NaN/Inf
   signal; plan § 9 P26 cause-2).

8. **No global RNG state.** Particle ICs use a deterministically-seeded
   :class:`numpy.random.Generator` (default seed = 42 per Appendix D
   descriptor convention); bare ``numpy.random.*`` global-state APIs
   are BANNED in :mod:`mpm_multimaterial.reference`,
   :mod:`mpm_multimaterial.sim`, and :mod:`mpm_multimaterial.invariants`
   (P22 pattern, conventions doc § F clause "RNG threaded through
   ``common_py.determinism.Config``"; here the deterministic
   :class:`numpy.random.Generator` plays the same role at Stack-D
   Python NumPy + numba reference scope).

9. **Numba ``@njit(fastmath=False, cache=True)`` discipline.** Both
   kwargs explicit per ``docs/common/numba.md`` § 2. ``fastmath=False``
   forbids LLVM associative re-ordering + FMA contraction; ``cache=True``
   keeps run-to-run determinism. Banned flags (``parallel=True``,
   ``error_model="numpy"``, ``boundscheck=False``) are NEVER applied
   — see ``docs/common/numba.md`` § 3. Cache-via-source-hash
   invalidation under mutation testing carries forward at Stage 2
   PATH-A per sub-phase-particle-fluids-sph-water Stage 2 N3
   verification — MPM is the second numba-using sim to consume the
   per-target mutation-runner.

10. **Phase-2+ deferred** (sim ``determinism.md`` ``epsilon-same-stack-
    same-hw`` declaration): Stack-D Taichi atomic-scatter-add (the
    spec-declared determinism floor) ships at spec-Phase-2+ as a
    focused infrastructure sub-phase mirroring the
    sub-phase-numba-integration precedent; driver / vendor FMA
    fusion (Stack-E Warp port and beyond). Cross-stack equivalence
    against the Python NumPy + numba reference at this sub-phase is
    bounded by the ``mpm`` category default ``relative = 1.0e-4``
    in :file:`tools/testkit/equivalence/tolerance.toml`.

Per spec § 2.5 the spec's declaration for ``mpm-multimaterial`` is
``epsilon-same-stack-same-hw`` (sim ``determinism.md``); the Stack-D
Python NumPy + numba reference at this sub-phase achieves cleanly
``bit-exact-same-stack-same-hw`` (gate 11 witnesses this via
``test_run_twice_epsilon_diff`` using ``sim_runner_diagnostic``); the
over-achievement is informational only per conventions doc § F.4.
"""

from __future__ import annotations

import sys
import time
from collections.abc import Iterable
from pathlib import Path
from typing import Final

import numpy as np

_PKG_ROOT = Path(__file__).resolve().parent.parent
_REPO_ROOT = _PKG_ROOT.parent.parent
_TESTKIT_TOOLS = _REPO_ROOT / "tools" / "testkit"
if str(_TESTKIT_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TESTKIT_TOOLS))

from capture import CaptureManifest, StepState, write_capture  # noqa: E402

from .reference import (  # noqa: E402
    CANONICAL_BLOB_CENTER,
    CANONICAL_BLOB_RADIUS,
    CANONICAL_BLOB_VELOCITY_Z,
    CANONICAL_CAPTURE_INTERVAL,
    CANONICAL_DESCRIPTOR,
    CANONICAL_DT,
    CANONICAL_FLOOR_Z_INDEX,
    CANONICAL_GRAVITY_Z,
    CANONICAL_GRID_N,
    CANONICAL_LAMBDA,
    CANONICAL_MU,
    CANONICAL_N_PARTICLES,
    CANONICAL_N_STEPS,
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
DIAGNOSTIC_DESCRIPTOR: Final[str] = "drop-impact-16cube-seed42-step50"


def _sample_blob_particles(
    n_particles: int,
    center: tuple[float, float, float],
    radius: float,
    initial_vz: float,
    seed: int,
    grid_n: int,
    grid_dx: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Deterministic blob sampler — uniform-in-sphere by rejection.

    Returns ``(pos, vel, mass, material_id)``. Particles are sampled
    in deterministic order from a seeded :class:`numpy.random.Generator`;
    the rejection-sampling loop produces a fixed sequence for a fixed
    seed (sorted-particle iteration P24 inheritance is satisfied by
    the deterministic generator advance order).
    """
    rng = np.random.default_rng(int(seed))
    # Sample uniformly in the bounding cube, reject outside the sphere.
    # Over-sample by ~2× to absorb rejection.
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
    # Clamp positions to grid interior so 3×3×3 stencil stays in bounds.
    lo = 2.0 * grid_dx
    hi = (grid_n - 2) * grid_dx
    np.clip(pos, lo, hi, out=pos)
    pos = np.ascontiguousarray(pos, dtype=np.float64)

    vel = np.zeros_like(pos)
    vel[:, 2] = float(initial_vz)
    # Single-material (algebraic.md § 3 — Phase 2+ populates the table).
    material_id = np.zeros(n_particles, dtype=np.int32)
    # Uniform particle mass; total mass = 1 (canonical normalisation).
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
    # Tier 1 — NaN/Inf health.
    health_ok = (
        np.all(np.isfinite(pos))
        and np.all(np.isfinite(vel))
        and np.all(np.isfinite(mass))
        and np.all(np.isfinite(grid_mom))
    )
    # Tier 2 IC-5 — particle count_invariance (delta vs initial count).
    # The sim doesn't add/remove particles so this is a structural witness.
    n_particles = pos.shape[0]
    # Tier 2 IC-5 — particle momentum_conservation (drift vs initial).
    # Drop-impact has gravity force injecting downward momentum; this
    # is advisory + reports the drift magnitude rather than asserting
    # conservation.
    p_total = (mass[:, None] * vel).sum(axis=0)
    abs_drift = np.abs(p_total - initial_momentum)
    max_abs_drift = float(abs_drift.max()) if abs_drift.size else 0.0
    # Tier 2 IC-6 — grid-momentum vector_field circulation surrogate.
    # We compute the L1 norm of the grid momentum as a scalar surrogate
    # for ``check_circulation`` — full circulation requires a loop
    # specification; the L1 is finite + advisory.
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
    wall_time_seconds: float,
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
            "name": "numpy-numba-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-mpm-multimaterial",
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
                "youngs_modulus": float(_E_FOR_TIER(tier)),
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
            "wall_clock_seconds": float(wall_time_seconds),
            "start_utc": "2026-05-23T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": (capture_dir / f"{descriptor}.h5").name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _E_FOR_TIER(tier: str) -> float:
    # Same elastic params across tiers; helper for manifest brevity.
    from .reference import CANONICAL_YOUNGS_MODULUS

    return CANONICAL_YOUNGS_MODULUS


def _evolve_to_step_states(
    *,
    grid_n: int,
    n_particles: int,
    n_steps: int,
    capture_interval: int,
    dt: float,
    seed: int,
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
    # Identity deformation gradient at initial state.
    for d in range(3):
        F[:, d, d] = 1.0
    stress = np.zeros((n_particles, 3, 3), dtype=np.float64)
    # Per-particle reference volume (uniform for the blob).
    blob_volume = (4.0 / 3.0) * np.pi * CANONICAL_BLOB_RADIUS**3
    volume_p = np.full(n_particles, blob_volume / n_particles, dtype=np.float64)

    grid_mass = np.zeros((grid_n, grid_n, grid_n), dtype=np.float64)
    grid_mom = np.zeros((grid_n, grid_n, grid_n, 3), dtype=np.float64)
    vel_new = np.zeros_like(vel)
    affine_c_new = np.zeros_like(affine_c)

    initial_momentum = (mass[:, None] * vel).sum(axis=0).copy()

    # Emit initial state (step 0).
    yield StepState(
        step=0,
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

    for step in range(1, n_steps + 1):
        # Stress from current F.
        compute_particle_stresses(
            F, material_id, CANONICAL_MU, CANONICAL_LAMBDA, stress
        )
        # Zero the grid.
        grid_mass.fill(0.0)
        grid_mom.fill(0.0)
        # P2G with stress + affine_c.
        p2g_with_stress(
            pos, vel, mass, affine_c, stress, volume_p, grid_mass, grid_mom, grid_dx, dt
        )
        # Grid update: gravity + sticky floor + axis-clamp walls.
        grid_update(
            grid_mass, grid_mom, CANONICAL_GRAVITY_Z, dt, CANONICAL_FLOOR_Z_INDEX
        )
        # G2P back to particle velocity + affine_c.
        g2p(pos, vel_new, affine_c_new, grid_mom, grid_mass, grid_dx)
        # Swap (lex order in-place copy keeps determinism explicit).
        vel[:] = vel_new
        affine_c[:] = affine_c_new
        # Deformation gradient update.
        deformation_update(F, affine_c, dt)
        # Advect.
        advect_particles(pos, vel, dt, grid_n, grid_dx)

        if step % capture_interval == 0 or step == n_steps:
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


def _write_canonical(
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
    t_start = time.perf_counter()
    state_iter = _evolve_to_step_states(
        grid_n=grid_n,
        n_particles=n_particles,
        n_steps=n_steps,
        capture_interval=capture_interval,
        dt=dt,
        seed=seed,
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
        wall_time_seconds=0.0,  # back-filled below
        tier=tier,
    )
    manifest_path = write_capture(state_iter, manifest, out_dir)
    elapsed = time.perf_counter() - t_start
    import json

    with manifest_path.open() as fh:
        m = json.load(fh)
    m["run"]["wall_clock_seconds"] = elapsed
    with manifest_path.open("w") as fh:
        json.dump(m, fh, indent=2, sort_keys=True)
    return manifest_path


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Run the canonical drop-impact capture and persist manifest + payload.

    Returns the path to the manifest JSON (per IC-1 / Phase 1 testkit
    Protocol). Canonical descriptor:
    ``drop-impact-128cube-seed42-step500``; ``CANONICAL_N_PARTICLES = 1M``
    particles; cadence-50 (~11 frames committed; ~1.6 GB) per
    Stage 0 Task 0.4 routing.

    Per conventions doc § F clauses 1-10 — see module docstring above.
    """
    return _write_canonical(
        descriptor=CANONICAL_DESCRIPTOR,
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
    """Diagnostic small-grid run (16³ × 5K particles × 50 steps).

    Used by ``test_diagnostics.py``, ``test_determinism.py``,
    ``test_pbt_invariants.py`` to witness the determinism + diagnostic
    contracts at a fast scale (sub-phase-eulerian-smoke / RD-3D /
    sph-water / LBM diagnostic-tier precedent).
    """
    return _write_canonical(
        descriptor=DIAGNOSTIC_DESCRIPTOR,
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
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_DT",
    "CANONICAL_GRID_N",
    "CANONICAL_N_PARTICLES",
    "CANONICAL_N_STEPS",
    "DIAGNOSTIC_DESCRIPTOR",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
]
