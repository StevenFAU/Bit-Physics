"""Test (d) -- negative test: the analyzer rejects the broken first-order solver.

The broken solver substitutes a first-order forward difference for u_xx.
Its observed spatial order collapses to roughly 1.0, which lies outside
the +/- 0.5 band around the FTCS scheme's formal order (2). The analyzer
must report `passes is False`, with the observed L2 order distinctly below
the lower band edge.
"""

from __future__ import annotations

from code_verification.mms.analyze import analyze_convergence
from code_verification.mms.runner import run_convergence_study
from code_verification.mms.solvers.heat_1d_broken import run_heat_1d_broken


def test_broken_solver_observed_order_is_rejected() -> None:
    result = run_convergence_study(
        scheme=run_heat_1d_broken,
        scheme_name="heat_1d_broken",
    )
    convergence = analyze_convergence(result)
    assert not convergence.passes, (
        f"analyzer accepted the broken first-order solver "
        f"(observed L2 order {convergence.observed_order_l2:.4f})"
    )
    # The broken solver's observed order should land near 1, well below the
    # lower band edge of 1.5; assert it is at most 1.5.
    assert convergence.observed_order_l2 <= 1.5, (
        f"broken-solver order {convergence.observed_order_l2:.4f} unexpectedly "
        f"close to formal order 2"
    )
