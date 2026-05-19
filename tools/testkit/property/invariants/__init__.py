"""Built-in invariants for the PBT harness (spec § 2.14).

Each invariant declares an applicable Tier-2 substack via
`applies_to_category`. The harness does not check the category at runtime;
it is documentation that the test author selects the correct invariant for
the sim under test.
"""

from __future__ import annotations

from .conservation import (
    conservation_energy,
    conservation_mass,
    conservation_momentum,
)
from .geometry import no_particle_overlap_within_epsilon
from .scalar_field import divergence_free_where_prescribed, monotone_bounds

__all__ = [
    "conservation_energy",
    "conservation_mass",
    "conservation_momentum",
    "divergence_free_where_prescribed",
    "monotone_bounds",
    "no_particle_overlap_within_epsilon",
]
