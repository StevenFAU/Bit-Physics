"""strange-attractors — closed-form sub-phase implementation.

Public surface per IC-8 probe report § 5 at
``tools/testkit/probes/reports/strange-attractors.md``:

- ``reference`` substack: per-attractor vector fields and Lorenz
  structural invariants (``fixed_points``, ``origin_jacobian_eigenvalues``,
  ``divergence``).
- ``integrator.rk4_evolve``: classical fixed-step RK4.
- ``sim.sim_runner_seeded``: testkit ``SimRunner`` Protocol.
- ``invariants``: Hypothesis-decorated property tests for spec § 6.6.
"""

from __future__ import annotations

from .integrator import rk4_evolve
from .reference.aizawa import aizawa_field
from .reference.lorenz import (
    divergence,
    fixed_points,
    lorenz_field,
    origin_jacobian_eigenvalues,
)
from .reference.rossler import rossler_field
from .reference.sprott import sprott_a_field
from .sim import sim_runner_seeded

__all__ = [
    "aizawa_field",
    "divergence",
    "fixed_points",
    "lorenz_field",
    "origin_jacobian_eigenvalues",
    "rk4_evolve",
    "rossler_field",
    "sim_runner_seeded",
    "sprott_a_field",
]
