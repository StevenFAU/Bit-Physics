"""Tier-3 Neural-CA: field-health diagnostics (regime-scoped, NOT gated).

The NCA cell state is ``(C, H, W)`` (or a frame stack); channels 0-3 are RGBA
(interpreted/visible), 4-15 are unbounded hidden channels that drift by design.
These diagnostics document the spec-ref §6/§10 regime:

- :func:`check_visible_bounds` — the FULL state is finite and the clamped visible
  RGBA lies in [0, 1] (the implementation clamps RGBA for the capture).
- :func:`check_alive_coverage` — the alpha-alive coverage stays within a band
  (the pool-trained model is persistent — it does NOT overgrow to a filled grid
  like the Growing variant, which reaches coverage → 1.0 by ~step 200).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

_ALIVE_THRESHOLD = 0.1


@dataclass(frozen=True)
class VisibleBoundsReport:
    """Report for :func:`check_visible_bounds`."""

    state_finite: bool
    rgba_min: float
    rgba_max: float
    ok: bool


def check_visible_bounds(state: NDArray[np.floating], *, eps: float = 1e-6) -> VisibleBoundsReport:
    """Verify the full ``(C, H, W)`` state is finite and the clamped RGBA
    (channels 0-3) lies in [0, 1]. The hidden channels (4-15) are NOT bounded."""
    s = np.asarray(state, dtype=np.float64)
    finite = bool(np.isfinite(s).all())
    rgba = np.clip(s[:4], 0.0, 1.0)
    lo, hi = float(rgba.min()), float(rgba.max())
    return VisibleBoundsReport(
        state_finite=finite,
        rgba_min=lo,
        rgba_max=hi,
        ok=finite and lo >= -eps and hi <= 1.0 + eps,
    )


@dataclass(frozen=True)
class AliveCoverageReport:
    """Report for :func:`check_alive_coverage`."""

    coverage: float
    band_max: float
    ok: bool


def check_alive_coverage(
    state: NDArray[np.floating],
    *,
    target_coverage: float,
    band: float = 0.30,
) -> AliveCoverageReport:
    """Verify the alpha-alive coverage (fraction of cells with alpha > 0.1) stays
    within ``target_coverage + band`` — i.e. the model persists without
    overgrowing to a filled grid."""
    s = np.asarray(state, dtype=np.float64)
    alpha = s[3]
    coverage = float((alpha > _ALIVE_THRESHOLD).mean())
    band_max = float(target_coverage) + float(band)
    return AliveCoverageReport(coverage=coverage, band_max=band_max, ok=coverage <= band_max)
