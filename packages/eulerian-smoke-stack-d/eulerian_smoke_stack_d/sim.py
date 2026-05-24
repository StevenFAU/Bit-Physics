"""SimRunner adapter -- eulerian-smoke Stack-D canonical captures (Taichi-DSL).

DETERMINISM STRATEGY (charter § 1.4.1 / conventions doc § F.1 -- load-bearing;
cited in the Stage-1 implementation commit footer):

1. **Per-cell stencil / semi-Lagrangian gather (NO atomic scatter).** Every
   primitive in :mod:`eulerian_smoke_stack_d.reference.stable_fluids_taichi`
   is a ``ti.ndrange`` per-cell kernel reading from immutable prior-step
   ``ti.types.ndarray`` views (SL backtrace gather; 5/7-point Laplacian;
   centered-difference div/grad/curl; Jacobi sweep). No ``ti.atomic_add``, no
   read-after-write hazard, no bucket-order leakage. ``determinism.atomic_ops
   = False``.

2. **f64 throughout; banked precedent #7 applies NON-vacuously.** The pipeline
   carries no in-kernel REDUCTIONS (the SL gather is a fixed 4/8-term convex sum;
   the stencils are fixed 4/6-term sums) and all kernels read/write f64
   ``ti.types.ndarray`` views. But the f64-seed trap still bites at the 3D Jacobi
   normaliser ``1.0/6.0`` -- a pure-literal division that infers f32 absent
   ``default_fp=ti.f64`` and leaked ~1e-9 into the 3D cross-stack pressure solve
   at the Stage-1 derisk; it is seeded ``ti.f64(1.0)/ti.f64(6.0)`` (the 2D
   ``0.25`` is exact in f32, no seed). Diagnostic mass/energy sums are computed in
   NumPy on the kernel outputs (``np.sum``), not in-kernel.

3. **Jacobi pressure-projection: FIXED ``n_jacobi = 20`` cap, NO early-stop**
   (the P24 pattern). The sweep COUNT is identical across stacks, so the
   cross-stack delta is FP-accumulation over fixed sweeps, NOT iteration-count
   divergence (deferred IC-15 aspect #5, in its determinism-safe fixed-cap form).

4. **MacCormack predictor-corrector (2D) + plain trilinear SL (3D).** The lex
   (i,j)/(i,j,k) vertex ordering + periodic floored-mod wrap mirror the NumPy
   reference; the stencil sums are written in the same lex order as the
   reference's ``np.roll`` expressions. NO monotonicity limiter (smooth fields).

5. **Vorticity confinement PRESENT-but-NOT-EXERCISED.** ``canonical_params_3d``
   sets ``vorticity_eps = 0.0`` -> ``_vorticity_confinement_3d`` early-returns
   zeros (dead code path; methodology § 5.1).

6. **No global RNG.** The canonical Taylor-Green + lid-driven ICs are analytic
   (RNG-free); ``set_taichi_deterministic`` pins ``random_seed`` but the kernels
   consume no ``ti.random`` surface. ``numpy.random.*`` global-state APIs are
   BANNED in :mod:`eulerian_smoke_stack_d.reference` + :mod:`eulerian_smoke_stack_d.sim`.

7. **``set_taichi_deterministic(arch='cpu')``** pins ``cpu_max_num_threads=1``
   (serialises the ``ti.ndrange`` cell loops) + ``offline_cache=True``,
   invoked lazily once via ``_ensure_taichi`` before any kernel launch.

8. **Same-stack posture: ``bit-exact-same-stack-same-hw``** (over-achieves the
   spec's ``epsilon-same-stack-same-hw`` Stack-C declaration; informational per
   conventions doc § F.4 -- does NOT promote the spec declaration). Phase-2+
   deferred: GPU-arch determinism; FMA fusion; subgroup-collectives; the
   MAC-staggered grid; the literal Stack-E Warp port.
"""

