"""Property-based invariants for the differentiable pendulum (PBT source + mutation target).

Two regime-scoped invariants (charter §4.4):

* :func:`gradient_matches_finite_difference` — the differentiable-specific invariant: the autodiff
  ``∂q̈/∂q`` agrees with central finite differences to a relative tolerance. **Regime:** the single
  pendulum (``n=1``, where the ``wp.Tape`` adjoint through the landed ABA is machine-exact — the
  Stage-0 probe), smooth interior, away from the straight-down/up gimbal where the pendulum
  linearization degenerates. Re-declared on falsification, never widened (HARD RULE 2).
* :func:`energy_drift_bounded` — a forward-physics invariant (the landed task-4 invariant, re-used
  on the diff forward): under the symplectic semi-implicit-Euler rollout the total mechanical energy
  has bounded oscillation and NO secular drift; the secular drift rate (difference of windowed
  means, filtering the O(dt) symplectic oscillation) stays below ``1e-3`` per second. **Regime:**
  gravity-only frictionless single pendulum, horizon ≥ 1 period (``T0 = 2π√(L/g) ≈ 2.0s``) — the
  windowed-mean secular metric is only well-posed once each window averages out the O(dt) energy
  oscillation (Stage-1a evidence: a sub-period horizon spuriously reports oscillation as drift; the
  oscillation itself is bounded + horizon-independent). Re-declared on evidence, never widened.
"""

from __future__ import annotations

import articulated_pedagogical as ap
import numpy as np
from articulated_pedagogical.model import ArticulatedChain

from .forward import ArticulatedDiffConfig
from .sim import central_fd_dqddot, differentiable_qddot, qddot_gradient


def gradient_matches_finite_difference(
    chain: ArticulatedChain,
    q: np.ndarray,
    qd: np.ndarray,
    *,
    wrt: str = "q",
    idx: int = 0,
    rel_tol: float = 1e-5,
    eps: float = 1e-6,
) -> bool:
    """True iff autodiff ``∂q̈[idx]/∂<wrt>[idx]`` matches central FD within ``rel_tol``.

    Single-pendulum smooth-interior regime (the machine-exact adjoint scope)."""
    _, g_ad = qddot_gradient(chain, q, qd, wrt=wrt, idx=idx)
    g_fd = central_fd_dqddot(chain, q, qd, wrt=wrt, idx=idx, eps=eps)
    denom = max(abs(g_fd), 1e-6)
    return bool(abs(g_ad - g_fd) / denom <= rel_tol)


def _rollout_energy(
    chain: ArticulatedChain, q0: np.ndarray, qd0: np.ndarray, dt: float, steps: int
) -> np.ndarray:
    """Semi-implicit-Euler rollout via the diff forward; return the per-step total-energy trace."""
    q = np.asarray(q0, dtype=np.float64).copy()
    qd = np.asarray(qd0, dtype=np.float64).copy()
    energies = [float(ap.total_energy(chain, q, qd))]
    for _ in range(steps):
        qdd = differentiable_qddot(chain, q, qd)
        qd = qd + dt * qdd
        q = q + dt * qd
        energies.append(float(ap.total_energy(chain, q, qd)))
    return np.asarray(energies, dtype=np.float64)


def energy_drift_bounded(
    chain: ArticulatedChain,
    cfg: ArticulatedDiffConfig,
    q0: np.ndarray,
    qd0: np.ndarray,
    *,
    rel_per_second: float = 1e-3,
) -> bool:
    """True iff the secular energy-drift rate over the rollout stays below ``rel_per_second``.

    Symplectic Euler has bounded oscillation + no secular drift (it conserves a modified energy)."""
    horizon = cfg.dt * cfg.steps
    energies = _rollout_energy(chain, q0, qd0, cfg.dt, cfg.steps)
    e0 = energies[0]
    half = len(energies) // 2
    secular = abs(float(np.mean(energies[half:]) - np.mean(energies[:half])))
    return bool((secular / abs(e0)) / horizon < rel_per_second)
