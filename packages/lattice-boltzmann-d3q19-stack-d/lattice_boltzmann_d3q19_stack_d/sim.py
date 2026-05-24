"""SimRunner adapter -- lattice-boltzmann-d3q19 Stack-D canonical captures.

DETERMINISM STRATEGY (charter section 1.4.1 / conventions doc section F.1 --
load-bearing; cited in the stage1b commit footer):

1. **Deterministic in-kernel 19-term moment reductions.** Every per-cell
   collision-moment reduction (rho = sum f_i; rho*u = sum c_i f_i) iterates in
   fixed ``ti.static(range(19))`` lex order over the canonical D3Q19 velocity
   set ``C`` (R-LBM-4: order matches the Phase-1 reference + the golden table's
   velocity_indexing verbatim). ``cpu_max_num_threads=1`` (from
   ``set_taichi_deterministic``) serialises the ``ti.ndrange`` cell loops, so
   the floating-point accumulation residual is bit-identical across runs.

2. **f64 accumulator seeds (Stage-0 banked, LOAD-BEARING).**
   ``set_taichi_deterministic`` pins arch + threads + seed + offline_cache but
   NOT ``default_fp=ti.f64``; a bare ``0.0`` kernel local infers f32 and leaked
   3.4e-6 in the 19-term reduction at the Stage-0 derisk. Every in-kernel
   reduction accumulator in ``reference.d3q19_taichi`` is seeded explicitly as
   ``ti.f64(0.0)`` (operands read from f64 ``ti.types.ndarray`` views), restoring
   7e-15. LBM is the first cross-stack port with genuine in-kernel f64 reductions
   (D9: collision-step FP-accumulation is THE cross-stack-non-trivial surface).

3. **Integer-offset streaming is bit-exact.** Streaming is a pure periodic index
   gather (no FP arithmetic); Stage-0 verified ``np.array_equal`` vs the
   ``np.roll`` oracle (``max_abs=0.0``). NOT a cross-stack-sensitive surface.

4. **Fixed-precision BGK + Guo forcing.** tau is set once per descriptor from the
   lattice viscosity relation ``nu_lat = c_s^2 (tau - 1/2)``; the Guo-2002
   half-step velocity shift + body-force term are computed direction-wise in lex
   order. No tolerance-comparison branch, no run-to-run tau drift.

5. **Fixed-precision boundary conditions.** Poiseuille: half-way bounce-back at
   y=0 and y=Ny-1 (no-slip), periodic x + z. Couette: bounce-back at y=0 (no-slip)
   + moving-top-plate momentum injection at y=Ny-1, periodic x + z. Bounce-back is
   value reflection + a linear injection formula (no reduction; pure NumPy), lex
   over ``C`` rows; identical math to the Phase-1 reference (cross-stack parity).

6. **N_z = 3 z-periodic depth-3 slab** (Phase-1 Stage-0 Task 0.4 routing). The 2D
   channel benchmarks are translation-invariant in z; depth-3 is the minimum that
   exercises 19-direction streaming without z-wraparound degeneracy.

7. **NO RNG.** The ICs are analytic (Poiseuille + Couette rest-state, rho=1,
   u=0); ``numpy.random.*`` global-state APIs are BANNED in this package. The
   ``seed`` parameter on the runners is recorded in the manifest for Protocol
   conformance but is COSMETIC (no determinism value -- D7 STAY BANKED disposition
   + S6 analytic-IC framing): two runs at any seed produce identical captures.

8. **Same-stack determinism posture: ``bit-exact-same-hw``** at arch="cpu". No
   ``ti.atomic_add`` / subgroup-collective / parallel-reduction surfaces in the
   serialised single-thread kernels (gate-11 ``test_run_twice_bit_exact_diagnostic``
   witnesses this).

9. **Phase-2+ deferred:** GPU-arch determinism; cross-platform FMA fusion;
   subgroup-collective ops. Out of scope at this Stack-D CPU sub-phase.
"""

import json
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
from .reference.d3q19_taichi import _ensure_taichi

CANONICAL_TAU: Final[float] = 0.7  # BGK relaxation time for canonical captures.
CANONICAL_POISEUILLE_FORCE_X: Final[float] = 1.0e-5  # body force (keeps Ma << 0.1).
CANONICAL_COUETTE_WALL_VELOCITY: Final[float] = 0.05  # top-plate lattice velocity.


