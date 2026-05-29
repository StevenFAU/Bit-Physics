"""MPM->3DGS coupling core (SIM-LOCAL; Phase-4 WU-C promotes to common-3dgs).

PhysGaussian (Xie et al. 2024, arXiv:2311.12198 — CITE-ONLY) Eq. (8) world-space
covariance transform: a Gaussian whose undeformed covariance is ``A`` deforms under a
material deformation gradient ``F`` to ``Sigma' = F A F^T`` (and its center follows the
material flow ``x_p(t) = phi(X_p, t)``). common-3dgs stores per-Gaussian ``(scale, quat)``
rather than a raw covariance, so the coupling round-trips:

    A = R(q) diag(s^2) R(q)^T            # reconstruct_covariance
    Sigma' = F A F^T                     # apply_deformation  (Eq. (8))
    (scale', quat') = eig(Sigma')        # extract_scale_rotation

The quaternion convention (wxyz) matches common-3dgs's renderer exactly
(``common_3dgs.render._quaternions_to_matrices``) so a coupled model renders identically.
The SH coefficients are FROZEN in the MVP (Eq. (9) polar-decomposition SH rotation is the
deferred stretch).

Determinism (D-DET): the eigendecomposition is made bit-reproducible — eigenvector
columns are forced to a proper rotation (``det = +1``) and the output quaternion to the
canonical hemisphere (``w >= 0``) — so the round-trip is identical run-to-run on a fixed
host. Equation numbers re-verified verbatim against arXiv:2311.12198v3 at Stage 0
(Convention #8): Eq. (8) covariance+center, Eq. (9) SH rotation, Eq. (10) rate-form (unused).
"""

from __future__ import annotations

import numpy as np

_EPS = 1e-12


def _quats_to_matrices(q: np.ndarray) -> np.ndarray:
    """(N, 4) wxyz unit quaternions -> (N, 3, 3) rotation matrices.

    Identical algebra to ``common_3dgs.render._quaternions_to_matrices`` (so a coupled
    model renders identically).
    """
    q = np.asarray(q, dtype=np.float64).reshape(-1, 4)
    norms = np.linalg.norm(q, axis=1, keepdims=True)
    norms = np.where(norms > 0.0, norms, 1.0)
    w, x, y, z = (q / norms).T
    n = q.shape[0]
    r = np.empty((n, 3, 3), dtype=np.float64)
    r[:, 0, 0] = 1.0 - 2.0 * (y * y + z * z)
    r[:, 0, 1] = 2.0 * (x * y - w * z)
    r[:, 0, 2] = 2.0 * (x * z + w * y)
    r[:, 1, 0] = 2.0 * (x * y + w * z)
    r[:, 1, 1] = 1.0 - 2.0 * (x * x + z * z)
    r[:, 1, 2] = 2.0 * (y * z - w * x)
    r[:, 2, 0] = 2.0 * (x * z - w * y)
    r[:, 2, 1] = 2.0 * (y * z + w * x)
    r[:, 2, 2] = 1.0 - 2.0 * (x * x + y * y)
    return r


def _matrices_to_quats(rot: np.ndarray) -> np.ndarray:
    """(N, 3, 3) proper rotation matrices -> (N, 4) wxyz unit quaternions, ``w >= 0``.

    Numerically-stable four-case (largest-component) construction, vectorized via
    ``np.select`` and canonicalized to the ``w >= 0`` hemisphere for determinism.
    """
    m = np.asarray(rot, dtype=np.float64).reshape(-1, 3, 3)
    m00, m01, m02 = m[:, 0, 0], m[:, 0, 1], m[:, 0, 2]
    m10, m11, m12 = m[:, 1, 0], m[:, 1, 1], m[:, 1, 2]
    m20, m21, m22 = m[:, 2, 0], m[:, 2, 1], m[:, 2, 2]
    trace = m00 + m11 + m22

    def _s(arg: np.ndarray) -> np.ndarray:
        out: np.ndarray = np.sqrt(np.maximum(arg, _EPS)) * 2.0
        return out

    s0 = _s(trace + 1.0)
    q0 = np.stack([0.25 * s0, (m21 - m12) / s0, (m02 - m20) / s0, (m10 - m01) / s0], axis=1)
    s1 = _s(1.0 + m00 - m11 - m22)
    q1 = np.stack([(m21 - m12) / s1, 0.25 * s1, (m01 + m10) / s1, (m02 + m20) / s1], axis=1)
    s2 = _s(1.0 + m11 - m00 - m22)
    q2 = np.stack([(m02 - m20) / s2, (m01 + m10) / s2, 0.25 * s2, (m12 + m21) / s2], axis=1)
    s3 = _s(1.0 + m22 - m00 - m11)
    q3 = np.stack([(m10 - m01) / s3, (m02 + m20) / s3, (m12 + m21) / s3, 0.25 * s3], axis=1)

    cond0 = trace > 0.0
    cond1 = (~cond0) & (m00 >= m11) & (m00 >= m22)
    cond2 = (~cond0) & (~cond1) & (m11 >= m22)
    sel = np.where(
        cond0[:, None], q0, np.where(cond1[:, None], q1, np.where(cond2[:, None], q2, q3))
    )
    sel = sel / np.linalg.norm(sel, axis=1, keepdims=True)
    # Canonical hemisphere w >= 0 (quaternion double-cover -> determinism).
    canonical: np.ndarray = np.where((sel[:, 0] < 0.0)[:, None], -sel, sel)
    return canonical


