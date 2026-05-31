"""Inverse-problem recovery: a planted D_u is recovered from a synthetic target."""

from __future__ import annotations

import numpy as np

from reaction_diffusion_2d_diff.forward import RD2DDiffConfig
from reaction_diffusion_2d_diff.sim import solve_diffusion_id


def test_recover_planted_diffusion_coefficient() -> None:
    cfg = RD2DDiffConfig(n=16, steps=8)
    sol = solve_diffusion_id(cfg, planted_du=0.16, init_du=0.10)
    assert abs(sol.recovered - sol.planted) < 1e-3
    assert sol.loss_trajectory[-1] < 1e-8
    # the optimization is monotone-ish: final loss well below the initial
    assert sol.loss_trajectory[-1] < sol.loss_trajectory[0]


def test_gradient_fields_populated() -> None:
    """The capture payload carries the ∂Loss/∂D_u gradient_fields (schema 1.1.0)."""
    cfg = RD2DDiffConfig(n=16, steps=8)
    sol = solve_diffusion_id(cfg, planted_du=0.16, init_du=0.12)
    assert "dLoss_dDu" in sol.grad_fields
    grad = sol.grad_fields["dLoss_dDu"]
    assert grad.shape == (1,)
    assert np.isfinite(grad).all()
    # at the recovered minimum the gradient is near zero
    assert abs(float(grad[0])) < 1e-3


def test_recovery_from_higher_init() -> None:
    cfg = RD2DDiffConfig(n=16, steps=8)
    sol = solve_diffusion_id(cfg, planted_du=0.16, init_du=0.22)
    assert abs(sol.recovered - sol.planted) < 1e-3
