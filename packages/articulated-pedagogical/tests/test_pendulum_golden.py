"""Stage 1a RED — single-revolute (simple pendulum) golden anchors.

Three independent analytic anchors of the ideal simple pendulum
``theta'' = -(g/L) sin(theta)`` (q measured from the downward vertical, CCW
positive), per D-ANCHOR (charter §6):

- **A1** small-angle period ``T0 = 2*pi*sqrt(L/g)`` (Marion & Thornton §3.2).
- **A2** large-angle exact period ``T = 4*sqrt(L/g)*K(sin(theta0/2))`` (NIST
  DLMF §19.2 + §22.19(i) / Landau & Lifshitz §11).
- **A3** trajectory ``theta(t) = 2*arcsin(sin(theta0/2)*cn(omega0*t, k))``
  (DLMF §22.19(i)).

Plus the ABA forward-dynamics check for the 1-link pendulum
(``qdd == -(g/L) sin(q)``) and an integrated-period check (semi-implicit Euler
recovers A2 within ``pendulum_period_rel = 1e-3``).

The expected values are computed inline via ``scipy.special`` (independent of
the production code under test). Stage 1a — every test FAILS with
``NotImplementedError`` from the analytic / ABA / integrator shells; Stage 1b
inverts to GREEN.
"""

from __future__ import annotations

import numpy as np
import pytest
from scipy.special import ellipj, ellipk

import articulated_pedagogical as ap

_L = 1.0
_G = 9.81
_THETA0 = 2.0  # rad, large amplitude (~114.6 deg)
_PERIOD_REL = 1e-3
_TRAJ_ABS = 1e-2


def _omega0(length: float, gravity: float) -> float:
    return float(np.sqrt(gravity / length))


def test_small_angle_period_anchor_A1() -> None:
    """A1 — small-angle period T0 = 2*pi*sqrt(L/g)."""
    expected = 2.0 * np.pi * np.sqrt(_L / _G)
    got = ap.pendulum_period_small_angle(_L, _G)
    assert got == pytest.approx(expected, rel=_PERIOD_REL)


def test_large_angle_period_anchor_A2() -> None:
    """A2 — exact period T = 4*sqrt(L/g)*K(sin(theta0/2)) (SciPy m = k**2)."""
    m = np.sin(_THETA0 / 2.0) ** 2
    expected = 4.0 * np.sqrt(_L / _G) * float(ellipk(m))
    got = ap.pendulum_period_large_angle(_L, _G, _THETA0)
    assert got == pytest.approx(expected, rel=_PERIOD_REL)


def test_trajectory_jacobi_cn_anchor_A3() -> None:
    """A3 — theta(t) = 2*arcsin(sin(theta0/2)*cn(omega0*t, k))."""
    k = np.sin(_THETA0 / 2.0)
    m = k * k
    t = np.linspace(0.0, 1.5, 16)
    _sn, cn, _dn, _ph = ellipj(_omega0(_L, _G) * t, m)
    expected = 2.0 * np.arcsin(k * cn)
    got = ap.pendulum_angle(_L, _G, _THETA0, t)
    np.testing.assert_allclose(got, expected, atol=_TRAJ_ABS, rtol=0.0)


def test_aba_single_link_equation_of_motion() -> None:
    """ABA forward dynamics for the 1-link pendulum: qdd = -(g/L) sin(q)."""
    pendulum = ap.make_simple_pendulum(length=_L, mass=1.0, gravity=_G)
    for theta in (0.3, 1.0, _THETA0, -0.7):
        q = np.array([theta], dtype=np.float64)
        qd = np.zeros(1, dtype=np.float64)
        expected = np.array([-(_G / _L) * np.sin(theta)], dtype=np.float64)
        got = ap.aba_forward_dynamics(pendulum, q, qd)
        np.testing.assert_allclose(got, expected, atol=1e-10, rtol=0.0)


def test_integrated_period_matches_large_angle_anchor() -> None:
    """RK4 trajectory recovers the A2 exact period (rel 1e-3)."""
    pendulum = ap.make_simple_pendulum(length=_L, mass=1.0, gravity=_G)
    dt = 1e-3
    n_steps = round(3.0 / dt)
    q0 = np.array([_THETA0], dtype=np.float64)
    qd0 = np.zeros(1, dtype=np.float64)
    q_traj, _qd_traj = ap.simulate(pendulum, q0, qd0, dt, n_steps, integrator="rk4")

    # Period = time between successive sign changes of (q - 0) on the way back
    # through the bottom; measure via the first full return to +theta0 region.
    theta = q_traj[:, 0]
    # First zero crossing (downward through vertical) then next: half period.
    crossings = np.where(np.signbit(theta[:-1]) != np.signbit(theta[1:]))[0]
    assert crossings.size >= 2
    half_period = (crossings[1] - crossings[0]) * dt
    measured_period = 2.0 * half_period

    m = np.sin(_THETA0 / 2.0) ** 2
    exact_period = 4.0 * np.sqrt(_L / _G) * float(ellipk(m))
    assert measured_period == pytest.approx(exact_period, rel=_PERIOD_REL)
