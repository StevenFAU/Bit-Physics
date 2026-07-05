"""Flagship cross-product identities + iso-value manifold instruments
(spec-ref § 6.1/6.2, goldens C and F — F as execution-corrected)."""

from __future__ import annotations

import numpy as np

from curl_noise.reference.advect import advect
from curl_noise.reference.curlnoise import CANONICAL_DT, seeded_tracers
from curl_noise.reference.fields import (
    CANONICAL_CONFIG,
    CurlNoiseConfig,
    clebsch_helicity_integrand,
    gradient_orthogonality,
    helicity_density,
    velocity,
)
from curl_noise.reference.manifold import iso_value_residual, iso_values, reproject

OPEN_CFG = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)


def test_gradient_orthogonality_machine_zero(probe_points):
    og1, og2 = gradient_orthogonality(probe_points, OPEN_CFG)
    scale = np.abs(velocity(probe_points, OPEN_CFG)).max()
    assert np.abs(og1).max() <= 1e-12 * max(scale, 1.0)
    assert np.abs(og2).max() <= 1e-12 * max(scale, 1.0)


def test_clebsch_integrand_machine_zero(probe_points):
    c = clebsch_helicity_integrand(probe_points, OPEN_CFG)
    scale = np.abs(velocity(probe_points, OPEN_CFG)).max()
    assert np.abs(c).max() <= 1e-12 * max(scale, 1.0)


def test_kinetic_helicity_honestly_nonzero(probe_points):
    """The v0.2 'helicity == 0' claim is refuted — the honest counter-row
    (execution correction; counterexample f1=xy, f2=z+x^2 in spec)."""
    h = helicity_density(probe_points, OPEN_CFG)
    assert np.abs(h).max() > 1.0  # very far from zero on the real field


def test_canonical_reprojected_residual(canonical_result):
    """The gated observable: reprojected iso-residual stays ~machine
    (measured 1.2e-9 max across checkpoints; declared ceiling 1e-8)."""
    assert canonical_result.iso_residual_max.max() <= 1e-8


def test_iso_residual_rk4_order_without_reprojection():
    """No-reprojection residual is the integrator's O(dt^p) drift."""
    pts = seeded_tracers(42, 256)
    r_coarse = advect(
        pts,
        CANONICAL_CONFIG,
        n_steps=16,
        dt=2.0 * CANONICAL_DT,
        integrator="rk4",
        reproject_iters=0,
        capture_interval=16,
    ).iso_residual_max[-1]
    r_fine = advect(
        pts,
        CANONICAL_CONFIG,
        n_steps=32,
        dt=CANONICAL_DT,
        integrator="rk4",
        reproject_iters=0,
        capture_interval=32,
    ).iso_residual_max[-1]
    # same physical time, halved dt: RK4 -> ~16x residual drop; accept
    # broadly (chaos-adjacent constants) but demand clear high-order gain
    assert r_coarse / r_fine > 6.0, (r_coarse, r_fine)


def test_reprojection_beats_no_reprojection():
    pts = seeded_tracers(43, 256)
    on = advect(
        pts,
        CANONICAL_CONFIG,
        n_steps=32,
        dt=CANONICAL_DT,
        integrator="rk4",
        reproject_iters=1,
        capture_interval=32,
    ).iso_residual_max[-1]
    off = advect(
        pts,
        CANONICAL_CONFIG,
        n_steps=32,
        dt=CANONICAL_DT,
        integrator="rk4",
        reproject_iters=0,
        capture_interval=32,
    ).iso_residual_max[-1]
    assert on < off / 100.0


def test_newton_reprojection_single_iteration_saturates():
    """1 Newton iteration recovers ~the full correction (the pinned
    default; Baerentzen's measured saturation)."""
    rng = np.random.default_rng(11)
    x0 = rng.uniform(0.2, 0.8, size=(128, 3))
    f0 = iso_values(x0, OPEN_CFG)
    # kick the points off-manifold by a small displacement
    x = x0 + rng.normal(scale=2e-3, size=x0.shape)
    res_before = iso_value_residual(x, f0, OPEN_CFG)
    res_one = iso_value_residual(reproject(x, f0, OPEN_CFG, 1), f0, OPEN_CFG)
    res_three = iso_value_residual(reproject(x, f0, OPEN_CFG, 3), f0, OPEN_CFG)
    # one Newton step leaves the SECOND-order residual ~|H||dx|^2/2
    # (measured ~30x drop for a 2e-3 kick); near-critical points of f
    # converge slower -> assert the measured orders, not fantasy ones
    assert res_one.max() < res_before.max() / 10.0
    assert float(np.median(res_one)) < float(np.median(res_before)) / 20.0
    assert res_three.max() <= res_one.max() * 1.01  # more iters never worse
    assert float(np.median(res_three)) < 1e-9  # typical point -> machine
    # worst near-critical point (nearly-parallel/weak gradients -> ill-
    # conditioned Gram matrix): bounded by the kick's value-space size,
    # never gated on (the gate scene's per-step kicks are ~50x smaller
    # and its measured residual is 1.2e-9)
    assert res_three.max() < res_before.max()
    assert res_three.max() < 1e-3
