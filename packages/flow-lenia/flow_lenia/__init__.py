"""flow-lenia — mass-conservative Flow Lenia (Stack D / Taichi).

Phase-4 batch-3 sim 3/3 (frontier-algorithm batch). Flow Lenia (Plantec et al., ALIFE 2022;
arXiv:2212.07906): matter is transported by **reintegration tracking** so total mass is conserved
by construction (each cell redistributes its full mass to flow-displaced neighbours; weights sum to
1 → ``Σ A`` conserved to summation roundoff ~Nε, NOT bit-exact). The Taichi engine runs the
convolve → flow → reintegration-scatter step; the rigorous golden anchors are A1 mass conservation
(honest summation tolerance), A2 non-negativity, A3 zero-flow identity. Single-stack (gate-14 N/A;
parent-vs-frontier REFRAMED to the invariant posture). This is the SOUND home of the Phase-3
plain-Lenia ``mass_approximately_conserved`` invariant FALSIFIED under Quad4 (re-routed, not
widened).
"""

from .forward import (
    FlowLeniaConfig,
    affinity_gradient,
    gaussian_kernel,
    initial_mass,
    reintegrate,
    total_mass,
)
from .invariants import mass_non_negative, total_mass_conserved
from .sim import FlowLeniaSim

__all__ = [
    "FlowLeniaConfig",
    "FlowLeniaSim",
    "affinity_gradient",
    "gaussian_kernel",
    "initial_mass",
    "mass_non_negative",
    "reintegrate",
    "total_mass",
    "total_mass_conserved",
]
