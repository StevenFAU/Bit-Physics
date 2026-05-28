"""Tier 3 — Ising-classical sim-specific diagnostics.

Per `docs/phases/phase-3-plan.md:556-578` § 3.2.9 + spec-ref
``docs/sim-specs/lattice-spin/ising-classical/spec-ref.md`` § 10. Second
``tools/diagnostics/tier3/`` subtree entry after ``tier3/lenia``; first
Stack-B-feeding Tier-3 (consumes ``.h5`` captures written by the
Stack-B WGSL impl / NumPy reference).

Surfaces (algorithm-level, above generic Tier-1 NaN/Inf + Tier-2
scalar-field bounds):

- :class:`EnergyBoundReport` / :func:`check_energy_bound` — verifies the
  per-spin energy ``E/N in [-2, 2]`` for the 2D nearest-neighbour Ising
  (J=1) at every captured step.
- :class:`MagnetizationReport` / :func:`check_magnetization` — tracks
  ``|m|`` per step + the integrated autocorrelation time of the
  magnetization series (documents critical slowing-down near ``T_c``;
  NOT a gate per § 6.3a H).
"""

from __future__ import annotations

from .energy_bound import EnergyBoundReport, check_energy_bound
from .magnetization import MagnetizationReport, check_magnetization

__all__ = [
    "EnergyBoundReport",
    "MagnetizationReport",
    "check_energy_bound",
    "check_magnetization",
]