import time
from collections.abc import Iterable
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference import (
    CANONICAL_DESCRIPTOR_2D,
    CANONICAL_DESCRIPTOR_3D,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT_2D,
    CANONICAL_STEP_COUNT_3D,
    Array2D,
    Array3D,
    canonical_params_2d,
    canonical_params_3d,
    semi_lagrangian_advect_2d,
    stable_fluids_step,
    stable_fluids_step_3d,
)
from .reference.stable_fluids_taichi import _ensure_taichi

_CANONICAL_CAPTURE_INTERVAL_3D: Final[int] = 50  # 11 frames over 500 steps.
_CANONICAL_CAPTURE_INTERVAL_2D: Final[int] = 100  # 11 frames over 1000 steps.

_STACK = {
    "name": "taichi-stack-d",
    "version": "0.0.1",
    "build_id": "sub-phase-eulerian-smoke-stack-d",
}


def _taylor_green_initial_condition(
    n: int,
    seed: int,
) -> tuple[Array3D, Array3D, Array3D, Array3D]:
    """Taylor-Green vortex IC on a periodic unit cube (re-derived verbatim).

    ``u = sin(2pi x) cos(2pi y) cos(2pi z)``, ``v = -cos sin cos``, ``w = 0``;
    smoke density a Gaussian blob (sigma=0.1) at the cube centre. Pure NumPy ->
    bit-identical to the Phase-1 reference step-0 capture (cross-stack parity).
    """
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y, Z = np.meshgrid(idx, idx, idx, indexing="ij")
    two_pi = 2.0 * np.pi
    u = np.sin(two_pi * X) * np.cos(two_pi * Y) * np.cos(two_pi * Z)
    v = -np.cos(two_pi * X) * np.sin(two_pi * Y) * np.cos(two_pi * Z)
    w = np.zeros_like(u)
    sigma2 = 0.1 * 0.1
    density = np.exp(-((X - 0.5) ** 2 + (Y - 0.5) ** 2 + (Z - 0.5) ** 2) / (2.0 * sigma2))
    return u, v, w, density


def _lid_driven_cavity_initial_condition(
    n: int,
    seed: int,
) -> tuple[Array2D, Array2D, Array2D]:
    """Lid-driven-cavity IC (periodic-BC approximation; re-derived verbatim).

    Thin lid-shear-layer ``u = U_lid * 0.5 * (1 + tanh((y - 0.95)/0.02))``,
    ``v = 0``; density a Gaussian blob (sigma=0.05) at the cavity centre. Pure
    NumPy -> bit-identical to the Phase-1 reference step-0 capture.
    """
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(idx, idx, indexing="ij")
    u_lid = 1.0
    u = u_lid * 0.5 * (1.0 + np.tanh((Y - 0.95) / 0.02))
    v = np.zeros_like(u)
    sigma2 = 0.05 * 0.05
    density = np.exp(-((X - 0.5) ** 2 + (Y - 0.5) ** 2) / (2.0 * sigma2))
    return u, v, density


def _build_manifest_3d(
    *,
    descriptor: str,
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
    n: int,
    tier: str,
    variant: str,
) -> CaptureManifest:
    p = canonical_params_3d()
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "eulerian-smoke", "category": "volumetric-grid", "variant": variant},
        stack=dict(_STACK),
        config={
            "tier": tier,
            "dims": [n, n, n],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "nu": p["nu"],
                "rho": p["rho"],
                "dx": 1.0 / n,
                "dt": p["dt"],
                "n": n,
                "n_jacobi": int(p["n_jacobi"]),
                "vorticity_eps": float(p.get("vorticity_eps", 0.0)),
            },
        },
        run={
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-24T00:00:00Z",
        },
        payload={"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        determinism={"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    )


