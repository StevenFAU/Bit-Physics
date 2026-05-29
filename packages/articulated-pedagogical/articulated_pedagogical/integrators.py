"""Time integrators + the RK4 numerical-baseline reference.

The production sim integrates the ABA forward dynamics with one of:

- **semi-implicit (symplectic) Euler** (default): ``qd <- qd + dt*qdd(q, qd);
  q <- q + dt*qd_new``. Symplectic → bounded energy oscillation, no secular
  drift (the ``energy_drift_bounded`` PBT invariant).
- **RK4** (option, ``--integrator rk4``): classic 4th-order Runge-Kutta on the
  first-order state ``(q, qd)``.

``rk4_reference`` is the **numerical baseline** (NOT an analytic anchor) for the
double-pendulum / 6-DOF goldens: RK4 at a step ``dt/refine`` (default
``refine=100``) over a short horizon, against which the production integrator is
checked within ``trajectory_abs``. It integrates the SAME ABA dynamics.

Stage 1a: all functions raise ``NotImplementedError``; implementations land at
Stage 1b. See ``docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md`` §5.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from .model import ArticulatedChain

_STAGE_1B = (
    "articulated-pedagogical integrator Stage 1a scaffold: implementation lands "
    "at Stage 1b atop the Warp ABA forward dynamics. See "
    "docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md §5."
)


def step_semi_implicit_euler(
    chain: ArticulatedChain,
    q: NDArray[np.floating],
    qd: NDArray[np.floating],
    dt: float,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """One symplectic-Euler step → ``(q_next, qd_next)``."""
    raise NotImplementedError(_STAGE_1B)


def step_rk4(
    chain: ArticulatedChain,
    q: NDArray[np.floating],
    qd: NDArray[np.floating],
    dt: float,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """One classic RK4 step on state ``(q, qd)`` → ``(q_next, qd_next)``."""
    raise NotImplementedError(_STAGE_1B)


def simulate(
    chain: ArticulatedChain,
    q0: NDArray[np.floating],
    qd0: NDArray[np.floating],
    dt: float,
    n_steps: int,
    integrator: str = "semi-implicit-euler",
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """Integrate ``n_steps`` steps → ``(q_traj, qd_traj)`` of shape
    ``(n_steps + 1, n_links)`` each (row 0 = initial state)."""
    raise NotImplementedError(_STAGE_1B)


def rk4_reference(
    chain: ArticulatedChain,
    q0: NDArray[np.floating],
    qd0: NDArray[np.floating],
    dt: float,
    n_steps: int,
    refine: int = 100,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """RK4 numerical baseline at step ``dt/refine``, sampled every ``refine``
    substeps → ``(q_traj, qd_traj)`` aligned with ``simulate``'s output grid."""
    raise NotImplementedError(_STAGE_1B)


__all__ = [
    "rk4_reference",
    "simulate",
    "step_rk4",
    "step_semi_implicit_euler",
]
