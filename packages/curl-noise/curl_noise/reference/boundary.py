"""Boundary no-penetration treatments (spec-ref § 3, golden D).

Three routes, honestly labeled:

- ``crossprod`` SDF-substitution/blend (Baerentzen 2025; the CANONICAL
  scene): f1 = sdf + A * ramp(d/d0) * n1 with the Bridson quintic ramp.
  At the surface (d = 0) BOTH gradient terms are parallel to the normal
  (ramp(0) = 0 kills the tangential grad-n1 term; the surviving
  ramp'(0)/d0 * n1 * grad-d term is normal-parallel), so
  grad f1 || n exactly and v.n = (grad f1 x grad f2).n = 0 to FP
  rounding — a machine-exact triple-product identity, not an O(h) claim.
- Bridson 2007 multiplicative ramp (2D stream function, Eq. 3/4):
  psi' = ramp(d/d0) * psi. Continuum-exact tangency on the analytic
  SDF; O(h) once the SDF is grid-discretized (golden D rows).
- Curl-Flow additive ramp is documented in the spec; its distinguishing
  free-slip behavior is a web-layer comparison template, not a gated
  reference surface (spec-ref § 13.3).

Medial-axis caveat (Ding & Batty 2023): for non-convex geometry the C^0
min{} distance kinks the potential — documented NOT-a-gate (golden D
probe row uses a two-sphere scene).
"""

from __future__ import annotations

import numpy as np


# --------------------------------------------------------------------------- #
# Quintic ramp (Bridson 2007 Eq. 4; C^2 joins at both ends — derived label)
# --------------------------------------------------------------------------- #
def ramp(r: np.ndarray) -> np.ndarray:
    """ramp(r) = 15/8 r - 10/8 r^3 + 3/8 r^5 on [0, 1], clamped outside.

    ramp(0)=0, ramp(1)=1, ramp'(1)=ramp''(1)=0, ramp''(0)=0; ramp'(0)=15/8.
    """
    r = np.clip(r, 0.0, 1.0)
    return 15.0 / 8.0 * r - 10.0 / 8.0 * r**3 + 3.0 / 8.0 * r**5


def _ramp_d1(r: np.ndarray) -> np.ndarray:
    """ramp'(r); outside [0, 1] the clamped ramp is constant -> 0.

    AT r = 0 the one-sided interior value 15/8 is used (the surface-
    tangency argument in the module docstring needs ramp'(0) != 0)."""
    out = 15.0 / 8.0 - 30.0 / 8.0 * r**2 + 15.0 / 8.0 * r**4
    return np.where((r < 0.0) | (r > 1.0), 0.0, out)


def _ramp_d2(r: np.ndarray) -> np.ndarray:
    out = -60.0 / 8.0 * r + 60.0 / 8.0 * r**3
    return np.where((r < 0.0) | (r > 1.0), 0.0, out)


