"""Differentiable MPM (3D APIC neo-Hookean MLS-MPM), Stack D / Taichi.

Phase-4 batch-1 differentiable variant of ``mpm-multimaterial``. See
``docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-diff.md`` and the Stage-0 probe
``tools/testkit/probes/reports/mpm-multimaterial-diff.md``.
"""

from __future__ import annotations

from .forward import (
    MpmDiffConfig,
    ballistic_dx_dv0,
    cluster_initial_positions,
    neohookean_dstress00_dstrain,
    neohookean_stress,
)
from .sim import (
    InverseSolution,
    MpmInitialVelocityID,
    autodiff_dstress00_dstrain,
    solve_recovery,
)

__all__ = [
    "InverseSolution",
    "MpmDiffConfig",
    "MpmInitialVelocityID",
    "autodiff_dstress00_dstrain",
    "ballistic_dx_dv0",
    "cluster_initial_positions",
    "neohookean_dstress00_dstrain",
    "neohookean_stress",
    "solve_recovery",
]
