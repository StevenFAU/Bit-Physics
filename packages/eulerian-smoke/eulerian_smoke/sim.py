"""SimRunner adapter — eulerian-smoke canonical captures.

Determinism strategy (charter § 1.5 / conventions doc § F.1 — load-bearing;
cited in the ``eulerian-smoke-stage1`` commit message footer):

1. **Semi-Lagrangian backtrace reads only from prior-step velocity
   arrays.** Both 2D and 3D backtraces in
   :mod:`eulerian_smoke.reference.stable_fluids` compute fractional
   backtracking positions, wrap periodically via ``np.mod`` (NOT
   ``np.clip``; clip would break periodicity), and bilinearly /
   trilinearly interpolate from the four / eight surrounding cells of
   the immutable prior-step field. No atomic scatter, no
   read-after-write hazard, no bucket-order leakage — analogous to
   RD-3D's 7-point-stencil determinism story
   (conventions doc § M.4 S1; § F clauses 1, 2).

2. **Bilinear / trilinear interpolation uses explicit lex vertex
   ordering** — ``f00, f01, f10, f11`` in 2D (j-major, i-minor) and
   ``c000…c111`` in 3D (k-major, j-mid, i-minor). No Python ``dict``
   or ``set`` iteration order leaks into the interpolation; the
   four-/eight-point sum is in a fixed order, so the floating-point
   accumulation residual is bit-identical across runs (mitigates the
   P22 / P24-class "iteration-order varies between runs" failure
   mode at the project-wide convention level).

3. **Jacobi pressure-projection uses a FIXED iteration cap** —
   :func:`eulerian_smoke.reference.stable_fluids.project_pressure`
   /``project_pressure_3d`` runs ``n_jacobi`` sweeps with NO
   tolerance-comparison early-stop branch. Stage 0 Task 0.4
   confirmed ``n_jacobi = 20`` is adequate for the canonical descriptors
   (per-step 0.93 s at N=128 3D; 500-step projection 8–16 min — well
   under the operator-routable 1-hour threshold). The P24 pattern
   "fixed iter-cap + accept floor-cap state" (conventions doc § M.5
   playbook P24) is inherited verbatim — the relevant clause for
   eulerian-grid pressure-projection determinism. No iteration-count
   drift across runs ⇒ no accumulated-rounding-tip-the-threshold
   non-determinism.

4. **No global RNG state.** The MMS gate-5 test uses analytic ICs
   (zero RNG); the canonical 3D Taylor-Green capture's IC is built
   from analytic vortex modes (zero RNG); the lid-driven-cavity 2D
   capture seeds optional perturbation through
   ``numpy.random.default_rng(seed)`` — bare ``numpy.random.*``
   global-state APIs are BANNED in :mod:`eulerian_smoke.reference`
   and :mod:`eulerian_smoke.sim` (P22 pattern, conventions doc § F
   clause "RNG threaded through ``common_py.determinism.Config``";
   per-process RNG state cannot leak between invocations of
   :func:`sim_runner_seeded`).

5. **Periodic BCs implemented via ``np.roll`` and ``np.mod``** rather
   than ghost-zone copy + slice. Conventions doc § M.4 S1 (P23
   cause-#1 mitigation) — this eliminates an entire class of
   off-by-one stencil bugs that would non-uniformly contaminate the
   MMS error norm at boundary cells and surface as a pre-asymptotic
   floor in the convergence study (gate 5).

6. **No BLAS / FMA path inside the kernel.** Every operation in the
   Stam-Fedkiw pipeline is elementwise NumPy: arithmetic on arrays,
   ``np.roll`` shifts, integer indexing on the backtrace lookup,
   ``np.sqrt`` for vorticity magnitude. NumPy's default BLAS is
   never engaged (no ``np.dot`` / ``np.matmul`` / ``@``). FMA fusion
   at the elementwise level is left at the compiler's default
   (typically unfused under glibc + GCC); cross-platform Stack-D
   variation is absorbed by spec § 2.6 ``same-stack-different-hw``
   ``epsilon`` row at Phase 2+. Same-stack same-hardware stays
   bit-exact under this kernel.

7. **Capture ordering is deterministic.** ``sim_runner_seeded`` emits
   :class:`capture.StepState`\\ s in step-index order (step 0, then
   every ``CANONICAL_CAPTURE_INTERVAL`` steps, plus the final step);
   ``h5py``'s default group ordering is preserved by
   :func:`capture.write_capture`.

8. **Phase-2+ deferred** (sim ``determinism.md``): Stack-C parallel
   reductions (the pressure-solver convergence-check Jacobi sweep
   reduction-tree on a GPU); driver / vendor FMA fusion (Vulkan
   compute-shader compile-time fusion of multiply-add). The Python
   NumPy reference shipped at THIS sub-phase has neither surface —
   the spec's ``epsilon-same-stack-same-hw`` declaration for
   Stack-C is over-achieved here, recorded as informational per
   conventions doc § F.4.

Per spec § 2.5 the spec's declaration for eulerian-smoke is
``epsilon-same-stack-same-hw`` (sim ``determinism.md`` —
pressure-projection iterations involve parallel reductions on the
Phase-2+ Stack-C target). The Python NumPy reference shipped at THIS
sub-phase achieves ``bit-exact-same-stack-same-hw`` (gate 11 witnesses
this via ``test_run_twice_epsilon_diff``); the over-achievement does
NOT promote the spec declaration — the Phase-2+ Stack-C target
remains ``epsilon`` per conventions doc § F.4.
"""

