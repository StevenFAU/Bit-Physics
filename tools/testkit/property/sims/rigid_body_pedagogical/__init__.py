"""rigid-body-pedagogical PBT-invariant module (≥2 invariants per spec §2.14).

Per ``docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md`` §6.

Exports:

- :func:`energy_drift_bounded_invariant` — secular energy-drift rate bounded.
- :func:`angular_momentum_about_pivot_conserved_invariant` — angular momentum
  about the pivot conserved under zero gravity (the physically-correct
  realization of momentum_conservation for a base-pinned chain; Stage-1a
  SHIFT-on-evidence, mirrors lenia).
"""

from __future__ import annotations

from .invariants import (
    angular_momentum_about_pivot_conserved_invariant,
    energy_drift_bounded_invariant,
)

__all__ = [
    "angular_momentum_about_pivot_conserved_invariant",
    "energy_drift_bounded_invariant",
]
