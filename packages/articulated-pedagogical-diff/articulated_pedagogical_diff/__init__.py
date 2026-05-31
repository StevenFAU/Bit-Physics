"""articulated-pedagogical-diff — differentiable articulated pendulum (Stack E / Warp wp.Tape).

Phase-4 batch-3 sim 1/3 (frontier-algorithm + differentiable carry). The differentiable sibling of
the Phase-3 task-4 Featherstone ABA: the landed parent kernel is launched on-device inside a
``wp.Tape`` (no ``.numpy()`` tape-sever), giving machine-exact gradients for the single pendulum.
Gradient golden table (``∂q̈/∂q`` analytic / central-FD baseline / ``∂q̈/∂τ = 1/(mL²)`` analytic;
≥3 independent anchors) + an initial-state-recovery inverse problem + ``gradient_fields`` capture.
Single-stack (gate-14 N/A; WU-F differentiable-axis forward-equivalence to the landed parent
applies). Single-pendulum scope (the n≥2 coupled adjoint is deferred — Stage-0 probe).
"""

from .forward import (
    ArticulatedDiffConfig,
    analytic_dqddot_dq,
    analytic_dqddot_dtau,
    analytic_qddot,
)
from .invariants import energy_drift_bounded, gradient_matches_finite_difference
from .sim import (
    InverseSolution,
    PendulumStateRecovery,
    central_fd_dqddot,
    differentiable_qddot,
    qddot_gradient,
    solve_recovery,
)

__all__ = [
    "ArticulatedDiffConfig",
    "InverseSolution",
    "PendulumStateRecovery",
    "analytic_dqddot_dq",
    "analytic_dqddot_dtau",
    "analytic_qddot",
    "central_fd_dqddot",
    "differentiable_qddot",
    "energy_drift_bounded",
    "gradient_matches_finite_difference",
    "qddot_gradient",
    "solve_recovery",
]
