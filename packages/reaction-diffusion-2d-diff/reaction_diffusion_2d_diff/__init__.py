"""Differentiable 2D reaction-diffusion (Gray-Scott), Stack D / Taichi.

Phase-4 batch-1 differentiable variant of ``reaction-diffusion-2d-stack-d``. See
``docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-diff.md`` and the Stage-0
probe ``tools/testkit/probes/reports/reaction-diffusion-2d-diff.md``.
"""

from __future__ import annotations

from .forward import (
    RD2DDiffConfig,
    discrete_laplacian_eigenvalue,
    fourier_eigenmode,
)
from .sim import (
    InverseSolution,
    RD2DDiffusionID,
    WellMixedFID,
    smooth_initial_condition,
    solve_diffusion_id,
    uniform_initial_condition,
)

__all__ = [
    "InverseSolution",
    "RD2DDiffConfig",
    "RD2DDiffusionID",
    "WellMixedFID",
    "discrete_laplacian_eigenvalue",
    "fourier_eigenmode",
    "smooth_initial_condition",
    "solve_diffusion_id",
    "uniform_initial_condition",
]
