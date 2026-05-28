"""lenia — reference Lenia continuous CA on Stack D (Taichi).

Phase 3 task-3. Public surface (Stage 1b will implement; Stage 1a ships
NotImplementedError shells so the failing TDD tests fail with the
correct mode per `docs/phases/phase-3-plan.md:1337`):

- :func:`quad4_kernel` — Chakazul/Lenia "Quad4" kernel shape function
  ``K(r) = (4 r (1 - r))^4`` for ``r in [0, 1]``, zero outside. Cited
  from the vendored Chakazul source at Stage 1b.
- :func:`growth_lenia` — Lenia bell-curve growth function around the
  preset mean ``mu`` with width ``sigma``.
- :class:`LeniaConfig` — dataclass holding kernel / growth / grid /
  seed parameters.
- :class:`LeniaSim` — Stack-D Taichi-backed sim with ``step()`` and
  ``capture()`` methods consuming ``common_py.capture.Writer``.

See `docs/sim-specs/continuous-ca/lenia/spec-ref.md` for the
13-section spec and `tools/testkit/probes/reports/lenia.md` for the
API-surfaces probe.
"""

from __future__ import annotations

from .growth import growth_lenia
from .kernel import quad4_kernel
from .sim import LeniaConfig, LeniaSim

__all__ = ["LeniaConfig", "LeniaSim", "growth_lenia", "quad4_kernel"]
