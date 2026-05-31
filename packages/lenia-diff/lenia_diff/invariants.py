"""Property-based invariants for differentiable Lenia (PBT source + mutation target).

Two regime-scoped invariants (charter §4.5):

* :func:`gradient_matches_finite_difference` — the differentiable-specific invariant: the
  autodiff ``(∂Loss/∂mu, ∂Loss/∂sigma)`` agrees with central finite differences to a relative
  tolerance. **Regime:** smooth interior, params away from clip saturation. Re-declared on
  falsification, never widened (HARD RULE 2).
* :func:`field_bounded` — a forward-physics invariant (the Phase-3 lenia ``monotone_bounds``
  re-scoped to the diff regime): the clip-Euler update keeps the field in ``[0, 1]`` for the
  whole horizon.
"""

from __future__ import annotations

import numpy as np

from .forward import LeniaDiffConfig
from .sim import LeniaGrowthID


def gradient_matches_finite_difference(
    cfg: LeniaDiffConfig,
    a0: np.ndarray,
    *,
    mu: float,
    sigma: float,
    rel_tol: float = 1e-3,
    eps: float = 1e-5,
) -> bool:
    """True iff autodiff ``(∂Loss/∂mu, ∂Loss/∂sigma)`` matches central FD within ``rel_tol``.

    The target is the forward at a perturbed ``(mu,sigma)`` so the gradient is non-zero (off the
    minimum). Smooth-interior regime: smooth IC, modest ``cfg.steps``.
    """
    prob = LeniaGrowthID(cfg, a0)
    target = prob.final_field(mu * 1.02, sigma * 1.02)
    prob.set_target(target)
    report = prob.check_gradient(params={"mu": mu, "sigma": sigma}, eps=eps, rel_tol=rel_tol)
    return bool(report.passed)


def field_bounded(
    cfg: LeniaDiffConfig,
    a0: np.ndarray,
    *,
    mu: float,
    sigma: float,
    slack: float = 1e-12,
) -> bool:
    """True iff the clip-Euler field stays in ``[0, 1]`` over the whole horizon.

    The Phase-3 lenia ``monotone_bounds`` re-scoped to the diff regime: ``clip(·,0,1)`` is
    applied every step, so every cell of every time-slice must lie in ``[0,1]``. Catches a
    dropped-clip or sign-flip mutation.
    """
    prob = LeniaGrowthID(cfg, a0)
    prob.final_field(mu, sigma)
    f = prob.field.to_numpy()  # (steps+1, n, n)
    return bool(f.min() >= -slack and f.max() <= 1.0 + slack)
