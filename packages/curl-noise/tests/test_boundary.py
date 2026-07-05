"""Boundary tangency (spec-ref § 3, golden D): machine-exact on the
analytic SDF routes; O(h) once the SDF is grid-discretized; degraded at
the medial axis (documented NOT-a-gate)."""

from __future__ import annotations

import numpy as np

from curl_noise.reference.boundary import velocity_2d_ramped
from curl_noise.reference.fields import CANONICAL_CONFIG, CurlNoiseConfig, velocity


def _sphere_surface_points(center, radius, n=256, seed=9):
    rng = np.random.default_rng(seed)
    theta = np.arccos(rng.uniform(-1, 1, n))
    phi = rng.uniform(0, 2 * np.pi, n)
    n_hat = np.stack(
        [
            np.sin(theta) * np.cos(phi),
            np.sin(theta) * np.sin(phi),
            np.cos(theta),
        ],
        axis=1,
    )
    return np.asarray(center) + radius * n_hat, n_hat


def test_canonical_sdf_substitution_tangency_machine_exact():
    """v.n on the canonical sphere: a triple-product identity, not O(h)."""
    cfg = CANONICAL_CONFIG
    surf, n_hat = _sphere_surface_points(cfg.obstacle_center, cfg.obstacle_radius)
    v = velocity(surf, cfg)
    vn = np.abs(np.sum(v * n_hat, axis=1)).max()
    scale = np.abs(v).max()
    assert vn <= 1e-12 * max(scale, 1.0)


def test_2d_multiplicative_ramp_tangency_analytic_sdf():
    """Bridson Eq. 3/4 on a cylinder with the ANALYTIC circle SDF:
    v = rot(grad psi') with grad psi' || n at the surface -> v.n = 0."""
    cfg = CurlNoiseConfig(construction="curl2d", octaves=3, ell0=0.5)
    center = np.array([0.5, 0.5, 0.0])
    radius, d0 = 0.2, 0.15
    ang = np.linspace(0, 2 * np.pi, 257)[:-1]
    surf = np.stack(
        [center[0] + radius * np.cos(ang), center[1] + radius * np.sin(ang)], axis=1
    )
    surf3 = np.concatenate([surf, np.zeros((surf.shape[0], 1))], axis=1)
    n_hat = np.zeros_like(surf3)
    n_hat[:, 0] = np.cos(ang)
    n_hat[:, 1] = np.sin(ang)
    v = velocity_2d_ramped(surf3, cfg, center, radius, d0)
    vn = np.abs(np.sum(v * n_hat, axis=1)).max()
    assert vn <= 1e-12 * max(np.abs(v).max(), 1.0)


def _grid_sdf_values(pts, center, radius, h):
    """Bilinearly-interpolated grid SDF + one-sided FD gradient — the
    'discretized enforcement' whose tangency error is O(h) (golden D)."""

    def sdf_exact(p):
        rel = p[:, :2] - center[None, :2]
        return np.linalg.norm(rel, axis=1) - radius

    # snap SDF evaluation to an h-grid (value + gradient from the grid)
    base = np.floor(pts[:, :2] / h) * h
    frac = (pts[:, :2] - base) / h
    corners = []
    for dx_i in (0.0, 1.0):
        for dy_i in (0.0, 1.0):
            q = base + np.array([dx_i, dy_i]) * h
            q3 = np.concatenate([q, np.zeros((q.shape[0], 1))], axis=1)
            corners.append(sdf_exact(q3))
    c00, c01, c10, c11 = corners
    fx, fy = frac[:, 0], frac[:, 1]
    d = (
        c00 * (1 - fx) * (1 - fy)
        + c01 * (1 - fx) * fy
        + c10 * fx * (1 - fy)
        + c11 * fx * fy
    )
    gd = np.zeros((pts.shape[0], 3))
    gd[:, 0] = ((c10 - c00) * (1 - fy) + (c11 - c01) * fy) / h
    gd[:, 1] = ((c01 - c00) * (1 - fx) + (c11 - c10) * fx) / h
    return d, gd


def test_discretized_sdf_tangency_first_order():
    cfg = CurlNoiseConfig(construction="curl2d", octaves=3, ell0=0.5)
    center = np.array([0.5, 0.5, 0.0])
    radius, d0 = 0.2, 0.15
    ang = np.linspace(0, 2 * np.pi, 129)[:-1]
    surf3 = np.stack(
        [
            center[0] + radius * np.cos(ang),
            center[1] + radius * np.sin(ang),
            np.zeros_like(ang),
        ],
        axis=1,
    )
    n_hat = np.zeros_like(surf3)
    n_hat[:, 0] = np.cos(ang)
    n_hat[:, 1] = np.sin(ang)

    def vn_at(h):
        sdf_vals = _grid_sdf_values(surf3, center, radius, h)
        v = velocity_2d_ramped(surf3, cfg, center, radius, d0, sdf_values=sdf_vals)
        return np.abs(np.sum(v * n_hat, axis=1)).max()

    e_coarse, e_fine = vn_at(2e-2), vn_at(2e-3)
    slope = np.log(e_coarse / e_fine) / np.log(10.0)
    assert 0.6 < slope < 1.6, f"discretized-SDF tangency slope {slope}"
    assert e_fine < e_coarse


def test_medial_axis_degrades_documented_not_gated():
    """Two-cylinder min{} SDF: the potential kinks on the equidistant
    plane -> velocity jump across it is far larger than the smooth-field
    increment (Ding & Batty 2023 problem statement; NOT a gate)."""
    cfg = CurlNoiseConfig(construction="curl2d", octaves=3, ell0=0.5)
    c1 = np.array([0.3, 0.5, 0.0])
    c2 = np.array([0.7, 0.5, 0.0])
    radius, d0 = 0.1, 0.15

    def min_sdf(pts):
        d1 = np.linalg.norm(pts[:, :2] - c1[None, :2], axis=1) - radius
        d2 = np.linalg.norm(pts[:, :2] - c2[None, :2], axis=1) - radius
        d = np.minimum(d1, d2)
        pick1 = d1 <= d2
        gd = np.zeros((pts.shape[0], 3))
        g1 = (pts[:, :2] - c1[None, :2]) / np.maximum(d1 + radius, 1e-300)[:, None]
        g2 = (pts[:, :2] - c2[None, :2]) / np.maximum(d2 + radius, 1e-300)[:, None]
        gd[:, :2] = np.where(pick1[:, None], g1, g2)
        return d, gd

    # sample a segment crossing the medial plane x = 0.5 between the discs
    xs = np.linspace(0.45, 0.55, 2001)
    seg = np.stack([xs, np.full_like(xs, 0.5), np.zeros_like(xs)], axis=1)
    v = velocity_2d_ramped(seg, cfg, c1, radius, d0, sdf_values=min_sdf(seg))
    dv = np.linalg.norm(np.diff(v, axis=0), axis=1)
    mid = dv[990:1010].max()  # increments straddling the medial plane
    typical = np.median(dv)
    assert mid > 20.0 * typical, (mid, typical)