from __future__ import annotations

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
    stable_fluids_step,
    stable_fluids_step_3d,
)

# Stage 0 Task 0.4 finding: cadence-50 routing fits the 1 GB pre-commit
# ceiling (conventions doc § M.5 R12). 11 frames at steps 0, 50, 100,
# ..., 500 over the canonical 500-step capture → ~0.42 GB at float32.
_CANONICAL_CAPTURE_INTERVAL_3D: Final[int] = 50
# 2D lid-driven-cavity at 128² × 1000 steps is small enough for
# cadence-100 (11 frames) — well under any ceiling per Stage 0 Task 0.4.
_CANONICAL_CAPTURE_INTERVAL_2D: Final[int] = 100


def _build_manifest_3d(
    *,
    descriptor: str,
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
) -> CaptureManifest:
    p = canonical_params_3d()
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "eulerian-smoke",
            "category": "volumetric-grid",
            "variant": "stam-fedkiw-stable-fluids",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-eulerian-smoke",
        },
        config={
            "tier": "test",
            "dims": [int(p["n"]), int(p["n"]), int(p["n"])],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "nu": p["nu"],
                "rho": p["rho"],
                "dx": p["dx"],
                "dt": p["dt"],
                "n": int(p["n"]),
                "n_jacobi": int(p["n_jacobi"]),
                "vorticity_eps": float(p.get("vorticity_eps", 0.0)),
            },
        },
        run={
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-22T00:00:00Z",
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


def _taylor_green_initial_condition(
    n: int,
    seed: int,  # noqa: ARG001 (kept for SimRunner Protocol signature parity)
) -> tuple[Array3D, Array3D, Array3D, Array3D]:
    """Taylor-Green vortex initial condition on a periodic unit cube.

    Per Taylor & Green 1937: the canonical 3D incompressible-NS IC is
    ``u = sin(x) cos(y) cos(z), v = -cos(x) sin(y) cos(z), w = 0``
    on the periodic ``[0, 2π]³`` cube. We rescale to the unit cube
    ``[0, 1]³`` by setting the wave numbers to ``2π`` — keeping the
    analytic decay law ``∝ exp(-2 ν k² t)`` with ``k = 2π``.

    The smoke density φ is initialized to a smooth Gaussian blob
    centred at ``(0.5, 0.5, 0.5)`` so the canonical capture's scalar
    field carries non-trivial advected information for gate-6 diagnostics.

    Note: seed is unused (analytic IC is determinism-by-construction);
    kept in the signature to satisfy the SimRunner Protocol.
    """
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y, Z = np.meshgrid(idx, idx, idx, indexing="ij")
    two_pi = 2.0 * np.pi
    # Taylor-Green vortex (rescaled to unit cube).
    u = np.sin(two_pi * X) * np.cos(two_pi * Y) * np.cos(two_pi * Z)
    v = -np.cos(two_pi * X) * np.sin(two_pi * Y) * np.cos(two_pi * Z)
    w = np.zeros_like(u)
    # Gaussian smoke blob (sigma = 0.1; centred at the cube centre).
    sigma2 = 0.1 * 0.1
    density = np.exp(
        -((X - 0.5) ** 2 + (Y - 0.5) ** 2 + (Z - 0.5) ** 2) / (2.0 * sigma2)
    )
    return u, v, w, density


def _evolve_3d_to_step_states(
    seed: int,
    step_count: int,
    capture_interval: int,
) -> Iterable[StepState]:
    """Evolve the canonical 3D Taylor-Green IC; yield ``StepState`` at cadence."""
    params = canonical_params_3d()
    u, v, w, density = _taylor_green_initial_condition(int(params["n"]), seed)
    p = np.zeros_like(u)
    yield StepState(
        step=0,
        state={"u": u.copy(), "v": v.copy(), "w": w.copy(), "density": density.copy()},
        diagnostics={
            "mass_density": float(np.sum(density)),
            "energy": 0.5 * float(np.sum(u * u + v * v + w * w)),
        },
    )
    for i in range(1, step_count + 1):
        u, v, w, density, p = stable_fluids_step_3d(u, v, w, density, params)
        if i % capture_interval == 0 or i == step_count:
            yield StepState(
                step=i,
                state={
                    "u": u.copy(),
                    "v": v.copy(),
                    "w": w.copy(),
                    "density": density.copy(),
                },
                diagnostics={
                    "mass_density": float(np.sum(density)),
                    "energy": 0.5 * float(np.sum(u * u + v * v + w * w)),
                },
            )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produces the canonical 3D Taylor-Green capture.

    Spec descriptor (Appendix D § D.2.3 line 2481):
    ``taylor-green-128cube-seed42-step500``.

    The 3D Taylor-Green vortex (Taylor & Green 1937,
    DOI 10.1098/rspa.1937.0036) is a canonical incompressible-NS IC
    with analytic energy-decay law; ``ν = 0.01`` keeps the trajectory
    in a non-trivial vortical regime over the 500-step window.

    Cadence-50 routing per Stage 0 Task 0.4 finding (conventions doc § N
    PROPOSED first practical exercise): 11 frames at steps 0, 50, 100,
    …, 500. Sidecar metadata records the cadence value.

    The :func:`determinism.run_twice_and_diff` harness invokes this
    twice at the same seed and asserts bit-exact equality (gate 11);
    the Python NumPy reference is expected to over-achieve the spec's
    ``epsilon-same-stack-same-hw`` declaration per § F.4 above.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    states = list(
        _evolve_3d_to_step_states(
            seed=seed,
            step_count=CANONICAL_STEP_COUNT_3D,
            capture_interval=_CANONICAL_CAPTURE_INTERVAL_3D,
        )
    )
    wall = time.perf_counter() - t0
    manifest = _build_manifest_3d(
        descriptor=CANONICAL_DESCRIPTOR_3D,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT_3D,
        capture_interval=_CANONICAL_CAPTURE_INTERVAL_3D,
        wall_clock_seconds=wall,
    )
    return write_capture(states, manifest, out_dir)


def compute_canonical_trajectory_3d(
    *,
    seed: int = CANONICAL_SEED,
    n_steps: int = CANONICAL_STEP_COUNT_3D,
    capture_interval: int = _CANONICAL_CAPTURE_INTERVAL_3D,
    n: int | None = None,
) -> tuple[
    list[int],
    list[Array3D],
    list[Array3D],
    list[Array3D],
    list[Array3D],
]:
    """In-memory 3D Taylor-Green trajectory (no I/O).

    Returns ``(step_indices, u_history, v_history, w_history, density_history)``
    in cadence order. Used by ``test_diagnostics`` (with ``n`` set to a
    smaller value for sub-second runs) and (with the canonical 128³
    default) by ad-hoc inspections.
    """
    params = canonical_params_3d()
    grid_n = int(params["n"]) if n is None else int(n)
    # Mirror canonical dx scaling so dt remains stable at smaller grids.
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


def _lid_driven_cavity_initial_condition(
    n: int,
    seed: int,  # noqa: ARG001 — analytic IC; seed unused.
) -> tuple[Array2D, Array2D, Array2D]:
    """Lid-driven-cavity initial condition (periodic-BC approximation).

    Spec descriptor: ``lid-driven-cavity-128sq-re100-seed42-step1000``.

    The TRUE lid-driven cavity has Dirichlet BCs (u=U_lid at y=1, zero
    elsewhere). Our pipeline is periodic-BC throughout, so we model
    the canonical capture as a thin lid-shear-layer IC: ``u(x, y, 0) =
    U_lid · tanh((y - 0.95) / 0.02)`` clipped to ``[0, U_lid]`` —
    approximates the boundary-induced shear with a smooth periodic
    field. This is sufficient for a deterministic capture fingerprint
    at the Python NumPy reference scope; the Phase-2+ Stack-C C++
    port will implement the proper Dirichlet boundary per spec-ref § 5.

    Returns ``(u, v, density)`` at cell centres, all shape ``(n, n)``.
    """
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    X, Y = np.meshgrid(idx, idx, indexing="ij")
    # Thin shear layer near y = 0.95 (the "lid" location).
    u_lid = 1.0
    u = u_lid * 0.5 * (1.0 + np.tanh((Y - 0.95) / 0.02))
    v = np.zeros_like(u)
    # Density IC: a Gaussian blob at the cavity centre.
    sigma2 = 0.05 * 0.05
    density = np.exp(-((X - 0.5) ** 2 + (Y - 0.5) ** 2) / (2.0 * sigma2))
    return u, v, density


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
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-eulerian-smoke",
        },
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
            "start_utc": "2026-05-22T00:00:00Z",
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