# --------------------------------------------------------------------------- #
# Sphere SDF (analytic; canonical obstacle)
# --------------------------------------------------------------------------- #
def sphere_sdf_grad_hess(
    x: np.ndarray, center: np.ndarray, radius: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """d = |x - c| - R; grad = n_hat; hess = (I - n n^T)/|x - c|."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    rel = x - np.asarray(center, dtype=np.float64)[None, :]
    dist = np.linalg.norm(rel, axis=1)
    dist_safe = np.maximum(dist, 1e-300)
    n_hat = rel / dist_safe[:, None]
    d = dist - radius
    eye = np.eye(3)[None, :, :]
    hess = (eye - n_hat[:, :, None] * n_hat[:, None, :]) / dist_safe[:, None, None]
    return d, n_hat, hess


# --------------------------------------------------------------------------- #
# Canonical crossprod obstacle potentials (f1 = sdf + A ramp(d/d0) n1, f2 = FBM)
# --------------------------------------------------------------------------- #
def crossprod_obstacle_potentials(
    x: np.ndarray, cfg
) -> tuple[tuple[np.ndarray, np.ndarray], tuple[np.ndarray, np.ndarray]]:
    """(grad f1, hess f1), (grad f2, hess f2) for the canonical scene.

    f1 = sdf(x) + A * ramp(u) * n1(x), u = clamp(d/d0, 0, 1)
    grad f1 = grad d + A [ ramp'(u)/d0 * n1 * grad d + ramp(u) * grad n1 ]
    hess f1 = hess d
            + A [ ramp''(u)/d0^2 * n1 * (grad d)(grad d)^T
                + ramp'(u)/d0 * n1 * hess d
                + ramp'(u)/d0 * (grad d (grad n1)^T + grad n1 (grad d)^T)
                + ramp(u) * hess n1 ]
    """
    from .fields import fbm_grad_hess  # local import (module cycle)

    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    center = np.asarray(cfg.obstacle_center, dtype=np.float64)
    d, gd, hd = sphere_sdf_grad_hess(x, center, cfg.obstacle_radius)
    d0 = cfg.obstacle_ramp_width
    amp = cfg.obstacle_noise_amp
    u = d / d0
    r0 = ramp(u)
    r1 = _ramp_d1(u) / d0
    r2 = _ramp_d2(u) / (d0 * d0)

    n1, g1, h1 = fbm_grad_hess(x, cfg, 0)
    _, g2, h2 = fbm_grad_hess(x, cfg, 1)

    grad_f1 = gd + amp * (r1[:, None] * n1[:, None] * gd + r0[:, None] * g1)
    gdgdt = gd[:, :, None] * gd[:, None, :]
    cross_t = gd[:, :, None] * g1[:, None, :] + g1[:, :, None] * gd[:, None, :]
    hess_f1 = hd + amp * (
        (r2 * n1)[:, None, None] * gdgdt
        + (r1 * n1)[:, None, None] * hd
        + r1[:, None, None] * cross_t
        + r0[:, None, None] * h1
    )
    return (grad_f1, hess_f1), (g2, h2)


# --------------------------------------------------------------------------- #
# Bridson multiplicative ramp for the 2D stream function (golden D)
# --------------------------------------------------------------------------- #
def psi2d_ramped_grad(
    x: np.ndarray,
    cfg,
    center: np.ndarray,
    radius: float,
    d0: float,
    sdf_values=None,
) -> tuple[np.ndarray, np.ndarray]:
    """psi' = ramp(d/d0) * psi on a cylinder (circle in the z-slice).

    Returns (psi', grad psi') with grad in the (x, y) plane. If
    ``sdf_values`` is given as (d, grad d) it replaces the analytic SDF —
    the hook the golden-D discretized-SDF O(h) rows use.
    """
    from .fields import fbm_grad_hess

    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    x3 = x.copy()
    x3[:, 2] = cfg.z_slice
    psi, gpsi, _ = fbm_grad_hess(x3, cfg, 0)

    if sdf_values is None:
        rel = x[:, :2] - np.asarray(center, dtype=np.float64)[None, :2]
        dist = np.linalg.norm(rel, axis=1)
        d = dist - radius
        gd = np.zeros_like(gpsi)
        gd[:, :2] = rel / np.maximum(dist, 1e-300)[:, None]
    else:
        d, gd = sdf_values

    u = d / d0
    r0 = ramp(u)
    r1 = _ramp_d1(u) / d0
    psi_c = r0 * psi
    grad_c = r1[:, None] * psi[:, None] * gd + r0[:, None] * gpsi
    return psi_c, grad_c


def velocity_2d_ramped(
    x: np.ndarray, cfg, center, radius: float, d0: float, sdf_values=None
) -> np.ndarray:
    """v = (d psi'/dy, -d psi'/dx, 0) for the ramped 2D stream function."""
    _, g = psi2d_ramped_grad(x, cfg, center, radius, d0, sdf_values)
    v = np.zeros_like(g)
    v[:, 0] = g[:, 1]
    v[:, 1] = -g[:, 0]
    return v
