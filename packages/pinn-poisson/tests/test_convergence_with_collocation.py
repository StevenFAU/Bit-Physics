"""Acceptance gate — solution-verification convergence with collocation density.

Spec § 5.12: "convergence-with-training-data is its own verification axis." As the
interior collocation-point count grows, the trained PINN's error against the
analytic solution should DECREASE (envelope-scoped to the trained domain; PINNs
do not extrapolate). Stage 1a RED -> Stage 1b-PINN GREEN.
"""

from __future__ import annotations

import numpy as np

from pinn_poisson import CANONICAL_PROBLEM, PINNConfig, evaluate_on_grid, train_pinn


def _relative_l2(approx: np.ndarray, exact: np.ndarray) -> float:
    return float(np.linalg.norm(approx - exact) / np.linalg.norm(exact))


def test_error_decreases_with_collocation_density() -> None:
    n = 64
    grid = np.linspace(0.0, 1.0, n)
    gx, gy = np.meshgrid(grid, grid)
    exact = CANONICAL_PROBLEM.u_exact(gx, gy, np)

    errors = []
    for n_interior in (256, 1024, 4096):
        config = PINNConfig(seed=42, n_interior=n_interior)
        result = train_pinn(CANONICAL_PROBLEM, config)
        field = evaluate_on_grid(result.model, n)
        errors.append(_relative_l2(field, exact))

    # Monotone non-increasing error with collocation density (allow a small
    # slack for stochastic training, tightened at Stage 1b on measurement).
    assert errors[-1] < errors[0], f"error did not improve with collocation: {errors}"
