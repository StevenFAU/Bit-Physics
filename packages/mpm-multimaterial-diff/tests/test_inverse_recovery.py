"""Inverse-problem recovery: planted shared v0 recovered from final positions.

Unlike lenia-diff's joint ``(mu,sigma)``, the shared ``v0`` IS identifiable (near-linear injective
map ``v0 -> final_positions``), so it recovers to the planted value with no spurious basin.
"""

from __future__ import annotations

import numpy as np

from mpm_multimaterial_diff.forward import MpmDiffConfig
from mpm_multimaterial_diff.sim import solve_recovery


def test_recover_planted_initial_velocity() -> None:
    cfg = MpmDiffConfig()
    sol = solve_recovery(cfg, planted=(0.30, 0.10, -0.20), init=(0.24, 0.16, -0.12))
    assert np.max(np.abs(sol.recovered_v0 - sol.planted_v0)) < 1e-3
    assert sol.loss_trajectory[-1] < sol.loss_trajectory[0]
    assert sol.loss_trajectory[-1] < 1e-12


def test_gradient_fields_populated() -> None:
    """The capture payload carries the dLoss/dv0 gradient_fields (schema 1.1.0)."""
    cfg = MpmDiffConfig()
    sol = solve_recovery(cfg, planted=(0.30, 0.10, -0.20), init=(0.25, 0.15, -0.13))
    assert "dLoss_dv0" in sol.grad_fields
    g = sol.grad_fields["dLoss_dv0"]
    assert g.shape == (3,)
    assert np.isfinite(g).all()
    # at the recovered minimum the gradient is near zero
    assert np.max(np.abs(g)) < 1e-6


def test_recovery_from_other_init() -> None:
    cfg = MpmDiffConfig()
    sol = solve_recovery(cfg, planted=(0.30, 0.10, -0.20), init=(0.36, 0.04, -0.27))
    assert np.max(np.abs(sol.recovered_v0 - sol.planted_v0)) < 1e-3
