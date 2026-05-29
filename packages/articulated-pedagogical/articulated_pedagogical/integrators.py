"""Time integrators + the RK4 numerical-baseline reference.

The production sim integrates the ABA forward dynamics with one of:

- **semi-implicit (symplectic) Euler** (default): ``qd <- qd + dt*qdd(q, qd);
  q <- q + dt*qd_new``. Symplectic → bounded energy oscillation, no secular
  drift (the ``energy_drift_bounded`` PBT invariant).
- **RK4** (option, ``--integrator rk4``): classic 4th-order Runge-Kutta on the
  first-order state ``(q, qd)``.

``rk4_reference`` is the **numerical baseline** (NOT an analytic anchor) for the
double-pendulum / 6-DOF goldens: RK4 at a step ``dt/refine`` (default
``refine=100``) over a short horizon, sampled onto ``simulate``'s output grid.
It integrates the SAME ABA dynamics.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from .aba import aba_forward_dynamics
from .model import ArticulatedChain

_SEMI_IMPLICIT_EULER = "semi-implicit-euler"
_RK4 = "rk4"


def step_semi_implicit_euler(
    chain: ArticulatedChain,
    q: NDArray[np.floating],
    qd: NDArray[np.floating],
    dt: float,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """One symplectic-Euler step → ``(q_next, qd_next)``."""
    qdd = aba_forward_dynamics(chain, q, qd)
    qd_next = np.asarray(qd, dtype=np.float64) + dt * qdd
    q_next = np.asarray(q, dtype=np.float64) + dt * qd_next
    return q_next, qd_next


def _deriv(
    chain: ArticulatedChain, q: NDArray[np.floating], qd: NDArray[np.floating]
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    return np.asarray(qd, dtype=np.float64), aba_forward_dynamics(chain, q, qd)


def step_rk4(
    chain: ArticulatedChain,
    q: NDArray[np.floating],
    qd: NDArray[np.floating],
    dt: float,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """One classic RK4 step on state ``(q, qd)`` → ``(q_next, qd_next)``."""
    q = np.asarray(q, dtype=np.float64)
    qd = np.asarray(qd, dtype=np.float64)
    k1q, k1v = _deriv(chain, q, qd)
    k2q, k2v = _deriv(chain, q + 0.5 * dt * k1q, qd + 0.5 * dt * k1v)
    k3q, k3v = _deriv(chain, q + 0.5 * dt * k2q, qd + 0.5 * dt * k2v)
    k4q, k4v = _deriv(chain, q + dt * k3q, qd + dt * k3v)
    q_next = q + (dt / 6.0) * (k1q + 2.0 * k2q + 2.0 * k3q + k4q)
    qd_next = qd + (dt / 6.0) * (k1v + 2.0 * k2v + 2.0 * k3v + k4v)
    return q_next, qd_next


def _step(
    chain: ArticulatedChain,
    q: NDArray[np.floating],
    qd: NDArray[np.floating],
    dt: float,
    integrator: str,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    if integrator == _SEMI_IMPLICIT_EULER:
        return step_semi_implicit_euler(chain, q, qd, dt)
    if integrator == _RK4:
        return step_rk4(chain, q, qd, dt)
    raise ValueError(
        f"unknown integrator {integrator!r}; expected one of {_SEMI_IMPLICIT_EULER!r}, {_RK4!r}"
    )


def simulate(
    chain: ArticulatedChain,
    q0: NDArray[np.floating],
    qd0: NDArray[np.floating],
    dt: float,
    n_steps: int,
    integrator: str = _SEMI_IMPLICIT_EULER,
) -> tuple[NDArray[np.floating], NDArray[np.floating]]:
    """Integrate ``n_steps`` steps → ``(q_traj, qd_traj)`` of shape
    ``(n_steps + 1, n_links)`` each (row 0 = initial state)."""
    n = chain.n_links
    q_traj = np.empty((n_steps + 1, n), dtype=np.float64)
    qd_traj = np.empty((n_steps + 1, n), dtype=np.float64)
    q: NDArray[np.floating] = np.asarray(q0, dtype=np.float64).copy()
    qd: NDArray[np.floating] = np.asarray(qd0, dtype=np.float64).copy()
    q_traj[0] = q
    qd_traj[0] = qd
    for step in range(1, n_steps + 1):
        q, qd = _step(chain, q, qd, dt, integrator)
        q_traj[step] = q
        qd_traj[step] = qd
    return q_traj, qd_traj


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
    if refine < 1:
        raise ValueError(f"refine must be >= 1; got {refine}")
    n = chain.n_links
    h = dt / refine
    q_traj = np.empty((n_steps + 1, n), dtype=np.float64)
    qd_traj = np.empty((n_steps + 1, n), dtype=np.float64)
    q: NDArray[np.floating] = np.asarray(q0, dtype=np.float64).copy()
    qd: NDArray[np.floating] = np.asarray(qd0, dtype=np.float64).copy()
    q_traj[0] = q
    qd_traj[0] = qd
    for step in range(1, n_steps + 1):
        for _sub in range(refine):
            q, qd = step_rk4(chain, q, qd, h)
        q_traj[step] = q
        qd_traj[step] = qd
    return q_traj, qd_traj


__all__ = [
    "rk4_reference",
    "simulate",
    "step_rk4",
    "step_semi_implicit_euler",
]
