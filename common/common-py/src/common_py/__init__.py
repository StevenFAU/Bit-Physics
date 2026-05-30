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

# Pre-import Taichi (the autodiff backend) with ITS import-time warnings
# suppressed. Importing Taichi 1.7.4 emits at least two third-party warnings the
# project cannot fix: a `locale.getdefaultlocale` DeprecationWarning and a
# `SyntaxWarning: invalid escape sequence` from `taichi/tools/image.py` (the
# latter fires only on a fresh .pyc compile, e.g. a CI runner). The eager
# `autodiff` import below imports Taichi from cache (silent), so importing
# `common_py` — including a consumer's `from common_py.capture import ...` under
# strict `filterwarnings=["error"]` (e.g. neural-ca) — does NOT leak Taichi's
# import-time warnings. Suppression is scoped to this single import statement
# (catch_warnings restores filters immediately after), so it hides nothing from
# common_py's own code or from consumers. (WU-A regression fix.)
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
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
