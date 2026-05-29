"""Tier-3 mass-spring-cloth: linear-momentum-drift diagnostic (free cloth).

Verifies the spec-ref §6 / gate-11 `momentum_conservation_free_no_gravity`
invariant on a captured trajectory of a FREE (unpinned) cloth with gravity off:
the total linear momentum ``sum m*v`` is constant (internal XPBD corrections are
equal-and-opposite). Inapplicable to a pinned cloth (the pins supply force).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class MomentumDriftReport:
    """Report for :func:`check_momentum_drift`."""

    max_abs_drift: float
    atol: float
    ok: bool


def check_momentum_drift(
    velocities_seq: NDArray[np.floating],
    particle_mass: float,
    *,
    atol: float = 1e-9,
) -> MomentumDriftReport:
    """Max deviation of total momentum from its step-0 value, vs ``atol``.

    ``velocities_seq`` shape: (n_steps, N, 3); uniform ``particle_mass``.
    """
    velocities_seq = np.asarray(velocities_seq, dtype=np.float64)
    momenta = float(particle_mass) * velocities_seq.sum(axis=1)
    drift = float(np.max(np.abs(momenta - momenta[0])))
    return MomentumDriftReport(max_abs_drift=drift, atol=float(atol), ok=drift <= float(atol))
