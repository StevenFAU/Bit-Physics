"""Tier-3 rigid-body: energy-conservation diagnostic.

Verifies a frictionless trajectory's total mechanical energy stays within the
declared secular-drift bound (`energy_drift_rel_per_second`). The secular drift
(difference of windowed means) filters the symplectic integrator's bounded
O(dt) energy oscillation. Used by the golden-table regression suite + spot
checks on alternate integrators.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class EnergyConservationReport:
    """Report for :func:`check_energy_conservation`."""

    e0: float
    secular_drift_rel_per_second: float
    max_abs_oscillation_rel: float
    ok: bool


def check_energy_conservation(
    energies: NDArray[np.floating],
    horizon_seconds: float,
    *,
    max_rel_per_second: float = 1e-3,
) -> EnergyConservationReport:
    """Check the energy series' secular drift rate is within bound.

    ``energies`` is the per-sample total mechanical energy over a trajectory of
    duration ``horizon_seconds``.
    """
    energies = np.asarray(energies, dtype=np.float64)
    e0 = float(energies[0])
    half = len(energies) // 2
    secular = abs(float(np.mean(energies[half:]) - np.mean(energies[:half])))
    rate = (secular / abs(e0)) / horizon_seconds if horizon_seconds > 0 else float("inf")
    oscillation = float(np.max(np.abs(energies - e0)) / abs(e0))
    return EnergyConservationReport(
        e0=e0,
        secular_drift_rel_per_second=rate,
        max_abs_oscillation_rel=oscillation,
        ok=rate < max_rel_per_second,
    )
