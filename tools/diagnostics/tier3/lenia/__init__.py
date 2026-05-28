"""Tier 3 — Lenia sim-specific diagnostics.

Per `docs/phases/phase-3-plan.md:556-578` § 3.2.9 + spec-ref
``docs/sim-specs/continuous-ca/lenia/spec-ref.md`` § 10. The
Tier-3 layer hosts algorithm-level correctness checks specific to
the Lenia continuous CA, sitting above the generic Tier-1 (NaN/Inf)
and Tier-2 (scalar-field) diagnostics.

Surfaces:

- :class:`KernelShapeReport` / :func:`check_kernel_shape` — verifies
  the Quad4 kernel window has the expected three anchors
  (K(0)=0, K(0.5)=1, K(1)=0) plus mass conservation under
  normalization.
- :class:`GrowthBoundReport` / :func:`check_growth_bound` — verifies
  the Lenia per-step change satisfies the spec-ref §6 invariant 2
  bound ``|A_{n+1}(x) - A_n(x)| ≤ dt``.
"""

from __future__ import annotations

from .growth_bound import GrowthBoundReport, check_growth_bound
from .kernel_shape import KernelShapeReport, check_kernel_shape

__all__ = [
    "GrowthBoundReport",
    "KernelShapeReport",
    "check_growth_bound",
    "check_kernel_shape",
]
