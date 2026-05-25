"""SimRunner adapter -- eulerian-smoke Stack-E canonical captures (NVIDIA Warp).

DETERMINISM STRATEGY (charter § 6 / conventions doc § F.1 -- load-bearing; cited
in the Stage-1b implementation commit footer):

1. **Per-cell stencil / semi-Lagrangian gather (NO atomic scatter).** Every
   primitive in :mod:`eulerian_smoke_stack_e.reference.stable_fluids_warp` is a
   per-cell ``@wp.kernel`` reading from immutable prior-step ``wp.array`` views
   (SL backtrace gather; 5/7-point Laplacian; centered-difference div/grad/curl;
   Jacobi sweep). No ``wp.atomic_add``, no read-after-write hazard, no
   bucket-order leakage. ``determinism.atomic_ops = False``.

2. **Warp CPU serial launch = bit-exact.** Warp's ``wp.launch`` on the CPU
   backend executes serially over the launch dimension in a single thread (the
   Warp analog of Taichi ``cpu_max_num_threads=1`` -- no knob), so the gather
   kernels are order-deterministic and bit-identical run-to-run
   (``bit-exact-same-hw``, D9), EVEN THOUGH the canonical trajectory diverges
   across stacks (chaotic / positive-Lyapunov; gate-14 R-P2 escape-hatch).

3. **f64 throughout; O-W7 pure-literal seed.** All kernels read/write
   ``wp.array(dtype=wp.float64)`` (D15). The 3D Jacobi normaliser is seeded
   ``wp.float64(1.0) / wp.float64(6.0)`` (Warp infers f32 absent the seed; the
   constant leaked ~1e-9 in the Taichi Stack-D port). Diagnostic mass/energy
   sums are computed in NumPy on the kernel outputs (``np.sum``), not in-kernel.

4. **Jacobi pressure-projection: FIXED ``n_jacobi = 20`` cap, NO early-stop**
   (IC-15 aspect #5 in its determinism-safe fixed-iteration-count form). The
   sweep COUNT is identical across stacks, so the cross-stack delta is
   FP-accumulation over fixed sweeps, NOT iteration-count divergence.

5. **np.roll operation order matched.** The Warp kernels replicate the Phase-1
   reference's ``np.roll`` neighbor order + ``np.mod`` positive-modulus, so the
   cross-stack step-1 delta is FP-round-off (D10 port-faithfulness), not an
   algorithmic divergence.

6. **No global RNG.** The canonical Taylor-Green + lid-driven ICs are analytic
   (RNG-free); ``set_warp_deterministic`` pins the seed but the kernels consume
   no random surface. ``numpy.random.*`` global-state APIs are BANNED in
   :mod:`eulerian_smoke_stack_e.reference` + this module.

7. **common-warp socket-only (D7).** ``common_warp.init("cpu",
   deterministic=True)`` + ``set_warp_deterministic`` + ``deterministic_context``
   + ``Capture`` / ``write_capture`` (f64-preserving). NOT Particles/Grids/HashGrid.

8. **Same-stack posture: ``bit-exact-same-hw``** (D9). The cross-stack
   positive-Lyapunov divergence (gate-14) is a SEPARATE axis from within-stack
   determinism; both hold simultaneously.
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

_CANONICAL_CAPTURE_INTERVAL_3D: Final[int] = 50  # 11 frames over 500 steps.
_CANONICAL_CAPTURE_INTERVAL_2D: Final[int] = 100  # 11 frames over 1000 steps.

DIAGNOSTIC_N: Final[int] = 32
DIAGNOSTIC_N_STEPS: Final[int] = 10
DIAGNOSTIC_CAPTURE_INTERVAL: Final[int] = 5  # 3 frames over 10 steps.

_STACK = {
    "name": "warp-stack-e",
    "version": "0.0.1",
    "build_id": "sub-phase-eulerian-smoke-stack-e",
}


def _taylor_green_initial_condition(n: int, seed: int) -> tuple[Array3D, Array3D, Array3D, Array3D]:
    """Taylor-Green vortex IC on a periodic unit cube (re-derived verbatim).

    ``u = sin(2pi x) cos(2pi y) cos(2pi z)``, ``v = -cos sin cos``, ``w = 0``;
    smoke density a Gaussian blob (sigma=0.1) at the cube centre. Pure NumPy ->
    bit-identical to the Phase-1 reference step-0 capture (cross-stack parity).
    """
    del seed  # analytic IC; recorded but immaterial.
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y, Z = np.meshgrid(idx, idx, idx, indexing="ij")
    two_pi = 2.0 * np.pi
    u = np.sin(two_pi * X) * np.cos(two_pi * Y) * np.cos(two_pi * Z)
    v = -np.cos(two_pi * X) * np.sin(two_pi * Y) * np.cos(two_pi * Z)
    w = np.zeros_like(u)
    sigma2 = 0.1 * 0.1
    density = np.exp(-((X - 0.5) ** 2 + (Y - 0.5) ** 2 + (Z - 0.5) ** 2) / (2.0 * sigma2))
    return u, v, w, density


def _lid_driven_cavity_initial_condition(n: int, seed: int) -> tuple[Array2D, Array2D, Array2D]:
    """Lid-driven-cavity IC (periodic-BC approximation; re-derived verbatim)."""
    del seed
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
) -> dict[str, object]:
    p = canonical_params_3d()
    return {
        "schema_version": "1.0.0",
        "sim": {"name": "eulerian-smoke", "category": "volumetric-grid", "variant": variant},
        "stack": dict(_STACK),
        "config": {
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
        "run": {
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-25T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }


def _build_manifest_2d(
    *,
    descriptor: str,
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
) -> dict[str, object]:
    p = canonical_params_2d()
    return {
        "schema_version": "1.0.0",
        "sim": {
            "name": "eulerian-smoke",
            "category": "volumetric-grid",
            "variant": "stam-fedkiw-stable-fluids-2d-lid-driven",
        },
        "stack": dict(_STACK),
        "config": {
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
        "run": {
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-25T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }


def _evolve_3d_to_frames(
    seed: int, step_count: int, capture_interval: int, n: int
) -> Iterable[tuple[int, dict[str, np.ndarray], dict[str, float]]]:
    """Evolve the 3D Taylor-Green IC via the Warp pipeline; yield frames at cadence."""
    params = canonical_params_3d()
    if n != int(params["n"]):
        params = {**params, "n": n, "dx": 1.0 / n}
    u, v, w, density = _taylor_green_initial_condition(n, seed)

    def _frame(step: int) -> tuple[int, dict[str, np.ndarray], dict[str, float]]:
        return (
            step,
            {"u": u.copy(), "v": v.copy(), "w": w.copy(), "density": density.copy()},
            {
                "mass_density": float(np.sum(density)),
                "energy": 0.5 * float(np.sum(u * u + v * v + w * w)),
            },
        )

    yield _frame(0)
    for i in range(1, step_count + 1):
        u, v, w, density, _p = stable_fluids_step_3d(u, v, w, density, params)
        if i % capture_interval == 0 or i == step_count:
            yield _frame(i)


def compute_canonical_trajectory_3d(
    *,
    seed: int = CANONICAL_SEED,
    n_steps: int = CANONICAL_STEP_COUNT_3D,
    capture_interval: int = _CANONICAL_CAPTURE_INTERVAL_3D,
    n: int | None = None,
) -> tuple[list[int], list[Array3D], list[Array3D], list[Array3D], list[Array3D]]:
    """In-memory 3D Taylor-Green Warp trajectory (no I/O).

    Returns ``(step_indices, u_history, v_history, w_history, density_history)``
    in cadence order. Used by ``test_diagnostics`` (with a smaller ``n``).
    """
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


def _write_capture_from_frames(
    *,
    descriptor: str,
    manifest: dict[str, object],
    frames: Iterable[tuple[int, dict[str, np.ndarray], dict[str, float]]],
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
    """SimRunner -- the canonical 3D Taylor-Green Stack-E capture.

    Descriptor ``taylor-green-128cube-seed42-step500`` (128^3 x 500, cadence-50,
    11 frames). ``seed`` recorded but immaterial (analytic IC). Returns the
    manifest JSON path.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    common_warp.init("cpu", deterministic=True)
    set_warp_deterministic(int(seed), device="cpu")
    params = canonical_params_3d()
    n = int(params["n"])
    t0 = time.perf_counter()
    with deterministic_context():
        frames = list(
            _evolve_3d_to_frames(seed, CANONICAL_STEP_COUNT_3D, _CANONICAL_CAPTURE_INTERVAL_3D, n)
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
    return _write_capture_from_frames(
        descriptor=CANONICAL_DESCRIPTOR_3D, manifest=manifest, frames=frames, out_dir=out_dir
    )


def sim_runner_seeded_2d(seed: int, out_dir: Path) -> Path:
    """SimRunner -- the canonical 2D lid-driven-cavity Stack-E capture.

    Descriptor ``lid-driven-cavity-128sq-re100-seed42-step1000`` (128^2 x 1000,
    cadence-100, 11 frames). MacCormack velocity advect + Jacobi project; density
    advected by the projected velocity via plain SL (mirrors Phase-1).
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    common_warp.init("cpu", deterministic=True)
    set_warp_deterministic(int(seed), device="cpu")
    params = canonical_params_2d()
    n = int(params["n"])
    dt = float(params["dt"])
    dx = float(params["dx"])
    t0 = time.perf_counter()
    with deterministic_context():
        u, v, density = _lid_driven_cavity_initial_condition(n, seed)
        p = np.zeros_like(u)

        def _frame_2d(step: int) -> tuple[int, dict[str, np.ndarray], dict[str, float]]:
            return (
                step,
                {"u": u.copy(), "v": v.copy(), "density": density.copy()},
                {
                    "mass_density": float(np.sum(density)),
                    "energy": 0.5 * float(np.sum(u * u + v * v)),
                },
            )

        frames = [_frame_2d(0)]
        for i in range(1, CANONICAL_STEP_COUNT_2D + 1):
            u, v, p = stable_fluids_step(u, v, p, params)
            density = semi_lagrangian_advect_2d(density, u, v, dt, dx)
            if i % _CANONICAL_CAPTURE_INTERVAL_2D == 0 or i == CANONICAL_STEP_COUNT_2D:
                frames.append(_frame_2d(i))
    wall = time.perf_counter() - t0
    manifest = _build_manifest_2d(
        descriptor=CANONICAL_DESCRIPTOR_2D,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT_2D,
        capture_interval=_CANONICAL_CAPTURE_INTERVAL_2D,
        wall_clock_seconds=wall,
    )
    return _write_capture_from_frames(
        descriptor=CANONICAL_DESCRIPTOR_2D, manifest=manifest, frames=frames, out_dir=out_dir
    )


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """Diagnostic-tier SimRunner -- small N, short window for gate-10 cost.

    32^3 x 10 steps (cadence-5, 3 frames), analytic Taylor-Green IC. Exercises
    every kernel without the canonical capture wall-clock; consumed by gate-10
    ``run_twice_and_diff``.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    common_warp.init("cpu", deterministic=True)
    set_warp_deterministic(int(seed), device="cpu")
    t0 = time.perf_counter()
    with deterministic_context():
        frames = list(
            _evolve_3d_to_frames(
                seed, DIAGNOSTIC_N_STEPS, DIAGNOSTIC_CAPTURE_INTERVAL, DIAGNOSTIC_N
            )
        )
    wall = time.perf_counter() - t0
    descriptor = "taylor-green-32cube-seed42-step10-diagnostic"
    manifest = _build_manifest_3d(
        descriptor=descriptor,
        seed=seed,
        step_count=DIAGNOSTIC_N_STEPS,
        capture_interval=DIAGNOSTIC_CAPTURE_INTERVAL,
        wall_clock_seconds=wall,
        n=DIAGNOSTIC_N,
        tier="diagnostic",
        variant="stam-fedkiw-stable-fluids-diagnostic",
    )
    return _write_capture_from_frames(
        descriptor=descriptor, manifest=manifest, frames=frames, out_dir=out_dir
    )


__all__ = [
    "DIAGNOSTIC_CAPTURE_INTERVAL",
    "DIAGNOSTIC_N",
    "DIAGNOSTIC_N_STEPS",
    "compute_canonical_trajectory_3d",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
    "sim_runner_seeded_2d",
]
