"""Stage 1a RED — property-based invariants (≥2, plan §6.4 line 1604).

Two declared invariants (charter §6 D-PBT, with the Stage-1a physical
refinement noted below):

1. **energy_drift_bounded** — frictionless: total mechanical energy drift per
   second stays below ``1e-3`` under the symplectic (semi-implicit Euler)
   integrator, for random valid ICs.
2. **angular_momentum_about_pivot_conserved** — with NO external forces
   (``gravity = 0``): the angular momentum of a base-pinned chain about its
   pivot is conserved (the pin reaction has zero moment about the pin), for
   random valid ICs.

**Physical refinement (Stage 1a, surfaced in the audit — mirrors the lenia
re-declaration precedent).** The dispatch's D-PBT names "momentum_conservation
(linear + angular)". For a base-**pinned** articulated chain, neither linear
momentum (the pin exerts a reaction force) nor angular-momentum-under-gravity is
conserved; the physically-correct realization of momentum_conservation is
**angular momentum about the pivot under zero gravity**. This is a re-declaration
on physical evidence (NOT a tolerance widening) — HARD RULE 2.

Stage 1a — every test FAILS with ``NotImplementedError`` from the integrator /
energy / momentum shells; Stage 1b inverts to GREEN (MEASURED).
"""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

import articulated_pedagogical as ap

_DT = 1e-3
_ENERGY_HORIZON = 0.6
_ANGULAR_HORIZON = 0.2
_ENERGY_DRIFT_REL_PER_SECOND = 1e-3
_ANGULAR_MOM_ATOL = 1e-9


@settings(max_examples=10, deadline=None)
@given(
    theta=st.lists(
        st.floats(min_value=-1.0, max_value=1.0, allow_nan=False, allow_infinity=False),
        min_size=2,
        max_size=2,
    ),
)
def test_energy_drift_bounded(theta: list[float]) -> None:
    """energy_drift_bounded — symplectic Euler has bounded energy oscillation
    and NO secular drift; assert the secular drift rate (difference of windowed
    means, which filters the O(dt) symplectic oscillation) is < 1e-3 per second.
    """
    chain = ap.make_double_pendulum(1.0, 1.0, 1.0, 1.0, 9.81)
    q0 = np.array(theta, dtype=np.float64)
    qd0 = np.zeros(2, dtype=np.float64)
    n_steps = round(_ENERGY_HORIZON / _DT)

    q_traj, qd_traj = ap.simulate(chain, q0, qd0, _DT, n_steps)
    energies = np.array(
        [ap.total_energy(chain, q, qd) for q, qd in zip(q_traj, qd_traj, strict=True)]
    )
    e0 = energies[0]
    half = len(energies) // 2
    secular = abs(float(np.mean(energies[half:]) - np.mean(energies[:half])))
    secular_drift_per_second = (secular / abs(e0)) / _ENERGY_HORIZON
    assert secular_drift_per_second < _ENERGY_DRIFT_REL_PER_SECOND


@settings(max_examples=10, deadline=None)
@given(
    omega=st.lists(
        st.floats(min_value=-2.0, max_value=2.0, allow_nan=False, allow_infinity=False),
        min_size=2,
        max_size=2,
    ),
)
def test_angular_momentum_about_pivot_conserved(omega: list[float]) -> None:
    """angular_momentum_about_pivot_conserved — with NO external forces
    (gravity=0) the dynamics conserve angular momentum about the pivot exactly;
    the high-order RK4 integrator reveals this to ~machine precision. (Symplectic
    Euler introduces an O(dt) drift — it conserves a modified energy, not this
    momentum — so the invariant is verified with the accurate integrator.)
    """
    chain = ap.make_double_pendulum(1.0, 1.0, 1.0, 1.0, gravity=0.0)
    q0 = np.array([0.4, -0.3], dtype=np.float64)
    qd0 = np.array(omega, dtype=np.float64)
    n_steps = round(_ANGULAR_HORIZON / _DT)

    q_traj, qd_traj = ap.simulate(chain, q0, qd0, _DT, n_steps, integrator="rk4")
    angular = np.array(
        [ap.angular_momentum(chain, q, qd) for q, qd in zip(q_traj, qd_traj, strict=True)]
    )
    np.testing.assert_allclose(angular, angular[0], atol=_ANGULAR_MOM_ATOL, rtol=0.0)
