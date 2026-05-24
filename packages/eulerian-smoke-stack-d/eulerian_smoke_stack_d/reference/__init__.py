"""eulerian-smoke Stack-D reference surface (Taichi-DSL).

Re-exports the Stam-Fedkiw stable-fluids primitives (2D + 3D) + canonical
constants for the gate-4 MMS, gate-11 PBT, and gate-9/13 capture contracts.
Public API mirrors the Phase-1 NumPy reference verbatim; the inner primitives
are Taichi-DSL ``@ti.kernel`` (collocated cell-centered periodic stencils;
fixed-cap Jacobi pressure-projection FP-accumulation surface, deferred IC-15
aspect #5 in determinism-safe fixed-iteration-count form).
"""

from .stable_fluids_taichi import (
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
