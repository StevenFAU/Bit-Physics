"""Analytic single-pendulum reference anchors (D-ANCHOR, charter §6).

Three independent analytic anchors for the ideal simple pendulum
``theta'' = -(g/L) sin(theta)`` released from rest at amplitude ``theta0``:

- **A1** small-angle period ``T0 = 2*pi*sqrt(L/g)`` (Marion & Thornton §3.2).
- **A2** large-angle exact period ``T = 4*sqrt(L/g)*K(sin(theta0/2))`` via the
  complete elliptic integral of the first kind ``K`` (NIST DLMF §19.2 +
  §22.19(i); Landau & Lifshitz *Mechanics* §11).
- **A3** trajectory ``theta(t) = 2*arcsin( sin(theta0/2) * cn(omega0*t, k) )``,
  ``k = sin(theta0/2)``, ``omega0 = sqrt(g/L)`` — the released-from-rest Jacobi
  solution (DLMF §22.19(i) eq. 22.19.2 + §22.2 definitions).

Host-side, stack-agnostic oracles (NOT in the Warp hot loop), via
``scipy.special.ellipk`` / ``ellipj`` (SciPy parameter convention ``m = k**2``).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray
from scipy.special import ellipj, ellipk


def pendulum_period_small_angle(length: float, gravity: float) -> float:
    """A1 — small-angle period ``T0 = 2*pi*sqrt(L/g)``."""
    return float(2.0 * np.pi * np.sqrt(length / gravity))


def pendulum_period_large_angle(length: float, gravity: float, theta0: float) -> float:
    """A2 — exact period ``T = 4*sqrt(L/g)*K(sin(theta0/2))`` (complete K)."""
    m = float(np.sin(theta0 / 2.0) ** 2)
    return float(4.0 * np.sqrt(length / gravity) * ellipk(m))


def pendulum_angle(
    length: float, gravity: float, theta0: float, t: NDArray[np.floating] | float
) -> NDArray[np.floating]:
    """A3 — released-from-rest trajectory ``theta(t)`` via Jacobi ``cn``."""
    k = np.sin(theta0 / 2.0)
    m = float(k * k)
    omega0 = np.sqrt(gravity / length)
    _sn, cn, _dn, _ph = ellipj(omega0 * np.asarray(t, dtype=np.float64), m)
    return np.asarray(2.0 * np.arcsin(k * cn), dtype=np.float64)


__all__ = [
    "pendulum_angle",
    "pendulum_period_large_angle",
    "pendulum_period_small_angle",
]
