"""mandelbulb-explorer — closed-form sub-phase implementation.

Public surface per IC-8 probe report § 5 at
``tools/testkit/probes/reports/mandelbulb-explorer.md``:

- ``reference.quilez.distance_estimator`` — Hubbard–Douady / Quilez DE.
- ``reference.quilez.iterate_map`` — one step of ``z -> z^p + c``.
- ``reference.quilez.pow_z`` — the closed-form ``z^p`` map.
- ``sim.sim_runner_seeded`` — testkit ``SimRunner`` Protocol.
- ``invariants`` — Hypothesis-decorated PBT properties (spec § 6.6).
"""

from __future__ import annotations

from .reference.quilez import distance_estimator, iterate_map, pow_z
from .sim import sim_runner_seeded

__all__ = [
    "distance_estimator",
    "iterate_map",
    "pow_z",
    "sim_runner_seeded",
]
