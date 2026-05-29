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

These are host-side, stack-agnostic oracles (NOT in the Warp hot loop); they use
``scipy.special.ellipk`` / ``ellipj`` (modulus convention: SciPy takes the
parameter ``m = k**2``). The ``RK4-reference`` baseline for the chaotic
double-pendulum / 6-DOF goldens is a *numerical* baseline, NOT an analytic
anchor — see ``integrators.rk4_reference`` and golden derivation
``tools/testkit/golden/derivations/rigid-body-rk4-reference.md``.

Stage 1a: every function raises ``NotImplementedError``; the closed forms land
at Stage 1b. See ``docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md`` §6.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

_STAGE_1B = (
    "articulated-pedagogical analytic anchor Stage 1a scaffold: closed form lands "
    "at Stage 1b. See docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md "
    "§6 (D-ANCHOR: Marion&Thornton §3.2 / DLMF §19.2+§22.19(i) / L&L §11)."
)


def pendulum_period_small_angle(length: float, gravity: float) -> float:
    """A1 — small-angle period ``T0 = 2*pi*sqrt(L/g)``."""
    raise NotImplementedError(_STAGE_1B)


def pendulum_period_large_angle(length: float, gravity: float, theta0: float) -> float:
    """A2 — exact period ``T = 4*sqrt(L/g)*K(sin(theta0/2))`` (complete K)."""
    raise NotImplementedError(_STAGE_1B)


def pendulum_angle(
    length: float, gravity: float, theta0: float, t: NDArray[np.floating] | float
) -> NDArray[np.floating]:
    """A3 — released-from-rest trajectory ``theta(t)`` via Jacobi ``cn``."""
    raise NotImplementedError(_STAGE_1B)


__all__ = [
    "pendulum_angle",
    "pendulum_period_large_angle",
    "pendulum_period_small_angle",
]
