"""Shared Tier 2 check-result type (IC-5 / IC-6 / IC-7).

Phase 1 Stage 1 introduces `CheckResult` as the unified return type for
the new `particle`, `vector_field`, and `closed_form` substacks per
charter `docs/phases/phase-1-plan.md` § 3.5 / § 3.6 / § 3.7.

Phase 0's `scalar_field` substack predates this convention and returns
per-check `*Report` dataclasses (`ConservationReport`, `BoundsReport`,
`SpectralReport`). Those are kept as-is per Convention A (Phase 0
deliverables are not edited in Phase 1 Stage 1). New Tier 2 substacks
use `CheckResult` going forward.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class CheckResult:
    """Outcome of a Tier 2 diagnostic check.

    Attributes:
        passed: ``True`` iff the check passes its assertion.
        value: The check's measured numeric value, when applicable. For
            checks that yield no scalar measurement, ``None``.
        tolerance: The threshold the measurement was compared against,
            when applicable.
        details: Free-form per-check diagnostic payload. Used by tests
            and by audit tooling to surface context (offending indices,
            per-axis statistics, intermediate quantities).
    """

    passed: bool
    value: float | None = None
    tolerance: float | None = None
    details: dict[str, Any] = field(default_factory=dict)
