"""Property-based invariants for differentiable smoke (PBT source + mutation target).

Two regime-scoped invariants (charter § 4.5):

* :func:`gradient_matches_finite_difference` — the differentiable-specific invariant: the autodiff
  ``∂Loss/∂u₀`` agrees with central finite differences to a relative tolerance. **Regime:**
  constant velocity, short horizon, small grid (the linear well-conditioned advect map).
  Re-declared on falsification, never widened (HARD RULE 2).
* :func:`advect_field_bounded_by_input_range` — a forward-physics invariant: the bilinear
  semi-Lagrangian advect is a convex combination of the source cells (weights ``(1∓fx)(1∓fy) ≥ 0``
  summing to 1), so the advected field stays within the input field's ``[min, max]`` range
  (range-preserving / monotone). The smoke-E reference's ``field_values_bounded`` re-scoped to the
  pure-advection diff regime. **Regime:** pure advection (no diffusion source).
"""

from __future__ import annotations

import numpy as np

from .forward import SmokeDiffConfig
from .sim import SmokeInitialFieldID


def gradient_matches_finite_difference(
    cfg: SmokeDiffConfig,
    u0: np.ndarray,
    *,
    rel_tol: float = 1e-3,
    eps: float = 1e-6,
) -> bool:
    """True iff autodiff ``∂Loss/∂u₀`` matches central FD within ``rel_tol``.

    The target is the forward at a perturbed ``u₀`` so the gradient is non-zero (off the
    minimum). Constant-velocity short-horizon small-grid regime."""
    prob = SmokeInitialFieldID(cfg)
    u0 = np.ascontiguousarray(u0, dtype=np.float64)
    target = prob.final_field(u0 * 1.05)
    prob.set_target(np.ascontiguousarray(target, dtype=np.float64))
    report = prob.check_gradient(params={"u0": u0.ravel()}, eps=eps, rel_tol=rel_tol)
    return bool(report.passed)


def advect_field_bounded_by_input_range(
    cfg: SmokeDiffConfig,
    u0: np.ndarray,
    *,
    slack: float = 1e-12,
) -> bool:
    """True iff the advected field stays within ``[min(u₀), max(u₀)]`` (range-preserving).

    Bilinear SL advect is a convex combination of source cells → no new extrema. A non-convex
    (e.g. negative-weight or un-normalized) stencil mutation breaks the bound. Pure-advection
    regime (no diffusion source)."""
    prob = SmokeInitialFieldID(cfg)
    u0 = np.ascontiguousarray(u0, dtype=np.float64)
    final = prob.final_field(u0)
    lo = float(np.min(u0)) - slack
    hi = float(np.max(u0)) + slack
    return bool(np.min(final) >= lo and np.max(final) <= hi)
