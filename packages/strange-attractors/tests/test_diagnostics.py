"""Tier 1 + Tier 2 closed_form diagnostics tests (gates 5, 6).

Phase 1 shipped these as failing-imports; the closed-form sub-phase
Stage 1 fills in the bodies (SHIFTED per the Stage 1 checkpoint —
function signatures unchanged, import contract preserved).
"""

from __future__ import annotations

import numpy as np
from diagnostics.tier2.closed_form import (
    check_bound_preservation,
    check_output_stability,
    check_precision_sensitivity,
)

from strange_attractors.sim import (
    compute_canonical_trajectory,
    parameter_sweep_final_z,
    precision_pair_at_canonical,
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


def test_tier1_health_no_nan_inf() -> None:
    """Canonical Lorenz trajectory contains no NaN or Inf at any step."""
    traj = compute_canonical_trajectory(seed=42)
    assert traj.ndim == 2
    assert traj.shape[1] == 3
    assert np.all(np.isfinite(traj)), (
        "canonical Lorenz trajectory contains non-finite values"
    )


def test_tier2_closed_form_bound_preservation() -> None:
    """Lorenz state stays inside a generous absorbing-set box."""
    traj = compute_canonical_trajectory(seed=42)
    # Per Sparrow 1982 § 1.4: the Lorenz absorbing set fits inside
    # |state| <= ~70 at canonical params. Use 200 as a generous bound
    # so the check distinguishes blow-up from ordinary chaotic orbits.
    radii = np.linalg.norm(traj, axis=1)
    result = check_bound_preservation(radii, lower_bound=0.0, upper_bound=200.0)
    assert result.passed, result.details


def test_tier2_closed_form_output_stability_parameter_sweep() -> None:
    """Final-z over a rho sweep has bounded variation (smooth in rho)."""
    rho_values = np.linspace(20.0, 30.0, 11)
    finals = parameter_sweep_final_z(rho_values, seed=42, n_steps=1000)
    # Even in the chaotic regime, two-thousand-step finals stay
    # bounded; total variation of order ~ rho_range * |final_z| max.
    result = check_output_stability(
        rho_values,
        finals,
        stability_metric="bounded_variation",
        threshold=1e3,
    )
    assert result.passed, result.details


def test_tier2_closed_form_precision_sensitivity_single_vs_double() -> None:
    """f32 vs f64 Lorenz traj agree on the first few steps within 1e-2."""
    traj32, traj64 = precision_pair_at_canonical(seed=42, n_steps=10)
    # Lorenz is chaotic; even tight short integrations drift in f32.
    # The first ~10 steps stay close — use a generous rel-tol that
    # still fails on a wholesale broken precision path.
    result = check_precision_sensitivity(traj32, traj64, tolerance_rel=1e-2)
    assert result.passed, result.details
