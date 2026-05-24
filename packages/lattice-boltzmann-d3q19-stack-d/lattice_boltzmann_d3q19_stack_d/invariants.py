"""Property-based invariants for lattice-boltzmann-d3q19 Stack-D (gate 12).

Ported from the Phase-1 reference invariants.py (spec-ref section 6.6); the
equilibrium-distribution algebra is identical, so the invariants hold for the
Stack-D Taichi reference's point-eval ``feq`` / ``density_moment`` /
``momentum_moment`` up to the f64 accumulation residual:

- :func:`equilibrium_density_moment`  -- ``sum(f_i^eq) = rho`` identically.
- :func:`equilibrium_momentum_moment` -- ``sum(c_i . f_i^eq) = rho * u`` per axis.

Hypothesis samples random (rho, u) within the weakly-compressible band; the
guard against the lex-ordered 19-term-sum typo surface (R-LBM-4).
"""

from __future__ import annotations

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference import CS2, density_moment, feq, momentum_moment

_MA_BOUND: float = 0.1  # weakly-compressible regime.
_U_BOUND: float = _MA_BOUND * (1.0 / 3.0) ** 0.5  # = Ma * c_s
_DENSITY_TOL: float = 1e-14
_MOMENTUM_TOL: float = 1e-14


@given(
    rho=st.floats(min_value=0.5, max_value=1.5, allow_nan=False, allow_infinity=False),
    ux=st.floats(min_value=-_U_BOUND, max_value=_U_BOUND, allow_nan=False, allow_infinity=False),
    uy=st.floats(min_value=-_U_BOUND, max_value=_U_BOUND, allow_nan=False, allow_infinity=False),
    uz=st.floats(min_value=-_U_BOUND, max_value=_U_BOUND, allow_nan=False, allow_infinity=False),
)
@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def equilibrium_density_moment(rho: float, ux: float, uy: float, uz: float) -> None:
    """sum(f_i^eq(rho, u)) = rho identically within FP tolerance."""
    u = (ux, uy, uz)
    u_mag = (ux * ux + uy * uy + uz * uz) ** 0.5
    if u_mag / (CS2**0.5) >= _MA_BOUND:
        return
    f = feq(rho, u)
    rho_recovered = density_moment(f)
    assert abs(rho_recovered - rho) <= _DENSITY_TOL * max(abs(rho), 1.0), (
        f"equilibrium_density_moment violated: rho_in={rho:.6e} rho_out={rho_recovered:.6e} "
        f"diff={abs(rho_recovered - rho):.3e}"
    )


@given(
    rho=st.floats(min_value=0.5, max_value=1.5, allow_nan=False, allow_infinity=False),
    ux=st.floats(min_value=-_U_BOUND, max_value=_U_BOUND, allow_nan=False, allow_infinity=False),
    uy=st.floats(min_value=-_U_BOUND, max_value=_U_BOUND, allow_nan=False, allow_infinity=False),
    uz=st.floats(min_value=-_U_BOUND, max_value=_U_BOUND, allow_nan=False, allow_infinity=False),
)
@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def equilibrium_momentum_moment(rho: float, ux: float, uy: float, uz: float) -> None:
    """sum(c_i . f_i^eq) = rho * u per component within FP tolerance."""
    u = (ux, uy, uz)
    u_mag = (ux * ux + uy * uy + uz * uz) ** 0.5
    if u_mag / (CS2**0.5) >= _MA_BOUND:
        return
    f = feq(rho, u)
    mom = momentum_moment(f)
    expected = [rho * ux, rho * uy, rho * uz]
    for axis, name in enumerate(("x", "y", "z")):
        diff = abs(mom[axis] - expected[axis])
        tol_axis = _MOMENTUM_TOL * max(abs(expected[axis]), 1.0)
        assert diff <= tol_axis, (
            f"equilibrium_momentum_moment[{name}] violated: "
            f"expected={expected[axis]:.6e} got={mom[axis]:.6e} diff={diff:.3e}"
        )


__all__ = [
    "equilibrium_density_moment",
    "equilibrium_momentum_moment",
]
