"""Acceptance gate — the classical FD reference itself (Stage 1a RED).

The FD reference is a reusable testkit oracle with its mutation target DEFERRED
(D-MUTATION, task-9), so its correctness rests on TWO checks beyond point-matching:

1. **point-match vs the analytic anchors** — the FD solution agrees with each
   analytic anchor on the interior grid (it is a numerical baseline anchored to
   the analytic set, not independent).
2. **convergence order ≈ 2** — refining the grid against the MMS analytic solution
   (Anchor 3), the observed discrete-L2 order is ≈ 2 (5-point Laplacian, O(h²)).
   This MMS-grade order check is the rigor substitute for the deferred mutation
   testing — a real solver bug would break the order, NOT just the tolerance.

Stage 1a: ``fd_solve`` / ``fd_convergence_orders`` raise ``NotImplementedError``
-> RED. Stage 1b-FD implements them and these PASS.
"""

from __future__ import annotations

import numpy as np

from pinn_poisson import ANCHOR3, ANCHORS, fd_convergence_orders, fd_solve


def test_fd_matches_analytic_anchors() -> None:
    n = 128
    grid = np.linspace(0.0, 1.0, n)
    gx, gy = np.meshgrid(grid, grid, indexing="ij")
    for problem in ANCHORS:
        fd = fd_solve(problem, n)
        exact = problem.u_exact(gx, gy, np)
        rel_l2 = float(np.linalg.norm(fd - exact) / np.linalg.norm(exact))
        # FD-vs-analytic at a fine grid: a high-precision numerical baseline.
        assert rel_l2 < 1e-3, f"{problem.name}: FD-vs-analytic rel-L2 {rel_l2:.2e}"


def test_fd_convergence_order_is_two() -> None:
    orders = fd_convergence_orders(ANCHOR3, [16, 32, 64, 128])
    assert len(orders) >= 2
    # Standard 5-point Laplacian: observed order -> 2 as h -> 0.
    assert all(abs(o - 2.0) < 0.2 for o in orders), f"observed FD orders {orders} not ≈ 2"
