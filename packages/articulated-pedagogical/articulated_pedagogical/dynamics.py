"""Conserved-quantity + kinematic helpers (energy, momentum, link positions).

Used by the ``energy_drift_bounded`` / ``momentum_conservation`` PBT invariants
and by the convention-free Cartesian trajectory comparison in the double-
pendulum / 6-DOF goldens. ``link_positions`` maps joint-space ``q`` to world
Cartesian COM positions, so trajectory comparisons are independent of the
joint-angle sign/zero convention.

Stage 1a: all functions raise ``NotImplementedError``; implementations land at
Stage 1b. See ``docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md`` §5.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from .model import ArticulatedChain

_STAGE_1B = (
    "articulated-pedagogical dynamics helper Stage 1a scaffold: implementation "
    "lands at Stage 1b. See docs/sim-specs/rigid-body/articulated-pedagogical/"
    "spec-ref.md §5."
)


def link_positions(chain: ArticulatedChain, q: NDArray[np.floating]) -> NDArray[np.floating]:
    """World Cartesian COM positions of each link, shape ``(n_links, 2)``."""
    raise NotImplementedError(_STAGE_1B)


def total_energy(
    chain: ArticulatedChain, q: NDArray[np.floating], qd: NDArray[np.floating]
) -> float:
    """Total mechanical energy ``T + V`` (frictionless conserved quantity)."""
    raise NotImplementedError(_STAGE_1B)


def linear_momentum(
    chain: ArticulatedChain, q: NDArray[np.floating], qd: NDArray[np.floating]
) -> NDArray[np.floating]:
    """World linear momentum ``(p_x, p_y)`` of the whole chain."""
    raise NotImplementedError(_STAGE_1B)


def angular_momentum(
    chain: ArticulatedChain, q: NDArray[np.floating], qd: NDArray[np.floating]
) -> float:
    """World angular momentum about the origin (scalar, planar ``z``)."""
    raise NotImplementedError(_STAGE_1B)


__all__ = [
    "angular_momentum",
    "linear_momentum",
    "link_positions",
    "total_energy",
]
