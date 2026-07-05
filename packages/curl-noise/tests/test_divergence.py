"""The divergence moat — three honest routes (spec-ref § 6.2, golden A).

Route A (matched staggered curl -> divergence) telescopes to machine
zero; the independent-stencil probe of the analytic field converges at
O(g^2); route C (same-stencil nested FD) cancels to the f64 floor; the
Jacobian-trace audit is machine-zero from analytic Hessians.
"""

from __future__ import annotations

import numpy as np
import pytest

from curl_noise.reference.discrete import (
    fd_divergence_probe,
    matched_curl_2d,
    matched_curl_3d,
    matched_divergence_2d,
    matched_divergence_3d,
    nested_fd_divergence_2d,
)
from curl_noise.reference.fields import (
    CurlNoiseConfig,
    divergence_trace,
    fbm_grad_hess,
    velocity,
)


@pytest.mark.parametrize("n", [32, 64, 128])
def test_matched_2d_machine_zero(n):
    rng = np.random.default_rng(n)
    psi = rng.standard_normal((n + 1, n + 1))
    dx = 1.0 / n
    u, w = matched_curl_2d(psi, dx)
    div = matched_divergence_2d(u, w, dx)
    flux_scale = max(np.abs(u).max(), np.abs(w).max()) / dx
    assert np.abs(div).max() <= 1e-13 * flux_scale


@pytest.mark.parametrize("n", [16, 32, 64])
def test_matched_3d_machine_zero(n):
    rng = np.random.default_rng(n + 1)
    psi_x = rng.standard_normal((n, n + 1, n + 1))
    psi_y = rng.standard_normal((n + 1, n, n + 1))
    psi_z = rng.standard_normal((n + 1, n + 1, n))
    dx = 1.0 / n
    u, v, w = matched_curl_3d(psi_x, psi_y, psi_z, dx)
    div = matched_divergence_3d(u, v, w, dx)
    flux_scale = max(np.abs(u).max(), np.abs(v).max(), np.abs(w).max()) / dx
    assert np.abs(div).max() <= 1e-13 * flux_scale


def test_fbm_linearity_on_matched_grid():
    """div-free is preserved under octave summation (golden E): the
    matched divergence of the FBM-sampled potential is machine-zero, and
    curl(sum of octaves) == sum(curl of octaves) to rounding."""
    n = 48
    dx = 1.0 / n
    nodes = np.stack(
        np.meshgrid(*([np.linspace(0, 1, n + 1)] * 2), indexing="ij"), axis=-1
    ).reshape(-1, 2)
    pts = np.concatenate([nodes, np.full((nodes.shape[0], 1), 0.37)], axis=1)

    cfg_all = CurlNoiseConfig(construction="curl2d", octaves=3, ell0=0.5)
    psi_sum, _, _ = fbm_grad_hess(pts, cfg_all, 0)
    psi_sum = psi_sum.reshape(n + 1, n + 1)
    u, w = matched_curl_2d(psi_sum, dx)
    div = matched_divergence_2d(u, w, dx)
    flux_scale = max(np.abs(u).max(), np.abs(w).max()) / dx
    assert np.abs(div).max() <= 1e-13 * flux_scale

    # linearity: octave-by-octave curls sum to the summed-potential curl
    u_acc = np.zeros_like(u)
    w_acc = np.zeros_like(w)
    for o in range(3):
        cfg_o = CurlNoiseConfig(construction="curl2d", octaves=o + 1, ell0=0.5)
        psi_o, _, _ = fbm_grad_hess(pts, cfg_o, 0)
        psi_prev = (
            fbm_grad_hess(
                pts, CurlNoiseConfig(construction="curl2d", octaves=o, ell0=0.5), 0
            )[0]
            if o > 0
            else np.zeros_like(psi_o)
        )
        octave_only = (psi_o - psi_prev).reshape(n + 1, n + 1)
        uo, wo = matched_curl_2d(octave_only, dx)
        u_acc += uo
        w_acc += wo
    assert np.abs(u_acc - u).max() <= 1e-10 * max(1.0, np.abs(u).max())


@pytest.mark.parametrize("construction", ["crossprod", "curl3d", "curl2d"])
def test_analytic_probe_second_order(construction, probe_points):
    cfg = CurlNoiseConfig(construction=construction, octaves=3, ell0=0.5)

    def vel(p):
        return velocity(p, cfg)

    d1 = np.abs(fd_divergence_probe(vel, probe_points, 1e-2)).max()
    d2 = np.abs(fd_divergence_probe(vel, probe_points, 1e-3)).max()
    slope = np.log(d1 / d2) / np.log(10.0)
    # the coarse stencil (g = 1e-2 vs finest wavelength 0.125) is not
    # fully asymptotic -> accept [1.6, 2.4] (measured: 1.70-1.88)
    assert 1.6 < slope < 2.4, f"{construction} probe slope {slope}"


def test_route_c_nested_fd_cancels(probe_points):
    cfg = CurlNoiseConfig(construction="curl2d", octaves=3, ell0=0.5)

    def psi_fn(p):
        return fbm_grad_hess(p, cfg, 0)[0]

    r = nested_fd_divergence_2d(psi_fn, probe_points, 1e-4)
    assert np.abs(r).max() <= 1e-9  # measured ~0 at h = 1e-4 (Sterbenz)


@pytest.mark.parametrize("construction", ["crossprod", "curl3d", "curl2d"])
def test_jacobian_trace_machine_zero(construction, probe_points):
    """div = trace(J) from analytic Hessians — the second, independent
    machine-exact divergence instrument (Niagara-identity precedent)."""
    cfg = CurlNoiseConfig(construction=construction, octaves=3, ell0=0.5)
    tr = divergence_trace(probe_points, cfg)
    assert np.abs(tr).max() <= 1e-10
