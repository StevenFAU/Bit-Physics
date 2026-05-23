"""SimRunner adapters wiring the Stack-D Taichi-DSL Gray-Scott into testkit protocols.

Determinism strategy declaration (conventions doc § F.1; cited from the
Stage 1b commit footer):

- **Reduction-ordering posture.** No in-kernel reductions. The canonical
  Gray-Scott update is a purely local 5-point Laplacian + pointwise
  reaction; every kernel iteration writes to a unique ``(i, j)`` cell of
  ``u_next`` / ``v_next`` from reads of ``u`` / ``v`` only. No atomic
  scatter-add; no Taichi-DSL ``ti.atomic_*`` surface; no cross-cell
  accumulation primitives.
- **Index-sorting / iteration-order pinning.** ``ti.ndrange(n, n)``
  produces a row-major iteration order. ``cpu_max_num_threads=1`` (set by
  ``set_taichi_deterministic``) serialises that iteration; the per-cell
  writes happen in a deterministic order. Combined with the no-reduction
  posture, this gives content-equivalent (IC-13) same-stack same-hw
  determinism: ``run_twice_and_diff`` yields ``content_equivalent=True``.
- **RNG threading.** RNG entry is exclusively through NumPy
  ``numpy.random.default_rng(seed)`` in
  :func:`reaction_diffusion_2d_stack_d.reference.gray_scott_taichi.initial_condition`
  (matches Stack-B's IC bit-for-bit). Taichi's ``random_seed`` is set via
  ``set_taichi_deterministic(Config(deterministic=True, seed=...), arch="cpu")``
  for completeness, but the kernels in this module do NOT consume the
  ``ti.random`` surface — they read only the per-step ``(u, v)`` state.
- **Phase-2+ deferred (NOT in scope at this sub-phase).** GPU arch
  determinism (``ti.cuda`` / ``ti.vulkan`` / ``ti.metal``); FMA fusion
  posture across backends; subgroup-collectives. The Stack-D port runs
  exclusively under ``arch="cpu"`` per
  ``docs/common/taichi.md`` § 2.1 + § 4.4; cross-backend equivalence is
  Phase-4+ frontier scope (spec § 4.4 limitation #4).

Exports:

    sim_runner_seeded(seed, out_dir) -> Path
        Canonical-descriptor SimRunner (testkit determinism harness +
        gate-9 canonical capture). Runs the locked Gray-Scott params at
        ``n=128`` for ``2000`` steps and writes the capture.
    sim_runner_pbt(initial_condition, out_dir) -> Path
        Short PBT SimRunner (testkit property harness; gate-11).
    sim_runner_with_source_term(seed, out_dir, mms, n, n_steps) -> Path
        Gate-4 MMS source-injection SimRunner; consumes
        ``GrayScott2DSolution`` from the MMS solutions library at
        ``tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/``.
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
from typing import Any

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference.gray_scott_taichi import (
    CANONICAL_DESCRIPTOR,
    CANONICAL_STEP_COUNT,
    GrayScottParams,
    _ensure_taichi,
    canonical_params,
    initial_condition,
    step_diffuse_react,
    step_diffuse_react_with_source,
)

_CAPTURE_INTERVAL_SEEDED = 200  # records 11 frames over 2000 steps (Stack-B parity)
_CAPTURE_INTERVAL_PBT = 5
_PBT_STEPS = 10
_PBT_GRID = 32


def _manifest(
    params: GrayScottParams,
    payload_name: str,
    seed: int,
    step_count: int,
    capture_interval: int,
    *,
    variant: str = "gray-scott",
) -> CaptureManifest:
    # Fixed ``start_utc`` + ``wall_clock_seconds = 0.0`` mirror Stack-B's
    # canonical-capture manifest pattern so the committed capture JSON is
    # byte-reproducible across re-runs (audit-chain stable; sha256-stable
    # under Convention #12 back-fill). Live wall-clock is measured at the
    # call site for perf-ledger appendage.
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "reaction-diffusion-2d",
            "category": "continuous-ca",
            "variant": variant,
        },
        stack={"name": "taichi-cpu", "version": "0.0.0", "build_id": "stack-d"},
        config={
            "tier": "test",
            "dims": [params.n, params.n],
            "dtype": "f64",
            "seed": seed,
            "params": {
                "Du": params.Du,
                "Dv": params.Dv,
                "F": params.F,
                "k": params.k,
                "dx": params.dx,
                "dt": params.dt,
            },
        },
        run={
            "step_count": step_count,
            "capture_interval": capture_interval,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-23T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": payload_name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _evolve_to_states(
    params: GrayScottParams,
    seed: int,
    n_steps: int,
    capture_interval: int,
) -> Iterable[StepState]:
    """Evolve via the Taichi kernel and yield ``StepState`` rows at capture cadence."""
    _ensure_taichi()
    u0, v0 = initial_condition(params, seed)
    u_curr = np.ascontiguousarray(u0, dtype=np.float64)
    v_curr = np.ascontiguousarray(v0, dtype=np.float64)
    yield StepState(
        step=0,
        state={"U": u_curr.copy(), "V": v_curr.copy()},
        diagnostics={
            "mass_U": float(np.sum(u_curr)),
            "mass_V": float(np.sum(v_curr)),
        },
    )
    u_next = np.empty_like(u_curr)
    v_next = np.empty_like(v_curr)
    for i in range(1, n_steps + 1):
        step_diffuse_react(
            u_curr,
            v_curr,
            u_next,
            v_next,
            params.Du,
            params.Dv,
            params.F,
            params.k,
            params.dt,
            params.dx,
            params.n,
        )
        u_curr, u_next = u_next, u_curr
        v_curr, v_next = v_next, v_curr
        if i % capture_interval == 0 or i == n_steps:
            yield StepState(
                step=i,
                state={"U": u_curr.copy(), "V": v_curr.copy()},
                diagnostics={
                    "mass_U": float(np.sum(u_curr)),
                    "mass_V": float(np.sum(v_curr)),
                },
            )


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """Block-3 ``SimRunner`` protocol — produces the canonical Stack-D capture.

    Always runs the locked canonical parameters (F=0.0367, k=0.0649,
    Du=0.16, Dv=0.08, dx=1, dt=1, n=128, 2000 steps); only ``seed`` and
    ``out_dir`` vary. Cross-stack equivalent to Stack-B's
    ``sim_runner_seeded`` at the IC + algorithm level; the
    ``run_twice_and_diff`` harness invokes this twice at the same seed
    and asserts content-equivalence (IC-13).
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    params = canonical_params()
    payload_name = f"{CANONICAL_DESCRIPTOR}.h5"
    rows = list(_evolve_to_states(params, seed, CANONICAL_STEP_COUNT, _CAPTURE_INTERVAL_SEEDED))
    manifest = _manifest(
        params,
        payload_name=payload_name,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=_CAPTURE_INTERVAL_SEEDED,
    )
    return write_capture(rows, manifest, out_dir)


