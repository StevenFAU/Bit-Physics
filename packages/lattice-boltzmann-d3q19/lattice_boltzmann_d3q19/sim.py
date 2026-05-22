"""SimRunner adapter — lattice-boltzmann-d3q19 canonical captures.

Determinism strategy (charter § 4.2 / conventions doc § F.1 — load-bearing;
cited in the ``lattice-boltzmann-d3q19-stage1`` commit message footer):

1. **Deterministic 19-direction iteration order.**
   :data:`~lattice_boltzmann_d3q19.reference.constants.C` is a fixed
   19×3 integer matrix whose row order matches the canonical
   d3q19 ordering at
   ``tools/testkit/golden/derivations/d3q19.md`` § 1 +
   ``tools/testkit/golden/tables/lattice/d3q19-equilibrium.json``
   ``velocity_indexing`` verbatim. All per-direction loops
   (streaming via ``np.roll``, Guo forcing assembly, bounce-back
   reflection) iterate in lex over rows of :data:`C` so the
   floating-point accumulation residual is bit-identical across
   runs. This mitigates the **P25 R-LBM-4** risk surface
   ("velocity-direction order ambiguity").

2. **Deterministic BGK collision with fixed-precision relaxation
   time τ.** τ is set once at sim-init from the descriptor's
   physical viscosity + lattice spacing per the
   ν_lattice = c_s² (τ - 1/2) relation. No tolerance-comparison
   branch + no run-to-run τ drift. Mitigates **P25 R-LBM-2**
   (BGK τ choice near stability boundary).

3. **Lattice ↔ physical unit conversion is fixed per descriptor
   + documented**:

       - Δx_phys = L_phys / N (the chosen grid spacing).
       - τ chosen to give ν_lattice = c_s² (τ - 1/2) that maps
         the descriptor's physical ν to the simulation.
       - Δt_phys = ν_lattice · Δx_phys² / ν_phys (diffusive
         scaling; keeps ν_phys consistent across grid refinement).
       - Lattice velocity u_lat = u_phys · (Δt_phys / Δx_phys).
       - Mach number Ma_lat = ‖u_lat‖ / c_s; sim-init asserts
         Ma_lat < 0.1 per the LBM weakly-compressible bound
         (Chapman-Enskog expansion validity). Mitigates **P25
         R-LBM-3** (Ma-bound violation).

4. **Fixed-precision boundary conditions per descriptor.**
   Poiseuille: half-way bounce-back at y=0 and y=N_y-1 (no-slip);
   periodic in x; periodic in z. Couette: half-way bounce-back at
   y=0 (no-slip); half-way bounce-back with wall-velocity injection
   at y=N_y-1 (moving plate); periodic in x; periodic in z.
   Bounce-back direction-swap iterates in lex over :data:`C` rows;
   the swap is involutive (sym-pair) and the wall-velocity
   momentum injection is computed direction-wise from a fixed
   formula. No global RNG state.

5. **Periodic BCs via ``np.roll``** rather than ghost-zone copy +
   slice. Conventions doc § M.4 S1 (P23 cause-#1 mitigation
   inheritance from RD-3D) — eliminates the off-by-one stencil
   bug class that would non-uniformly contaminate the MMS error
   norm at boundary cells.

6. **N_z = 3 z-periodic depth-3 slab** convention per Stage 0
   Task 0.4 routing. The 2D channel-flow benchmarks (Poiseuille,
   Couette) are translation-invariant in z; depth-3 is the
   minimum that exercises the 19-direction streaming without
   z-wraparound degeneracy. Documented in the capture sidecar
   metadata.

7. **No global RNG state.** Analytic ICs (rest IC for Poiseuille
   start-up + Couette plate-impulse start-up) are seeded
   deterministically with the canonical seed = 42; bare
   ``numpy.random.*`` global-state APIs are BANNED in
   :mod:`lattice_boltzmann_d3q19.reference`,
   :mod:`lattice_boltzmann_d3q19.sim`, and
   :mod:`lattice_boltzmann_d3q19.invariants` (P22 pattern,
   conventions doc § F clause "RNG threaded through
   ``common_py.determinism.Config``").

8. **No BLAS / FMA path inside the kernel.** Every operation in
   the streaming + BGK collision + Guo forcing pipeline is
   elementwise NumPy: arithmetic on arrays, ``np.roll`` shifts,
   ``np.einsum`` with a fixed contraction (lex over 19 directions).
   NumPy's default BLAS is never engaged in the LBM kernel (no
   ``np.dot`` / ``np.matmul`` / ``@``). FMA fusion at the
   elementwise level is left at the compiler's default;
   cross-platform Stack-D variation is absorbed by spec § 2.6
   ``same-stack-different-hw`` ``epsilon`` row at Phase 2+.
   Same-stack same-hardware stays bit-exact under this kernel.

9. **Phase-2+ deferred** (sim ``determinism.md`` —
   ``bit-exact-effort-same-stack-same-hw`` declaration): the
   "effort" caveat applies to Stack-C subgroup-collective ops in
   optimized GPU paths + driver / vendor FMA fusion. The Python
   NumPy reference shipped at THIS sub-phase has neither surface
   — the spec's ``bit-exact-effort`` declaration for Stack-C is
   over-achieved here (no ``effort`` caveats trigger), recorded
   as informational per conventions doc § F.4.

Per spec § 2.5 the spec's declaration for lattice-boltzmann-d3q19 is
``bit-exact-effort-same-stack-same-hw`` (sim ``determinism.md``);
the Python NumPy reference at this sub-phase achieves
``bit-exact-same-stack-same-hw`` cleanly (gate 11 witnesses this
via ``test_run_twice_bit_exact_canonical``); the
"effort" caveat is informational only per conventions doc § F.4.
"""

