"""Iso-value residual + Newton reprojection (Baerentzen 2025 Eqs. 10/12).

For the cross-product construction the streamline through x0 is exactly
the codim-2 intersection {f1 = f1(x0)} n {f2 = f2(x0)}; the residual
||f(x) - f(x0)|| (distance-to-manifold in value space) is the
chaos-immune verification instrument (spec-ref § 6.2): it is invariant
under sliding ALONG the intersection curve, grows O(dt^p) under RK-p
advection, and is driven to machine zero by the min-norm Newton step

    x <- x - J^T (J J^T)^{-1} r,   J = [grad f1; grad f2] (2x3),

whose iteration count is pinned to 1 (Baerentzen's measured saturation:
RMSE 3.861 for 1 iteration vs 3.882 for 10).
"""

from __future__ import annotations

import numpy as np


def iso_values(x: np.ndarray, cfg) -> np.ndarray:
    """(f1, f2) at points x for the crossprod construction. (N, 2)."""
    from .fields import fbm_grad_hess

    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    if cfg.obstacle_center is not None:
        f1 = _obstacle_f1_value(x, cfg)
    else:
        f1, _, _ = fbm_grad_hess(x, cfg, 0)
    f2, _, _ = fbm_grad_hess(x, cfg, 1)
    return np.stack([f1, f2], axis=1)


def _obstacle_f1_value(x: np.ndarray, cfg) -> np.ndarray:
    from .boundary import ramp, sphere_sdf_grad_hess
    from .fields import fbm_grad_hess

    d, _, _ = sphere_sdf_grad_hess(
        x, np.asarray(cfg.obstacle_center), cfg.obstacle_radius
    )
    n1, _, _ = fbm_grad_hess(x, cfg, 0)
    return d + cfg.obstacle_noise_amp * ramp(d / cfg.obstacle_ramp_width) * n1


def _iso_grads(x: np.ndarray, cfg) -> tuple[np.ndarray, np.ndarray]:
    from .fields import fbm_grad_hess

    if cfg.obstacle_center is not None:
        from .boundary import crossprod_obstacle_potentials

        (g1, _), (g2, _) = crossprod_obstacle_potentials(x, cfg)
    else:
        _, g1, _ = fbm_grad_hess(x, cfg, 0)
        _, g2, _ = fbm_grad_hess(x, cfg, 1)
    return g1, g2


def iso_value_residual(x: np.ndarray, f0: np.ndarray, cfg) -> np.ndarray:
    """||f(x) - f0|| per point (Euclidean over the two channels)."""
    f = iso_values(x, cfg)
    return np.linalg.norm(f - f0, axis=1)


def reproject(x: np.ndarray, f0: np.ndarray, cfg, iterations: int = 1) -> np.ndarray:
    """Min-norm Newton reprojection onto {f = f0} (default 1 iteration)."""
    x = np.asarray(x, dtype=np.float64).copy()
    if x.ndim == 1:
        x = x[None, :]
    for _ in range(iterations):
        f = iso_values(x, cfg)
        r = f - f0  # (N, 2)
        g1, g2 = _iso_grads(x, cfg)
        # J J^T (2x2 symmetric): [[g1.g1, g1.g2], [g1.g2, g2.g2]]
        a = np.sum(g1 * g1, axis=1)
        b = np.sum(g1 * g2, axis=1)
        c = np.sum(g2 * g2, axis=1)
        det = a * c - b * b
        det = np.where(np.abs(det) < 1e-300, 1e-300, det)
        # solve (J J^T) y = r
        y1 = (c * r[:, 0] - b * r[:, 1]) / det
        y2 = (a * r[:, 1] - b * r[:, 0]) / det
        # x -= J^T y
        x = x - (y1[:, None] * g1 + y2[:, None] * g2)
    return x
