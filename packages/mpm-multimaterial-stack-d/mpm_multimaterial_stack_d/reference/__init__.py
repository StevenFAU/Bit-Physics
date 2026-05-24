"""mpm-multimaterial Stack-D reference (Taichi-DSL MLS-MPM/APIC + shape functions).

Surface:
- :mod:`.shape_functions` -- pure-Python quadratic B-spline N(x) + partition-of-unity
  (gate-4 golden + the partition-of-unity PBT invariant).
- :mod:`.mls_mpm_taichi` -- Taichi-DSL P2G (atomic-scatter) / G2P (APIC) / grid-update /
  deformation-update / neo-Hookean stress / advect (canonical-scale captures).

Canonical constants for the ``drop-impact-128cube-seed42-step500`` descriptor are
re-exported here for cross-module consistency (mirrors the Phase-1 reference).
"""

from __future__ import annotations

from . import mls_mpm_taichi, shape_functions
from .mls_mpm_taichi import (
    CANONICAL_BLOB_CENTER,
    CANONICAL_BLOB_RADIUS,
    CANONICAL_BLOB_VELOCITY_Z,
    CANONICAL_CAPTURE_INTERVAL,
    CANONICAL_DESCRIPTOR,
    CANONICAL_DT,
    CANONICAL_FLOOR_Z_INDEX,
    CANONICAL_GRAVITY_Z,
    CANONICAL_GRID_N,
    CANONICAL_LAMBDA,
    CANONICAL_MU,
    CANONICAL_N_PARTICLES,
    CANONICAL_N_STEPS,
    CANONICAL_POISSON_RATIO,
    CANONICAL_SEED,
    CANONICAL_YOUNGS_MODULUS,
    advect_particles,
    compute_particle_stresses,
    deformation_update,
    g2p,
    grid_update,
    p2g,
    p2g_with_stress,
)
from .shape_functions import N, partition_of_unity_sum

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
    "CANONICAL_SEED",
    "CANONICAL_YOUNGS_MODULUS",
    "N",
    "advect_particles",
    "compute_particle_stresses",
    "deformation_update",
    "g2p",
    "grid_update",
    "mls_mpm_taichi",
    "p2g",
    "p2g_with_stress",
    "partition_of_unity_sum",
    "shape_functions",
]
