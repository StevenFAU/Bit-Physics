"""Property-based invariants for the strange-attractors sim (gate 11).

Declarations per spec § 6.6 (closed-form sub-phase charter § 4.2):

- ``volume_contraction_rate_constant`` — for the Lorenz field at
  canonical parameters, the divergence ``div f = tr(J)`` is the
  constant ``-(sigma + 1 + beta)`` independent of ``(x, y, z)``.
- ``rk4_time_reversibility_modulo_dissipation`` — for the Sprott-A
  (volume-preserving) field, RK4-evolving N steps at ``dt`` then N
  steps at ``-dt`` recovers the initial state with error ``O(dt^4)``.

Each invariant is a zero-arg Hypothesis-decorated callable; pytest
collects the wrapping ``test_*`` functions in
``tests/test_pbt_invariants.py``, each of which simply invokes its
invariant (driving Hypothesis to sample inputs).
"""

from __future__ import annotations

import math

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .integrator import rk4_evolve
from .reference.lorenz import lorenz_field
from .reference.sprott import sprott_a_field

_SIGMA = 10.0
_RHO = 28.0
_BETA = 8.0 / 3.0
_EXPECTED_DIV = -(_SIGMA + 1.0 + _BETA)  # -41/3
_DIV_TOL = 1e-6  # central-difference truncation @ h=1e-3 is O(h^2) ~ 1e-6.


def _numerical_divergence(point: np.ndarray, *, h: float = 1e-3) -> float:
    """Central-difference estimate of div(f) at a point for Lorenz canonical.

    Three central-difference partials summed:
      div f = dfx/dx + dfy/dy + dfz/dz.
    """
    p = np.asarray(point, dtype=np.float64)
    total = 0.0
    for axis in range(3):
        ph = p.copy()
        ph[axis] += h
        pm = p.copy()
        pm[axis] -= h
        fh = lorenz_field(ph, sigma=_SIGMA, rho=_RHO, beta=_BETA)
        fm = lorenz_field(pm, sigma=_SIGMA, rho=_RHO, beta=_BETA)
        total += float((fh[axis] - fm[axis]) / (2.0 * h))
    return total


@given(
    x=st.floats(min_value=-30.0, max_value=30.0, allow_nan=False),
    y=st.floats(min_value=-30.0, max_value=30.0, allow_nan=False),
    z=st.floats(min_value=-30.0, max_value=50.0, allow_nan=False),
)
@settings(
    max_examples=30,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def volume_contraction_rate_constant(x: float, y: float, z: float) -> None:
    """Lorenz canonical: div(f) is the constant -(sigma + 1 + beta).

    The Lorenz field's Jacobian has only an off-diagonal x-dependence in
    the (z, x*y) coupling; the trace is identically the linear
    combination of parameters above. A central-difference estimate at
    an arbitrary point reproduces it within numerical tolerance.
    """
    point = np.array([x, y, z], dtype=np.float64)
    estimate = _numerical_divergence(point)
    assert math.isclose(estimate, _EXPECTED_DIV, abs_tol=_DIV_TOL), (
        f"div f at {point.tolist()} = {estimate}; expected {_EXPECTED_DIV}"
    )


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    dt=st.floats(min_value=1e-3, max_value=1e-2, allow_nan=False),
)
@settings(
    max_examples=15,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def rk4_time_reversibility_modulo_dissipation(seed: int, dt: float) -> None:
    """Sprott-A is volume-preserving; RK4 round-trip error is O(dt^4).

    Pick a small random initial state, integrate forward N steps under
    Sprott-A, then integrate backward N steps (dt -> -dt). The returned
    state should agree with the original within a constant times dt^4
    (here ``C = 100`` to absorb the proportionality constant and the
    Sprott-A field's bounded Lipschitz constant on the sampled IC ball).
    """
    rng = np.random.default_rng(int(seed))
    ic = rng.uniform(-1.0, 1.0, size=3)
    n_forward = 200
    forward = rk4_evolve(
        sprott_a_field, ic, dt=dt, n_steps=n_forward, capture_interval=n_forward
    )
    final_forward = forward[-1]
    backward = rk4_evolve(
        sprott_a_field,
        final_forward,
        dt=-dt,
        n_steps=n_forward,
        capture_interval=n_forward,
    )
    recovered = backward[-1]
    err = float(np.linalg.norm(recovered - ic))
    bound = 1e2 * (dt**4) + 1e-12
    assert err < bound, (
        f"sprott-a round-trip err={err:.3e} exceeds C*dt^4={bound:.3e} "
        f"(ic={ic.tolist()}, dt={dt}, N={n_forward})"
    )


__all__ = [
    "rk4_time_reversibility_modulo_dissipation",
    "volume_contraction_rate_constant",
]
