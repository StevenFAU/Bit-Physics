"""Property-based invariants for differentiable RD-2D (PBT source + mutation target).

Two regime-scoped invariants (charter §4.5):

* :func:`gradient_matches_finite_difference` — the differentiable-specific invariant:
  the autodiff gradient agrees with the central finite-difference gradient to a
  relative tolerance. **Regime:** smooth interior, small step-count (gradient
  conditioning). Re-declared on falsification, never widened (HARD RULE 2).
* :func:`concentration_change_bounded` — a forward-physics invariant inherited from
  the RD-2D-stack-d reference (re-scoped to the diff regime): one explicit-Euler
  step cannot change a concentration by more than the local rate budget allows.
"""

from __future__ import annotations

import numpy as np

from .forward import RD2DDiffConfig
from .sim import RD2DDiffusionID

__all__ = [
    "concentration_change_bounded",
    "gradient_matches_finite_difference",
]


def gradient_matches_finite_difference(
    cfg: RD2DDiffConfig,
    u0: np.ndarray,
    v0: np.ndarray,
    *,
    du: float,
    rel_tol: float = 1e-3,
    eps: float = 1e-5,
) -> bool:
    """True iff autodiff ``∂Loss/∂D_u`` matches central FD within ``rel_tol``.

    The target is the forward at ``du`` itself (so the gradient is taken at a
    non-trivial loss surface point near, but not at, the minimum). Smooth-interior
    regime: smooth IC, modest ``cfg.steps``.
    """
    # one problem instance (avoids field accumulation across PBT examples):
    # synthesize the target from a perturbed Du so the gradient is non-zero (off
    # the minimum), then check the gradient at the unperturbed Du.
    prob = RD2DDiffusionID(cfg, u0, v0)
    target = prob.final_u(du * 1.05)
    prob.set_target(target)
    report = prob.check_gradient(params={"Du": du}, eps=eps, rel_tol=rel_tol)
    return bool(report.passed)


def concentration_change_bounded(
    cfg: RD2DDiffConfig,
    u0: np.ndarray,
    v0: np.ndarray,
    *,
    du: float,
    slack: float = 1e-9,
) -> bool:
    """True iff no single explicit-Euler step changes ``u`` beyond its rate budget.

    For the diffusion term the per-step change is bounded by
    ``dt·D_u·‖∇²u‖_∞`` plus the reaction budget ``dt·(F + ‖uvv‖_∞)``; this checks the
    realized per-step ``‖Δu‖_∞`` does not exceed that bound (a re-scoped
    ``monotone_bounds`` analogue from the reference). Catches a blow-up / sign-flip
    mutation.
    """
    prob = RD2DDiffusionID(cfg, u0, v0)
    prob.final_u(du)
    u = prob.u.to_numpy()  # (steps+1, n, n)
    inv_dx2 = 1.0 / (cfg.dx * cfg.dx)
    for t in range(cfg.steps):
        lap_inf = _laplacian_inf_norm(u[t], inv_dx2)
        uvv_inf = float(np.max(np.abs(u[t] * 1.0)))  # |u| upper-bounds the uvv magnitude scale
        budget = cfg.dt * (du * lap_inf + cfg.F + uvv_inf) + slack
        step_change = float(np.max(np.abs(u[t + 1] - u[t])))
        if step_change > budget:
            return False
    return True


def _laplacian_inf_norm(field: np.ndarray, inv_dx2: float) -> float:
    lap = (
        np.roll(field, 1, 0)
        + np.roll(field, -1, 0)
        + np.roll(field, 1, 1)
        + np.roll(field, -1, 1)
        - 4.0 * field
    ) * inv_dx2
    return float(np.max(np.abs(lap)))