def _pbt_initial_condition(sample: Any, params: GrayScottParams) -> tuple[np.ndarray, np.ndarray]:
    """Build a 2-D Stack-D PBT IC from a Hypothesis-generated 1-D profile.

    Mirrors Stack-B's ``_pbt_initial_condition``: tile the 1-D profile
    into U and a phase-shifted copy into V so the system has nontrivial
    reactive structure across both species; clip to [0, 1].
    """
    profile = np.asarray(sample, dtype=np.float64)
    if profile.ndim != 1:
        raise ValueError(f"pbt strategy produced shape {profile.shape}; expected 1-D")
    n_src = profile.size
    n = params.n
    idx = np.linspace(0, n_src - 1, n)
    base = np.interp(idx, np.arange(n_src), profile)
    u = np.tile(base, (n, 1))
    v = np.tile(np.roll(base, n // 4), (n, 1)).T
    np.clip(u, 0.0, 1.0, out=u)
    np.clip(v, 0.0, 1.0, out=v)
    return u, v


def _evolve_from_ic(
    u0: np.ndarray,
    v0: np.ndarray,
    params: GrayScottParams,
    n_steps: int,
    capture_interval: int,
) -> Iterable[StepState]:
    _ensure_taichi()
    u_curr = np.ascontiguousarray(u0.copy(), dtype=np.float64)
    v_curr = np.ascontiguousarray(v0.copy(), dtype=np.float64)
    yield StepState(step=0, state={"U": u_curr.copy(), "V": v_curr.copy()}, diagnostics={})
    u_next = np.empty_like(u_curr)
    v_next = np.empty_like(v_curr)
    for i in range(1, n_steps + 1):
        step_diffuse_react(
            u_curr,
            v_curr,
            u_next,
            v_next,
            params.Du,
            params.Dv,
            params.F,
            params.k,
            params.dt,
            params.dx,
            params.n,
        )
        u_curr, u_next = u_next, u_curr
        v_curr, v_next = v_next, v_curr
        if i % capture_interval == 0 or i == n_steps:
            yield StepState(step=i, state={"U": u_curr.copy(), "V": v_curr.copy()}, diagnostics={})


def sim_runner_pbt(initial_condition_sample: Any, out_dir: Path) -> Path:
    """Block-3 ``SimRunnerPBT`` protocol — short Stack-D RD-2D from a PBT IC.

    32x32 / 10-step / cadence-5 run so the property harness can afford
    ``n_examples = 20`` without burning CI budget. Mirrors Stack-B's
    PBT runner shape exactly.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    base = canonical_params()
    params = GrayScottParams(
        n=_PBT_GRID,
        Du=base.Du,
        Dv=base.Dv,
        F=base.F,
        k=base.k,
        dx=base.dx,
        dt=base.dt,
    )
    u0, v0 = _pbt_initial_condition(initial_condition_sample, params)
    payload_name = "rd-2d-stack-d-pbt.h5"
    rows = list(_evolve_from_ic(u0, v0, params, _PBT_STEPS, _CAPTURE_INTERVAL_PBT))
    manifest = _manifest(
        params,
        payload_name=payload_name,
        seed=0,
        step_count=_PBT_STEPS,
        capture_interval=_CAPTURE_INTERVAL_PBT,
        variant="gray-scott-pbt",
    )
    return write_capture(rows, manifest, out_dir)


def _build_mms_grid(n: int, L_domain: float) -> tuple[np.ndarray, np.ndarray, float]:
    """Build a cell-centered ``n x n`` mesh on a periodic square of side ``L_domain``.

    ``L_domain = 2 · mms.L`` is the load-bearing convention from the RD-3D
    MMS test (``packages/reaction-diffusion-3d/tests/test_mms_convergence.py``
    docstring P23 cause #1 mitigation): the manufactured solution's
    wavenumber κ = π / mms.L has true spatial period 2 · mms.L (a single
    sin/cos factor flips sign over [0, mms.L]; only the wider 2 · mms.L
    square actually closes the period). Discretising on [0, 2·mms.L]²
    keeps the 5-point periodic stencil consistent with the manufactured
    solution's BCs — without this the stencil reads neighbours from a
    sign-flipped copy of the field and observed OOA collapses.
    """
    dx = L_domain / n
    cell_centers = (np.arange(n, dtype=np.float64) + 0.5) * dx
    X, Y = np.meshgrid(cell_centers, cell_centers, indexing="ij")
    return X, Y, dx


def _evolve_with_source(
    params: GrayScottParams,
    mms: Any,
    X: np.ndarray,
    Y: np.ndarray,
    n_steps: int,
    capture_interval: int,
) -> Iterable[StepState]:
    """Evolve with MMS source-term injection (gate-4 mechanism).

    The IC is the manufactured solution at ``t = 0``; each step injects the
    source term evaluated at the left-endpoint time of the step (the
    canonical forward-Euler convention; mirrors RD-3D's
    ``test_mms_convergence.py``).
    """
    _ensure_taichi()
    u_0, v_0 = mms.evaluate(X, Y, 0.0)
    u_curr = np.ascontiguousarray(u_0, dtype=np.float64)
    v_curr = np.ascontiguousarray(v_0, dtype=np.float64)
    yield StepState(step=0, state={"U": u_curr.copy(), "V": v_curr.copy()}, diagnostics={})
    u_next = np.empty_like(u_curr)
    v_next = np.empty_like(v_curr)
    for i in range(1, n_steps + 1):
        t_n = float(i - 1) * params.dt
        s_u_np, s_v_np = mms.source_term(X, Y, t_n)
        s_u = np.ascontiguousarray(s_u_np, dtype=np.float64)
        s_v = np.ascontiguousarray(s_v_np, dtype=np.float64)
        step_diffuse_react_with_source(
            u_curr,
            v_curr,
            u_next,
            v_next,
            s_u,
            s_v,
            params.Du,
            params.Dv,
            params.F,
            params.k,
            params.dt,
            params.dx,
            params.n,
        )
        u_curr, u_next = u_next, u_curr
        v_curr, v_next = v_next, v_curr
        if i % capture_interval == 0 or i == n_steps:
            yield StepState(step=i, state={"U": u_curr.copy(), "V": v_curr.copy()}, diagnostics={})


def sim_runner_with_source_term(
    seed: int,
    out_dir: Path,
    *,
    mms: Any,
    n: int,
    t_final: float = 0.05,
    cfl_safety: float = 0.4,
) -> Path:
    """Gate-4 MMS SimRunner — manufactured source-term injection.

    Used by ``tests/test_code_verification.py`` to drive the observed-
    order-of-accuracy sweep at multiple grid resolutions. ``seed`` is
    accepted for protocol uniformity but not consumed (the IC is the MMS
    solution at ``t=0``, fully determined by ``mms`` + ``n``).

    Domain + grid: cells centred at ``(i + 0.5) · dx`` for ``i = 0..n-1``
    on a periodic square of side ``2 · mms.L`` (the true period of
    sin(πx/L) / cos(πx/L); see :func:`_build_mms_grid` for the
    load-bearing rationale). Time step is the largest ``dt = t_final /
    n_steps`` that satisfies ``dt ≤ cfl_safety · dx² / (4 · max(D_u, D_v))``
    (explicit-Euler 2D stability for the dominant diffusion species);
    ``n_steps`` is the smallest integer that achieves that. The capture
    records two frames: step 0 (the manufactured-solution IC) and the
    final step at exactly ``t_final``.
    """
    del seed
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    L_domain = 2.0 * float(mms.L)
    X, Y, dx = _build_mms_grid(n, L_domain)
    dt_ceiling = dx * dx / (4.0 * max(float(mms.D_u), float(mms.D_v)))
    dt_target = cfl_safety * dt_ceiling
    n_steps = max(1, int(np.ceil(t_final / dt_target)))
    dt = t_final / n_steps
    params = GrayScottParams(
        n=n,
        Du=float(mms.D_u),
        Dv=float(mms.D_v),
        F=float(mms.F),
        k=float(mms.k),
        dx=dx,
        dt=dt,
    )
    descriptor = f"gray-scott-mms-{n}sq-step{n_steps}"
    payload_name = f"{descriptor}.h5"
    rows = list(_evolve_with_source(params, mms, X, Y, n_steps, capture_interval=n_steps))
    manifest = _manifest(
        params,
        payload_name=payload_name,
        seed=0,
        step_count=n_steps,
        capture_interval=n_steps,
        variant="gray-scott-mms",
    )
    return write_capture(rows, manifest, out_dir)
