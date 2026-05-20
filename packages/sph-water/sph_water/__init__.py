"""sph-water — Phase 1 sub-phase Stage 1 Python NumPy reference.

Sub-phase plan: ``docs/phases/sub-phase-particle-fluids-sph-water.md``.
Implements gates 4–13 against the Phase 1 RED test contract at
``packages/sph-water/tests/`` (Phase 1 Stage 2 bootstrap at SHA
``cd20faa``).

Public surface (probe report § 5):

- :mod:`sph_water.reference.dfsph` — kernel + neighbor list + density
  + density-evolution + divergence-free corrector;
- :mod:`sph_water.sim` — ``sim_runner_seeded`` Protocol implementation
  + diagnostic-tier helpers;
- :mod:`sph_water.invariants` — Hypothesis-decorated PBT callables.

Vendored SPlisHSPlasH at ``references/SPlisHSPlasH/`` is cited by
NAME only (Bender & Koschier 2015; Monaghan 1992/2005); the Python
reference here is derived independently per spec § 9.2 + sub-phase
plan § 1.6.
"""

from __future__ import annotations

from . import invariants, reference, sim

__all__ = ["invariants", "reference", "sim"]
