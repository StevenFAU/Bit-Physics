"""2D MMS convergence (spec-ref.md § 4.4, § 6.1; heat_2d solution).

T = sin(2*pi*x/Lx)*sin(2*pi*y/Ly)*cos(t) with the derived source
S = T_t - alpha*(T_xx + T_yy). dt scales with dx^2 (CFL fixed), so the
first-order temporal error rides at O(dx^2) and the observed order is the
formal spatial order 2.0 (+/- 0.5 — the heat-1D acceptance envelope).

Honesty note (§ 6.1): MMS detects only order-of-accuracy-affecting coding
mistakes; the machine-exact spectral gates cover a different, sharper class.
The heat_2d solution class is committed under
tools/testkit/code_verification/mms/solutions/heat_2d/ and cross-checked
here against the package's own manufactured functions.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from heat_equation.reference import ftcs_step, grid_coords, mms_solution, mms_source

REPO = Path(__file__).resolve().parents[3]

ALPHA = 1.0
CFL_SUM = 0.25  # r_x + r_y — half the stability bound, heat-1D runner parity
T_FINAL = 0.05
RESOLUTIONS = (16, 32, 64, 128)


def _run_mms(n: int) -> tuple[float, float]:
    dx = 1.0 / n
    dt_max = CFL_SUM * dx * dx / (2.0 * ALPHA)
    steps = int(np.ceil(T_FINAL / dt_max))
    dt = T_FINAL / steps
    x, y = grid_coords(n, n)
    t_field = mms_solution(x, y, 0.0)
    for i in range(steps):
        t_now = i * dt
        t_field = ftcs_step(
            t_field, ALPHA, dt, dx, dx, source=mms_source(x, y, t_now, ALPHA)
        )
    exact = mms_solution(x, y, T_FINAL)
    err = t_field - exact
    l2 = float(np.sqrt(np.mean(err * err)))
    linf = float(np.max(np.abs(err)))
    return l2, linf


def _observed_order(dxs: list[float], errs: list[float]) -> float:
    slope, _ = np.polyfit(np.log(dxs), np.log(errs), 1)
    return float(slope)


def test_mms_observed_order_is_2() -> None:
    dxs, l2s, linfs = [], [], []
    for n in RESOLUTIONS:
        l2, linf = _run_mms(n)
        dxs.append(1.0 / n)
        l2s.append(l2)
        linfs.append(linf)
    order_l2 = _observed_order(dxs, l2s)
    order_linf = _observed_order(dxs, linfs)
    assert abs(order_l2 - 2.0) <= 0.5, (
        f"observed L2 order {order_l2:.4f} outside 2.0 +/- 0.5"
    )
    assert abs(order_linf - 2.0) <= 0.5, (
        f"observed Linf order {order_linf:.4f} outside 2.0 +/- 0.5"
    )


def test_mms_matches_committed_solution_class() -> None:
    """The committed heat_2d MMS solution class and the package's manufactured
    functions must be the same functions (drift here = silently divergent
    goldens)."""
    sys.path.insert(0, str(REPO / "tools/testkit"))
    from code_verification.mms.solutions.heat_2d.solution import HeatEq2DSolution

    sol = HeatEq2DSolution(alpha=ALPHA)
    x, y = grid_coords(48, 48)
    for t in (0.0, 0.3, 1.1):
        np.testing.assert_allclose(
            sol.evaluate(x, y, t), mms_solution(x, y, t), rtol=1e-14
        )
        np.testing.assert_allclose(
            sol.source_term(x, y, t), mms_source(x, y, t, ALPHA), rtol=1e-13, atol=1e-13
        )


def test_flipped_laplacian_sign_fails_mms() -> None:
    """Negative control (§ 6.5): flip the Laplacian sign — the MMS error at a
    single resolution must explode relative to the correct scheme."""
    n = 32
    dx = 1.0 / n
    dt_max = CFL_SUM * dx * dx / (2.0 * ALPHA)
    steps = int(np.ceil(0.01 / dt_max))
    dt = 0.01 / steps
    x, y = grid_coords(n, n)
    good = mms_solution(x, y, 0.0)
    bad = good.copy()
    for i in range(steps):
        t_now = i * dt
        src = mms_source(x, y, t_now, ALPHA)
        good = ftcs_step(good, ALPHA, dt, dx, dx, source=src)
        bad = ftcs_step(bad, -ALPHA, dt, dx, dx, source=src)  # anti-diffusion
    exact = mms_solution(x, y, 0.01)
    err_good = float(np.max(np.abs(good - exact)))
    err_bad = float(np.max(np.abs(bad - exact)))
    assert err_bad > 100.0 * err_good
