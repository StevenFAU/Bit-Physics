"""Inverse-problem recovery: planted shared v0z recovered from final positions.

The ``v0z -> final_positions`` map is EXACTLY linear (free-fall; gravity/IC cancel), so the
quadratic loss has a single basin and the curvature-scaled step recovers the planted value.
"""

from __future__ import annotations

import numpy as np

from sph_water_diff.forward import SphDiffConfig
from sph_water_diff.sim import solve_recovery


def test_recover_planted_v0z() -> None:
    cfg = SphDiffConfig()
    sol = solve_recovery(cfg, planted=-0.20, init=-0.12)
    assert abs(sol.recovered_v0z - sol.planted_v0z) < 1e-6
    assert sol.loss_trajectory[-1] < sol.loss_trajectory[0]
    assert sol.loss_trajectory[-1] < 1e-18


def test_gradient_fields_populated() -> None:
    """The capture payload carries the dLoss/dv0z gradient_fields (schema 1.1.0)."""
    cfg = SphDiffConfig()
    sol = solve_recovery(cfg, planted=-0.20, init=-0.15)
    assert "dLoss_dv0z" in sol.grad_fields
    g = sol.grad_fields["dLoss_dv0z"]
    assert g.shape == (1,)
    assert np.isfinite(g).all()
    # at the recovered minimum the gradient is near zero
    assert float(np.max(np.abs(g))) < 1e-9


def test_recovery_from_other_init() -> None:
    cfg = SphDiffConfig()
    sol = solve_recovery(cfg, planted=0.15, init=0.40)
    assert abs(sol.recovered_v0z - sol.planted_v0z) < 1e-6
