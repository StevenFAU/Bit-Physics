"""Property-based invariants (spec-ref § 6.6; architecture § 2.14 needs >= 2).

1. matched_curl_divergence_machine_zero  (route A telescoping)
2. analytic_divergence_converges         (independent probe O(g^2))
3. gradient_matches_fd                   (bonus — MMS sweep)
4. isovalue_residual_reprojects_to_zero  (bonus — Newton basin)
5. confinement_identities_zero           (bonus — corrected golden F)
"""

from __future__ import annotations

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from curl_noise.reference.discrete import (
    fd_divergence_probe,
    matched_curl_2d,
    matched_divergence_2d,
)
from curl_noise.reference.fields import (
    CurlNoiseConfig,
    clebsch_helicity_integrand,
    gradient_orthogonality,
    velocity,
)
from curl_noise.reference.manifold import iso_value_residual, iso_values, reproject
from curl_noise.reference.noise import snoise_grad_hess

_SETTINGS = settings(max_examples=12, deadline=None)


@_SETTINGS
@given(
    n=st.sampled_from([8, 16, 24, 32]),
    seed=st.integers(min_value=0, max_value=2**31 - 1),
)
def test_matched_curl_divergence_machine_zero(n, seed):
    rng = np.random.default_rng(seed)
    psi = rng.standard_normal((n + 1, n + 1))
    dx = 1.0 / n
    u, w = matched_curl_2d(psi, dx)
    div = matched_divergence_2d(u, w, dx)
    flux_scale = max(np.abs(u).max(), np.abs(w).max()) / dx
    assert np.abs(div).max() <= 1e-13 * max(flux_scale, 1.0)


@_SETTINGS
@given(
    seed=st.integers(min_value=0, max_value=10_000),
    construction=st.sampled_from(["crossprod", "curl3d"]),
)
def test_analytic_divergence_converges(seed, construction):
    cfg = CurlNoiseConfig(construction=construction, octaves=3, ell0=0.5, seed=seed % 7)
    rng = np.random.default_rng(seed)
    pts = rng.uniform(-2.0, 2.0, size=(64, 3))

    def vel(p):
        return velocity(p, cfg)

    d1 = np.abs(fd_divergence_probe(vel, pts, 1e-2)).max()
    d2 = np.abs(fd_divergence_probe(vel, pts, 1e-3)).max()
    slope = np.log(d1 / d2) / np.log(10.0)
    assert 1.6 < slope < 2.4


@_SETTINGS
@given(seed=st.integers(min_value=0, max_value=10_000))
def test_gradient_matches_fd(seed):
    rng = np.random.default_rng(seed)
    pts = rng.uniform(-10.0, 10.0, size=(64, 3))
    _, g, _ = snoise_grad_hess(pts)
    h = 1e-4
    fd = np.zeros_like(g)
    for k in range(3):
        e = np.zeros(3)
        e[k] = h
        vp, _, _ = snoise_grad_hess(pts + e)
        vm, _, _ = snoise_grad_hess(pts - e)
        fd[:, k] = (vp - vm) / (2 * h)
    assert np.abs(fd - g).max() < 1e-5


@_SETTINGS
@given(seed=st.integers(min_value=0, max_value=10_000))
def test_isovalue_residual_reprojects_to_zero(seed):
    cfg = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)
    rng = np.random.default_rng(seed)
    x0 = rng.uniform(0.1, 0.9, size=(32, 3))
    f0 = iso_values(x0, cfg)
    x = x0 + rng.normal(scale=1e-3, size=x0.shape)
    x_re = reproject(x, f0, cfg, iterations=3)
    res = iso_value_residual(x_re, f0, cfg)
    # typical point collapses to machine; rare near-critical points of f
    # (ill-conditioned Gram) converge slowly — bounded by the kick scale
    # (measured worst ~4e-5 over hypothesis sweeps at a 1e-3 kick)
    assert float(np.median(res)) <= 1e-10
    assert res.max() <= 1e-3


@_SETTINGS
@given(seed=st.integers(min_value=0, max_value=10_000))
def test_confinement_identities_zero(seed):
    cfg = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5, seed=seed % 5)
    rng = np.random.default_rng(seed)
    pts = rng.uniform(-2.0, 2.0, size=(64, 3))
    og1, og2 = gradient_orthogonality(pts, cfg)
    cle = clebsch_helicity_integrand(pts, cfg)
    scale = max(float(np.abs(velocity(pts, cfg)).max()), 1.0)
    assert np.abs(og1).max() <= 1e-12 * scale
    assert np.abs(og2).max() <= 1e-12 * scale
    assert np.abs(cle).max() <= 1e-12 * scale
