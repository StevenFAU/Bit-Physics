"""Lenia PBT-invariant module (≥ 2 invariants per spec § 2.14).

Per ``docs/sim-specs/continuous-ca/lenia/spec-ref.md`` § 6 +
charter §1.1 first-SIM PBT-module surfacing.

Exports:

- :func:`monotone_bounds_invariant` — field ∈ [0, 1] for the run.
- :func:`per_step_change_bounded_by_dt_invariant` — per-step change
  bounded by ``dt`` because ``G ∈ [-1, 1]`` + clip-Euler.

The two invariants reflect the Stage-1b SHIFTED-on-evidence
re-declaration documented in
``docs/sim-specs/continuous-ca/lenia/spec-ref.md`` § 6: the
Stage-1a charter's ``mass_approximately_conserved`` suggestion was
mathematically falsified for arbitrary IC under Quad4 polynomial
growth gn=1 (HARD RULE 2). Stage 1b re-declares (NOT widens).
"""

from __future__ import annotations

from .invariants import (
    monotone_bounds_invariant,
    per_step_change_bounded_by_dt_invariant,
)

__all__ = [
    "monotone_bounds_invariant",
    "per_step_change_bounded_by_dt_invariant",
]
