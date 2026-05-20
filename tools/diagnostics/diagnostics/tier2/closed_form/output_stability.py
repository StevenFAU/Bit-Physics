"""Closed-form output-stability check (IC-7).

For a parameter sweep ``(p_i, y_i)`` over a closed-form output, verify
that the output behaves smoothly. Two stability metrics:

- ``"bounded_variation"`` — total variation ``sum |y_{i+1} - y_i|``
  (over the sweep) stays below ``threshold``. Captures aggregate
  smoothness; sensitive to many small jumps.
- ``"max_jump"`` — ``max |y_{i+1} - y_i|`` stays below ``threshold``.
  Captures the worst-case discontinuity.

For both metrics, the sweep is sorted by parameter value before
differencing, so the input ordering is not load-bearing.

Reference: Roy 2005 §§ on solution verification; per spec § 2.5 and
charter § 3.7.
"""

from __future__ import annotations

from typing import Literal

import numpy as np

from .._types import CheckResult

StabilityMetric = Literal["bounded_variation", "max_jump"]


def check_output_stability(
    parameter_values: np.ndarray,
    output_values: np.ndarray,
    stability_metric: StabilityMetric = "bounded_variation",
    threshold: float = 1.0,
) -> CheckResult:
    """See module docstring."""
    p = np.asarray(parameter_values, dtype=np.float64)
    y = np.asarray(output_values, dtype=np.float64)
    if p.shape != y.shape:
        raise ValueError(f"parameter_values shape {p.shape} != output_values shape {y.shape}")
    if p.ndim != 1:
        raise ValueError(f"expected 1-D arrays, got ndim={p.ndim}")
    if p.size < 2:
        return CheckResult(
            passed=True,
            value=0.0,
            tolerance=float(threshold),
            details={"metric": stability_metric, "n_samples": int(p.size)},
        )
    if threshold < 0.0:
        raise ValueError(f"threshold={threshold!r} must be non-negative")

    order = np.argsort(p, kind="stable")
    dy = np.diff(y[order])
    abs_dy = np.abs(dy)

    if stability_metric == "bounded_variation":
        value = float(abs_dy.sum())
    elif stability_metric == "max_jump":
        value = float(abs_dy.max())
    else:
        raise ValueError(
            f"unknown stability_metric: {stability_metric!r}; "
            f"expected 'bounded_variation' or 'max_jump'"
        )

    return CheckResult(
        passed=value <= threshold,
        value=value,
        tolerance=float(threshold),
        details={
            "metric": stability_metric,
            "n_samples": int(p.size),
            "max_abs_jump": float(abs_dy.max()),
        },
    )