def _diagnostic_health_check(rho: np.ndarray, u: np.ndarray) -> dict[str, float]:
    """Tier 1 health diagnostic at the current step."""
    return {
        "check_health": 0.0 if (np.all(np.isfinite(rho)) and np.all(np.isfinite(u))) else 1.0,
        "rho_min": float(np.min(rho)),
        "rho_max": float(np.max(rho)),
        "u_max_lat": float(np.max(np.sqrt((u * u).sum(axis=0)))),
    }


def _compute_diagnostic_vector_field(u: np.ndarray, dx_phys: float) -> dict[str, float]:
    """IC-6 Tier 2 vector_field diagnostic on the macroscopic velocity (z=0 slice)."""
    u2d = u[:, :, :, 0]
    inv_2dx = 0.5 / dx_phys
    div = (np.roll(u2d[0], -1, axis=0) - np.roll(u2d[0], +1, axis=0)) * inv_2dx + (
        np.roll(u2d[1], -1, axis=1) - np.roll(u2d[1], +1, axis=1)
    ) * inv_2dx
    return {
        "check_divergence_free": float(np.max(np.abs(div))),  # advisory; weakly compressible.
        "check_circulation": float(np.sum(u2d[0]) * dx_phys * dx_phys),
    }


def _manifest_poiseuille(
    *,
    out_dir: Path,
    seed: int,
    nx: int,
    ny: int,
    nz: int,
    n_steps: int,
    capture_interval: int,
    tau: float,
    force_x: float,
    tier: str,
    descriptor: str,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "lattice-boltzmann-d3q19",
            "category": "lattice",
            "variant": "bgk-d3q19-qian-1992",
        },
        stack={
            "name": "taichi-stack-d",
            "version": "0.0.1",
            "build_id": "sub-phase-lattice-boltzmann-d3q19-stack-d",
        },
        config={
            "tier": tier,
            "dims": [nx, ny, nz],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "descriptor": descriptor,
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
            "start_utc": "2026-05-24T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": (out_dir / f"{descriptor}.h5").name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    )


