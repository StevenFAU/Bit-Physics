"""Differentiable Lenia (Quad4), Stack D / Taichi.

Phase-4 batch-1 differentiable variant of ``lenia``. See
``docs/sim-specs/continuous-ca/lenia/spec-diff.md`` and the Stage-0 probe
``tools/testkit/probes/reports/lenia-diff.md``.
"""

from __future__ import annotations

from .forward import (
    LeniaDiffConfig,
    periodic_conv,
    quad4_growth,
    quad4_growth_dmu,
    quad4_growth_dsigma,
    quad4_growth_du,
    quad4_kernel_window,
)
from .sim import (
    InverseSolution,
    LeniaGrowthID,
    LeniaInitialFieldID,
    smooth_initial_condition,
    solve_growth_id,
)

__all__ = [
    "InverseSolution",
    "LeniaDiffConfig",
    "LeniaGrowthID",
    "LeniaInitialFieldID",
    "periodic_conv",
    "quad4_growth",
    "quad4_growth_dmu",
    "quad4_growth_dsigma",
    "quad4_growth_du",
    "quad4_kernel_window",
    "smooth_initial_condition",
    "solve_growth_id",
]
