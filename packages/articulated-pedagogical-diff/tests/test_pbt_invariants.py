"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``gradient_matches_finite_difference`` — the differentiable-specific invariant (autodiff
  ∂q̈/∂q ≈ central FD ≤ 1e-5). Regime: single pendulum (the machine-exact adjoint scope), smooth
  interior, away from the gimbal.
* ``energy_drift_bounded`` — a forward-physics invariant (the landed task-4 invariant on the diff
  forward): symplectic Euler has bounded oscillation + no secular drift. Regime: gravity-only
  frictionless single pendulum, short horizon.
"""

from __future__ import annotations

import numpy as np
from articulated_pedagogical.model import make_simple_pendulum
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from articulated_pedagogical_diff.forward import ArticulatedDiffConfig
from articulated_pedagogical_diff.invariants import (
    energy_drift_bounded,
    gradient_matches_finite_difference,
)

# Away from the straight-down (q=0) and straight-up (q=±π) gimbal where cos q -> the linearization
# degenerates; |q| in [0.2, 1.3] is the smooth-interior regime.
_Q = st.floats(min_value=0.2, max_value=1.3)
_SETTINGS = settings(
    max_examples=10,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)


@given(q0=_Q, sign=st.sampled_from([-1.0, 1.0]))
@_SETTINGS
def test_gradient_matches_finite_difference_pbt(q0: float, sign: float) -> None:
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    q = np.array([sign * q0])
    qd = np.array([0.0])
    assert gradient_matches_finite_difference(chain, q, qd, wrt="q", rel_tol=1e-5)


@given(q0=_Q, qd0=st.floats(min_value=-1.0, max_value=1.0))
@_SETTINGS
def test_energy_drift_bounded_pbt(q0: float, qd0: float) -> None:
    # Regime: horizon >= 1 oscillation period (small-angle T0 = 2*pi*sqrt(L/g) ~ 2.0s).
    # The secular-drift metric (first-half vs second-half windowed-mean difference) is only
    # well-posed once each window averages out the O(dt) symplectic energy OSCILLATION; the
    # Stage-1a evidence showed a 0.3-period (0.6s) horizon conflates oscillation phase with drift.
    # steps=520 @ dt=0.005 = 2.6s ~ 1.3 periods -> the secular rate is well-defined (< 1e-3/s for
    # all |q0|<=1.3, |qd0|<=1.0 — the oscillation is bounded + horizon-independent). This is a
    # regime scoping on physical evidence (HARD RULE 2), NOT a tolerance widening (thresh = 1e-3).
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    cfg = ArticulatedDiffConfig(dt=0.005, steps=520)
    assert energy_drift_bounded(chain, cfg, np.array([q0]), np.array([qd0]))
