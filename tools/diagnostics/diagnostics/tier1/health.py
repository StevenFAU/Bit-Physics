"""Tier 1 — NaN/Inf health check.

Phase 0 plan § 3.3.6:
    HealthReport.ok = True iff nan_count == 0 and inf_count == 0.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from capture import Capture

from .capture_io import iter_steps


@dataclass(frozen=True)
class HealthReport:
    ok: bool
    nan_count: int
    inf_count: int
    first_offending_step: int | None
    first_offending_field: str | None


def check_health(capture: Capture) -> HealthReport:
    """Scan every state array in every step for NaN / Inf.

    Returns the aggregate counts plus the first offending (step, field)
    pair for fast triage. ``ok`` is True iff both counts are zero.
    """
    nan_total = 0
    inf_total = 0
    first_step: int | None = None
    first_field: str | None = None
    for state in iter_steps(capture):
        for fname, arr in state.state.items():
            if not np.issubdtype(arr.dtype, np.floating):
                continue
            n_nan = int(np.isnan(arr).sum())
            n_inf = int(np.isinf(arr).sum())
            if (n_nan or n_inf) and first_step is None:
                first_step = state.step
                first_field = fname
            nan_total += n_nan
            inf_total += n_inf
    return HealthReport(
        ok=(nan_total == 0 and inf_total == 0),
        nan_count=nan_total,
        inf_count=inf_total,
        first_offending_step=first_step,
        first_offending_field=first_field,
    )
