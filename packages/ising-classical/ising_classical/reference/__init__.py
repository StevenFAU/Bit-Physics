"""NumPy reference implementations for Ising-classical."""

from __future__ import annotations

from .ising_numpy import (
    CANONICAL_DESCRIPTOR,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT,
    CANONICAL_TEMPERATURE,
    IsingParams,
    canonical_params,
    critical_temperature,
    energy_per_spin,
    evolve,
    initial_condition,
    magnetization_per_spin,
    metropolis_sweep,
    onsager_magnetization,
)

__all__ = [
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT",
    "CANONICAL_TEMPERATURE",
    "IsingParams",
    "canonical_params",
    "critical_temperature",
    "energy_per_spin",
    "evolve",
    "initial_condition",
    "magnetization_per_spin",
    "metropolis_sweep",
    "onsager_magnetization",
]
