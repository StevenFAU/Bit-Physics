"""PBT invariant tests (gate 11; spec § 6.6).

Phase 1 shipped these as failing-imports; the closed-form sub-phase
Stage 1 fills in the bodies (SHIFTED — imports preserved; bodies
invoke the imported Hypothesis-decorated invariants).
"""

from __future__ import annotations

from mandelbulb_explorer.invariants import (
    de_lower_bound_property,
    map_p8_z_inversion_symmetry,
)


def test_de_lower_bound_property() -> None:
    """DE(c) is a lower bound on distance from c to the set."""
    de_lower_bound_property()


def test_map_p8_z_inversion_symmetry() -> None:
    """z^p is invariant under phi -> phi + 2*pi/p (canonical p = 8)."""
    map_p8_z_inversion_symmetry()
