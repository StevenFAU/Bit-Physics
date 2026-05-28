"""``render`` — the deterministic forward EWA-splatting renderer (§3.2.1).

Projects each 3D Gaussian to a screen-space 2D Gaussian (EWA splatting: the
local-affine Jacobian of the perspective map applied to the camera-space
covariance), evaluates its view-dependent colour from the spherical-harmonic
bank, sorts the splats by camera-space depth, and alpha-composites them
front-to-back per pixel.

Pipeline split: the projection / covariance / SH-colour preprocessing and the
stable depth sort run on the host in NumPy (deterministic); the per-pixel
front-to-back compositing — the O(H·W·N) rasterizer inner loop — runs in the
Warp kernel ``common_3dgs._kernels.composite_splats`` (Stack-E, CPU-serial,
no atomic scatter → bit-identical run-to-run; D-C bit-exact / same-stack-same-hw).

This module hosts no ``@wp.kernel`` directly (those live in ``_kernels.py``), but
it does keep ``from __future__ import annotations`` off out of caution for the
Warp interop / to mirror the kernel-module posture.
"""

import numpy as np
import warp as wp

from ._kernels import composite_splats
from .camera import Camera
from .model import GaussianSplatModel

#: Default background colour (RGB in [0, 1]).
BACKGROUND_DEFAULT = (0.0, 0.0, 0.0)

#: EWA low-pass filter: dilate the 2D covariance so every splat covers ≥ ~1px
#: (Inria forward-rasterizer convention; keeps the conic well-conditioned).
_LOW_PASS = 0.3

# Real spherical-harmonic basis constants (Inria utils/sh_utils.py).
_C0 = 0.28209479177387814
_C1 = 0.4886025119029199
_C2 = (
    1.0925484305920792,
    -1.0925484305920792,
    0.31539156525252005,
    -1.0925484305920792,
    0.5462742152960396,
)
_C3 = (
    -0.5900435899266435,
    2.890611442640554,
    -0.4570457994644658,
    0.3731763325901154,
    -0.4570457994644658,
    1.445305721320277,
    -0.5900435899266435,
)

_wp_initialized = False


def _ensure_warp() -> None:
    global _wp_initialized
    if not _wp_initialized:
        wp.init()
        _wp_initialized = True


def _quaternions_to_matrices(q: np.ndarray) -> np.ndarray:
    """(N, 4) wxyz unit quaternions → (N, 3, 3) rotation matrices."""
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


def _eval_sh(degree: int, sh: np.ndarray, dirs: np.ndarray) -> np.ndarray:
    """Evaluate the real SH colour (N, 3) from coefficients (N, K, 3) + dirs (N, 3)."""
    result = _C0 * sh[:, 0, :]
    if degree >= 1:
        x = dirs[:, 0:1]
        y = dirs[:, 1:2]
        z = dirs[:, 2:3]
        result = result - _C1 * y * sh[:, 1, :] + _C1 * z * sh[:, 2, :] - _C1 * x * sh[:, 3, :]
        if degree >= 2:
            xx, yy, zz = x * x, y * y, z * z
            xy, yz, xz = x * y, y * z, x * z
            result = (
                result
                + _C2[0] * xy * sh[:, 4, :]
                + _C2[1] * yz * sh[:, 5, :]
                + _C2[2] * (2.0 * zz - xx - yy) * sh[:, 6, :]
                + _C2[3] * xz * sh[:, 7, :]
                + _C2[4] * (xx - yy) * sh[:, 8, :]
            )
            if degree >= 3:
                result = (
                    result
                    + _C3[0] * y * (3.0 * xx - yy) * sh[:, 9, :]
                    + _C3[1] * xy * z * sh[:, 10, :]
                    + _C3[2] * y * (4.0 * zz - xx - yy) * sh[:, 11, :]
                    + _C3[3] * z * (2.0 * zz - 3.0 * xx - 3.0 * yy) * sh[:, 12, :]
                    + _C3[4] * x * (4.0 * zz - xx - yy) * sh[:, 13, :]
                    + _C3[5] * z * (xx - yy) * sh[:, 14, :]
                    + _C3[6] * x * (xx - 3.0 * yy) * sh[:, 15, :]
                )
    return result + 0.5


