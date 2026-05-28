"""Tier-3 Ising-classical: magnetization tracking + autocorrelation.

Tracks the per-spin magnetization ``|m|`` of a spin-field series and
estimates the integrated autocorrelation time ``tau_int`` of the
magnetization signal. Near ``T_c`` the autocorrelation time diverges
(critical slowing-down) — this diagnostic DOCUMENTS that behaviour; it
does NOT gate (per `docs/phases/phase-3-plan.md` § 6.3a H).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class MagnetizationReport:
    """Report for :func:`check_magnetization`."""

    abs_magnetization: list[float]
    mean_abs_magnetization: float
    integrated_autocorr_time: float
    bounded: bool


def magnetization_per_spin(spins: NDArray[np.floating]) -> float:
    """Mean spin ``(1/N) sum s_i`` in ``[-1, 1]``."""
    return float(np.mean(np.asarray(spins, dtype=np.float64)))


def _integrated_autocorr_time(series: NDArray[np.floating]) -> float:
    """Integrated autocorrelation time of a 1-D signal (1 + 2 sum rho_k).

    Summed up to the first non-positive autocorrelation (standard
    self-consistent truncation). Returns 1.0 for series shorter than 2
    samples or zero-variance signals.
    """
    x = np.asarray(series, dtype=np.float64)
    n = x.size
    if n < 2:
        return 1.0
    x = x - x.mean()
    var = float(np.dot(x, x) / n)
    if var <= 0.0:
        return 1.0
    tau = 1.0
    for k in range(1, n):
        rho = float(np.dot(x[: n - k], x[k:]) / (n * var))
        if rho <= 0.0:
            break
        tau += 2.0 * rho
    return tau


def check_magnetization(
    spin_series: Sequence[NDArray[np.floating]],
) -> MagnetizationReport:
    """Track ``|m|`` per frame + integrated autocorrelation time."""
    abs_m = [abs(magnetization_per_spin(s)) for s in spin_series]
    mean_abs = float(np.mean(abs_m)) if abs_m else 0.0
    tau = _integrated_autocorr_time(np.array([magnetization_per_spin(s) for s in spin_series]))
    bounded = all(0.0 <= v <= 1.0 + 1e-9 for v in abs_m)
    return MagnetizationReport(
        abs_magnetization=abs_m,
        mean_abs_magnetization=mean_abs,
        integrated_autocorr_time=tau,
        bounded=bounded,
    )
