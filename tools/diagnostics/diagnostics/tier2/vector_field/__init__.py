"""Tier 2 — vector-field diagnostics (IC-6, charter § 3.6).

Phase 1 Stage 1 introduces the substack (no Phase 0 stub existed).
Four checks, mirroring the IC-6 contract:

- :func:`check_divergence_free` — pointwise divergence stays at zero.
- :func:`check_circulation` — line integral along a closed loop
  matches an expected value (or simply reports the value).
- :func:`check_helicity` — volume integral of ``u . (curl u)``.
- :func:`check_energy_spectrum` — radial power spectrum slope.

All checks return :class:`diagnostics.tier2._types.CheckResult`.

Velocity fields are array-of-vectors with shape ``(..., D)`` where the
last axis is the component axis (``D == 2`` for 2D, ``D == 3`` for 3D).
"""

from __future__ import annotations

from .circulation import check_circulation
from .divergence_free import check_divergence_free
from .energy_spectrum import check_energy_spectrum
from .helicity import check_helicity

__all__ = [
    "check_circulation",
    "check_divergence_free",
    "check_energy_spectrum",
    "check_helicity",
]
