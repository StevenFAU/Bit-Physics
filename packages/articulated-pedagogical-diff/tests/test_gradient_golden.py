"""Gate-4 gradient golden table — ≥3 independent anchors (single pendulum).

The golden table ``tools/testkit/golden/tables/articulated-pedagogical-diff-gradient.json`` stores
the ``wp.Tape`` autodiff gradient at canonical single-pendulum points, each verified against an
independent reference:

* **A1** analytic STATE-sensitivity ``∂q̈/∂q = -(g/L) cos q`` (closed form; autodiff machine-exact).
* **A2** central finite-difference baseline (independent numerical method).
* **A3** analytic TORQUE-sensitivity ``∂q̈/∂τ = 1/(mL²)`` (distinct physical term/parameter/method;
  configuration-independent constant).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from articulated_pedagogical.model import make_simple_pendulum
from golden import verify_against_table

from articulated_pedagogical_diff.forward import analytic_dqddot_dq, analytic_dqddot_dtau
from articulated_pedagogical_diff.sim import central_fd_dqddot, qddot_gradient

ALGORITHM = "articulated-pedagogical-diff-gradient"


def _autodiff(inp: dict[str, Any]) -> dict[str, float]:
    chain = make_simple_pendulum(length=inp["length"], mass=inp["mass"], gravity=inp["gravity"])
    q = np.array([inp["q"]], dtype=np.float64)
    qd = np.array([inp["qd"]], dtype=np.float64)
    if inp["anchor"] == "a3-torque":
        _, g = qddot_gradient(chain, q, qd, wrt="tau")
        return {"dqddot_dtau": float(g)}
    _, g = qddot_gradient(chain, q, qd, wrt="q")
    return {"dqddot_dq": float(g)}


def gradient_evaluator(inputs: dict[str, Any]) -> dict[str, float]:
    """Dispatch on ``inputs['anchor']``; return the sim's autodiff gradient."""
    anchor = inputs["anchor"]
    if anchor in ("a1-state", "a2-fd", "a3-torque"):
        return _autodiff(inputs)
    raise KeyError(f"unknown anchor {anchor!r}")


def test_gradient_golden_table(gradient_table: Path) -> None:
    result = verify_against_table(gradient_table, gradient_evaluator)
    assert result.algorithm == ALGORITHM
    assert result.ok, result.failures
    assert result.points_passed == result.points_tested
    assert result.points_tested >= 3


def test_a1_dqddot_dq_analytic_exact() -> None:
    """A1 cross-check: autodiff ∂q̈/∂q == analytic -(g/L)cos q (machine-exact)."""
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    for q0 in (0.3, 0.7, 1.2):
        q = np.array([q0])
        qd = np.array([0.0])
        _, ad = qddot_gradient(chain, q, qd, wrt="q")
        analytic = analytic_dqddot_dq(1.0, 9.81, q0)
        assert abs(ad - analytic) <= 1e-12 + 1e-12 * abs(analytic)


def test_a2_dqddot_dq_matches_finite_difference() -> None:
    """A2 anchor mechanism: autodiff ∂q̈/∂q matches central FD (numerical baseline)."""
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    for q0 in (0.3, 0.7, 1.2):
        q = np.array([q0])
        qd = np.array([0.0])
        _, ad = qddot_gradient(chain, q, qd, wrt="q")
        fd = central_fd_dqddot(chain, q, qd, wrt="q", eps=1e-6)
        assert abs(ad - fd) / max(abs(fd), 1e-6) < 1e-5


def test_a3_dqddot_dtau_analytic_exact() -> None:
    """A3 cross-check: autodiff ∂q̈/∂τ == analytic 1/(mL²) (EXACT, config-independent)."""
    for length, mass in ((1.0, 1.0), (2.0, 0.5), (0.7, 1.3)):
        chain = make_simple_pendulum(length, mass, 9.81)
        q = np.array([0.6])
        qd = np.array([0.0])
        _, ad = qddot_gradient(chain, q, qd, wrt="tau")
        analytic = analytic_dqddot_dtau(mass, length)
        assert abs(ad - analytic) <= 1e-12 + 1e-12 * abs(analytic)
