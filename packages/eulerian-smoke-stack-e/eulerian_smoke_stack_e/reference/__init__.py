"""eulerian-smoke Stack-E reference surface (NVIDIA Warp).

Re-exports the Stam-Fedkiw stable-fluids primitives (2D + 3D) + canonical
constants for the gate-4 MMS, gate-11 PBT, and gate-9/13 capture contracts.
Public API mirrors the Phase-1 NumPy reference verbatim; the inner primitives
are NVIDIA Warp ``@wp.kernel`` per-cell gathers (collocated cell-centered
periodic stencils; fixed-cap Jacobi pressure-projection FP-accumulation, deferred
IC-15 aspect #5 in determinism-safe fixed-iteration-count form) over own f64
``wp.array``s (D15; common-warp Particles/Grids are f32 surfaces).
"""

from .stable_fluids_warp import (
    _DEFAULT_N_JACOBI,
    CANONICAL_DESCRIPTOR_2D,
    CANONICAL_DESCRIPTOR_3D,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT_2D,
    CANONICAL_STEP_COUNT_3D,
    Array2D,
    Array3D,
    canonical_params_2d,
    canonical_params_3d,
    maccormack_advect_2d,
    project_pressure,
    project_pressure_3d,
    semi_lagrangian_advect_2d,
    semi_lagrangian_advect_3d,
    stable_fluids_step,
    stable_fluids_step_3d,
)

__all__ = [
    "CANONICAL_DESCRIPTOR_2D",
    "CANONICAL_DESCRIPTOR_3D",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT_2D",
    "CANONICAL_STEP_COUNT_3D",
    "_DEFAULT_N_JACOBI",
    "Array2D",
    "Array3D",
    "canonical_params_2d",
    "canonical_params_3d",
    "maccormack_advect_2d",
    "project_pressure",
    "project_pressure_3d",
    "semi_lagrangian_advect_2d",
    "semi_lagrangian_advect_3d",
    "stable_fluids_step",
    "stable_fluids_step_3d",
]
