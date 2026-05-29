"""Acceptance gate — solution-verification convergence with collocation density.

Spec § 5.12: "convergence-with-training-data is its own verification axis." As the
interior collocation-point count grows, the trained PINN's error against the
analytic solution should DECREASE (envelope-scoped to the trained domain; PINNs
do not extrapolate). Stage 1a RED -> Stage 1b-PINN GREEN.
"""

from __future__ import annotations

import numpy as np

from pinn_poisson import CANONICAL_PROBLEM, PINNConfig, evaluate_on_grid


def _relative_l2(approx: np.ndarray, exact: np.ndarray) -> float:
    return float(np.linalg.norm(approx - exact) / np.linalg.norm(exact))


def test_error_decreases_with_collocation_density(train_cached) -> None:
    n = 64
    grid = np.linspace(0.0, 1.0, n)
    gx, gy = np.meshgrid(grid, grid, indexing="ij")
    exact = CANONICAL_PROBLEM.u_exact(gx, gy, np)

    # Adam-only moderate training at each density isolates the collocation effect
    # (the LBFGS refinement would mask it by driving every density to ~1e-4); the
    # error must DROP as collocation density grows (envelope-scoped to [0,1]^2).
    errors = []
    for n_interior in (64, 256, 2000):
        config = PINNConfig(n_interior=n_interior, iterations=2000, lbfgs_iterations=0)
        result = train_cached(CANONICAL_PROBLEM, config)
        field = evaluate_on_grid(result.model, n)
        errors.append(_relative_l2(field, exact))

    assert errors[-1] < errors[0], f"error did not improve with collocation: {errors}"