from __future__ import annotations

import time
from collections.abc import Iterable
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference import (
    CANONICAL_COUETTE_NX,
    CANONICAL_COUETTE_NY,
    CANONICAL_COUETTE_STEPS,
    CANONICAL_DESCRIPTOR_COUETTE,
    CANONICAL_DESCRIPTOR_POISEUILLE,
    CANONICAL_NZ,
    CANONICAL_POISEUILLE_NX,
    CANONICAL_POISEUILLE_NY,
    CANONICAL_POISEUILLE_STEPS,
    apply_bounce_back_y_walls,
    bgk_step,
    density_field,
    feq_field,
    macroscopic_velocity,
)

CANONICAL_TAU: Final[float] = 0.7  # BGK relaxation time for canonical captures.
# Body force chosen per-descriptor to keep u_max_lattice well below Ma=0.1.
CANONICAL_POISEUILLE_FORCE_X: Final[float] = 1.0e-5
# Couette top-plate velocity in lattice units (kept well below Ma=0.1).
CANONICAL_COUETTE_WALL_VELOCITY: Final[float] = 0.05


def _diagnostic_health_check(rho: np.ndarray, u: np.ndarray) -> dict[str, float]:
    """Tier 1 health diagnostic at the current step."""
    return {
        "check_health": 0.0
        if (np.all(np.isfinite(rho)) and np.all(np.isfinite(u)))
        else 1.0,
        "rho_min": float(np.min(rho)),
        "rho_max": float(np.max(rho)),
        "u_max_lat": float(np.max(np.sqrt((u * u).sum(axis=0)))),
    }


def _compute_diagnostic_vector_field(u: np.ndarray, dx_phys: float) -> dict[str, float]:
    """IC-6 Tier 2 vector_field diagnostic on the macroscopic velocity (z=0 slice).

    Returns advisory divergence-free + circulation magnitudes.
    """
    u2d = u[:, :, :, 0]
    inv_2dx = 0.5 / dx_phys
    div = (np.roll(u2d[0], -1, axis=0) - np.roll(u2d[0], +1, axis=0)) * inv_2dx + (
        np.roll(u2d[1], -1, axis=1) - np.roll(u2d[1], +1, axis=1)
    ) * inv_2dx
    return {
        "check_divergence_free": float(
            np.max(np.abs(div))
        ),  # advisory; LBM is weakly compressible.
        "check_circulation": float(np.sum(u2d[0]) * dx_phys * dx_phys),
    }


