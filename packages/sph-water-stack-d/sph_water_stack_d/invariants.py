"""Property-based invariants for the Stack-D sph-water port (gate 11).

The two invariants the Phase-1 reference declares at spec-ref § 6.6, ported
verbatim (same algorithm, same invariants) against the Stack-D reference
``density``:

- ``density_nonneg`` — SPH density rho_i = sum_j m_j W is non-negative for any
  valid configuration (W >= 0 on its support; m_j >= 0).
- ``kernel_normalization_unit_volume`` — a unit-mass particle alone gives
  rho = sigma_3 / h^3 exactly (cubic-spline peak); sweeps h for the h^-3 scaling.

Each invariant is a Hypothesis-decorated callable invoked with NO arguments by
the wrapping ``test_*`` functions so Hypothesis drives the strategies.
"""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference.dfsph_taichi import SIGMA_3D, density

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
    """Self-contribution alone matches sigma_3 / h^3 within FP epsilon."""
    particles = [{"p": [0.0, 0.0, 0.0], "v": [0.0, 0.0, 0.0], "m": 1.0}]
    rho = density(particles=particles, h=float(h))
    expected = SIGMA_3D / (h**3)
    assert rho[0] == np.float64(expected) or abs(rho[0] - expected) < 1e-14, (
        f"kernel normalization mismatch at h={h}: rho={rho[0]} expected={expected}"
    )
