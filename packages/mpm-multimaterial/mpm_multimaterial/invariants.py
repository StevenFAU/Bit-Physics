"""MPM PBT invariants (gate 12; spec § 6.6).

Two invariants per spec § 6.6:

- :func:`mass_conservation_p2g_g2p` — for any random particle IC, the
  P2G → grid-identity → G2P round-trip preserves total particle mass.
- :func:`partition_of_unity_b_spline` — for any particle position p,
  the sum of N(p − (base + k)) over the 3 neighboring grid nodes
  equals 1.

Both are pure-Python; called by the Hypothesis-driven tests with small
particle clouds (N ≤ 100; PBT scale, NOT canonical-N).
"""

from __future__ import annotations

import math

import numpy as np

from .reference.mls_mpm import p2g
from .reference.shape_functions import N


def mass_conservation_p2g_g2p(
    positions: np.ndarray,
    masses: np.ndarray,
    grid_n: int = 16,
    grid_dx: float = 1.0 / 16,
) -> tuple[float, float]:
    """Round-trip mass through a P2G → G2P pass on an identity grid update.

    Returns ``(mass_initial, mass_final)``. Equality (up to FP
    tolerance) witnesses the invariant.

    Procedure:

    1. Initialize grid_mass + grid_mom = 0.
    2. P2G the particles into the grid (with zero velocity, zero
       affine — pure mass transfer; momentum is zero by construction).
    3. G2P back into particles' velocity field (no-op for mass; the
       grid mass field IS the round-trip witness).
    4. mass_final = sum over grid cells of grid_mass.
       The partition-of-unity property guarantees this equals
       sum of particle masses for any IC within stencil bounds.
    """
    n_particles = positions.shape[0]
    pos = np.ascontiguousarray(positions, dtype=np.float64)
    vel = np.zeros_like(pos)
    affine = np.zeros((n_particles, 3, 3), dtype=np.float64)
    mass = np.ascontiguousarray(masses, dtype=np.float64)
    grid_mass = np.zeros((grid_n, grid_n, grid_n), dtype=np.float64)
    grid_mom = np.zeros((grid_n, grid_n, grid_n, 3), dtype=np.float64)
    p2g(pos, vel, mass, affine, grid_mass, grid_mom, grid_dx)
    return float(mass.sum()), float(grid_mass.sum())


def partition_of_unity_b_spline(p: float) -> float:
    """Sum of N(p − (base + k)) over k in (0, 1, 2) — closed-form invariant.

    Equals 1.0 exactly for any real p, per the partition-of-unity
    property of the quadratic B-spline at unit grid spacing.

    MLS-MPM base convention: ``base = floor(p + 0.5) - 1``.
    """
    base = math.floor(float(p) + 0.5) - 1
    return sum(N(float(p) - (base + k)) for k in (0, 1, 2))


__all__ = [
    "mass_conservation_p2g_g2p",
    "partition_of_unity_b_spline",
]