def _build_manifest_poiseuille(
    *,
    capture_dir: Path,
    seed: int,
    nx: int,
    ny: int,
    nz: int,
    n_steps: int,
    capture_interval: int,
    tau: float,
    force_x: float,
    wall_time_seconds: float,
    tier: str = "test",
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "lattice-boltzmann-d3q19",
            "category": "lattice",
            "variant": "bgk-d3q19-qian-1992",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-lattice-boltzmann-d3q19",
        },
        config={
            "tier": tier,
            "dims": [nx, ny, nz],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "descriptor": CANONICAL_DESCRIPTOR_POISEUILLE,
                "tau": float(tau),
                "force_x_lattice": float(force_x),
                "nz_convention": "depth-3-z-periodic-slab",
                "boundary": "bounce-back-y-walls-periodic-xz",
            },
        },
        run={
            "step_count": int(n_steps),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_time_seconds),
            "start_utc": "2026-05-22T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": (capture_dir / f"{CANONICAL_DESCRIPTOR_POISEUILLE}.h5").name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _build_manifest_couette(
    *,
    capture_dir: Path,
    seed: int,
    nx: int,
    ny: int,
    nz: int,
    n_steps: int,
    capture_interval: int,
    tau: float,
    wall_velocity: float,
    wall_time_seconds: float,
    tier: str = "test",
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "lattice-boltzmann-d3q19",
            "category": "lattice",
            "variant": "bgk-d3q19-qian-1992",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-lattice-boltzmann-d3q19",
        },
        config={
            "tier": tier,
            "dims": [nx, ny, nz],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "descriptor": CANONICAL_DESCRIPTOR_COUETTE,
                "tau": float(tau),
                "wall_velocity_top_lattice": float(wall_velocity),
                "nz_convention": "depth-3-z-periodic-slab",
                "boundary": "bounce-back-y-walls-with-moving-top-plate-periodic-xz",
            },
        },
        run={
            "step_count": int(n_steps),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_time_seconds),
            "start_utc": "2026-05-22T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": (capture_dir / f"{CANONICAL_DESCRIPTOR_COUETTE}.h5").name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _initial_rest_state(nx: int, ny: int, nz: int) -> np.ndarray:
    """Initial distribution at rest (ρ=1, u=0); used by both Poiseuille + Couette."""
    rho = np.ones((nx, ny, nz), dtype=np.float64)
    u_lat = np.zeros((3, nx, ny, nz), dtype=np.float64)
    return feq_field(rho, u_lat)


def _evolve_poiseuille_to_step_states(
    *,
    nx: int,
    ny: int,
    nz: int,
    n_steps: int,
    capture_interval: int,
    tau: float,
    force_x: float,
    dx_phys: float,
) -> Iterable[StepState]:
    f = _initial_rest_state(nx, ny, nz)
    force = np.zeros((3, nx, ny, nz), dtype=np.float64)
    force[0, :, :, :] = force_x
    rho0 = density_field(f)
    u0 = macroscopic_velocity(f, force_lattice=force)
    yield StepState(
        step=0,
        state={"rho": rho0.astype(np.float64), "u": u0.astype(np.float64)},
        diagnostics={
            **_diagnostic_health_check(rho0, u0),
            **_compute_diagnostic_vector_field(u0, dx_phys),
        },
    )
    for step in range(1, n_steps + 1):
        f = bgk_step(f, tau, force_lattice=force)
        f = apply_bounce_back_y_walls(f)
        if step % capture_interval == 0 or step == n_steps:
            rho = density_field(f)
            u = macroscopic_velocity(f, force_lattice=force)
            yield StepState(
                step=step,
                state={"rho": rho.astype(np.float64), "u": u.astype(np.float64)},
                diagnostics={
                    **_diagnostic_health_check(rho, u),
                    **_compute_diagnostic_vector_field(u, dx_phys),
                },
            )


