"""Tier 2 — particle diagnostics (IC-5, charter § 3.5).

Phase 1 Stage 1 fills in the substack scaffolded as a stub in Phase 0.
Four checks, mirroring the IC-5 contract:

- :func:`check_no_overlap` — no two particles closer than ``epsilon``.
- :func:`check_neighbor_list_integrity` — declared neighbor lists are
  symmetric, within cutoff, and self-exclusive.
- :func:`check_momentum_conservation` — system momentum drift between
  two snapshots stays within tolerance.
- :func:`check_count_invariance` — particle count is preserved across
  steps.

All checks return :class:`diagnostics.tier2._types.CheckResult`.
"""

from __future__ import annotations

from .count_invariance import check_count_invariance
from .momentum_conservation import check_momentum_conservation
from .neighbor_list_integrity import check_neighbor_list_integrity
from .no_overlap import check_no_overlap

__all__ = [
    "check_count_invariance",
    "check_momentum_conservation",
    "check_neighbor_list_integrity",
    "check_no_overlap",
]
