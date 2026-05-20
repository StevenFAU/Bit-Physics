"""Bit-Physics common-py (Phase 1 Stage 1).

Public surface:

- :mod:`common_py.capture` — IC-2 ``Reader`` / ``Writer`` (HDF5
  manifest + payload, delegating to the testkit ``capture`` module).
- :mod:`common_py.determinism` — IC-4 ``Config`` + argparse glue.
- :mod:`common_py.alembic` — export surface stub.
- :mod:`common_py.vdb` — export surface stub.
- :mod:`common_py.plotting` — matplotlib helpers.
- :mod:`common_py.ggui` — Taichi GGUI F-key workaround.
- :mod:`common_py.hotreload` — watchfiles-based source re-exec.

Consumers: Stack D sims (Phase 1 Stage 2 bootstraps
``mpm-multimaterial``; subsequent implementation phases use this
module at full surface).
"""

from __future__ import annotations

__all__ = [
    "alembic",
    "capture",
    "determinism",
    "ggui",
    "hotreload",
    "plotting",
    "vdb",
]
