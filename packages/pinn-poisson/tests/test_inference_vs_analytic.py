"""Acceptance gate — trained PINN vs the analytic anchors (Stage 1a RED).

The load-bearing verification: the frozen network's field, evaluated on the eval
grid, must match the analytic solution within ``analytical_l2`` (relative
discrete-L2). Covered for all three independent-reference anchors (Cat-3 ≥3
anchors): Anchor 1 (Evans §2.2 harmonic), Anchor 2 (Strauss §6.2 harmonic),
Anchor 3 (MMS f≠0 — the canonical trained instance).

Stage 1a: ``train_pinn`` / ``evaluate_on_grid`` raise ``NotImplementedError`` ->
RED. Stage 1b-PINN implements them and these PASS within tolerance.
"""

from __future__ import annotations

import numpy as np
import pytest

from pinn_poisson import ANCHORS, PINNConfig, evaluate_on_grid, train_pinn


def _relative_l2(approx: np.ndarray, exact: np.ndarray) -> float:
    return float(np.linalg.norm(approx - exact) / np.linalg.norm(exact))


@pytest.mark.parametrize("problem", ANCHORS, ids=[p.name for p in ANCHORS])
def test_pinn_matches_analytic_within_tolerance(
    problem: object, golden_tolerance: dict[str, float]
) -> None:
    n = 64
    config = PINNConfig(seed=42)
    result = train_pinn(problem, config)  # type: ignore[arg-type]
    field = evaluate_on_grid(result.model, n)

    grid = np.linspace(0.0, 1.0, n)
    gx, gy = np.meshgrid(grid, grid)
    exact = problem.u_exact(gx, gy, np)  # type: ignore[attr-defined]

    rel_l2 = _relative_l2(field, exact)
    assert rel_l2 <= golden_tolerance["analytical_l2"], (
        f"{problem.name}: PINN-vs-analytic rel-L2 {rel_l2:.2e} > "  # type: ignore[attr-defined]
        f"{golden_tolerance['analytical_l2']:.0e}"
    )
