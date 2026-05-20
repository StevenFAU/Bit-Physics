"""Property-based invariants for the boids-3d sim (gate 11).

Declarations per spec § 6.6 (charter § 4.2):

- ``v_max_clamp_respected`` — for any IC and any number of steps,
  every agent's speed stays at or below ``v_max`` after the clamp.
- ``particle_count_invariant`` — the agent count is conserved across
  steps (no spawning / removal).

Each invariant is a zero-arg Hypothesis-decorated callable; the
wrapping ``test_*`` functions in ``tests/test_pbt_invariants.py``
invoke them, driving Hypothesis to sample inputs.
"""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference import canonical_params, evolve

_V_MAX_RTOL = 1e-9


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n_agents=st.integers(min_value=2, max_value=12),
    n_steps=st.integers(min_value=1, max_value=20),
)
@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def v_max_clamp_respected(seed: int, n_agents: int, n_steps: int) -> None:
    """No agent's speed exceeds ``v_max`` after the clamp at any step."""
    rng = np.random.default_rng(int(seed))
    positions = rng.uniform(-5.0, 5.0, size=(n_agents, 3))
    velocities = rng.uniform(-3.0, 3.0, size=(n_agents, 3))
    params = canonical_params()
    v_max = float(params["v_max"])
    p_hist, v_hist, _ = evolve(
        positions, velocities, params, n_steps=n_steps, capture_interval=1
    )
    # Frame 0 is the IC (may violate); frames 1..N are post-clamp.
    speeds = np.linalg.norm(v_hist[1:], axis=-1)
    if speeds.size == 0:
        return
    max_speed = float(speeds.max())
    assert max_speed <= v_max + _V_MAX_RTOL * v_max, (
        f"max speed {max_speed} exceeds v_max={v_max} "
        f"(seed={seed}, n_agents={n_agents}, n_steps={n_steps})"
    )


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n_agents=st.integers(min_value=1, max_value=12),
    n_steps=st.integers(min_value=1, max_value=20),
)
@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def particle_count_invariant(seed: int, n_agents: int, n_steps: int) -> None:
    """Agent count is preserved across ``n_steps`` Reynolds steps."""
    rng = np.random.default_rng(int(seed))
    positions = rng.uniform(-5.0, 5.0, size=(n_agents, 3))
    velocities = rng.uniform(-3.0, 3.0, size=(n_agents, 3))
    p_hist, v_hist, _ = evolve(
        positions,
        velocities,
        canonical_params(),
        n_steps=n_steps,
        capture_interval=1,
    )
    assert p_hist.shape[1] == n_agents, (
        f"position count drifted: shape {p_hist.shape[1]} != {n_agents}"
    )
    assert v_hist.shape[1] == n_agents, (
        f"velocity count drifted: shape {v_hist.shape[1]} != {n_agents}"
    )


__all__ = [
    "particle_count_invariant",
    "v_max_clamp_respected",
]
