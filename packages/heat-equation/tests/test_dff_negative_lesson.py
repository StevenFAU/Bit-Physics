"""DuFort-Frankel negative-lesson controls (spec-ref.md § 3.6, § 6.5).

DFF at dt = O(dx) is INCONSISTENT with the heat equation: the truncation
term (dt/dx)^2 * T_tt survives refinement, so the scheme converges to a
telegraph-type equation. The executable pin: refine dx -> dx/2 with dt =
gamma*dx FIXED-RATIO and a fixed final time — the FTCS error (dt ~ dx^2)
shrinks at second order, while the DFF-vs-exact deviation does NOT vanish
(it converges to the telegraph-vs-heat gap). Never a gate; never marketed.

Attribution honesty (v0.3): the telegraph inconsistency is the CLASSICAL
result; Corem & Ditkowski 2012's new result is that DFF is NOT
unconditionally stable (non-normal amplification-matrix norm growth) —
their consistency analysis actually softens the classical defect.
"""

from __future__ import annotations

import numpy as np
from heat_equation.reference import (
    dff_step,
    fourier_mode,
    ftcs_step,
    sinsin_amplitude,
    stability_bound_dt,
)

ALPHA = 1.0
T_FINAL = 0.05
GAMMA = 0.05  # dt = GAMMA * dx  (dt = O(dx): the inconsistent regime)
MODE = (2, 1)


def _exact_amp(t: float) -> float:
    k2 = (2.0 * np.pi * MODE[0]) ** 2 + (2.0 * np.pi * MODE[1]) ** 2
    return float(np.exp(-ALPHA * k2 * t))


def _run_dff(n: int) -> float:
    dx = 1.0 / n
    dt = GAMMA * dx
    steps = int(round(T_FINAL / dt))
    t0 = fourier_mode(n, n, *MODE)
    # FTCS bootstrap for the second level, at the SAME dt (the scheme's own
    # startup recipe; one inconsistent-regime FTCS step of O(dt) error).
    prev = t0
    curr = ftcs_step(t0, ALPHA, dt, dx, dx)
    for _ in range(steps - 1):
        prev, curr = curr, dff_step(prev, curr, ALPHA, dt, dx, dx)
    return sinsin_amplitude(curr, *MODE)


def _run_ftcs(n: int) -> float:
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(ALPHA, dx, dx)
    steps = int(np.ceil(T_FINAL / dt))
    dt = T_FINAL / steps
    t = fourier_mode(n, n, *MODE)
    for _ in range(steps):
        t = ftcs_step(t, ALPHA, dt, dx, dx)
    return sinsin_amplitude(t, *MODE)


def test_dff_at_dt_order_dx_solves_the_wrong_equation() -> None:
    exact = _exact_amp(T_FINAL)
    dev_dff_coarse = abs(_run_dff(64) - exact)
    dev_dff_fine = abs(_run_dff(128) - exact)
    dev_ftcs_fine = abs(_run_ftcs(128) - exact)

    # FTCS (dt ~ dx^2) genuinely converges to the heat equation...
    assert dev_ftcs_fine <= 0.25 * dev_dff_fine, (
        f"FTCS dev {dev_ftcs_fine:.3e} not << DFF dev {dev_dff_fine:.3e}"
    )
    # ...while the DFF deviation does NOT vanish under refinement at fixed
    # dt/dx (it approaches the telegraph-vs-heat gap, not zero).
    assert dev_dff_fine >= 0.4 * dev_dff_coarse, (
        f"DFF deviation vanished under refinement ({dev_dff_coarse:.3e} -> "
        f"{dev_dff_fine:.3e}) — the negative lesson would be false"
    )
    # And the deviation is macroscopic relative to the surviving amplitude.
    assert dev_dff_fine >= 0.01 * exact


def test_dff_consistent_regime_recovers_heat() -> None:
    """Honesty twin: at dt = O(dx^2) (dt/dx -> 0) DFF IS consistent — the
    deviation drops far below the inconsistent-regime one. The lesson is the
    REGIME, not the stencil."""
    n = 64
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(ALPHA, dx, dx)  # dt ~ dx^2
    steps = int(np.ceil(T_FINAL / dt))
    dt = T_FINAL / steps
    t0 = fourier_mode(n, n, *MODE)
    prev = t0
    curr = ftcs_step(t0, ALPHA, dt, dx, dx)
    for _ in range(steps - 1):
        prev, curr = curr, dff_step(prev, curr, ALPHA, dt, dx, dx)
    dev_consistent = abs(sinsin_amplitude(curr, *MODE) - _exact_amp(T_FINAL))
    dev_inconsistent = abs(_run_dff(n) - _exact_amp(T_FINAL))
    assert dev_consistent <= 0.2 * dev_inconsistent
