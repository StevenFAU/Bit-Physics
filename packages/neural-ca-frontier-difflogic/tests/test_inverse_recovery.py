"""Inverse-problem recovery: planted soft-excitation alpha recovered from the final state."""

from __future__ import annotations

import numpy as np

from neural_ca_frontier_difflogic.forward import DiffLogicConfig
from neural_ca_frontier_difflogic.sim import solve_recovery


def test_recover_planted_alpha() -> None:
    cfg = DiffLogicConfig()
    sol = solve_recovery(cfg, planted=0.60, init=0.30)
    assert abs(sol.recovered_alpha - sol.planted_alpha) < 1e-3
    assert sol.loss_trajectory[-1] < sol.loss_trajectory[0]


def test_gradient_fields_populated() -> None:
    """The capture payload carries the dLoss/dalpha gradient_fields (schema 1.1.0)."""
    cfg = DiffLogicConfig()
    sol = solve_recovery(cfg, planted=0.60, init=0.40)
    assert "dLoss_dalpha" in sol.grad_fields
    g = sol.grad_fields["dLoss_dalpha"]
    assert g.shape == (1,)
    assert np.isfinite(g).all()
    # near the recovered minimum the gradient is small
    assert float(np.max(np.abs(g))) < 1e-6


def test_recovery_from_other_init() -> None:
    cfg = DiffLogicConfig()
    sol = solve_recovery(cfg, planted=0.25, init=0.70)
    assert abs(sol.recovered_alpha - sol.planted_alpha) < 1e-3
