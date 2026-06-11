"""Property-based invariants for differentiable SPH (PBT source + mutation target).

Two regime-scoped invariants (charter § 3.1):

* :func:`gradient_matches_finite_difference` - the differentiable-specific invariant: the
  autodiff ``dLoss/dv0z`` agrees with central finite differences to a relative tolerance.
  **Regime:** fixed-topology interior free-fall cloud (the map is exactly linear in
  ``v0z``). Re-declared on falsification, never widened (HARD RULE 2).
* :func:`density_summation_positive` - a forward-physics invariant: the cubic-spline kernel
  is non-negative with f(0)=1, so every particle's SPH density is strictly positive for
  positive masses (the self-term alone is ``m*sigma_3/h^3 > 0``; neighbor terms only add).
  Exact property of the Monaghan kernel (Monaghan 2005). **Regime:** any ``h > 0``, finite
  positions, positive mass.
"""

from __future__ import annotations

import numpy as np

from .forward import SphDiffConfig
from .sim import SphInitialVelocityControl, SphKernelWidthID


def gradient_matches_finite_difference(
    cfg: SphDiffConfig,
    x0: np.ndarray,
    *,
    v0z: float,
    rel_tol: float = 1e-3,
    eps: float = 1e-6,
) -> bool:
    """True iff autodiff ``dLoss/dv0z`` matches central FD within ``rel_tol``.

    The target is the forward at a perturbed ``v0z`` so the gradient is non-zero (off the
    minimum). Fixed-topology free-fall regime."""
    prob = SphInitialVelocityControl(cfg, x0)
    target = prob.final_positions(float(v0z) + 0.05)
    prob.set_target(target)
    report = prob.check_gradient(params={"v0z": float(v0z)}, eps=eps, rel_tol=rel_tol)
    return bool(report.passed)


def density_summation_positive(
    cfg: SphDiffConfig,
    x0: np.ndarray,
    *,
    h: float,
) -> bool:
    """True iff every particle's SPH density is strictly positive at ``h``.

    Exact kernel-positivity property: ``rho_p >= m*sigma_3/h^3 > 0`` (self term; neighbor
    contributions are non-negative because f(q) >= 0). A sign-flip / dropped-self-term /
    branch-inversion mutation breaks it."""
    prob = SphKernelWidthID(cfg, x0)
    rho = prob.densities(float(h))
    return bool(np.all(rho > 0.0))
