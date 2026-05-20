"""Closed-form bound-preservation check (IC-7).

Element-wise verification that an output array sits inside an optional
``[lower_bound, upper_bound]`` window. Either bound may be ``None`` to
disable that side of the check; both ``None`` is a trivial pass.
"""

from __future__ import annotations

import numpy as np

from .._types import CheckResult


def check_bound_preservation(
    output_values: np.ndarray,
    lower_bound: float | None = None,
    upper_bound: float | None = None,
) -> CheckResult:
    """See module docstring."""
    y = np.asarray(output_values, dtype=np.float64)
    n_below = 0
    n_above = 0
    min_val = float(y.min()) if y.size else 0.0
    max_val = float(y.max()) if y.size else 0.0
    if lower_bound is not None:
        n_below = int(np.sum(y < lower_bound))
    if upper_bound is not None:
        n_above = int(np.sum(y > upper_bound))
    n_violations = n_below + n_above
    return CheckResult(
        passed=n_violations == 0,
        value=float(n_violations),
        tolerance=0.0,
        details={
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "n_below": n_below,
            "n_above": n_above,
            "min_value": min_val,
            "max_value": max_val,
            "n_elements": int(y.size),
        },
    )
