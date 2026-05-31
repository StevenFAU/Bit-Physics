"""Inverse problem (spec §6.1): recover the initial state (q0, qd0) from the observed final state.

A "gradients exist" demo without an inverse problem is not a differentiable sim. The single-pendulum
initial-state recovery is identifiable (2 unknowns, 2 observations) in the smooth short-horizon
regime → the optimizer converges to the planted initial state.
"""

from __future__ import annotations

import numpy as np
from articulated_pedagogical.model import make_simple_pendulum

from articulated_pedagogical_diff.forward import ArticulatedDiffConfig
from articulated_pedagogical_diff.sim import PendulumStateRecovery, solve_recovery


def test_recover_initial_state_converges() -> None:
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    cfg = ArticulatedDiffConfig(q0=0.4, qd0=0.0, dt=0.01, steps=50)
    sol = solve_recovery(chain, cfg, max_iter=4000)
    assert sol.loss_trajectory[-1] < 1e-12
    assert np.allclose(sol.recovered_q0, sol.planted_q0, atol=1e-5)
    assert np.allclose(sol.recovered_qd0, sol.planted_qd0, atol=1e-5)


def test_recover_nonzero_velocity() -> None:
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    cfg = ArticulatedDiffConfig(q0=0.3, qd0=0.5, dt=0.01, steps=40)
    sol = solve_recovery(chain, cfg, max_iter=4000)
    assert np.allclose(sol.recovered_q0, sol.planted_q0, atol=1e-5)
    assert np.allclose(sol.recovered_qd0, sol.planted_qd0, atol=1e-5)


def test_gradient_check_report_passes() -> None:
    """The autodiff loss-gradient matches central FD (the inverse-problem gradient is correct)."""
    chain = make_simple_pendulum(1.0, 1.0, 9.81)
    cfg = ArticulatedDiffConfig(q0=0.4, qd0=0.0, dt=0.01, steps=20)
    prob = PendulumStateRecovery(chain, cfg)
    target = prob.final_state(np.array([cfg.q0]), np.array([cfg.qd0]))
    prob.set_target(target)
    report = prob.check_gradient(
        params={"q0": np.array([0.2]), "qd0": np.array([0.1])}, eps=1e-6, rel_tol=1e-4
    )
    assert report.passed
    assert report.max_relative_error < 1e-4
