"""Inverse-problem recovery: planted initial smoke field recovered from the final frame.

The initial field ``u₀`` IS identifiable in the constant-velocity regime (the advect operator ``M``
is full-rank and well-conditioned → the L2 loss is a strictly-convex quadratic with its unique
minimum at the planted field), so it recovers to the planted value with no spurious basin.
"""

from __future__ import annotations

import numpy as np

from eulerian_smoke_diff.forward import SmokeDiffConfig
from eulerian_smoke_diff.sim import solve_recovery


def test_recover_planted_initial_field() -> None:
    cfg = SmokeDiffConfig()
    sol = solve_recovery(cfg)
    assert np.max(np.abs(sol.recovered_field - sol.planted_field)) < 1e-3
    assert sol.loss_trajectory[-1] < sol.loss_trajectory[0]
    assert sol.loss_trajectory[-1] < 1e-10


def test_gradient_fields_populated() -> None:
    """The capture payload carries the ∂Loss/∂u₀ gradient_fields (schema 1.1.0)."""
    cfg = SmokeDiffConfig()
    sol = solve_recovery(cfg)
    assert "dLoss_du0" in sol.grad_fields
    g = sol.grad_fields["dLoss_du0"]
    assert g.shape == (cfg.grid_n, cfg.grid_n)
    assert np.isfinite(g).all()
    # at the recovered minimum the gradient is near zero
    assert np.max(np.abs(g)) < 1e-6


def test_recovery_is_smooth_planted_field() -> None:
    """The planted field is the smooth Gaussian IC; recovery matches it cell-for-cell."""
    cfg = SmokeDiffConfig(grid_n=12, steps=2)
    sol = solve_recovery(cfg)
    assert np.allclose(sol.recovered_field, sol.planted_field, atol=1e-3)
