"""``equivalence.variant`` — same-stack variant-vs-reference equivalence (§4.2.F).

WU-F's foundation surface for the 27 Phase-4 frontier variants (Stages 9-35):
:class:`VariantToleranceSpec`, :func:`compare_captures`, :class:`EquivalenceReport`,
and :func:`assert_within_budget` (raising :class:`ToleranceBudgetExceeded`). Sibling
to the Phase-0 cross-stack ``equivalence`` harness; distinct module + surface.
"""

from __future__ import annotations

from .harness import compare_captures
from .report import EquivalenceReport
from .tolerance import (
    ToleranceBudgetExceeded,
    VariantToleranceSpec,
    assert_within_budget,
    budget_for_axis,
)

__all__ = [
    "EquivalenceReport",
    "ToleranceBudgetExceeded",
    "VariantToleranceSpec",
    "assert_within_budget",
    "budget_for_axis",
    "compare_captures",
]
