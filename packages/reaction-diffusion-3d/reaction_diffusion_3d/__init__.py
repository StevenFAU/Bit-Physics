"""reaction-diffusion-3d — continuous-CA sub-phase implementation.

Public surface per IC-8 probe report § 5 at
``tools/testkit/probes/reports/reaction-diffusion-3d.md``:

- ``reference``: NumPy Gray-Scott 3D step with optional manufactured
  source (gate-5 MMS contract), canonical-IC ``evolve``, canonical
  parameter dict.
- ``sim.sim_runner_seeded``: testkit ``SimRunner`` Protocol; produces
  the ``gray-scott-lambda-64cube-seed42-step2000`` canonical capture
  (Appendix D § D.2.3).
- ``invariants``: Hypothesis-decorated property tests for spec § 6.6
  (``monotone_bounds``, ``periodic_bc_satisfied``).

Implementation is Python NumPy reference only at this sub-phase per
the continuous-CA-rd3d charter § 1.4 language-pivot re-anchor; the
Stack-C C++ / Vulkan path is deferred to Phase-2+.
"""

from __future__ import annotations

from .invariants import monotone_bounds, periodic_bc_satisfied
from .reference import (
    CANONICAL_DESCRIPTOR,
    CANONICAL_SEED,
    CANONICAL_STEP_COUNT,
    canonical_params,
    evolve,
    gray_scott_step_with_source,
    initial_condition,
)
from .sim import compute_canonical_trajectory, sim_runner_seeded

__all__ = [
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT",
    "canonical_params",
    "compute_canonical_trajectory",
    "evolve",
    "gray_scott_step_with_source",
    "initial_condition",
    "monotone_bounds",
    "periodic_bc_satisfied",
    "sim_runner_seeded",
]
