"""Inverse-problem recovery: planted (mu,sigma) recovered from a synthetic target."""

from __future__ import annotations

import numpy as np

from lenia_diff.forward import LeniaDiffConfig
from lenia_diff.sim import solve_growth_id


def test_recover_planted_growth_params() -> None:
    cfg = LeniaDiffConfig(grid=16, R=3, steps=4)
    sol = solve_growth_id(cfg, planted=(0.30, 0.15), init=(0.26, 0.13))
    # mu is the well-identified parameter; the recovered field (loss) must collapse
    assert abs(sol.recovered_mu - sol.planted_mu) < 1e-3
    assert sol.loss_trajectory[-1] < 1e-9
    assert sol.loss_trajectory[-1] < sol.loss_trajectory[0]


def test_gradient_fields_populated() -> None:
    """The capture payload carries the ∂Loss/∂mu + ∂Loss/∂sigma gradient_fields (schema 1.1.0)."""
    cfg = LeniaDiffConfig(grid=16, R=3, steps=4)
    sol = solve_growth_id(cfg, planted=(0.30, 0.15), init=(0.27, 0.14))
    assert "dLoss_dmu" in sol.grad_fields
    assert "dLoss_dsigma" in sol.grad_fields
    for key in ("dLoss_dmu", "dLoss_dsigma"):
        g = sol.grad_fields[key]
        assert g.shape == (1,)
        assert np.isfinite(g).all()
        # at the recovered minimum the gradient is near zero
        assert abs(float(g[0])) < 1e-3


def test_recovery_from_higher_init() -> None:
    cfg = LeniaDiffConfig(grid=16, R=3, steps=4)
    sol = solve_growth_id(cfg, planted=(0.30, 0.15), init=(0.34, 0.17))
    assert abs(sol.recovered_mu - sol.planted_mu) < 1e-3
