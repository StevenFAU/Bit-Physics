"""Tier 1 + Tier 2 closed_form diagnostics tests (gates 5, 6).

Phase 1 shipped these as failing-imports; the closed-form sub-phase
Stage 1 fills in the bodies (SHIFTED — signatures and imports
preserved).
"""

from __future__ import annotations

import numpy as np
from diagnostics.tier2.closed_form import (
    check_bound_preservation,
    check_output_stability,
    check_precision_sensitivity,
)

from mandelbulb_explorer.sim import (
    camera_sweep_de_at_origin,
    compute_canonical_de_grid,
    precision_pair_at_grid,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def test_tier1_health_no_nan_inf_on_de_sample_grid() -> None:
    """Canonical DE-probe grid contains no NaN or Inf."""
    _, de = compute_canonical_de_grid(seed=42)
    assert de.shape == (16, 16)
    assert np.all(np.isfinite(de)), "DE-probe grid has non-finite values"


def test_tier2_closed_form_bound_preservation_de_nonneg() -> None:
    """DE values are non-negative element-wise (Hubbard-Douady property)."""
    _, de = compute_canonical_de_grid(seed=42)
    result = check_bound_preservation(de, lower_bound=0.0, upper_bound=None)
    assert result.passed, result.details


def test_tier2_closed_form_output_stability_camera_sweep() -> None:
    """DE along an outward +x ray is smooth (bounded variation)."""
    radii = np.linspace(1.5, 5.0, 11)
    de_sweep = camera_sweep_de_at_origin(radii, seed=42)
    # Far-field DE ~ (|c|/2)*log|c|; total variation over the sweep
    # stays well below 50 in this band.
    result = check_output_stability(
        radii, de_sweep, stability_metric="bounded_variation", threshold=50.0
    )
    assert result.passed, result.details


def test_tier2_closed_form_precision_sensitivity_f32_vs_f64() -> None:
    """f32-cast input vs f64 DE agree element-wise within 1e-3 rel."""
    de32, de64 = precision_pair_at_grid(seed=42)
    result = check_precision_sensitivity(de32, de64, tolerance_rel=1e-3)
    assert result.passed, result.details
