"""articulated-pedagogical — Phase 3 task-4 reference rigid-body pendulum sim.

Stack E (NVIDIA Warp). Featherstone Articulated-Body Algorithm (ABA, reduced/
generalized-coordinate forward dynamics) for a planar revolute serial chain;
semi-implicit (symplectic) Euler default + RK4 option. Public surface (Cat 2,
gate-8) re-exported here per the spec-ref §5 API contract.
"""

from __future__ import annotations

from .aba import aba_forward_dynamics
from .analytic import (
    pendulum_angle,
    pendulum_period_large_angle,
    pendulum_period_small_angle,
)
from .dynamics import (
    angular_momentum,
    linear_momentum,
    link_positions,
    total_energy,
)
from .integrators import (
    rk4_reference,
    simulate,
    step_rk4,
    step_semi_implicit_euler,
)
from .model import (
    ArticulatedChain,
    make_double_pendulum,
    make_nlink_chain,
    make_simple_pendulum,
)
from .sim import sim_runner_seeded

__version__ = "0.0.0"

__all__ = [
    "ArticulatedChain",
    "__version__",
    "aba_forward_dynamics",
    "angular_momentum",
    "linear_momentum",
    "link_positions",
    "make_double_pendulum",
    "make_nlink_chain",
    "make_simple_pendulum",
    "pendulum_angle",
    "pendulum_period_large_angle",
    "pendulum_period_small_angle",
    "rk4_reference",
    "sim_runner_seeded",
    "simulate",
    "step_rk4",
    "step_semi_implicit_euler",
    "total_energy",
]
