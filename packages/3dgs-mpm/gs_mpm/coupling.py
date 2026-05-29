"""MPM->3DGS coupling core (SIM-LOCAL; Phase-4 WU-C promotes to common-3dgs).

PhysGaussian (Xie et al. 2024, arXiv:2311.12198 — CITE-ONLY) Eq. (8) world-space
covariance transform: a Gaussian whose undeformed covariance is ``A`` deforms under a
material deformation gradient ``F`` to ``Sigma' = F A F^T`` (and its center follows the
material flow ``x_p(t) = phi(X_p, t)``). common-3dgs stores per-Gaussian ``(scale, quat)``
rather than a raw covariance, so the coupling round-trips:

    A = R(q) diag(s^2) R(q)^T            # reconstruct_covariance
    Sigma' = F A F^T                     # apply_deformation  (Eq. (8))
    (scale', quat') = eig(Sigma')        # extract_scale_rotation

The SH coefficients are FROZEN in the MVP (Eq. (9) polar-decomposition SH rotation is the
deferred stretch). Determinism (D-DET): the eigendecomposition sign/handedness is fixed
(largest-magnitude eigenvector component made positive; det forced to +1; quaternion ``w``
made non-negative) so the round-trip is bit-reproducible run-to-run on a fixed host.

Equation numbers re-verified verbatim against arXiv:2311.12198v3 at Stage 0 (Convention
#8): Eq. (8) covariance+center, Eq. (9) SH rotation, Eq. (10) rate-form (NOT used).
"""

from __future__ import annotations

import numpy as np


def reconstruct_covariance(scale: np.ndarray, quat_wxyz: np.ndarray) -> np.ndarray:
    """Reconstruct the 3x3 SPD covariance ``A = R(q) diag(s^2) R(q)^T``.

    ``scale`` is ``(3,)`` (per-axis std-dev); ``quat_wxyz`` is ``(4,)`` unit quaternion
    in common-3dgs's ``wxyz`` order. Returns ``(3, 3)`` symmetric positive-definite.
    This mirrors the ``Sigma = R diag(s^2) R^T`` build inside common-3dgs ``render()``.
    """
    raise NotImplementedError("Stage 1b")


def apply_deformation(cov: np.ndarray, deformation_gradient: np.ndarray) -> np.ndarray:
    """Apply PhysGaussian Eq. (8) covariance transform ``Sigma' = F A F^T``.

    ``cov`` is the ``(3, 3)`` undeformed covariance ``A``; ``deformation_gradient`` is the
    per-particle ``F`` ``(3, 3)``. Returns the deformed ``(3, 3)`` covariance.
    """
    raise NotImplementedError("Stage 1b")


def extract_scale_rotation(cov: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Re-extract ``(scale (3,), quat_wxyz (4,))`` from a 3x3 SPD covariance.

    Symmetric eigendecomposition ``cov = U diag(lambda) U^T`` (``lambda >= 0``); the scale
    is ``sqrt(lambda)`` and the rotation quaternion is read from the (sign/handedness-
    canonicalized, proper) eigenvector matrix ``U``. Deterministic by construction (D-DET).
    """
    raise NotImplementedError("Stage 1b")


def couple_gaussians(
    scales: np.ndarray,
    quats_wxyz: np.ndarray,
    deformation_gradients: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Batched coupling: ``(scales (N,3), quats (N,4), F (N,3,3))`` -> ``(scales', quats')``.

    Per Gaussian: reconstruct ``A``, apply ``Sigma' = F A F^T`` (Eq. (8)), re-extract
    ``(scale', quat')``. SH coefficients are unchanged (frozen, MVP). Gaussian centers are
    updated separately from the MPM particle positions by the sim driver.
    """
    raise NotImplementedError("Stage 1b")
