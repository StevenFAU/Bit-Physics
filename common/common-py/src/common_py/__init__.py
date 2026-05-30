"""Bit-Physics common-py (Phase 1 Stage 1).

Public surface:

- :mod:`common_py.autodiff` — differentiable-sim infrastructure
  (Taichi ``ti.ad.Tape`` backend; plan § 4.2.A, Phase 4.0 WU-A).
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

import warnings

# Pre-import Taichi (the autodiff backend) with its known import-time
# `locale.getdefaultlocale` DeprecationWarning (a Taichi-1.7.4 quirk — see this
# package's pyproject `filterwarnings`) suppressed. The eager `autodiff` import
# below imports Taichi from cache (silent), so importing `common_py` — including
# a consumer's `from common_py.capture import ...` under strict
# `filterwarnings=["error"]` (e.g. neural-ca) — does NOT leak that third-party
# warning. The suppression is scoped (catch_warnings restores filters) and
# message-specific, so it hides nothing else. (WU-A regression fix.)
with warnings.catch_warnings():
    warnings.filterwarnings(
        "ignore",
        message=r".*locale\.getdefaultlocale.*",
        category=DeprecationWarning,
    )
    import taichi  # noqa: F401  — pre-warm under suppression; autodiff imports it cached.

from . import alembic, autodiff, capture, determinism, ggui, hotreload, plotting, vdb

__all__ = [
    "alembic",
    "autodiff",
    "capture",
    "determinism",
    "ggui",
    "hotreload",
    "plotting",
    "vdb",
]
