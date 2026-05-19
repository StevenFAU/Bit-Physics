"""NumPy reference implementations for RD-2D."""

from __future__ import annotations

from .gray_scott_numpy import (
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
