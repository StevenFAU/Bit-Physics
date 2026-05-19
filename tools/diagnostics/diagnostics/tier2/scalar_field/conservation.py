"""Scalar-field conservation check.

For a closed scalar system, ``sum(field)`` should be conserved up to
floating-point precision across every step. The check computes the
per-step sum and compares against the initial step's sum.

Returns:
    ConservationReport with per-step drift, the maximum drift, and
    `ok = True` iff the maximum drift stays within tolerance.
"""

from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field as _field

import numpy as np
from capture import Capture

from ...tier1.capture_io import iter_step_arrays


@dataclass(frozen=True)
class ConservationReport:
    ok: bool
    field: str
    initial_total: float
    max_abs_drift: float
    max_rel_drift: float
    per_step_total: list[tuple[int, float]] = _field(default_factory=list)
    first_offending_step: int | None = None


def check_conservation(
    capture: Capture,
    field: str,
    atol: float = 0.0,
    rtol: float = 1e-10,
) -> ConservationReport:
    """Verify ``sum(field)`` stays within tolerance of the initial total.

    Tolerance follows the standard ``|drift| <= atol + rtol * |initial|``
    form (matches `numpy.isclose` semantics).
    """
    if atol < 0.0 or rtol < 0.0:
        raise ValueError(f"atol={atol!r}, rtol={rtol!r} must be non-negative")
    initial: float | None = None
    per_step: list[tuple[int, float]] = []
    max_abs = 0.0
    max_rel = 0.0
    first_off: int | None = None
    threshold: float | None = None
    for step, arr in iter_step_arrays(capture, field):
        total = float(np.asarray(arr, dtype=np.float64).sum())
        per_step.append((int(step), total))
        if initial is None:
            initial = total
            threshold = atol + rtol * abs(initial)
            continue
        drift = total - initial
        abs_drift = abs(drift)
        rel_drift = abs_drift / max(abs(initial), 1e-300)
        max_abs = max(max_abs, abs_drift)
        max_rel = max(max_rel, rel_drift)
        if threshold is not None and abs_drift > threshold and first_off is None:
            first_off = int(step)
    if initial is None:
        return ConservationReport(
            ok=True,
            field=field,
            initial_total=0.0,
            max_abs_drift=0.0,
            max_rel_drift=0.0,
            per_step_total=[],
            first_offending_step=None,
        )
    return ConservationReport(
        ok=first_off is None,
        field=field,
        initial_total=initial,
        max_abs_drift=max_abs,
        max_rel_drift=max_rel,
        per_step_total=per_step,
        first_offending_step=first_off,
    )
