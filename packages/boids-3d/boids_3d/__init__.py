"""boids-3d — agent-based sub-phase implementation.

Public surface per IC-8 probe report § 5 at
``tools/testkit/probes/reports/boids-3d.md``:

- ``reference``: Reynolds 1987/1999 per-step update on the named-agent
  fixture (``step_one``) and on flock arrays (``evolve``); canonical
  parameter set.
- ``sim.sim_runner_seeded``: testkit ``SimRunner`` Protocol; produces
  the 1000-agent canonical capture. ``sim.sim_runner_seeded_3agent``
  produces the canonical 3-agent capture (the two Appendix D § D.2.3
  descriptors).
- ``invariants``: Hypothesis-decorated property tests for spec § 6.6.
"""

from __future__ import annotations

from .invariants import particle_count_invariant, v_max_clamp_respected
from .reference import canonical_params, evolve, step_one
from .sim import sim_runner_seeded, sim_runner_seeded_3agent

__all__ = [
    "canonical_params",
    "evolve",
    "particle_count_invariant",
    "sim_runner_seeded",
    "sim_runner_seeded_3agent",
    "step_one",
    "v_max_clamp_respected",
]
