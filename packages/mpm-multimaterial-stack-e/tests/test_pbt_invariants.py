"""Gate 11 — property-based invariants (spec § 6.6), 50 examples each.

- ``mass_conservation_p2g_g2p`` — sum m_p (initial) == sum_i grid_mass_i (after
  the production Warp P2G), for any small random IC within stencil bounds.
- ``partition_of_unity_b_spline`` — sum_{k in 0..2} N(p - (base + k)) == 1.
"""

from __future__ import annotations

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from mpm_multimaterial_stack_e.invariants import (
    mass_conservation_p2g_g2p,
    partition_of_unity_b_spline,
)


@settings(max_examples=50, deadline=None)
@given(
    n_particles=st.integers(min_value=1, max_value=50),
    seed=st.integers(min_value=0, max_value=2**31 - 1),
)
def test_mass_conservation_p2g_g2p(n_particles: int, seed: int) -> None:
    grid_n = 16
    grid_dx = 1.0 / grid_n
    rng = np.random.default_rng(seed)
    lo = 2.0 * grid_dx
    hi = (grid_n - 2) * grid_dx
    positions = rng.uniform(lo, hi, size=(n_particles, 3))
    masses = rng.uniform(0.01, 1.0, size=n_particles)
    m_init, m_final = mass_conservation_p2g_g2p(positions, masses, grid_n=grid_n, grid_dx=grid_dx)
    assert m_final == pytest.approx(m_init, rel=1e-12, abs=1e-12)


@settings(max_examples=50, deadline=None)
@given(p=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False))
def test_partition_of_unity_b_spline(p: float) -> None:
    s = partition_of_unity_b_spline(p)
    assert s == pytest.approx(1.0, abs=1e-15)
