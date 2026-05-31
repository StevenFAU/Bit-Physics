"""particle-lenia — energy-based Particle Lenia (Stack D / Taichi).

Phase-4 batch-3 sim 2/3 (frontier-algorithm batch). Particle Lenia (Mordvintsev, Niklasson,
Randazzo 2022, Google Research Self-Organising Systems): particles descend their OWN local energy
field ``E(x) = R(x) - G(U(x))`` (the canonical LOCAL rule ``dp_i/dt = -∇E(p_i)``). The Taichi engine
computes the analytic force; the rigorous golden anchors verify it against an independent NumPy
analytic mirror (A1), central FD (A2), and the total-energy translation symmetry (A3). Single-stack
(gate-14 N/A; parent-vs-frontier REFRAMED to the invariant posture — particle-based, not
pointwise-comparable to grid Lenia). Energy monotonicity is NOT asserted (unsound for LOCAL rule).
"""

from .forward import (
    ParticleLeniaConfig,
    energy_E,
    grad_E_analytic,
    grad_E_fd,
    initial_positions,
    total_energy,
)
from .invariants import force_matches_finite_difference, total_energy_translation_invariant
from .sim import ParticleLeniaSim

__all__ = [
    "ParticleLeniaConfig",
    "ParticleLeniaSim",
    "energy_E",
    "force_matches_finite_difference",
    "grad_E_analytic",
    "grad_E_fd",
    "initial_positions",
    "total_energy",
    "total_energy_translation_invariant",
]
