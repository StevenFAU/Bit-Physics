"""Tier 3 — rigid-body-pedagogical sim-specific diagnostics.

Per `docs/phases/phase-3-plan.md` §3.2.9 + spec-ref
`docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md` §10. Sits above
the generic Tier-1 (NaN/Inf) and Tier-2 diagnostics with algorithm-level checks
for the articulated-body sim:

- :class:`EnergyConservationReport` / :func:`check_energy_conservation` — secular
  energy-drift bound for a frictionless trajectory (the symplectic invariant).
- :class:`PeriodRecoveryReport` / :func:`check_period_recovery` — single-pendulum
  measured period vs the analytic large-angle exact period.
"""

from __future__ import annotations

from .energy_conservation import EnergyConservationReport, check_energy_conservation
from .period_recovery import (
    PeriodRecoveryReport,
    analytic_large_angle_period,
    check_period_recovery,
)

__all__ = [
    "EnergyConservationReport",
    "PeriodRecoveryReport",
    "analytic_large_angle_period",
    "check_energy_conservation",
    "check_period_recovery",
]
