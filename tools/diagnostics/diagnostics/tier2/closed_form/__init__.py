"""Tier 2 — closed-form diagnostics (IC-7, charter § 3.7).

Phase 1 Stage 1 fills in the substack scaffolded as a stub in Phase 0.
Three checks, mirroring the IC-7 contract:

- :func:`check_output_stability` — bounded variation / max-jump of an
  output sequence sampled over a parameter sweep.
- :func:`check_precision_sensitivity` — relative agreement of single-
  vs double-precision evaluations of the same closed-form output.
- :func:`check_bound_preservation` — element-wise admissibility of an
  output against optional lower / upper bounds.

All checks return :class:`diagnostics.tier2._types.CheckResult`.
"""

from __future__ import annotations

from .bound_preservation import check_bound_preservation
from .output_stability import check_output_stability
from .precision_sensitivity import check_precision_sensitivity

__all__ = [
    "check_bound_preservation",
    "check_output_stability",
    "check_precision_sensitivity",
]