def _manifest_couette(
    *,
    out_dir: Path,
    seed: int,
    nx: int,
    ny: int,
    nz: int,
    n_steps: int,
    capture_interval: int,
    tau: float,
    wall_velocity: float,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "lattice-boltzmann-d3q19",
            "category": "lattice",
            "variant": "bgk-d3q19-qian-1992",
        },
        stack={
            "name": "taichi-stack-d",
            "version": "0.0.1",
            "build_id": "sub-phase-lattice-boltzmann-d3q19-stack-d",
        },
        config={
            "tier": "test",
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
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-24T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": (out_dir / f"{CANONICAL_DESCRIPTOR_COUETTE}.h5").name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    )


def _initial_rest_state(nx: int, ny: int, nz: int) -> np.ndarray:
    """Initial distribution at rest (rho=1, u=0); analytic IC (no RNG)."""
    rho = np.ones((nx, ny, nz), dtype=np.float64)
    u_lat = np.zeros((3, nx, ny, nz), dtype=np.float64)
    return feq_field(rho, u_lat)


def _evolve_poiseuille(
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
        state={"rho": rho0, "u": u0},
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
                state={"rho": rho, "u": u},
                diagnostics={
                    **_diagnostic_health_check(rho, u),
                    **_compute_diagnostic_vector_field(u, dx_phys),
                },
            )


def _evolve_couette(
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
        state={"rho": rho0, "u": u0},
        diagnostics={
            **_diagnostic_health_check(rho0, u0),
            **_compute_diagnostic_vector_field(u0, dx_phys),
        },
    )
    for step in range(1, n_steps + 1):
        f = bgk_step(f, tau)
        f = apply_bounce_back_y_walls(
            f, wall_velocity_top=(wall_velocity, 0.0, 0.0), wall_velocity_bottom=(0.0, 0.0, 0.0)
        )
        if step % capture_interval == 0 or step == n_steps:
            rho = density_field(f)
            u = macroscopic_velocity(f)
            yield StepState(
                step=step,
                state={"rho": rho, "u": u},
                diagnostics={
                    **_diagnostic_health_check(rho, u),
                    **_compute_diagnostic_vector_field(u, dx_phys),
                },
            )


def _patch_wall_clock(manifest_path: Path, elapsed: float) -> None:
    """Re-read the on-disk manifest + patch wall_clock_seconds (spec section 2.7)."""
    with manifest_path.open() as fh:
        m = json.load(fh)
    m["run"]["wall_clock_seconds"] = elapsed
    with manifest_path.open("w") as fh:
        json.dump(m, fh, indent=2, sort_keys=True)


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Run the canonical Poiseuille capture (64x32x3 x 1000) + persist manifest.

    The default canonical capture; ``seed`` is recorded but COSMETIC (analytic
    rest-state IC, no RNG -- clause 7). Returns the manifest JSON path.
    """
    _ensure_taichi()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nx, ny, nz = CANONICAL_POISEUILLE_NX, CANONICAL_POISEUILLE_NY, CANONICAL_NZ
    n_steps = CANONICAL_POISEUILLE_STEPS
    capture_interval = 1  # full cadence (D4).
    tau = CANONICAL_TAU
    force_x = CANONICAL_POISEUILLE_FORCE_X
    dx_phys = 1.0 / nx
    t_start = time.perf_counter()
    states = _evolve_poiseuille(
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        force_x=force_x,
        dx_phys=dx_phys,
    )
    manifest = _manifest_poiseuille(
        out_dir=out_dir,
        seed=seed,
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        force_x=force_x,
        tier="test",
        descriptor=CANONICAL_DESCRIPTOR_POISEUILLE,
    )
    manifest_path = write_capture(states, manifest, out_dir)
    _patch_wall_clock(manifest_path, time.perf_counter() - t_start)
    return manifest_path


def sim_runner_seeded_couette(seed: int, out_dir: Path) -> Path:
    """Run the canonical Couette capture (32x16x3 x 500, moving top-plate).

    SECOND seeded runner (D4 dual-capture); ``seed`` is COSMETIC (clause 7).
    """
    _ensure_taichi()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nx, ny, nz = CANONICAL_COUETTE_NX, CANONICAL_COUETTE_NY, CANONICAL_NZ
    n_steps = CANONICAL_COUETTE_STEPS
    capture_interval = 1  # full cadence (D4).
    tau = CANONICAL_TAU
    wall_velocity = CANONICAL_COUETTE_WALL_VELOCITY
    dx_phys = 1.0 / nx
    t_start = time.perf_counter()
    states = _evolve_couette(
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        wall_velocity=wall_velocity,
        dx_phys=dx_phys,
    )
    manifest = _manifest_couette(
        out_dir=out_dir,
        seed=seed,
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        wall_velocity=wall_velocity,
    )
    manifest_path = write_capture(states, manifest, out_dir)
    _patch_wall_clock(manifest_path, time.perf_counter() - t_start)
    return manifest_path


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic small-grid Poiseuille run (16x8x3 x 50).

    Used by ``test_diagnostics`` + ``test_determinism`` at a fast scale. Per the
    D7 STAY BANKED disposition the ``seed`` parameter is COSMETIC (analytic IC, no
    RNG); the function exists for SimRunner-Protocol + portfolio-pattern
    consistency. Two runs at the same seed are content-equivalent (clause 8).
    """
    _ensure_taichi()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nx, ny, nz = 16, 8, CANONICAL_NZ
    n_steps = 50
    capture_interval = 10
    tau = CANONICAL_TAU
    force_x = CANONICAL_POISEUILLE_FORCE_X
    dx_phys = 1.0 / nx
    t_start = time.perf_counter()
    states = _evolve_poiseuille(
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        force_x=force_x,
        dx_phys=dx_phys,
    )
    manifest = _manifest_poiseuille(
        out_dir=out_dir,
        seed=seed,
        nx=nx,
        ny=ny,
        nz=nz,
        n_steps=n_steps,
        capture_interval=capture_interval,
        tau=tau,
        force_x=force_x,
        tier="diagnostic",
        descriptor="poiseuille-16x8-seed42-step50",
    )
    manifest_path = write_capture(states, manifest, out_dir)
    _patch_wall_clock(manifest_path, time.perf_counter() - t_start)
    return manifest_path


__all__ = [
    "CANONICAL_COUETTE_WALL_VELOCITY",
    "CANONICAL_POISEUILLE_FORCE_X",
    "CANONICAL_TAU",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
    "sim_runner_seeded_couette",
]
