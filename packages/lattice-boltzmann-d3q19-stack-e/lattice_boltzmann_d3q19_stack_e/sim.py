"""SimRunner adapter -- lattice-boltzmann-d3q19 Stack-E canonical captures (Warp).

Determinism strategy (charter section 4 / conventions doc section F; load-bearing;
the D9 ``bit-exact-same-hw`` contract + the cross-stack BIT-EXACT (shape (a))
gate-14 verdict both rest on it):

1. **Deterministic 19-direction lex order.** Every per-direction loop (moment
   reductions, feq polynomial, Guo forcing, streaming gather) iterates a fixed
   ``for d in range(19)`` over the canonical ``C`` ordering (matching the golden
   table velocity_indexing verbatim; R-LBM-4). Warp's CPU ``wp.launch`` is
   single-threaded serial over the launch dimension, so the floating-point
   accumulation residual is bit-identical run-to-run.

2. **f64 throughout (D8/D15; R-LBME2).** The distribution is an own
   ``wp.array(dtype=wp.float64, ndim=4)``; every in-kernel reduction accumulator is
   seeded ``wp.float64(0.0)`` and every pure-literal is ``wp.float64(...)`` (Warp
   infers f32 for bare literals -- the f32 downcast would destroy the 1e-5 gate-14
   budget). The c_s^2-derived constants are precomputed host-side with the EXACT
   Phase-1 expressions and passed as f64 kernel scalars, so the in-kernel
   equilibrium reproduces the NumPy reference ``feq_field`` byte-for-byte
   (Stage-0 Task 0.2 MEASURED max_abs_err=0.0; shape (a) bit-exact).

3. **No atomic scatter (D9; R-LBME5 N/A).** Streaming is a per-cell positive-mod
   index gather (no ``wp.atomic_add``, no shared-node contention). Determinism is
   structurally trivial -- ``determinism.atomic_ops=False``.

4. **No RNG.** The Poiseuille / Couette ICs are analytic rest states (rho=1, u=0);
   ``set_warp_deterministic(seed)`` pins the seed but the kernels consume no
   ``wp.rand`` surface (seed is cosmetic; D7 + S6).

5. **common-warp socket-only (D7).** ``common_warp.init("cpu")`` +
   ``set_warp_deterministic`` + ``deterministic_context`` + ``Capture`` /
   ``write_capture`` (f64-preserving). NOT Particles/Grids/HashGrid (f32-pinned
   single-component; cannot hold the 19-component f64 lattice).

6. **N_z = 3 z-periodic depth-3 slab** (Phase-1 Stage 0 Task 0.4); periodic in x,z;
   half-way bounce-back at the y-walls (Poiseuille: both no-slip; Couette: bottom
   no-slip + top moving plate). Bounce-back is value-reflection + a linear
   moving-wall momentum injection -- pure NumPy, identical math to the reference.

7. **Lattice <-> physical units fixed per descriptor.** tau=0.7 (set once); the
   Poiseuille body force + Couette wall velocity are kept well below Ma=0.1
   (weakly-compressible bound; R-LBM-3). The evolution mirrors the Phase-1 NumPy
   reference step-for-step so the cross-stack capture is bit-identical (gate-14).
"""

from __future__ import annotations

import time
from collections.abc import Iterable
from pathlib import Path
from typing import Final

import common_warp
import numpy as np
from common_warp.capture.model import diagnostics_key, state_key
from common_warp.warp_harness import deterministic_context, set_warp_deterministic

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
CANONICAL_POISEUILLE_FORCE_X: Final[float] = 1.0e-5
CANONICAL_COUETTE_WALL_VELOCITY: Final[float] = 0.05

_STACK: Final[dict[str, str]] = {
    "name": "warp-stack-e",
    "version": "0.0.1",
    "build_id": "sub-phase-lattice-boltzmann-d3q19-stack-e",
}

_Frame = tuple[int, dict[str, np.ndarray], dict[str, float]]


def _diagnostic_health_check(rho: np.ndarray, u: np.ndarray) -> dict[str, float]:
    """Tier 1 health diagnostic at the current step (verbatim Phase-1)."""
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


