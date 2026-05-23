"""PBT invariant tests (gate 12; spec § 6.6).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the mpm-multimaterial sub-phase Stage 1 fills in the bodies (S1
pattern; conventions doc § M inheritance). The imported invariants
are the 2 declared in spec § 6.6:

- :func:`mass_conservation_p2g_g2p` — for any random IC, the P2G →
  grid-identity → G2P round-trip preserves total particle mass.
- :func:`partition_of_unity_b_spline` — for any particle position
  ``p``, the sum of N(p − (base + k)) over the 3 neighbouring grid
  nodes equals 1.

Hypothesis 50 examples each (project default; conventions doc § A —
matches LBM Stage 1 step 8 precedent).
"""

from __future__ import annotations

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from mpm_multimaterial.invariants import (  # type: ignore[import-not-found]
    mass_conservation_p2g_g2p,
    partition_of_unity_b_spline,
)


@settings(max_examples=50, deadline=None)
@given(
    n_particles=st.integers(min_value=1, max_value=50),
    seed=st.integers(min_value=0, max_value=2**31 - 1),
)
def test_mass_conservation_p2g_g2p(n_particles: int, seed: int) -> None:
    """∑ m_p (initial) == ∑_i grid_mass_i (after P2G).

    Hypothesis-driven: random particle counts (1..50) at random seeds.
    Grid is 16³ with dx = 1/16; particles sampled uniformly in the
    interior ``[2*dx, 14*dx]`` so the 3×3×3 stencil stays in-bounds
    (no boundary mass loss).
    """
    grid_n = 16
    grid_dx = 1.0 / grid_n
    rng = np.random.default_rng(seed)
    lo = 2.0 * grid_dx
    hi = (grid_n - 2) * grid_dx
    positions = rng.uniform(lo, hi, size=(n_particles, 3))
    masses = rng.uniform(0.01, 1.0, size=n_particles)
    m_init, m_final = mass_conservation_p2g_g2p(
        positions, masses, grid_n=grid_n, grid_dx=grid_dx
    )
    # Partition-of-unity guarantees exact preservation up to FP.
    assert m_final == pytest.approx(m_init, rel=1e-12, abs=1e-12), (
        f"mass conservation violated: initial={m_init} final={m_final} "
        f"(n_particles={n_particles}, seed={seed})"
    )


@settings(max_examples=50, deadline=None)
@given(
    p=st.floats(
        min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False
    )
)
def test_partition_of_unity_b_spline(p: float) -> None:
    """∑_{k∈(0,1,2)} N(p − (base + k)) == 1 for any real p.

    Closed-form invariant of the quadratic B-spline at unit grid
    spacing with the MLS-MPM 3-node convention ``base = floor(p +
    0.5) - 1``.
    """
    s = partition_of_unity_b_spline(p)
    assert s == pytest.approx(1.0, abs=1e-15), (
        f"partition-of-unity violated at p={p}: sum={s}"
    )