def sim_runner_seeded_2d(seed: int, out_dir: Path) -> Path:
    """SimRunner — produces the canonical 2D lid-driven-cavity capture.

    Spec descriptor (Appendix D § D.2.3 line 2481):
    ``lid-driven-cavity-128sq-re100-seed42-step1000``.

    Per Stage 0 Task 0.4 finding, the 2D capture fits comfortably under
    all ceilings (262 MB at full cadence; ~10 s wall-clock). We use
    cadence-100 (11 frames) for parity with the 3D capture's sidecar
    cadence convention.
    """
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
        # Advect density with the projected velocity.
        from .reference import semi_lagrangian_advect_2d  # local import for clarity

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
    """Diagnostic-tier SimRunner — small ``N``, short window for gate-11 cost.

    Mirrors the sph-water ``sim_runner_diagnostic`` pattern (conventions
    doc § F.2 dual-implementation precedent; see
    ``packages/sph-water/sph_water/sim.py`` for the established shape).
    The canonical ``sim_runner_seeded`` produces the 128³ × 500-step
    Taylor-Green capture (Stage 0 Task 0.4: ~8-16 min wall-clock); the
    gate-11 ``run_twice_and_diff`` harness invokes its runner TWICE,
    making the canonical capture infeasible at pytest scope. The
    diagnostic runner exercises the same Stam-pipeline kernel at
    ``N = 32`` × 10 steps (sub-second per invocation; ≈ 1-2 s for
    capture-twice-and-diff), sufficient to witness the bit-exact
    determinism contract end-to-end.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    diag_n = 32
    diag_steps = 10
    diag_capture_interval = 5  # 3 frames over 10 steps.
    base = canonical_params_3d()
    # Diagnostic params: same nu/rho/n_jacobi as canonical, smaller grid.
    diag_params = {
        **base,
        "n": diag_n,
        "dx": 1.0 / diag_n,
    }
    t0 = time.perf_counter()
    u, v, w, density = _taylor_green_initial_condition(diag_n, seed)
    p = np.zeros_like(u)
    states: list[StepState] = [
        StepState(
            step=0,
            state={
                "u": u.copy(),
                "v": v.copy(),
                "w": w.copy(),
                "density": density.copy(),
            },
            diagnostics={
                "mass_density": float(np.sum(density)),
                "energy": 0.5 * float(np.sum(u * u + v * v + w * w)),
            },
        )
    ]
    for i in range(1, diag_steps + 1):
        u, v, w, density, p = stable_fluids_step_3d(u, v, w, density, diag_params)
        if i % diag_capture_interval == 0 or i == diag_steps:
            states.append(
                StepState(
                    step=i,
                    state={
                        "u": u.copy(),
                        "v": v.copy(),
                        "w": w.copy(),
                        "density": density.copy(),
                    },
                    diagnostics={
                        "mass_density": float(np.sum(density)),
                        "energy": 0.5 * float(np.sum(u * u + v * v + w * w)),
                    },
                )
            )
    wall = time.perf_counter() - t0
    manifest = CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "eulerian-smoke",
            "category": "volumetric-grid",
            "variant": "stam-fedkiw-stable-fluids-diagnostic",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-eulerian-smoke",
        },
        config={
            "tier": "diagnostic",
            "dims": [diag_n, diag_n, diag_n],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "nu": diag_params["nu"],
                "rho": diag_params["rho"],
                "dx": diag_params["dx"],
                "dt": diag_params["dt"],
                "n": diag_n,
                "n_jacobi": int(diag_params["n_jacobi"]),
                "vorticity_eps": float(diag_params.get("vorticity_eps", 0.0)),
            },
        },
        run={
            "step_count": diag_steps,
            "capture_interval": diag_capture_interval,
            "wall_clock_seconds": float(wall),
            "start_utc": "2026-05-22T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": "taylor-green-32cube-seed42-step10-diagnostic.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )
    return write_capture(states, manifest, out_dir)


__all__ = [
    "compute_canonical_trajectory_3d",
    "sim_runner_diagnostic",
    "sim_runner_seeded",
    "sim_runner_seeded_2d",
]
