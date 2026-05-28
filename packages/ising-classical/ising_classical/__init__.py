"""ising_classical — reference 2D Ising-classical lattice-spin sim (Stack B).

Phase 3 task-3a. First Stack-B SIM in Phase 3. Public surface:

- :class:`IsingParams` — dataclass holding lattice / coupling / field /
  temperature parameters.
- :func:`critical_temperature` — Onsager exact ``T_c = 2/ln(1+√2)``.
- :func:`onsager_magnetization` — Yang 1952 ``m(T)`` for ``T < T_c``.
- :func:`sim_runner_seeded` / :func:`sim_runner_pbt` — testkit
  SimRunner adapters (Metropolis-Hastings checkerboard Monte Carlo).
"""

from __future__ import annotations

from .reference import (
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
from .sim import sim_runner_pbt, sim_runner_seeded

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
    "sim_runner_pbt",
    "sim_runner_seeded",
]