def _build_manifest_2d(
    *,
    descriptor: str,
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
) -> CaptureManifest:
    p = canonical_params_2d()
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "eulerian-smoke",
            "category": "volumetric-grid",
            "variant": "stam-fedkiw-stable-fluids-2d-lid-driven",
        },
        stack=dict(_STACK),
        config={
            "tier": "test",
            "dims": [int(p["n"]), int(p["n"])],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "nu": p["nu"],
                "rho": p["rho"],
                "dx": p["dx"],
                "dt": p["dt"],
                "n": int(p["n"]),
                "n_jacobi": int(p["n_jacobi"]),
                "Re": 100.0,
            },
        },
        run={
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-24T00:00:00Z",
        },
        payload={"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        determinism={"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    )


def _evolve_3d_to_step_states(
    seed: int,
    step_count: int,
    capture_interval: int,
    n: int,
) -> Iterable[StepState]:
    """Evolve the 3D Taylor-Green IC via the Taichi pipeline; yield StepState at cadence."""
    params = canonical_params_3d()
    if n != int(params["n"]):
        params = {**params, "n": n, "dx": 1.0 / n}
    u, v, w, density = _taylor_green_initial_condition(n, seed)
    yield StepState(
        step=0,
        state={"u": u.copy(), "v": v.copy(), "w": w.copy(), "density": density.copy()},
        diagnostics={
            "mass_density": float(np.sum(density)),
            "energy": 0.5 * float(np.sum(u * u + v * v + w * w)),
        },
    )
    for i in range(1, step_count + 1):
        u, v, w, density, _p = stable_fluids_step_3d(u, v, w, density, params)
        if i % capture_interval == 0 or i == step_count:
            yield StepState(
                step=i,
                state={"u": u.copy(), "v": v.copy(), "w": w.copy(), "density": density.copy()},
                diagnostics={
                    "mass_density": float(np.sum(density)),
                    "energy": 0.5 * float(np.sum(u * u + v * v + w * w)),
                },
            )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol -- produces the canonical 3D Taylor-Green Stack-D capture.

    Spec descriptor: ``taylor-green-128cube-seed42-step500`` (128^3 x 500,
    cadence-50, 11 frames). ``seed`` is recorded but immaterial (analytic IC).
    """
    _ensure_taichi()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    params = canonical_params_3d()
    n = int(params["n"])
    t0 = time.perf_counter()
    states = list(
        _evolve_3d_to_step_states(
            seed=seed,
            step_count=CANONICAL_STEP_COUNT_3D,
            capture_interval=_CANONICAL_CAPTURE_INTERVAL_3D,
            n=n,
        )
    )
    wall = time.perf_counter() - t0
    manifest = _build_manifest_3d(
        descriptor=CANONICAL_DESCRIPTOR_3D,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT_3D,
        capture_interval=_CANONICAL_CAPTURE_INTERVAL_3D,
        wall_clock_seconds=wall,
        n=n,
        tier="test",
        variant="stam-fedkiw-stable-fluids",
    )
    return write_capture(states, manifest, out_dir)


def compute_canonical_trajectory_3d(
    *,
    seed: int = CANONICAL_SEED,
    n_steps: int = CANONICAL_STEP_COUNT_3D,
    capture_interval: int = _CANONICAL_CAPTURE_INTERVAL_3D,
    n: int | None = None,
) -> tuple[list[int], list[Array3D], list[Array3D], list[Array3D], list[Array3D]]:
    """In-memory 3D Taylor-Green Taichi trajectory (no I/O).

    Returns ``(step_indices, u_history, v_history, w_history, density_history)``
    in cadence order. Used by ``test_diagnostics`` (with a smaller ``n``).
    """
    _ensure_taichi()
    params = canonical_params_3d()
    grid_n = int(params["n"]) if n is None else int(n)
    if n is not None and grid_n != int(params["n"]):
        params = {**params, "n": grid_n, "dx": 1.0 / grid_n}
    u, v, w, density = _taylor_green_initial_condition(grid_n, seed)
    step_indices: list[int] = [0]
    u_hist: list[Array3D] = [u.copy()]
    v_hist: list[Array3D] = [v.copy()]
    w_hist: list[Array3D] = [w.copy()]
    d_hist: list[Array3D] = [density.copy()]
    for i in range(1, int(n_steps) + 1):
        u, v, w, density, _p = stable_fluids_step_3d(u, v, w, density, params)
        if i % capture_interval == 0 or i == int(n_steps):
            step_indices.append(i)
            u_hist.append(u.copy())
            v_hist.append(v.copy())
            w_hist.append(w.copy())
            d_hist.append(density.copy())
    return step_indices, u_hist, v_hist, w_hist, d_hist


def sim_runner_seeded_2d(seed: int, out_dir: Path) -> Path:
    """SimRunner -- produces the canonical 2D lid-driven-cavity Stack-D capture.

    Spec descriptor: ``lid-driven-cavity-128sq-re100-seed42-step1000`` (128^2 x
    1000, cadence-100, 11 frames). MacCormack velocity advect + Jacobi project;
    density advected by the projected velocity via plain SL (mirrors Phase-1).
    """
    _ensure_taichi()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    params = canonical_params_2d()
    n = int(params["n"])
    u, v, density = _lid_driven_cavity_initial_condition(n, seed)
    p = np.zeros_like(u)
    states: list[StepState] = [
        StepState(
            step=0,
            state={"u": u.copy(), "v": v.copy(), "density": density.copy()},
            diagnostics={
                "mass_density": float(np.sum(density)),
                "energy": 0.5 * float(np.sum(u * u + v * v)),
            },
        )
    ]
    t0 = time.perf_counter()
    dt = float(params["dt"])
    dx = float(params["dx"])
    for i in range(1, CANONICAL_STEP_COUNT_2D + 1):
        u, v, p = stable_fluids_step(u, v, p, params)
        density = semi_lagrangian_advect_2d(density, u, v, dt, dx)
        if i % _CANONICAL_CAPTURE_INTERVAL_2D == 0 or i == CANONICAL_STEP_COUNT_2D:
            states.append(
                StepState(
                    step=i,
                    state={"u": u.copy(), "v": v.copy(), "density": density.copy()},
                    diagnostics={
                        "mass_density": float(np.sum(density)),
                        "energy": 0.5 * float(np.sum(u * u + v * v)),
                    },
                )
            )
    wall = time.perf_counter() - t0
    manifest = _build_manifest_2d(
        descriptor=CANONICAL_DESCRIPTOR_2D,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT_2D,
        capture_interval=_CANONICAL_CAPTURE_INTERVAL_2D,
        wall_clock_seconds=wall,
    )
    return write_capture(states, manifest, out_dir)


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic-tier SimRunner -- small N, short window for gate-10 cost.

    Mirrors the Phase-1 diagnostic runner: 32^3 x 10 steps (cadence-5, 3 frames),
    analytic Taylor-Green IC. Exercises every kernel without the canonical
    capture wall-clock; consumed by gate-10 ``run_twice_and_diff``.
    """
    _ensure_taichi()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    diag_n = 32
    diag_steps = 10
    diag_capture_interval = 5
    t0 = time.perf_counter()
    states = list(
        _evolve_3d_to_step_states(
            seed=seed,
            step_count=diag_steps,
            capture_interval=diag_capture_interval,
            n=diag_n,
        )
    )
    wall = time.perf_counter() - t0
    manifest = _build_manifest_3d(
        descriptor="taylor-green-32cube-seed42-step10-diagnostic",
        seed=seed,
        step_count=diag_steps,
        capture_interval=diag_capture_interval,
        wall_clock_seconds=wall,
        n=diag_n,
        tier="diagnostic",
        variant="stam-fedkiw-stable-fluids-diagnostic",
    )
    return write_capture(states, manifest, out_dir)


__all__ = [
    "compute_canonical_trajectory_3d",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
    "sim_runner_seeded_2d",
]
