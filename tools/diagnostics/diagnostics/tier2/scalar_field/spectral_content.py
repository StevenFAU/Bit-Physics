"""Scalar-field spectral-content check.

For a scalar field with bounded spectral support (e.g. RD-2D under
periodic BCs), the per-step energy spectrum should not exhibit spurious
growth above a configured cutoff wavenumber. The check computes a
discrete FFT of each step's array, sums |F|^2 in two bins:

- Low-wavenumber bin: indices with |k| <= ``cutoff_fraction * N/2``.
- High-wavenumber bin: indices with |k| >  ``cutoff_fraction * N/2``.

The ratio ``high / total`` is compared against ``max_high_fraction``;
``ok`` is True iff every step stays below the threshold.
"""

from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field as _field

import numpy as np
from capture import Capture

from ...tier1.capture_io import iter_step_arrays


@dataclass(frozen=True)
class SpectralReport:
    ok: bool
    field: str
    cutoff_fraction: float
    max_high_fraction: float
    per_step_high_fraction: list[tuple[int, float]] = _field(default_factory=list)
    first_offending_step: int | None = None


def _high_fraction(arr: np.ndarray, cutoff_fraction: float) -> float:
    """Return the fraction of |F|^2 mass above the cutoff."""
    fft = np.fft.fftn(arr)
    power = np.abs(fft) ** 2
    total = float(power.sum())
    if total <= 0.0:
        return 0.0
    # Build a wavenumber-magnitude grid normalized to the Nyquist.
    # Each axis contributes |k_i| / (N_i / 2) ∈ [0, 1].
    coords = np.meshgrid(*(np.fft.fftfreq(n) * 2.0 for n in arr.shape), indexing="ij")
    k_mag = np.sqrt(sum(np.asarray(c) ** 2 for c in coords))
    high_mask = k_mag > cutoff_fraction
    return float(power[high_mask].sum()) / total


def check_spectral_content(
    capture: Capture,
    field: str,
    cutoff_fraction: float = 0.5,
    max_high_fraction: float = 0.1,
) -> SpectralReport:
    """Verify the high-wavenumber band stays within ``max_high_fraction``.

    Args:
        cutoff_fraction: fraction of the Nyquist wavenumber that separates
            "low" from "high". Default 0.5 ≡ the upper half of |k|.
        max_high_fraction: maximum allowed |F|^2 mass fraction above the
            cutoff. Default 0.1.
    """
    if not 0.0 < cutoff_fraction <= 1.0:
        raise ValueError(f"cutoff_fraction must be in (0, 1]; got {cutoff_fraction!r}")
    if max_high_fraction < 0.0:
        raise ValueError(f"max_high_fraction must be >= 0; got {max_high_fraction!r}")
    per_step: list[tuple[int, float]] = []
    first_off: int | None = None
    for step, arr in iter_step_arrays(capture, field):
        if not np.issubdtype(arr.dtype, np.floating):
            continue
        frac = _high_fraction(arr.astype(np.float64), cutoff_fraction)
        per_step.append((int(step), frac))
        if frac > max_high_fraction and first_off is None:
            first_off = int(step)
    ok = first_off is None
    return SpectralReport(
        ok=ok,
        field=field,
        cutoff_fraction=cutoff_fraction,
        max_high_fraction=max_high_fraction,
        per_step_high_fraction=per_step,
        first_offending_step=first_off,
    )
