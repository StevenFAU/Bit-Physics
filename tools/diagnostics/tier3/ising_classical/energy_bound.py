"""Tier-3 Ising-classical: per-spin energy bound diagnostic.

Verifies the spec-ref § 6 invariant ``E/N in [-2, 2]`` for the 2D
nearest-neighbour Ising model (J=1, h=0, periodic BCs):

    E = -J sum_<ij> s_i s_j   over the 2N bonds (each counted once)

Holds for any spin configuration: each of the 2N bonds contributes
``+/- J``, and the per-spin extremum is ``-2J`` (fully aligned) /
``+2J`` (fully frustrated checkerboard).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class EnergyBoundReport:
    """Report for :func:`check_energy_bound`."""

    energy_per_spin: float
    lo: float
    hi: float
    ok: bool


def energy_per_spin(spins: NDArray[np.floating], coupling: float = 1.0) -> float:
    """``E/N`` over the 2N bonds (periodic BCs), via the +x and +y rolls."""
    s = np.asarray(spins, dtype=np.float64)
    bonds = -coupling * (s * np.roll(s, -1, axis=0) + s * np.roll(s, -1, axis=1))
    return float(bonds.sum() / s.size)


def check_energy_bound(
    spins: NDArray[np.floating],
    *,
    coupling: float = 1.0,
    eps: float = 1e-9,
) -> EnergyBoundReport:
    """Verify ``E/N in [-2, 2]`` (J=1 scale) for a spin field."""
    e = energy_per_spin(spins, coupling)
    lo = -2.0 * coupling
    hi = 2.0 * coupling
    return EnergyBoundReport(
        energy_per_spin=e,
        lo=lo,
        hi=hi,
        ok=bool(np.isfinite(e) and lo - eps <= e <= hi + eps),
    )
