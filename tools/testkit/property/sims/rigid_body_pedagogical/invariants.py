"""rigid-body-pedagogical PBT invariants (shared module form).

The in-package witness tests at
``packages/articulated-pedagogical/tests/test_pbt_invariants.py`` exercise these
invariants on random ICs; this shared module hosts the canonical predicate forms
so downstream consumers (and the Stage-2 landing audit) can route a single
declaration.

Two invariants (≥2 per spec §2.14):

- :func:`energy_drift_bounded_invariant` — frictionless: the SECULAR energy
  drift rate (windowed-mean difference, filtering the symplectic O(dt)
  oscillation) is below ``max_rel_per_second``.
- :func:`angular_momentum_about_pivot_conserved_invariant` — with no external
  forces (gravity=0) the angular momentum of a base-pinned chain about its pivot
  is conserved (the pin reaction has zero moment about the pin).

Stage-1a SHIFT-on-evidence (mirrors lenia): the dispatch's
``momentum_conservation (linear + angular)`` is physically inapplicable to a
base-PINNED chain (the pin exerts a reaction force → linear momentum and
angular-momentum-under-gravity are NOT conserved). The correct realization is
angular momentum about the pivot under zero gravity — a re-declaration, NOT a
widening (HARD RULE 2).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def energy_drift_bounded_invariant(
    energies: NDArray[np.floating],
    horizon_seconds: float,
    *,
    max_rel_per_second: float = 1e-3,
) -> bool:
    """Secular energy-drift rate below ``max_rel_per_second`` (symplectic)."""
    energies = np.asarray(energies, dtype=np.float64)
    e0 = float(energies[0])
    half = len(energies) // 2
    secular = abs(float(np.mean(energies[half:]) - np.mean(energies[:half])))
    rate = (secular / abs(e0)) / horizon_seconds if horizon_seconds > 0 else float("inf")
    return bool(rate < max_rel_per_second)


def angular_momentum_about_pivot_conserved_invariant(
    angular_momenta: NDArray[np.floating],
    *,
    atol: float = 1e-9,
) -> bool:
    """Angular momentum about the pivot is constant to ``atol`` over the run."""
    angular_momenta = np.asarray(angular_momenta, dtype=np.float64)
    return bool(float(np.max(np.abs(angular_momenta - angular_momenta[0]))) <= atol)


__all__ = [
    "angular_momentum_about_pivot_conserved_invariant",
    "energy_drift_bounded_invariant",
]
