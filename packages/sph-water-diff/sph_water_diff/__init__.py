"""Differentiable SPH water (Stack D / Taichi ``ti.ad.Tape``) - Phase 6 C-1 unit U-1.

Diff variant of the landed ``sph-water-stack-d`` parent (spec § 11.5 item 4.2 / Phase-4
ledger row 10, deferred to Phase-4-Greenfield-CPU, built in Phase-6 cluster C-1). The
forward is the parent's canonical physics: semi-implicit-Euler gravity free-fall +
Monaghan-cubic-spline SPH density (R-S3/S6). Two inverse problems on the WU-A autodiff
substrate (``common_py.autodiff``): initial-vertical-velocity control (throw-to-target) and
kernel-width identification (the SPH-specific gradient surface, EXP-C regime-scoped).
"""

from .capture import CANONICAL_DESCRIPTOR, default_capture, write_inverse_capture
from .forward import (
    SIGMA_3D,
    SphDiffConfig,
    analytic_drho_dh_pair,
    cloud_initial_positions,
    cubic_spline_f,
    cubic_spline_fprime,
    freefall_dloss_dv0z,
    pair_density,
)
from .invariants import density_summation_positive, gradient_matches_finite_difference
from .sim import (
    InverseSolution,
    SphInitialVelocityControl,
    SphKernelWidthID,
    autodiff_drho_dh_pair,
    solve_recovery,
)

__all__ = [
    "CANONICAL_DESCRIPTOR",
    "SIGMA_3D",
    "InverseSolution",
    "SphDiffConfig",
    "SphInitialVelocityControl",
    "SphKernelWidthID",
    "analytic_drho_dh_pair",
    "autodiff_drho_dh_pair",
    "cloud_initial_positions",
    "cubic_spline_f",
    "cubic_spline_fprime",
    "default_capture",
    "density_summation_positive",
    "freefall_dloss_dv0z",
    "gradient_matches_finite_difference",
    "pair_density",
    "solve_recovery",
    "write_inverse_capture",
]
