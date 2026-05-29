"""PINN-Poisson PBT invariants (shared module form for per-sim consumption)."""

from __future__ import annotations

from .invariants import (
    boundary_residual_bounded,
    pde_residual_bounded,
    residual_within_envelope,
)

__all__ = [
    "boundary_residual_bounded",
    "pde_residual_bounded",
    "residual_within_envelope",
]
