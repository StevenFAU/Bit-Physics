"""mpm-multimaterial reference implementation (Stack-D Python NumPy + numba).

Surface:

- :mod:`.shape_functions` — quadratic B-spline N(x) + partition-of-unity (gate-5 golden).
- :mod:`.mls_mpm` — numba-jitted P2G / G2P / deformation-update / stress / grid-update / advect.

Canonical constants for the ``drop-impact-128cube-seed42-step500``
descriptor are pinned here for cross-module consistency.
"""

from __future__ import annotations

from typing import Final

from . import mls_mpm, shape_functions
from .mls_mpm import (
    advect_particles,
    compute_particle_stresses,
    deformation_update,
    g2p,
    grid_update,
    p2g,
    p2g_with_stress,
)
from .shape_functions import N, partition_of_unity_sum

# Canonical descriptor per Appendix D § D.2.3.
CANONICAL_DESCRIPTOR: Final[str] = "drop-impact-128cube-seed42-step500"
CANONICAL_GRID_N: Final[int] = 128
CANONICAL_N_STEPS: Final[int] = 500
CANONICAL_CAPTURE_INTERVAL: Final[int] = 50  # cadence-50 per Stage 0 Task 0.4.

# Particle count target — Stage 0 Task 0.4 routing (mid of 1-3M plan range,
# refined to 1M for sparse-IC drop-impact margin).
CANONICAL_N_PARTICLES: Final[int] = 1_000_000

# Physical parameters for the drop-impact descriptor.
# Domain is the unit cube [0, 1]^3 with grid spacing 1/N.
CANONICAL_GRAVITY_Z: Final[float] = -9.81
CANONICAL_DT: Final[float] = 1.0e-4  # 500 steps × 1e-4 = 0.05 s total simulated.
CANONICAL_YOUNGS_MODULUS: Final[float] = 4.0e3  # Soft elastic.
CANONICAL_POISSON_RATIO: Final[float] = 0.3
# Lamé parameters from (E, ν):
_E: Final[float] = CANONICAL_YOUNGS_MODULUS
_NU: Final[float] = CANONICAL_POISSON_RATIO
CANONICAL_MU: Final[float] = _E / (2.0 * (1.0 + _NU))
CANONICAL_LAMBDA: Final[float] = _E * _NU / ((1.0 + _NU) * (1.0 - 2.0 * _NU))

# Initial blob geometry: sphere centered at (0.5, 0.5, 0.65) with radius 0.15
# falling downward with initial velocity (0, 0, -2.0). Floor BC at z-cell-index 4.
CANONICAL_BLOB_CENTER: Final[tuple[float, float, float]] = (0.5, 0.5, 0.65)
CANONICAL_BLOB_RADIUS: Final[float] = 0.15
CANONICAL_BLOB_VELOCITY_Z: Final[float] = -2.0
CANONICAL_FLOOR_Z_INDEX: Final[int] = 4

__all__ = [
    "CANONICAL_BLOB_CENTER",
    "CANONICAL_BLOB_RADIUS",
    "CANONICAL_BLOB_VELOCITY_Z",
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_DT",
    "CANONICAL_FLOOR_Z_INDEX",
    "CANONICAL_GRAVITY_Z",
    "CANONICAL_GRID_N",
    "CANONICAL_LAMBDA",
    "CANONICAL_MU",
    "CANONICAL_N_PARTICLES",
    "CANONICAL_N_STEPS",
    "CANONICAL_POISSON_RATIO",
    "CANONICAL_YOUNGS_MODULUS",
    "N",
    "advect_particles",
    "compute_particle_stresses",
    "deformation_update",
    "g2p",
    "grid_update",
    "mls_mpm",
    "p2g",
    "p2g_with_stress",
    "partition_of_unity_sum",
    "shape_functions",
]
