"""ABC flow + closed-form reference fields (golden E/F anchors)."""

from __future__ import annotations

import numpy as np

from curl_noise.reference.discrete import fd_divergence_probe
from curl_noise.reference.fields import abc_curl, abc_flow


def test_abc_beltrami_exact(probe_points):
    """curl v == v term-by-term (Beltrami) — bit-exact residual 0."""
    v = abc_flow(probe_points, 1.0, 1.0, 1.0)
    c = abc_curl(probe_points, 1.0, 1.0, 1.0)
    assert np.array_equal(v, c)


def test_abc_helicity_density_is_speed_squared(probe_points):
    v = abc_flow(probe_points)
    h = np.sum(v * abc_curl(probe_points), axis=1)
    assert np.allclose(h, np.sum(v * v, axis=1), rtol=0, atol=0)


def test_abc_divergence_probe_structurally_zero(probe_points):
    """Stronger than O(g^2): each ABC component is constant along its own
    axis, so even the FD probe's differences vanish BIT-EXACTLY at any
    stencil (v_x(x+g e_x) and v_x(x-g e_x) have identical arguments)."""
    d1 = np.abs(fd_divergence_probe(abc_flow, probe_points, 1e-2)).max()
    d2 = np.abs(fd_divergence_probe(abc_flow, probe_points, 1e-3)).max()
    assert d1 == 0.0
    assert d2 == 0.0


def test_abc_generic_params():
    rng = np.random.default_rng(12)
    pts = rng.uniform(-4, 4, size=(200, 3))
    a, b, c = 1.0, np.sqrt(2.0 / 3.0), np.sqrt(1.0 / 3.0)  # Dombre canonical
    assert np.array_equal(abc_flow(pts, a, b, c), abc_curl(pts, a, b, c))


def test_taylor_green_stream_function_div_free():
    """Golden-E third closed form: psi = sin x sin y -> v = (psi_y, -psi_x)
    has div = psi_yx - psi_xy = 0 analytically; FD probe confirms O(g^2)."""

    def tg_vel(p):
        v = np.zeros_like(p)
        v[:, 0] = np.sin(p[:, 0]) * np.cos(p[:, 1])
        v[:, 1] = -np.cos(p[:, 0]) * np.sin(p[:, 1])
        return v

    rng = np.random.default_rng(13)
    pts = rng.uniform(-3, 3, size=(200, 3))
    d = np.abs(fd_divergence_probe(tg_vel, pts, 1e-3)).max()
    assert d < 1e-9