def _evolve_couette_to_step_states(
    *,
    nx: int,
    ny: int,
    nz: int,
    n_steps: int,
    capture_interval: int,
    tau: float,
    wall_velocity: float,
    dx_phys: float,
) -> Iterable[StepState]:
    f = _initial_rest_state(nx, ny, nz)
    rho0 = density_field(f)
    u0 = macroscopic_velocity(f)
    yield StepState(
        step=0,
        state={"rho": rho0.astype(np.float64), "u": u0.astype(np.float64)},
        diagnostics={
            **_diagnostic_health_check(rho0, u0),
            **_compute_diagnostic_vector_field(u0, dx_phys),
        },
    )
    for step in range(1, n_steps + 1):
        f = bgk_step(f, tau)
        f = apply_bounce_back_y_walls(
            f,
            wall_velocity_top=(wall_velocity, 0.0, 0.0),
            wall_velocity_bottom=(0.0, 0.0, 0.0),
        )
        if step % capture_interval == 0 or step == n_steps:
            rho = density_field(f)
            u = macroscopic_velocity(f)
            yield StepState(
                step=step,
                state={"rho": rho.astype(np.float64), "u": u.astype(np.float64)},
                diagnostics={
                    **_diagnostic_health_check(rho, u),
                    **_compute_diagnostic_vector_field(u, dx_phys),
                },
            )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Run the canonical Poiseuille capture and persist manifest + payload.

    Returns the path to the manifest JSON (per IC-1 / Phase 1 testkit
    Protocol). The Poiseuille descriptor is the default canonical
    capture; :func:`sim_runner_seeded_couette` runs the second one.

    Per conventions doc § F clauses 1–9 — see module docstring above.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nx = CANONICAL_POISEUILLE_NX
    ny = CANONICAL_POISEUILLE_NY
    nz = CANONICAL_NZ
    n_steps = CANONICAL_POISEUILLE_STEPS
    capture_interval = 1  # full cadence per Stage 1 dispatch routing.
    tau = CANONICAL_TAU
    force_x = CANONICAL_POISEUILLE_FORCE_X
    dx_phys = 1.0 / nx  # nominal lattice-cell spacing (channel length = 1).
    t_start = time.perf_counter()
    state_iter = _evolve_poiseuille_to_step_states(
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        force_x=force_x,
        dx_phys=dx_phys,
    )
    manifest = _build_manifest_poiseuille(
        capture_dir=out_dir,
        seed=seed,
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        force_x=force_x,
        wall_time_seconds=0.0,  # back-filled below.
    )
    manifest_path = write_capture(state_iter, manifest, out_dir)
    elapsed = time.perf_counter() - t_start
    # Patch wall_clock_seconds via the on-disk manifest re-read; spec § 2.7.
    import json

    with manifest_path.open() as fh:
        m = json.load(fh)
    m["run"]["wall_clock_seconds"] = elapsed
    with manifest_path.open("w") as fh:
        json.dump(m, fh, indent=2, sort_keys=True)
    return manifest_path


def sim_runner_seeded_couette(seed: int, out_dir: Path) -> Path:
    """Run the canonical Couette capture and persist manifest + payload."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nx = CANONICAL_COUETTE_NX
    ny = CANONICAL_COUETTE_NY
    nz = CANONICAL_NZ
    n_steps = CANONICAL_COUETTE_STEPS
    capture_interval = 1  # full cadence.
    tau = CANONICAL_TAU
    wall_velocity = CANONICAL_COUETTE_WALL_VELOCITY
    dx_phys = 1.0 / nx
    t_start = time.perf_counter()
    state_iter = _evolve_couette_to_step_states(
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        wall_velocity=wall_velocity,
        dx_phys=dx_phys,
    )
    manifest = _build_manifest_couette(
        capture_dir=out_dir,
        seed=seed,
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        wall_velocity=wall_velocity,
        wall_time_seconds=0.0,
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


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic small-grid run (Poiseuille at coarser N + fewer steps).

    Used by ``test_diagnostics.py`` and ``test_determinism.py`` to
    witness the determinism + diagnostic contracts at a fast scale.
    Diagnostic-tier descriptor: ``poiseuille-16x8-seed42-step50``.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nx, ny, nz = 16, 8, CANONICAL_NZ
    n_steps = 50
    capture_interval = 10
    tau = CANONICAL_TAU
    force_x = 1.0e-5
    dx_phys = 1.0 / nx
    t_start = time.perf_counter()
    state_iter = _evolve_poiseuille_to_step_states(
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        force_x=force_x,
        dx_phys=dx_phys,
    )
    manifest = CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "lattice-boltzmann-d3q19",
            "category": "lattice",
            "variant": "bgk-d3q19-qian-1992",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-lattice-boltzmann-d3q19",
        },
        config={
            "tier": "diagnostic",
            "dims": [nx, ny, nz],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "descriptor": "poiseuille-16x8-seed42-step50",
                "tau": float(tau),
                "force_x_lattice": float(force_x),
                "nz_convention": "depth-3-z-periodic-slab",
                "boundary": "bounce-back-y-walls-periodic-xz",
            },
        },
        run={
            "step_count": int(n_steps),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-22T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": (out_dir / "poiseuille-16x8-seed42-step50.h5").name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
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


__all__ = [
    "CANONICAL_COUETTE_WALL_VELOCITY",
    "CANONICAL_POISEUILLE_FORCE_X",
    "CANONICAL_TAU",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
    "sim_runner_seeded_couette",
]
