"""Tier-3 rigid-body: pendulum period-recovery diagnostic.

Verifies a measured single-pendulum oscillation period matches the analytic
large-angle exact period ``T = 4*sqrt(L/g)*K(sin(theta0/2))`` within the
declared relative tolerance (`pendulum_period_rel`). Used by the golden-table
regression suite.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.special import ellipk


@dataclass(frozen=True)
class PeriodRecoveryReport:
    """Report for :func:`check_period_recovery`."""

    measured_period: float
    analytic_period: float
    rel_error: float
    ok: bool


def analytic_large_angle_period(length: float, gravity: float, theta0: float) -> float:
    """``T = 4*sqrt(L/g)*K(sin(theta0/2))`` (SciPy parameter ``m = k**2``)."""
    m = float(np.sin(theta0 / 2.0) ** 2)
    return float(4.0 * np.sqrt(length / gravity) * ellipk(m))


def check_period_recovery(
    measured_period: float,
    length: float,
    gravity: float,
    theta0: float,
    *,
    rel_tol: float = 1e-3,
) -> PeriodRecoveryReport:
    """Compare a measured period against the analytic large-angle exact period."""
    analytic = analytic_large_angle_period(length, gravity, theta0)
    rel_error = abs(measured_period - analytic) / abs(analytic)
    return PeriodRecoveryReport(
        measured_period=float(measured_period),
        analytic_period=analytic,
        rel_error=float(rel_error),
        ok=rel_error < rel_tol,
    )
