"""Taichi-DSL reference implementations for RD-2D Stack-D.

Re-exports the canonical Gray-Scott surface from
:mod:`reaction_diffusion_2d_stack_d.reference.gray_scott_taichi` so
``reaction_diffusion_2d_stack_d.reference.{GrayScottParams, canonical_params,
evolve, step, initial_condition}`` matches the Stack-B `reference/__init__.py`
public-API shape (probe report § 5 contract).
"""

from __future__ import annotations

from .gray_scott_taichi import (
    CANONICAL_DESCRIPTOR,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT,
    GrayScottParams,
    canonical_params,
    evolve,
    initial_condition,
    step,
)

__all__ = [
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT",
    "GrayScottParams",
    "canonical_params",
    "evolve",
    "initial_condition",
    "step",
]
