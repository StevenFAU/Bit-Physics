"""Stage 1a RED — double-pendulum trajectory vs an independent RK4 reference.

The double pendulum is chaotic; the golden compares production Cartesian mass
positions against an **independently-derived** double-pendulum EOM integrated
with RK4 at ``dt/100`` (the numerical baseline, NOT an analytic anchor — plan
§6.4 / D-ANCHOR). The comparison is over a SHORT horizon at a moderate amplitude
(before exponential divergence dominates) and is **convention-free**: it
compares world Cartesian positions (``link_positions``), not joint angles.

The reference EOM (absolute angles ``theta1, theta2`` from the downward vertical,
point masses) is the standard closed form; encoded inline, independent of the
production ABA. Stage 1a — FAILS with ``NotImplementedError``; Stage 1b GREEN.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

import articulated_pedagogical as ap

_L1 = 1.0
_L2 = 1.0
_M1 = 1.0
_M2 = 1.0
_G = 9.81
_TRAJ_ABS = 1e-2

# Moderate initial amplitudes (absolute angles from downward vertical), at rest.
_THETA1_0 = 0.5
_THETA2_0 = 0.7
_DT = 1e-3
_HORIZON = 0.4  # seconds — short, pre-chaotic-divergence
_REFINE = 100


def _accel(theta: NDArray[np.floating], omega: NDArray[np.floating]) -> NDArray[np.floating]:
    """Standard double-pendulum angular accelerations (absolute-from-vertical)."""
    t1, t2 = float(theta[0]), float(theta[1])
    w1, w2 = float(omega[0]), float(omega[1])
    dt12 = t1 - t2
    denom = 2.0 * _M1 + _M2 - _M2 * np.cos(2.0 * t1 - 2.0 * t2)
    a1 = (
        -_G * (2.0 * _M1 + _M2) * np.sin(t1)
        - _M2 * _G * np.sin(t1 - 2.0 * t2)
        - 2.0 * np.sin(dt12) * _M2 * (w2 * w2 * _L2 + w1 * w1 * _L1 * np.cos(dt12))
    ) / (_L1 * denom)
    a2 = (
        2.0
        * np.sin(dt12)
        * (
            w1 * w1 * _L1 * (_M1 + _M2)
            + _G * (_M1 + _M2) * np.cos(t1)
            + w2 * w2 * _L2 * _M2 * np.cos(dt12)
        )
    ) / (_L2 * denom)
    return np.array([a1, a2], dtype=np.float64)


def _reference_positions() -> NDArray[np.floating]:
    """RK4 reference at dt/REFINE; world Cartesian mass positions per sampled
    step, shape ``(n_steps + 1, 2, 2)``."""
    n_steps = round(_HORIZON / _DT)
    h = _DT / _REFINE
    theta = np.array([_THETA1_0, _THETA2_0], dtype=np.float64)
    omega = np.zeros(2, dtype=np.float64)

    def deriv(state: NDArray[np.floating]) -> NDArray[np.floating]:
        th, om = state[:2], state[2:]
        return np.concatenate([om, _accel(th, om)])

    def cart(th: NDArray[np.floating]) -> NDArray[np.floating]:
        x1 = _L1 * np.sin(th[0])
        y1 = -_L1 * np.cos(th[0])
        x2 = x1 + _L2 * np.sin(th[1])
        y2 = y1 - _L2 * np.cos(th[1])
        return np.array([[x1, y1], [x2, y2]], dtype=np.float64)

    out = [cart(theta)]
    state = np.concatenate([theta, omega])
    for _step in range(n_steps):
        for _sub in range(_REFINE):
            k1 = deriv(state)
            k2 = deriv(state + 0.5 * h * k1)
            k3 = deriv(state + 0.5 * h * k2)
            k4 = deriv(state + h * k3)
            state = state + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
        out.append(cart(state[:2]))
    return np.array(out, dtype=np.float64)


def test_double_pendulum_matches_rk4_reference() -> None:
    """Production Cartesian trajectory matches the RK4 reference (atol 1e-2)."""
    chain = ap.make_double_pendulum(_L1, _L2, _M1, _M2, _G)
    # Physical IC: absolute angles (theta1, theta2) -> relative joint coords.
    q0 = np.array([_THETA1_0, _THETA2_0 - _THETA1_0], dtype=np.float64)
    qd0 = np.zeros(2, dtype=np.float64)
    n_steps = round(_HORIZON / _DT)

    q_traj, _qd_traj = ap.simulate(chain, q0, qd0, _DT, n_steps, integrator="rk4")
    prod_positions = np.array([ap.link_positions(chain, q) for q in q_traj])

    ref_positions = _reference_positions()
    assert prod_positions.shape == ref_positions.shape
    np.testing.assert_allclose(prod_positions, ref_positions, atol=_TRAJ_ABS, rtol=0.0)
