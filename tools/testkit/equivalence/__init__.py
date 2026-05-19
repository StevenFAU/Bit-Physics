"""Cross-stack equivalence harness (spec § 2.6).

Public surface pinned in `docs/phases/phase-0-plan.md` § 3.3.3.
"""

from __future__ import annotations

from .harness import EquivalenceVerdict, compare_captures, load_tolerance_table

__all__ = ["EquivalenceVerdict", "compare_captures", "load_tolerance_table"]
