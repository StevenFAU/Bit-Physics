"""physarum — agent-based sub-phase implementation.

Public surface per IC-8 probe report § 5 at
``tools/testkit/probes/reports/physarum.md``:

- ``reference``: Jones 2010 per-step update on the named-agent
  fixture (``step_to_deposit``) and on array state (``evolve``);
  canonical parameter set.
- ``sim.sim_runner_seeded``: testkit ``SimRunner`` Protocol; produces
  the canonical capture ``network-canonical-seed42-step5000``.
- ``invariants``: Hypothesis-decorated property tests for spec § 6.6.
"""

from __future__ import annotations

from .invariants import agent_count_invariant, trail_mass_conserves_modulo_decay
from .reference import canonical_params, evolve, step_to_deposit
from .sim import sim_runner_seeded

__all__ = [
    "agent_count_invariant",
    "canonical_params",
    "evolve",
    "sim_runner_seeded",
    "step_to_deposit",
    "trail_mass_conserves_modulo_decay",
]
