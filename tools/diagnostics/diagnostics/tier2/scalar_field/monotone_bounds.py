"""Scalar-field monotone-bounds check.

Phase 0 plan § 3.3.6:
    check_bounds(capture, field, lo, hi) -> BoundsReport.

For a scalar field the PDE prescribes a bound on, every step's array
MUST lie within ``[lo, hi]``. Violations are surfaced with the offending
(step, location, value, bound, kind) tuple.
"""

from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field as _field
from typing import Literal

import numpy as np
from capture import Capture

from ...tier1.capture_io import iter_step_arrays

ViolationKind = Literal["below", "above"]

_MAX_VIOLATIONS_PER_STEP = 4


@dataclass(frozen=True)
class BoundsReport:
    ok: bool
    field: str
    violations: list[dict[str, object]] = _field(default_factory=list)


def check_bounds(capture: Capture, field: str, lo: float, hi: float) -> BoundsReport:
    """Verify every value of ``field`` across all captured steps lies in [lo, hi]."""
    if lo > hi:
        raise ValueError(f"lo={lo!r} must be <= hi={hi!r}")
    violations: list[dict[str, object]] = []
    for step, arr in iter_step_arrays(capture, field):
        below = np.argwhere(arr < lo)
        above = np.argwhere(arr > hi)
        for idx in below[:_MAX_VIOLATIONS_PER_STEP]:
            loc = tuple(int(c) for c in idx)
            violations.append(
                {
                    "step": int(step),
                    "location": loc,
                    "value": float(arr[loc]),
                    "bound": float(lo),
                    "kind": "below",
                }
            )
        for idx in above[:_MAX_VIOLATIONS_PER_STEP]:
            loc = tuple(int(c) for c in idx)
            violations.append(
                {
                    "step": int(step),
                    "location": loc,
                    "value": float(arr[loc]),
                    "bound": float(hi),
                    "kind": "above",
                }
            )
    return BoundsReport(ok=not violations, field=field, violations=violations)
