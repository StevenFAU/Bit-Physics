"""Property-based invariants for the strange-attractors sim (gate 11).

Declarations per spec § 6.6 (closed-form sub-phase charter § 4.2),
extended by the X-A family expansion (≥ 2 invariants per system):

- ``volume_contraction_rate_constant`` — for the Lorenz field at
  canonical parameters, the divergence ``div f = tr(J)`` is the
  constant ``-(sigma + 1 + beta)`` independent of ``(x, y, z)``.
- ``rk4_time_reversibility_modulo_dissipation`` — for the Sprott-A
  (volume-preserving) field, RK4-evolving N steps at ``dt`` then N
  steps at ``-dt`` recovers the initial state with error ``O(dt^4)``.
- ``rossler_divergence_affine_in_x`` — Rössler's div f = a + (x - c)
  at any sampled point (central-difference cross-check).
- ``rossler_fixed_points_null_field`` — the closed-form fixed points
  annihilate the field for arbitrary valid (a, b, c).
- ``aizawa_divergence_matches_closed_form`` — Aizawa's state-dependent
  trace formula matches the central-difference estimate anywhere.
- ``aizawa_axis_fixed_points_null_field`` — every real root of the
  on-axis cubic is a genuine fixed point for arbitrary (a, c).
- ``sprott_a_parity_equivariance`` — f(-x, -y, z) = (-f1, -f2, f3)
  exactly at any sampled point (the case-A symmetry).

Each invariant is a zero-arg Hypothesis-decorated callable; pytest
collects the wrapping ``test_*`` functions in
``tests/test_pbt_invariants.py``, each of which simply invokes its
invariant (driving Hypothesis to sample inputs).
"""

from __future__ import annotations

import math
from collections.abc import Callable

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .integrator import rk4_evolve
from .reference import aizawa as aizawa_ref
from .reference import rossler as rossler_ref
from .reference.lorenz import lorenz_field
from .reference.sprott import parity_transform, sprott_a_field

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


def _central_difference_divergence(
    field: Callable[[np.ndarray], np.ndarray],
    point: np.ndarray,
    *,
    h: float = 1e-3,
) -> float:
    """Central-difference div(f) estimate for an arbitrary 3D field."""
    p = np.asarray(point, dtype=np.float64)
    total = 0.0
    for axis in range(3):
        ph = p.copy()
        ph[axis] += h
        pm = p.copy()
        pm[axis] -= h
        total += float((field(ph)[axis] - field(pm)[axis]) / (2.0 * h))
    return total


@given(
    x=st.floats(min_value=-25.0, max_value=25.0, allow_nan=False),
    y=st.floats(min_value=-30.0, max_value=30.0, allow_nan=False),
    z=st.floats(min_value=-5.0, max_value=40.0, allow_nan=False),
)
@settings(
    max_examples=30,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def rossler_divergence_affine_in_x(x: float, y: float, z: float) -> None:
    """Rössler canonical: div(f) = a + (x - c) at every point.

    Unlike Lorenz the trace is state-dependent (linear in x); the
    central-difference estimate must reproduce the closed form anywhere.
    """
    point = np.array([x, y, z], dtype=np.float64)
    estimate = _central_difference_divergence(rossler_ref.rossler_field, point)
    expected = rossler_ref.divergence(point)
    assert math.isclose(estimate, expected, abs_tol=_DIV_TOL), (
        f"rossler div at {point.tolist()} = {estimate}; expected {expected}"
    )


@given(
    a=st.floats(min_value=0.05, max_value=0.5, allow_nan=False),
    b=st.floats(min_value=0.05, max_value=0.5, allow_nan=False),
    c=st.floats(min_value=2.0, max_value=12.0, allow_nan=False),
)
@settings(
    max_examples=30,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def rossler_fixed_points_null_field(a: float, b: float, c: float) -> None:
    """The closed-form Rössler fixed points annihilate the field.

    Sampled (a, b, c) stay inside c**2 > 4*a*b (guaranteed by the
    strategy ranges: c >= 2 while 4ab <= 1), so both roots are real.
    """
    fps = rossler_ref.fixed_points(a=a, b=b, c=c)
    for name, p in fps.items():
        residual = rossler_ref.rossler_field(
            np.asarray(p, dtype=np.float64), a=a, b=b, c=c
        )
        norm = float(np.linalg.norm(residual))
        scale = 1.0 + float(np.linalg.norm(p))
        assert norm <= 1e-9 * scale, (
            f"rossler {name} at (a={a}, b={b}, c={c}): |f| = {norm}"
        )


@given(
    x=st.floats(min_value=-2.0, max_value=2.0, allow_nan=False),
    y=st.floats(min_value=-2.0, max_value=2.0, allow_nan=False),
    z=st.floats(min_value=-2.0, max_value=2.0, allow_nan=False),
)
@settings(
    max_examples=30,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def aizawa_divergence_matches_closed_form(x: float, y: float, z: float) -> None:
    """Aizawa canonical: the trace formula holds at every point.

    div f = 2*(z - b) + a - z**2 - e*(x**2 + y**2) + f*x**3 — the
    central-difference estimate must reproduce it (h=1e-3 truncation is
    O(h^2); the cubic terms bound the third derivative on the sampled
    box, so 1e-5 absolute slack is comfortable).
    """
    point = np.array([x, y, z], dtype=np.float64)
    estimate = _central_difference_divergence(aizawa_ref.aizawa_field, point)
    expected = aizawa_ref.divergence(point)
    assert math.isclose(estimate, expected, abs_tol=1e-5), (
        f"aizawa div at {point.tolist()} = {estimate}; expected {expected}"
    )


@given(
    a=st.floats(min_value=0.3, max_value=2.0, allow_nan=False),
    c=st.floats(min_value=0.1, max_value=2.0, allow_nan=False),
)
@settings(
    max_examples=30,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def aizawa_axis_fixed_points_null_field(a: float, c: float) -> None:
    """Every real on-axis cubic root is a genuine Aizawa fixed point."""
    roots = aizawa_ref.axis_fixed_points(a=a, c=c)
    assert roots, f"cubic z^3 - 3*{a}*z - 3*{c} has no real root?"
    for z_star in roots:
        p = np.array([0.0, 0.0, z_star], dtype=np.float64)
        residual = aizawa_ref.aizawa_field(p, a=a, c=c)
        norm = float(np.linalg.norm(residual))
        assert norm <= 1e-8 * (1.0 + abs(z_star) ** 3), (
            f"aizawa axis root z={z_star} at (a={a}, c={c}): |f| = {norm}"
        )


@given(
    x=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False),
    y=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False),
    z=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False),
)
@settings(
    max_examples=30,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def sprott_a_parity_equivariance(x: float, y: float, z: float) -> None:
    """Sprott-A case symmetry: f(Px) = P f(x) with P = diag(-1, -1, 1).

    Exact in floating point (negation is exact), so the residual must
    be identically zero — no tolerance.
    """
    s = np.array([x, y, z], dtype=np.float64)
    lhs = sprott_a_field(parity_transform(s))
    rhs = parity_transform(sprott_a_field(s))
    assert np.array_equal(lhs, rhs), (
        f"sprott-a parity residual at {s.tolist()}: {(lhs - rhs).tolist()}"
    )


__all__ = [
    "aizawa_axis_fixed_points_null_field",
    "aizawa_divergence_matches_closed_form",
    "rk4_time_reversibility_modulo_dissipation",
    "rossler_divergence_affine_in_x",
    "rossler_fixed_points_null_field",
    "sprott_a_parity_equivariance",
    "volume_contraction_rate_constant",
]
