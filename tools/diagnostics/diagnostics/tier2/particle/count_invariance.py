"""Particle count-invariance check (IC-5).

For a closed particle system, the particle count must be preserved
between any two snapshots. This is the cheapest possible check; it
catches whole classes of bugs (silent particle deletion, double-emit
in spatial-hash construction) before the more expensive checks run.
"""

from __future__ import annotations

from .._types import CheckResult


def check_count_invariance(count_t0: int, count_t1: int) -> CheckResult:
    """See module docstring."""
    diff = int(count_t1) - int(count_t0)
    return CheckResult(
        passed=diff == 0,
        value=float(diff),
        tolerance=0.0,
        details={
            "count_t0": int(count_t0),
            "count_t1": int(count_t1),
            "delta": diff,
        },
    )
