"""Noise-basis code verification (spec-ref § 6.1, golden B posture).

The analytic gradient and Hessian are exact closed forms; central
differences of the value/gradient must converge to them at O(h^2).
"""

from __future__ import annotations

import numpy as np

from curl_noise.reference import noise
from curl_noise.reference.noise import snoise_grad_hess


def _fd_gradient(pts: np.ndarray, h: float) -> np.ndarray:
    fd = np.zeros((pts.shape[0], 3))
    for k in range(3):
        e = np.zeros(3)
        e[k] = h
        vp, _, _ = snoise_grad_hess(pts + e)
        vm, _, _ = snoise_grad_hess(pts - e)
        fd[:, k] = (vp - vm) / (2.0 * h)
    return fd


def _fd_hessian(pts: np.ndarray, h: float) -> np.ndarray:
    fd = np.zeros((pts.shape[0], 3, 3))
    for k in range(3):
        e = np.zeros(3)
        e[k] = h
        _, gp, _ = snoise_grad_hess(pts + e)
        _, gm, _ = snoise_grad_hess(pts - e)
        fd[:, :, k] = (gp - gm) / (2.0 * h)
    return fd


def test_pinned_constants():
    """The two silent-killer constants (spec-ref § 2.5) are pinned."""
    assert noise.FALLOFF == 0.5  # NOT Perlin's 0.6
    assert noise.PERM_ADD == 10.0  # NOT the streaky +1
    assert noise.PERM_MUL == 34.0
    assert noise.PERM_MOD == 289.0  # 17^2, f32-exact hash domain


def test_gradient_fd_convergence_order2():
    rng = np.random.default_rng(3)
    pts = rng.uniform(-8.0, 8.0, size=(200, 3))
    _, g, _ = snoise_grad_hess(pts)
    e1 = np.abs(_fd_gradient(pts, 1e-3) - g).max()
    e2 = np.abs(_fd_gradient(pts, 1e-4) - g).max()
    slope = np.log(e1 / e2) / np.log(10.0)
    assert 1.9 < slope < 2.1, f"gradient MMS slope {slope}"
    assert e2 < 1e-5


def test_hessian_fd_convergence_order2():
    rng = np.random.default_rng(4)
    pts = rng.uniform(-8.0, 8.0, size=(200, 3))
    _, _, h_an = snoise_grad_hess(pts)
    e1 = np.abs(_fd_hessian(pts, 1e-3) - h_an).max()
    e2 = np.abs(_fd_hessian(pts, 1e-4) - h_an).max()
    slope = np.log(e1 / e2) / np.log(10.0)
    assert 1.9 < slope < 2.1, f"Hessian MMS slope {slope}"


def test_hessian_symmetric_bit_exact():
    rng = np.random.default_rng(5)
    pts = rng.uniform(-20.0, 20.0, size=(500, 3))
    _, _, h = snoise_grad_hess(pts)
    assert np.array_equal(h, np.transpose(h, (0, 2, 1)))


def test_value_range_committed():
    """SCALE = 22.0 committed; measured range with the exact-integer
    gradient selection is max |n| ~ 0.21 (see noise.py SCALE comment)."""
    rng = np.random.default_rng(6)
    pts = rng.uniform(-50.0, 50.0, size=(500_000, 3))
    v, _, _ = snoise_grad_hess(pts)
    assert np.abs(v).max() <= 0.35
    assert np.abs(v).max() > 0.1  # not accidentally dead


def test_continuity_along_line():
    """C^0/C^1 across simplex boundaries: increments bounded by the local
    gradient (the 0.5-falloff continuity claim, spec-ref § 2.5)."""
    t = np.linspace(0.0, 3.0, 300_001)
    pts = np.stack([t, 0.3 + 0.7 * t, 1.1 - 0.2 * t], axis=1)
    v, g, _ = snoise_grad_hess(pts)
    step = float(np.linalg.norm(pts[1] - pts[0]))
    gmax = float(np.linalg.norm(g, axis=1).max())
    assert np.abs(np.diff(v)).max() < 2.0 * gmax * step
    # gradient itself continuous (C^1) — bounded by Hessian-scale * step
    assert np.abs(np.diff(g, axis=0)).max() < 50.0 * step
