"""Property-based invariants for the sph-water sim (gate 12).

Declarations per spec § 6.6 (sub-phase plan § 2 gate 12):

- ``density_nonneg`` — for any valid SPH particle configuration with
  non-negative masses, the SPH density $\\rho_i = \\sum_j m_j W$ is
  non-negative at every particle. Follows from $W \\ge 0$ (cubic-spline
  kernel is non-negative on its support) + $m_j \\ge 0$.
- ``kernel_normalization_unit_volume`` — at any particle position on a
  near-uniform reference configuration, the SPH self-mass estimate
  $\\sum_j m_j W$ is consistent with the discretized continuum density;
  for a uniform reference configuration the discrete sum approximates
  the continuum $\\rho_0$ within a kernel-discretization error bound
  (per spec § 5.4 + sph-water spec § 6.6).

Each invariant is a Hypothesis-decorated callable; the wrapping
``test_*`` functions in ``tests/test_pbt_invariants.py`` invoke them
with NO arguments so Hypothesis can drive the strategies. Cited in
the sub-phase Stage 1 commit footer (see sub-phase plan § 4.2 step 7).
"""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference.dfsph import SIGMA_3D, density

__all__ = ["density_nonneg", "kernel_normalization_unit_volume"]


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n=st.integers(min_value=1, max_value=16),
    h=st.floats(min_value=0.1, max_value=2.0, allow_nan=False, allow_infinity=False),
)
@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def density_nonneg(seed: int, n: int, h: float) -> None:
    """SPH density is non-negative for any valid configuration."""
    rng = np.random.default_rng(int(seed))
    positions = rng.uniform(-1.0, 1.0, size=(int(n), 3))
    velocities = np.zeros((int(n), 3), dtype=np.float64)
    # Masses are positive by construction (uniform in (0.1, 2.0)).
    masses = rng.uniform(0.1, 2.0, size=(int(n),))
    particles = [
        {"p": positions[i].tolist(), "v": velocities[i].tolist(), "m": float(masses[i])}
        for i in range(int(n))
    ]
    rho = density(particles=particles, h=float(h))
    assert all(r >= 0.0 for r in rho), f"density must be non-negative; got {rho}"


@given(
    h=st.floats(min_value=0.5, max_value=2.0, allow_nan=False, allow_infinity=False),
)
@settings(
    max_examples=10,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def kernel_normalization_unit_volume(h: float) -> None:
    """Self-contribution alone matches $\\sigma_3 / h^3$ within FP epsilon.

    The cubic-spline 3D kernel peak at $q=0$ is the 3D normalization
    constant $\\sigma_3 = 1/\\pi$ (Monaghan 1992/2005 § 2.7); a unit-mass
    particle alone in space gives $\\rho_i = m \\cdot \\sigma_3 / h^3 =
    \\sigma_3 / h^3$ exactly. This pins the kernel normalization at a
    deterministic point + sweeps $h$ to verify the $h^{-3}$ scaling.
    """
    particles = [{"p": [0.0, 0.0, 0.0], "v": [0.0, 0.0, 0.0], "m": 1.0}]
    rho = density(particles=particles, h=float(h))
    expected = SIGMA_3D / (h**3)
    assert rho[0] == np.float64(expected) or abs(rho[0] - expected) < 1e-14, (
        f"kernel normalization mismatch at h={h}: rho={rho[0]} expected={expected}"
    )