def reconstruct_covariance(scale: np.ndarray, quat_wxyz: np.ndarray) -> np.ndarray:
    """Reconstruct the 3x3 SPD covariance ``A = R(q) diag(s^2) R(q)^T``."""
    scale = np.asarray(scale, dtype=np.float64).reshape(3)
    rot = _quats_to_matrices(quat_wxyz)[0]
    cov = (rot * (scale * scale)) @ rot.T
    out: np.ndarray = 0.5 * (cov + cov.T)
    return out


def apply_deformation(cov: np.ndarray, deformation_gradient: np.ndarray) -> np.ndarray:
    """Apply PhysGaussian Eq. (8) covariance transform ``Sigma' = F A F^T``."""
    cov = np.asarray(cov, dtype=np.float64).reshape(3, 3)
    fgrad = np.asarray(deformation_gradient, dtype=np.float64).reshape(3, 3)
    deformed = fgrad @ cov @ fgrad.T
    out: np.ndarray = 0.5 * (deformed + deformed.T)
    return out


def _extract_batched(cov: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(N, 3, 3) SPD covariances -> (scale (N,3), quat (N,4) wxyz)."""
    cov = np.asarray(cov, dtype=np.float64).reshape(-1, 3, 3)
    sym = 0.5 * (cov + cov.transpose(0, 2, 1))
    eigvals, eigvecs = np.linalg.eigh(sym)  # ascending eigenvalues; columns = eigenvectors
    scale = np.sqrt(np.maximum(eigvals, 0.0))
    # Force each eigenvector basis to a PROPER rotation (det = +1) by flipping the first
    # column where det < 0 (covariance is invariant to eigenvector sign).
    dets = np.linalg.det(eigvecs)
    flip = dets < 0.0
    eigvecs[flip, :, 0] *= -1.0
    quats = _matrices_to_quats(eigvecs)
    return scale, quats


def extract_scale_rotation(cov: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Re-extract ``(scale (3,), quat_wxyz (4,))`` from a 3x3 SPD covariance."""
    scale, quats = _extract_batched(np.asarray(cov, dtype=np.float64).reshape(1, 3, 3))
    return scale[0], quats[0]


def couple_gaussians(
    scales: np.ndarray,
    quats_wxyz: np.ndarray,
    deformation_gradients: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Batched coupling: ``(scales (N,3), quats (N,4), F (N,3,3))`` -> ``(scales', quats')``.

    Per Gaussian: ``A = R diag(s^2) R^T``, ``Sigma' = F A F^T`` (Eq. (8)), re-extract
    ``(scale', quat')``. SH coefficients are unchanged (frozen, MVP); Gaussian centers are
    updated separately from the MPM particle positions by the sim driver.
    """
    scales = np.asarray(scales, dtype=np.float64).reshape(-1, 3)
    quats_wxyz = np.asarray(quats_wxyz, dtype=np.float64).reshape(-1, 4)
    fgrads = np.asarray(deformation_gradients, dtype=np.float64).reshape(-1, 3, 3)
    rot = _quats_to_matrices(quats_wxyz)
    s2 = scales * scales
    cov = np.einsum("nij,nj,nkj->nik", rot, s2, rot)  # R diag(s^2) R^T
    deformed = np.einsum("nij,njk,nlk->nil", fgrads, cov, fgrads)  # F A F^T
    return _extract_batched(deformed)
