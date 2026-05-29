"""Acceptance gate — trained PINN vs the classical FD reference (Stage 1a RED).

The second prong: the frozen network's field vs the pure-NumPy 5-point-Laplacian
FD solution of the SAME BVP, within ``fd_l2`` (wider than ``analytical_l2`` — the
FD baseline carries its own O(h²) discretization error). Run on the canonical
inhomogeneous MMS instance (Anchor 3).

Stage 1a: ``train_pinn`` / ``evaluate_on_grid`` / ``fd_solve`` raise
``NotImplementedError`` -> RED. Stage 1b implements them and this PASSES.
"""

from __future__ import annotations

import numpy as np

from pinn_poisson import CANONICAL_PROBLEM, PINNConfig, evaluate_on_grid, fd_solve, train_pinn


def test_pinn_matches_fd_reference_within_tolerance(
    golden_tolerance: dict[str, float],
) -> None:
    n = 64
    result = train_pinn(CANONICAL_PROBLEM, PINNConfig(seed=42))
    pinn_field = evaluate_on_grid(result.model, n)
    fd_field = fd_solve(CANONICAL_PROBLEM, n)

    rel_l2 = float(np.linalg.norm(pinn_field - fd_field) / np.linalg.norm(fd_field))
    assert rel_l2 <= golden_tolerance["fd_l2"], (
        f"PINN-vs-FD rel-L2 {rel_l2:.2e} > {golden_tolerance['fd_l2']:.0e}"
    )
