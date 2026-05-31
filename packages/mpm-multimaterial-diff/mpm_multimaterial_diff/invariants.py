"""Property-based invariants for differentiable MPM (PBT source + mutation target).

Two regime-scoped invariants (charter §4.5):

* :func:`gradient_matches_finite_difference` - the differentiable-specific invariant: the
  autodiff ``dLoss/dv0`` agrees with central finite differences to a relative tolerance.
  **Regime:** interior small-strain elastic, no plastic yield, short horizon. Re-declared on
  falsification, never widened (HARD RULE 2).
* :func:`momentum_change_bounded_by_impulse` - a forward-physics invariant (the
  ``mpm-multimaterial`` reference's momentum-conservation property re-scoped to the diff
  regime): the total particle linear-momentum change over the horizon equals the external
  gravity impulse ``(0,0,-|g|*dt*STEPS*m_total)`` - internal elastic + APIC transfer forces add
  no net momentum. **Regime:** interior (no boundary clamp activates).
"""

from __future__ import annotations

import numpy as np

from .forward import MpmDiffConfig
from .sim import MpmInitialVelocityID


def gradient_matches_finite_difference(
    cfg: MpmDiffConfig,
    x0: np.ndarray,
    *,
    v0: np.ndarray,
    rel_tol: float = 1e-3,
    eps: float = 1e-6,
) -> bool:
    """True iff autodiff ``dLoss/dv0`` matches central FD within ``rel_tol``.

    The target is the forward at a perturbed ``v0`` so the gradient is non-zero (off the
    minimum). Interior small-strain regime."""
    prob = MpmInitialVelocityID(cfg, x0)
    target = prob.final_positions(np.asarray(v0, dtype=np.float64) * 1.05)
    prob.set_target(target)
    v0arr = np.asarray(v0, dtype=np.float64)
    report = prob.check_gradient(params={"v0": v0arr}, eps=eps, rel_tol=rel_tol)
    return bool(report.passed)


def momentum_change_bounded_by_impulse(
    cfg: MpmDiffConfig,
    x0: np.ndarray,
    *,
    v0: np.ndarray,
    slack: float = 1e-9,
) -> bool:
    """True iff the total momentum change equals the gravity impulse within ``slack``.

    ``Δp = sum_p m*(v[STEPS,p] - v0)``; the only external force in the interior regime is
    gravity, so ``Δp = (0,0,-|g|*dt*STEPS*m_total)`` (internal elastic + APIC forces are
    momentum-conserving). A dropped-gravity, sign-flip, or non-conservative-scatter mutation
    breaks the bound. Interior regime (no boundary clamp)."""
    prob = MpmInitialVelocityID(cfg, x0)
    prob.final_positions(np.asarray(v0, dtype=np.float64))
    v_final = np.asarray(prob.v.to_numpy()[cfg.steps], dtype=np.float64)  # (P,3)
    v0arr = np.asarray(v0, dtype=np.float64)
    dp = cfg.mass * (v_final - v0arr[None, :]).sum(axis=0)  # (3,)
    impulse_z = cfg.gravity_z * cfg.dt * cfg.steps * cfg.mass * cfg.n_particles
    expected = np.array([0.0, 0.0, impulse_z], dtype=np.float64)
    return bool(np.max(np.abs(dp - expected)) <= slack)
