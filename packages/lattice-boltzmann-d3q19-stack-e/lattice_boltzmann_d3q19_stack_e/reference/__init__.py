"""D3Q19 Stack-E reference surface (NVIDIA Warp).

Re-exports the equilibrium / BGK / streaming / bounce-back surface + canonical
constants for the gate-4a golden, gate-4b MMS, gate-11 PBT, and gate-9/13/14
capture contracts. Public API mirrors the Phase-1 NumPy reference verbatim; the
hot primitives (equilibrium, moment reductions, collision, streaming) are
``@wp.kernel`` over an own ``wp.array(dtype=wp.float64, ndim=4)`` (D7 socket-only
+ D8/D15; the collision-step FP-accumulation reproduces the NumPy reference
byte-for-byte per the Stage-0 measurement -- shape (a) bit-exact, D10).
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
from .d3q19_warp import (
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
