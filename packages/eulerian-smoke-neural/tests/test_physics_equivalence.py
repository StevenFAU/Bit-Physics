"""Physics-equivalence vs the parent (spec § 5.11: the underlying physics verification runs).

The 3dgs-smoke coupling changes only the RENDER — the smoke field is driven by the parent's
``stable_fluids_step_3d`` from the parent's Taylor-Green IC. So the captured per-frame ``density``
MUST be bit-equal to a direct ``eulerian-smoke-stack-e`` rollout at the same grid/seed (the coupling
adds no new physics axis). RED at Stage 1a (the sim raises ``NotImplementedError``); GREEN at 1b.
"""

from __future__ import annotations

import numpy as np

from eulerian_smoke_neural.sim import (
    CANONICAL_CAPTURE_INTERVAL,
    CANONICAL_N,
    CANONICAL_N_STEPS,
    CANONICAL_SEED,
    run_canonical_smoke_neural_sim,
)


def test_density_matches_parent_rollout() -> None:
    """Captured density per frame is bit-equal to a direct eulerian-smoke-stack-e rollout."""
    from eulerian_smoke_stack_e.reference import canonical_params_3d, stable_fluids_step_3d
    from eulerian_smoke_stack_e.sim import _taylor_green_initial_condition

    n = CANONICAL_N
    params = canonical_params_3d()
    if n != int(params["n"]):
        params = {**params, "n": n, "dx": 1.0 / n}
    u, v, w, density = _taylor_green_initial_condition(n, CANONICAL_SEED)
    ref: dict[int, np.ndarray] = {0: density.copy()}
    for step in range(1, CANONICAL_N_STEPS + 1):
        u, v, w, density, _p = stable_fluids_step_3d(u, v, w, density, params)
        if step % CANONICAL_CAPTURE_INTERVAL == 0 or step == CANONICAL_N_STEPS:
            ref[step] = density.copy()

    frames = run_canonical_smoke_neural_sim(seed=CANONICAL_SEED)
    assert frames, "no frames"
    checked = 0
    for fr in frames:
        if fr.step in ref:
            assert np.array_equal(fr.density, ref[fr.step]), f"density mismatch @{fr.step}"
            checked += 1
    assert checked >= 2, "fewer than 2 frames cross-checked against the parent rollout"
