"""Tier-3 PINN-Poisson: convergence-order + collocation-convergence diagnostics.

Two algorithm-level correctness checks specific to the two-pronged verification:

- :func:`check_fd_convergence_order` — the classical FD reference's observed
  discrete-L2 order against the MMS analytic solution is ≈ 2 (``O(h²)`` 5-point
  Laplacian). The rigor substitute for the deferred FD mutation target.
- :func:`check_collocation_convergence` — the PINN's error against the analytic
  solution is non-increasing as the interior collocation count grows (envelope-
  scoped to the trained domain).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ConvergenceOrderReport:
    """Report for :func:`check_fd_convergence_order`."""

    observed_orders: tuple[float, ...]
    expected_order: float
    tolerance: float
    ok: bool


def check_fd_convergence_order(
    observed_orders: list[float], *, expected_order: float = 2.0, tolerance: float = 0.2
) -> ConvergenceOrderReport:
    """Verify every observed FD order is within ``tolerance`` of ``expected_order``."""
    orders = tuple(float(o) for o in observed_orders)
    ok = len(orders) >= 1 and all(abs(o - expected_order) <= tolerance for o in orders)
    return ConvergenceOrderReport(
        observed_orders=orders,
        expected_order=float(expected_order),
        tolerance=float(tolerance),
        ok=ok,
    )


@dataclass(frozen=True)
class CollocationConvergenceReport:
    """Report for :func:`check_collocation_convergence`."""

    collocation_counts: tuple[int, ...]
    errors: tuple[float, ...]
    ok: bool


def check_collocation_convergence(
    collocation_counts: list[int], errors: list[float]
) -> CollocationConvergenceReport:
    """Verify the analytic-error decreases from the coarsest to the finest collocation."""
    counts = tuple(int(c) for c in collocation_counts)
    errs = tuple(float(e) for e in errors)
    ok = len(errs) >= 2 and errs[-1] < errs[0]
    return CollocationConvergenceReport(collocation_counts=counts, errors=errs, ok=ok)
