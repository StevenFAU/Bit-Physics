"""Tier-3 mass-spring-cloth: constraint-violation (stretch) bound diagnostic.

Verifies the spec-ref §6 / gate-11 `length_bounded_above` invariant on a captured
trajectory: no structural/shear (stretch) spring exceeds ``rest*(1+max_ratio)`` at
any step. An XPBD compliant solver keeps springs near rest; a runaway/exploding
solve violates this.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class ConstraintViolationReport:
    """Report for :func:`check_constraint_violation`."""

    max_stretch_ratio: float
    bound: float
    ok: bool


def check_constraint_violation(
    positions_seq: NDArray[np.floating],
    edges: list[tuple[int, int, float]],
    spacing: float,
    *,
    max_ratio: float = 0.5,
) -> ConstraintViolationReport:
    """Max over stretch springs / steps of ``|d - rest|/rest`` vs ``max_ratio``.

    ``positions_seq`` shape: (n_steps, N, 3). ``edges`` = (a, b, rest_units).
    """
    positions_seq = np.asarray(positions_seq, dtype=np.float64)
    worst = 0.0
    for step in positions_seq:
        for a, b, rest_units in edges:
            rest = rest_units * spacing
            d = float(np.linalg.norm(step[a] - step[b]))
            worst = max(worst, abs(d - rest) / rest)
    return ConstraintViolationReport(
        max_stretch_ratio=worst, bound=float(max_ratio), ok=worst <= float(max_ratio)
    )
