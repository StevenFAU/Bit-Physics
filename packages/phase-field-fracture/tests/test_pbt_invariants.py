"""Property-based invariants of the damage updates (Hypothesis fuzzing)."""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st
from hypothesis.extra.numpy import arrays
from phase_field_fracture.reference import (
    elliptic_damage_solve,
    gradient_flow_damage,
    psi_plus_miehe,
)

h_fields = arrays(
    np.float64,
    (12, 12),
    elements=st.floats(min_value=0.0, max_value=50.0, allow_nan=False),
)
d_fields = arrays(
    np.float64,
    (12, 12),
    elements=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
)
strains = arrays(
    np.float64,
    (8, 8),
    elements=st.floats(min_value=-0.1, max_value=0.1, allow_nan=False),
)


@given(d=d_fields, h_field=h_fields, m=st.floats(min_value=1e-3, max_value=1e3))
@settings(max_examples=60, deadline=None)
def test_gradient_flow_bounds_and_monotone(
    d: np.ndarray, h_field: np.ndarray, m: float
) -> None:
    d_new = gradient_flow_damage(d, h_field, m=m, h=0.5)
    assert float(np.min(d_new - d)) >= 0.0  # irreversibility
    assert float(d_new.min()) >= 0.0
    assert float(d_new.max()) <= 1.0 + 1e-12  # AT2 maximum principle + clamp


@given(h_field=h_fields)
@settings(max_examples=20, deadline=None)
def test_elliptic_solution_in_unit_interval(h_field: np.ndarray) -> None:
    d, _ = elliptic_damage_solve(np.zeros((12, 12)), h_field, h=0.5)
    assert float(d.min()) >= -1e-10
    assert float(d.max()) <= 1.0 + 1e-10


@given(exx=strains, eyy=strains, exy=strains)
@settings(max_examples=60, deadline=None)
def test_psi_plus_nonnegative_and_bounded_by_iso(
    exx: np.ndarray, eyy: np.ndarray, exy: np.ndarray
) -> None:
    lam, mu = 673.0769, 448.7179
    psi_p = psi_plus_miehe(exx, eyy, exy, lam, mu)
    assert float(psi_p.min()) >= 0.0
    # tr+^2 <= tr^2 and <e>+^2 <= e^2, so psi+ never exceeds the full
    # spectral energy
    tr = exx + eyy
    disc = np.sqrt(((exx - eyy) * 0.5) ** 2 + exy**2)
    e1 = tr * 0.5 + disc
    e2 = tr * 0.5 - disc
    full = 0.5 * lam * tr**2 + mu * (e1**2 + e2**2)
    assert float(np.max(psi_p - full)) <= 1e-9
