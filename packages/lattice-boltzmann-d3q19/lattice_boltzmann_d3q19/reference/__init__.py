"""D3Q19 reference implementation surface.

Re-exports the equilibrium / BGK kernels + canonical constants for
the gate-5 / gate-10 / gate-13 contracts. Public API per probe report
§ 5 (``tools/testkit/probes/reports/lattice-boltzmann-d3q19.md``).
"""

from __future__ import annotations

from . import bgk, equilibrium
from .bgk import (
    apply_bounce_back_y_walls,
    bgk_step,
    macroscopic_velocity,
    stream,
)
from .constants import (
    C,
    CANONICAL_COUETTE_NX,
    CANONICAL_COUETTE_NY,
    CANONICAL_COUETTE_STEPS,
    CANONICAL_DESCRIPTOR_COUETTE,
    CANONICAL_DESCRIPTOR_POISEUILLE,
    CANONICAL_NZ,
    CANONICAL_POISEUILLE_NX,
    CANONICAL_POISEUILLE_NY,
    CANONICAL_POISEUILLE_STEPS,
    CANONICAL_SEED,
    CS2,
    VELOCITIES,
    W,
    WEIGHTS,
)
from .equilibrium import (
    density_field,
    density_moment,
    feq,
    feq_field,
    momentum_field,
    momentum_moment,
)

__all__ = [
    "C",
    "CANONICAL_COUETTE_NX",
    "CANONICAL_COUETTE_NY",
    "CANONICAL_COUETTE_STEPS",
    "CANONICAL_DESCRIPTOR_COUETTE",
    "CANONICAL_DESCRIPTOR_POISEUILLE",
    "CANONICAL_NZ",
    "CANONICAL_POISEUILLE_NX",
    "CANONICAL_POISEUILLE_NY",
    "CANONICAL_POISEUILLE_STEPS",
    "CANONICAL_SEED",
    "CS2",
    "VELOCITIES",
    "W",
    "WEIGHTS",
    "apply_bounce_back_y_walls",
    "bgk",
    "bgk_step",
    "density_field",
    "density_moment",
    "equilibrium",
    "feq",
    "feq_field",
    "macroscopic_velocity",
    "momentum_field",
    "momentum_moment",
    "stream",
]
