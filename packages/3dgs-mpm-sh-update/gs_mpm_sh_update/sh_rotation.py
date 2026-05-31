"""Spherical-harmonic rotation under deformation — the Phase-3-task-8-deferred stretch.

PhysGaussian (Xie et al. 2024, arXiv:2311.12198 — CITE-ONLY) rotates each Gaussian's
view-dependent appearance with the body: the SH coefficients are rotated by the rotation
part ``R`` of the polar decomposition ``F = R S`` of the per-particle deformation gradient
(Eq. (9); equivalently the inverse rotation is applied to the view directions). The MVP
(``packages/3dgs-mpm``) FROZE the SH (``R`` unused); this module supplies the rotation.

**Degree-1 Wigner-D closed form (derived against the LANDED renderer basis).** The
common-3dgs renderer evaluates the degree-1 band as
``-C1*y*sh[1] + C1*z*sh[2] - C1*x*sh[3]`` (``common/common-3dgs/src/common_3dgs/render.py``
``_eval_sh``), i.e. the band-1 basis values are ``(-y, +z, -x)*C1``. Writing the signed
permutation ``P = [[0,-1,0],[0,0,1],[-1,0,0]]`` (so the band-1 basis vector is ``v(d)=P d``),
rotation-equivariance ``eval_SH(D1(R) c, R d) = eval_SH(c, d)`` forces

    D1(R) = P R P^T

(``P`` and ``R`` orthogonal). The DC band (degree 0) is rotation-invariant (unchanged); the
renderer's ``+0.5`` colour offset is a constant and does not affect equivariance.

**Scope: degree <= 1.** The canonical SH-update scene is degree-1 (K=4); band-1 dipole
rotation is the rigorous, closed-form-anchored frontier delta. Coefficients of degree >= 2
raise ``NotImplementedError`` (higher-band real-SH Wigner-D is a documented further
extension — not asserted unverified).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

#: Signed permutation taking ``(x, y, z) -> (-y, +z, -x)`` — the degree-1 real-SH basis
#: order of the landed common-3dgs renderer (``render._eval_sh``).
_P = np.array([[0.0, -1.0, 0.0], [0.0, 0.0, 1.0], [-1.0, 0.0, 0.0]], dtype=np.float64)


def polar_rotation(deformation_gradient: NDArray[np.floating]) -> NDArray[np.float64]:
    """Rotation part ``R`` of the polar decomposition ``F = R S`` (per Gaussian).

    ``deformation_gradient`` is ``(N, 3, 3)``. ``R = U V^T`` from the SVD ``F = U Sigma V^T``,
    forced to a proper rotation (``det = +1``) by flipping the sign of the last column of
    ``U`` where ``det(U V^T) < 0`` (the standard nearest-rotation correction). For a pure
    stretch (``F`` SPD) ``R = I``; for a pure rotation (``F`` orthogonal) ``R = F``.
    """
    f = np.asarray(deformation_gradient, dtype=np.float64).reshape(-1, 3, 3)
    u, _s, vt = np.linalg.svd(f)
    r = u @ vt
    # Nearest PROPER rotation: where det(U V^T) < 0, flip the last column of U.
    flip = np.linalg.det(r) < 0.0
    u[flip, :, 2] *= -1.0
    r = u @ vt
    return np.ascontiguousarray(r, dtype=np.float64)


def rotate_sh_degree1(
    sh_coefficients: NDArray[np.floating], rotation: NDArray[np.floating]
) -> NDArray[np.float64]:
    """Rotate real-SH coefficients ``(N, K, 3)`` by per-Gaussian rotations ``(N, 3, 3)``.

    DC band (index 0) is unchanged (rotation-invariant); the degree-1 band (indices 1..3,
    present when ``K >= 4``) is rotated per channel by ``D1(R) = P R P^T``. ``K`` must be 1
    (DC-only) or 4 (degree 1); ``K`` implying degree >= 2 raises ``NotImplementedError``.
    """
    sh = np.asarray(sh_coefficients, dtype=np.float64)
    if sh.ndim != 3 or sh.shape[2] != 3:
        raise ValueError(f"sh_coefficients must be (N, K, 3); got {sh.shape}")
    k = sh.shape[1]
    out = sh.copy()
    if k == 1:
        return out  # DC-only (degree 0) — rotation-invariant
    if k != 4:
        raise NotImplementedError(
            f"SH degree >= 2 (K={k}) rotation is out of scope (degree <= 1 only); "
            "higher-band real-SH Wigner-D is a documented further extension"
        )
    r = np.asarray(rotation, dtype=np.float64).reshape(-1, 3, 3)
    if r.shape[0] != sh.shape[0]:
        raise ValueError(f"rotation leading dim {r.shape[0]} != N {sh.shape[0]}")
    # Degree-1 Wigner-D in the renderer's (-y,+z,-x) basis: D1(R) = P R P^T.
    d1 = np.einsum("ij,njk,lk->nil", _P, r, _P)
    # Rotate the 3 band-1 coefficients (axis 1) per channel: c'[n,i,ch] = D1[n,i,j] c[n,j,ch].
    out[:, 1:4, :] = np.einsum("nij,njc->nic", d1, sh[:, 1:4, :])
    return out


__all__ = ["polar_rotation", "rotate_sh_degree1"]
