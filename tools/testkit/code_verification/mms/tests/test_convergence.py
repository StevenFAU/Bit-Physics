"""Test (c) -- analyzer reports order in [1.5, 2.5] on the FTCS solver.

Runs the default convergence sweep and asserts the observed L2 order is
within +/- 0.5 of the formal spatial order (2).
"""

from __future__ import annotations

from itertools import pairwise

from code_verification.mms.analyze import analyze_convergence
from code_verification.mms.runner import run_convergence_study


def test_ftcs_observed_order_is_within_tolerance() -> None:
    result = run_convergence_study()
    convergence = analyze_convergence(result)
    assert convergence.passes, (
        f"observed L2 order {convergence.observed_order_l2:.4f} outside "
        f"+/- {convergence.order_tolerance} of formal order {convergence.formal_order}"
    )
    # Sanity: observed L-inf order is also close to 2
    assert abs(convergence.observed_order_linf - 2.0) <= 0.5


def test_per_resolution_errors_decrease_monotonically() -> None:
    """As N doubles, error should roughly quarter for an order-2 scheme."""
    result = run_convergence_study()
    convergence = analyze_convergence(result)
    errors = [r.l2_error for r in convergence.per_resolution]
    for prev, curr in pairwise(errors):
        assert curr < prev, f"L2 error did not decrease: {prev} -> {curr}"
