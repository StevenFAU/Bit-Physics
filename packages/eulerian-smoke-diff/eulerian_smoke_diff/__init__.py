"""eulerian-smoke-diff — differentiable Eulerian smoke (Stack E / NVIDIA Warp wp.Tape).

Phase-4 batch-1 sim 4/4. Tape-differentiable semi-Lagrangian smoke step (SL backtrace + bilinear
gather + explicit diffusion) on the WU-A autodiff substrate; initial-smoke-field inverse problem +
gradient golden table (≥3 independent anchors). Single-stack (gate-14 N/A; WU-F differentiable-axis
variant-equivalence to the landed ``eulerian-smoke-stack-e`` reference applies).
"""

from .forward import (
    SmokeDiffConfig,
    advect_loss_grad_analytic,
    diffusion_dloss_dnu_analytic,
    smooth_initial_field,
)
from .sim import InverseSolution, SmokeInitialFieldID, autodiff_dloss_dnu, solve_recovery

__all__ = [
    "InverseSolution",
    "SmokeDiffConfig",
    "SmokeInitialFieldID",
    "advect_loss_grad_analytic",
    "autodiff_dloss_dnu",
    "diffusion_dloss_dnu_analytic",
    "smooth_initial_field",
    "solve_recovery",
]
