"""Property-based invariants for the physarum sim (gate 11).

Declarations per spec § 6.6 (charter § 4.2):

- ``trail_mass_conserves_modulo_decay`` — over one full
  sense+rotate+move+deposit+diffuse+decay step, total trail mass
  satisfies
  ``mass_{n+1} ≈ mass_n * (1 - decay_alpha) + n_agents * deposit``
  (mass-preserving 3×3 box-blur, then multiplicative decay, then a
  ``n_agents``-sized scatter-add at the new positions).
- ``agent_count_invariant`` — the agent count is conserved across
  steps (no spawning / removal).

Each invariant is a zero-arg Hypothesis-decorated callable; the
wrapping ``test_*`` functions in ``tests/test_pbt_invariants.py``
invoke them, driving Hypothesis to sample inputs.
"""

from __future__ import annotations

import math

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference import _step_full, canonical_params


def _random_initial_state(
    rng: np.random.Generator, *, n_agents: int, grid_size: int, trail_scale: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    T = trail_scale * rng.uniform(0.0, 1.0, size=(grid_size, grid_size))
    positions = np.column_stack(
        [
            rng.uniform(0.0, float(grid_size), size=int(n_agents)),
            rng.uniform(0.0, float(grid_size), size=int(n_agents)),
        ]
    )
    angles = rng.uniform(0.0, 2.0 * np.pi, size=int(n_agents))
    headings = np.column_stack([np.cos(angles), np.sin(angles)])
    return T, positions, headings


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n_agents=st.integers(min_value=1, max_value=16),
    grid_size=st.integers(min_value=8, max_value=32),
    trail_scale=st.floats(min_value=0.0, max_value=2.0, allow_nan=False),
)
@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def trail_mass_conserves_modulo_decay(
    seed: int, n_agents: int, grid_size: int, trail_scale: float
) -> None:
    """One full step: mass_{n+1} ≈ mass_n * (1 - α) + N * deposit."""
    rng = np.random.default_rng(int(seed))
    T0, positions, headings = _random_initial_state(
        rng, n_agents=n_agents, grid_size=grid_size, trail_scale=trail_scale
    )
    params = canonical_params()
    mass_before = float(T0.sum())
    T1, _, _ = _step_full(T=T0, positions=positions, headings=headings, params=params)
    mass_after = float(T1.sum())
    deposit_added = float(params["deposit"]) * float(n_agents)
    decay = float(params["decay_alpha"])
    expected = mass_before * (1.0 - decay) + deposit_added * (1.0 - decay)
    # The diffuse step preserves mass; the decay multiplies by (1-α)
    # AFTER the box-blur; the deposit lands BEFORE the diffuse+decay,
    # so the deposit mass also picks up the (1-α) factor.
    tol = 1e-9 * max(1.0, abs(expected))
    assert math.isclose(mass_after, expected, abs_tol=tol, rel_tol=1e-9), (
        f"trail_mass_conserves_modulo_decay: got {mass_after}, expected {expected} "
        f"(seed={seed}, n_agents={n_agents}, grid_size={grid_size})"
    )


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n_agents=st.integers(min_value=1, max_value=16),
    grid_size=st.integers(min_value=8, max_value=32),
    n_steps=st.integers(min_value=1, max_value=8),
)
@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def agent_count_invariant(
    seed: int, n_agents: int, grid_size: int, n_steps: int
) -> None:
    """Agent count is preserved across ``n_steps`` full Jones-2010 steps."""
    rng = np.random.default_rng(int(seed))
    T, positions, headings = _random_initial_state(
        rng, n_agents=n_agents, grid_size=grid_size, trail_scale=1.0
    )
    params = canonical_params()
    expected_n = positions.shape[0]
    for _ in range(int(n_steps)):
        T, positions, headings = _step_full(
            T=T, positions=positions, headings=headings, params=params
        )
    assert positions.shape[0] == expected_n, (
        f"position count drifted: {positions.shape[0]} != {expected_n}"
    )
    assert headings.shape[0] == expected_n, (
        f"heading count drifted: {headings.shape[0]} != {expected_n}"
    )


__all__ = [
    "agent_count_invariant",
    "trail_mass_conserves_modulo_decay",
]
