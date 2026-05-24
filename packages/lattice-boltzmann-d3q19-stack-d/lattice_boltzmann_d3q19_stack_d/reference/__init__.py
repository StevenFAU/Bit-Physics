"""D3Q19 Stack-D reference surface (Taichi-DSL).

Re-exports the equilibrium / BGK / streaming / bounce-back kernels + canonical
constants for the gate-4a golden, gate-4b MMS, gate-11 PBT, and gate-9/13
capture contracts. Public API mirrors the Phase-1 NumPy reference verbatim;
the inner primitives are Taichi-DSL ``@ti.kernel`` (D9 collision-step
FP-accumulation surface; f64-seeded reductions per the Stage-0 banked finding).
"""

from .constants import (
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
    WEIGHTS,
    C,
    W,
)
from .d3q19_taichi import (
    apply_bounce_back_y_walls,
    bgk_step,
    density_field,
    density_moment,
    feq,
    feq_field,
    macroscopic_velocity,
    momentum_field,
    momentum_moment,
    stream,
)

__all__ = [
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
    "WEIGHTS",
    "C",
    "W",
    "apply_bounce_back_y_walls",
    "bgk_step",
    "density_field",
    "density_moment",
    "feq",
    "feq_field",
    "macroscopic_velocity",
    "momentum_field",
    "momentum_moment",
    "stream",
]
