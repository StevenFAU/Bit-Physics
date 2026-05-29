"""Tier 3 — PINN-Poisson sim-specific diagnostics.

Per `docs/phases/phase-3-plan.md` § 3.2.9 + spec-ref
``docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md`` § 10. Algorithm-level
correctness checks specific to the PINN-Poisson two-pronged verification, sitting
above the generic Tier-1 (NaN/Inf) and Tier-2 (scalar-field) diagnostics.

Surfaces:

- :class:`ResidualBoundReport` / :func:`check_residual_bounds` — the interior PDE
  residual ``|Δu_NN - f|`` and boundary residual ``|u_NN - g|`` lie within their
  trained envelopes (the spec-ref §6 PBT predicates).
- :class:`ConvergenceOrderReport` / :func:`check_fd_convergence_order` — the FD
  reference's observed discrete-L2 order vs the MMS analytic solution is ≈ 2.
- :class:`CollocationConvergenceReport` / :func:`check_collocation_convergence` —
  the PINN analytic-error decreases as collocation density grows.
"""

from __future__ import annotations

from .convergence_diagnostics import (
    CollocationConvergenceReport,
    ConvergenceOrderReport,
    check_collocation_convergence,
    check_fd_convergence_order,
)
from .residual_diagnostics import ResidualBoundReport, check_residual_bounds

__all__ = [
    "CollocationConvergenceReport",
    "ConvergenceOrderReport",
    "ResidualBoundReport",
    "check_collocation_convergence",
    "check_fd_convergence_order",
    "check_residual_bounds",
]
