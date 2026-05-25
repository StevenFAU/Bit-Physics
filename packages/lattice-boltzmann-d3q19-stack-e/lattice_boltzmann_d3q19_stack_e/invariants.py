"""Property-based invariants for lattice-boltzmann-d3q19 Stack-E (gate 11).

Two equilibrium-algebra invariants port VERBATIM from the Phase-1 reference
(identical analytic property; the Stack-E reference's point-eval feq /
density_moment / momentum_moment satisfy them up to FP accumulation residual):

- :func:`equilibrium_density_moment` -- for any (rho, u) within the
  weakly-compressible band, ``sum(f_i^eq) = rho`` identically (algebraic.md
  section 4 + section 5).
- :func:`equilibrium_momentum_moment` -- for any (rho, u),
  ``sum(c_i . f_i^eq) = rho . u`` identically per component (algebraic.md
  section 4).

Both are analytically exact in the equilibrium-distribution algebra (no numerical
solver); the PBT witnesses them up to the floating-point accumulation residual.
The Hypothesis sampling guards against typos in the per-direction sum (the
lex-ordered 19-term sum is the high-leverage failure surface -- R-LBM-4).
"""

from __future__ import annotations

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference import CS2, density_moment, feq, momentum_moment

_MA_BOUND: float = 0.1  # weakly-compressible regime per algebraic.md section 3.
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
    """``sum(f_i^eq(rho, u)) = rho`` identically within FP tolerance.

    The D3Q19 equilibrium-distribution algebra preserves the zeroth moment exactly
    (Kruger 2017 Ch. 3 / algebraic.md section 5). The PBT samples random (rho, u)
    within the weakly-compressible band and verifies the recovered density.
    """
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
    """``sum(c_i . f_i^eq) = rho . u`` identically per component within FP tol.

    The first moment of the D3Q19 equilibrium recovers rho*u exactly
    (algebraic.md section 5). PBT samples random (rho, u); asserts each of the
    three component sums matches rho*u_alpha within FP tolerance.
    """
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