def _initial_rest_state(nx: int, ny: int, nz: int) -> np.ndarray:
    """Initial distribution at rest (rho=1, u=0); used by Poiseuille + Couette."""
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
) -> Iterable[_Frame]:
    f = _initial_rest_state(nx, ny, nz)
    force = np.zeros((3, nx, ny, nz), dtype=np.float64)
    force[0, :, :, :] = force_x
    rho0 = density_field(f)
    u0 = macroscopic_velocity(f, force_lattice=force)
    yield (
        0,
        {"rho": rho0.astype(np.float64), "u": u0.astype(np.float64)},
        {**_diagnostic_health_check(rho0, u0), **_compute_diagnostic_vector_field(u0, dx_phys)},
    )
    for step in range(1, n_steps + 1):
        f = bgk_step(f, tau, force_lattice=force)
        f = apply_bounce_back_y_walls(f)
        if step % capture_interval == 0 or step == n_steps:
            rho = density_field(f)
            u = macroscopic_velocity(f, force_lattice=force)
            yield (
                step,
                {"rho": rho.astype(np.float64), "u": u.astype(np.float64)},
                {
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
) -> Iterable[_Frame]:
    f = _initial_rest_state(nx, ny, nz)
    rho0 = density_field(f)
    u0 = macroscopic_velocity(f)
    yield (
        0,
        {"rho": rho0.astype(np.float64), "u": u0.astype(np.float64)},
        {**_diagnostic_health_check(rho0, u0), **_compute_diagnostic_vector_field(u0, dx_phys)},
    )
    for step in range(1, n_steps + 1):
        f = bgk_step(f, tau)
        f = apply_bounce_back_y_walls(
            f, wall_velocity_top=(wall_velocity, 0.0, 0.0), wall_velocity_bottom=(0.0, 0.0, 0.0)
        )
        if step % capture_interval == 0 or step == n_steps:
            rho = density_field(f)
            u = macroscopic_velocity(f)
            yield (
                step,
                {"rho": rho.astype(np.float64), "u": u.astype(np.float64)},
                {
                    **_diagnostic_health_check(rho, u),
                    **_compute_diagnostic_vector_field(u, dx_phys),
                },
            )


def _build_manifest(
    *,
    descriptor: str,
    tier: str,
    nx: int,
    ny: int,
    nz: int,
    seed: int,
    n_steps: int,
    capture_interval: int,
    wall_clock_seconds: float,
    params: dict[str, object],
) -> dict[str, object]:
    return {
        "schema_version": "1.0.0",
        "sim": {
            "name": "lattice-boltzmann-d3q19",
            "category": "lattice",
            "variant": "bgk-d3q19-qian-1992",
        },
        "stack": dict(_STACK),
        "config": {
            "tier": tier,
            "dims": [nx, ny, nz],
            "dtype": "f64",
            "seed": int(seed),
            "params": params,
        },
        "run": {
            "step_count": int(n_steps),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-25T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }


def _write_capture_from_frames(
    *,
    descriptor: str,
    manifest: dict[str, object],
    frames: Iterable[_Frame],
    out_dir: Path,
) -> Path:
    payload: dict[str, np.ndarray] = {}
    for step, state, diagnostics in frames:
        for name, arr in state.items():
            payload[state_key(step, name)] = arr
        for check, val in diagnostics.items():
            payload[diagnostics_key(step, check)] = np.float64(val)
    capture = common_warp.Capture(manifest=manifest, payload=payload)
    common_warp.write_capture(capture, out_dir / descriptor)
    return out_dir / f"{descriptor}.json"


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner -- the canonical Poiseuille Stack-E capture (64x32x3 x 1000, cadence-1)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    common_warp.init("cpu")
    set_warp_deterministic(int(seed), device="cpu")
    nx, ny, nz = CANONICAL_POISEUILLE_NX, CANONICAL_POISEUILLE_NY, CANONICAL_NZ
    n_steps = CANONICAL_POISEUILLE_STEPS
    capture_interval = 1
    tau = CANONICAL_TAU
    force_x = CANONICAL_POISEUILLE_FORCE_X
    dx_phys = 1.0 / nx
    t0 = time.perf_counter()
    with deterministic_context():
        frames = list(
            _evolve_poiseuille(
                nx=nx,
                ny=ny,
                nz=nz,
                n_steps=n_steps,
                capture_interval=capture_interval,
                tau=tau,
                force_x=force_x,
                dx_phys=dx_phys,
            )
        )
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=CANONICAL_DESCRIPTOR_POISEUILLE,
        tier="test",
        nx=nx,
        ny=ny,
        nz=nz,
        seed=seed,
        n_steps=n_steps,
        capture_interval=capture_interval,
        wall_clock_seconds=wall,
        params={
            "descriptor": CANONICAL_DESCRIPTOR_POISEUILLE,
            "tau": float(tau),
            "force_x_lattice": float(force_x),
            "nz_convention": "depth-3-z-periodic-slab",
            "boundary": "bounce-back-y-walls-periodic-xz",
        },
    )
    return _write_capture_from_frames(
        descriptor=CANONICAL_DESCRIPTOR_POISEUILLE,
        manifest=manifest,
        frames=frames,
        out_dir=out_dir,
    )


def sim_runner_seeded_couette(seed: int, out_dir: Path) -> Path:
    """SimRunner -- the canonical Couette Stack-E capture (32x16x3 x 500, cadence-1)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    common_warp.init("cpu")
    set_warp_deterministic(int(seed), device="cpu")
    nx, ny, nz = CANONICAL_COUETTE_NX, CANONICAL_COUETTE_NY, CANONICAL_NZ
    n_steps = CANONICAL_COUETTE_STEPS
    capture_interval = 1
    tau = CANONICAL_TAU
    wall_velocity = CANONICAL_COUETTE_WALL_VELOCITY
    dx_phys = 1.0 / nx
    t0 = time.perf_counter()
    with deterministic_context():
        frames = list(
            _evolve_couette(
                nx=nx,
                ny=ny,
                nz=nz,
                n_steps=n_steps,
                capture_interval=capture_interval,
                tau=tau,
                wall_velocity=wall_velocity,
                dx_phys=dx_phys,
            )
        )
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=CANONICAL_DESCRIPTOR_COUETTE,
        tier="test",
        nx=nx,
        ny=ny,
        nz=nz,
        seed=seed,
        n_steps=n_steps,
        capture_interval=capture_interval,
        wall_clock_seconds=wall,
        params={
            "descriptor": CANONICAL_DESCRIPTOR_COUETTE,
            "tau": float(tau),
            "wall_velocity_top_lattice": float(wall_velocity),
            "nz_convention": "depth-3-z-periodic-slab",
            "boundary": "bounce-back-y-walls-with-moving-top-plate-periodic-xz",
        },
    )
    return _write_capture_from_frames(
        descriptor=CANONICAL_DESCRIPTOR_COUETTE, manifest=manifest, frames=frames, out_dir=out_dir
    )


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic small-grid Poiseuille run (16x8x3 x 50, cadence-10) for gate-10 cost."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    common_warp.init("cpu")
    set_warp_deterministic(int(seed), device="cpu")
    nx, ny, nz = 16, 8, CANONICAL_NZ
    n_steps = 50
    capture_interval = 10
    tau = CANONICAL_TAU
    force_x = 1.0e-5
    dx_phys = 1.0 / nx
    descriptor = "poiseuille-16x8-seed42-step50"
    t0 = time.perf_counter()
    with deterministic_context():
        frames = list(
            _evolve_poiseuille(
                nx=nx,
                ny=ny,
                nz=nz,
                n_steps=n_steps,
                capture_interval=capture_interval,
                tau=tau,
                force_x=force_x,
                dx_phys=dx_phys,
            )
        )
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=descriptor,
        tier="diagnostic",
        nx=nx,
        ny=ny,
        nz=nz,
        seed=seed,
        n_steps=n_steps,
        capture_interval=capture_interval,
        wall_clock_seconds=wall,
        params={
            "descriptor": descriptor,
            "tau": float(tau),
            "force_x_lattice": float(force_x),
            "nz_convention": "depth-3-z-periodic-slab",
            "boundary": "bounce-back-y-walls-periodic-xz",
        },
    )
    return _write_capture_from_frames(
        descriptor=descriptor, manifest=manifest, frames=frames, out_dir=out_dir
    )


__all__ = [
    "CANONICAL_COUETTE_WALL_VELOCITY",
    "CANONICAL_POISEUILLE_FORCE_X",
    "CANONICAL_TAU",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
    "sim_runner_seeded_couette",
]