def render(
    model: GaussianSplatModel,
    camera: Camera,
    *,
    image_height: int | None = None,
    image_width: int | None = None,
    background: tuple[float, float, float] = BACKGROUND_DEFAULT,
) -> np.ndarray:
    """Render ``model`` from ``camera`` to an ``(H, W, 3) float32`` image in ``[0, 1]``.

    Image dimensions default to the camera's ``image_height`` / ``image_width`` when
    not given. An empty model (``N == 0``) — or one whose every Gaussian is culled
    (behind the near plane / degenerate covariance) — returns a background-filled
    image of the requested shape/dtype. Deterministic given fixed inputs (D-C).
    """
    h = int(image_height if image_height is not None else camera.image_height)
    w = int(image_width if image_width is not None else camera.image_width)
    bg = np.asarray(background, dtype=np.float32).reshape(3)

    def _background_image() -> np.ndarray:
        img = np.empty((h, w, 3), dtype=np.float32)
        img[:] = np.clip(bg, 0.0, 1.0)
        return img

    if model.num_gaussians == 0:
        return _background_image()

    npy = model.to_numpy()
    positions = npy["positions"].astype(np.float64)
    scales = npy["scales"].astype(np.float64)
    rotations = npy["rotations"].astype(np.float64)
    opacities = npy["opacities"].astype(np.float64)
    sh = npy["sh_coefficients"].astype(np.float64)

    view = camera.view_matrix.astype(np.float64)
    rot_view = view[:3, :3]
    trans_view = view[:3, 3]
    cam_center = camera.camera_center.astype(np.float64)

    p_cam = positions @ rot_view.T + trans_view
    tz = p_cam[:, 2]

    focal = (h / 2.0) / np.tan(camera.fov_y / 2.0)
    cx = (w - 1) / 2.0
    cy = (h - 1) / 2.0

    # 3D world covariance Σ = R diag(s²) Rᵀ, then to camera space W Σ Wᵀ.
    rmat = _quaternions_to_matrices(rotations)
    s2 = scales * scales
    cov3d = np.einsum("nij,nj,nkj->nik", rmat, s2, rmat)
    cov_cam = np.einsum("ij,njk,lk->nil", rot_view, cov3d, rot_view)

    # EWA Jacobian J (N, 2, 3) of the perspective map at each splat's depth.
    safe_tz = np.where(np.abs(tz) > 1e-8, tz, 1e-8)
    jac = np.zeros((positions.shape[0], 2, 3), dtype=np.float64)
    jac[:, 0, 0] = focal / safe_tz
    jac[:, 0, 2] = -focal * p_cam[:, 0] / (safe_tz * safe_tz)
    jac[:, 1, 1] = focal / safe_tz
    jac[:, 1, 2] = -focal * p_cam[:, 1] / (safe_tz * safe_tz)

    cov2d = np.einsum("nij,njk,nlk->nil", jac, cov_cam, jac)
    cov2d[:, 0, 0] += _LOW_PASS
    cov2d[:, 1, 1] += _LOW_PASS
    det = cov2d[:, 0, 0] * cov2d[:, 1, 1] - cov2d[:, 0, 1] * cov2d[:, 1, 0]

    u = focal * p_cam[:, 0] / safe_tz + cx
    v = focal * p_cam[:, 1] / safe_tz + cy

    dirs = positions - cam_center
    dnorm = np.linalg.norm(dirs, axis=1, keepdims=True)
    dirs = dirs / np.where(dnorm > 0.0, dnorm, 1.0)
    colors = np.clip(_eval_sh(model.sh_degree, sh, dirs), 0.0, None)

    visible = (tz > camera.near) & (det > 1e-12)
    if not np.any(visible):
        return _background_image()

    order = np.argsort(tz[visible], kind="stable")  # nearest first; stable for determinism
    idx = np.flatnonzero(visible)[order]

    det_v = det[idx]
    conic_a = (cov2d[idx, 1, 1] / det_v).astype(np.float32)
    conic_b = (-cov2d[idx, 0, 1] / det_v).astype(np.float32)
    conic_c = (cov2d[idx, 0, 0] / det_v).astype(np.float32)

    _ensure_warp()
    n = idx.shape[0]
    out = wp.zeros((h, w, 3), dtype=wp.float32, device="cpu")
    wp.launch(
        composite_splats,
        dim=(h, w),
        inputs=[
            wp.array(u[idx].astype(np.float32), dtype=wp.float32, device="cpu"),
            wp.array(v[idx].astype(np.float32), dtype=wp.float32, device="cpu"),
            wp.array(conic_a, dtype=wp.float32, device="cpu"),
            wp.array(conic_b, dtype=wp.float32, device="cpu"),
            wp.array(conic_c, dtype=wp.float32, device="cpu"),
            wp.array(colors[idx, 0].astype(np.float32), dtype=wp.float32, device="cpu"),
            wp.array(colors[idx, 1].astype(np.float32), dtype=wp.float32, device="cpu"),
            wp.array(colors[idx, 2].astype(np.float32), dtype=wp.float32, device="cpu"),
            wp.array(opacities[idx].astype(np.float32), dtype=wp.float32, device="cpu"),
            wp.int32(n),
            wp.float32(float(bg[0])),
            wp.float32(float(bg[1])),
            wp.float32(float(bg[2])),
        ],
        outputs=[out],
        device="cpu",
    )
    return np.asarray(out.numpy(), dtype=np.float32).reshape(h, w, 3)
