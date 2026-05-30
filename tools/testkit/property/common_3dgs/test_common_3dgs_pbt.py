"""Phase-4 WU-C property-based tests (spec § 2.14; plan §7.4 v9 addendum).

Two declared invariants:

- ``render_similarity_self_identity`` — for any rendered image, the
  render-similarity metrics report perfect self-similarity (PSNR sentinel +inf,
  SSIM 1.0, MS-SSIM 1.0) regardless of scene content.
- ``gaussian_serialization_round_trip`` — a random valid Gaussian set survives
  ``save_ply`` → ``load_ply`` preserving every parameter within fp32 precision.
"""

from __future__ import annotations

import math
import tempfile
from pathlib import Path

import numpy as np
from common_3dgs import Camera, GaussianSplatModel, render
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from render_similarity import ms_ssim, psnr, ssim

K = 16  # sh_degree 3
_SETTINGS = settings(max_examples=30, deadline=None, suppress_health_check=[HealthCheck.too_slow])


def _random_model(seed: int, n: int) -> GaussianSplatModel:
    rng = np.random.default_rng(seed)
    positions = rng.uniform(-1.0, 1.0, (n, 3)).astype(np.float32)
    scales = rng.uniform(0.05, 0.4, (n, 3)).astype(np.float32)
    quats = rng.standard_normal((n, 4)).astype(np.float32)
    quats /= np.linalg.norm(quats, axis=1, keepdims=True)
    opacities = rng.uniform(0.1, 0.95, (n,)).astype(np.float32)
    sh = rng.uniform(-1.0, 1.0, (n, K, 3)).astype(np.float32)
    return GaussianSplatModel(positions, scales, quats, opacities, sh)


@_SETTINGS
@given(seed=st.integers(0, 2**31 - 1), n=st.integers(1, 6))
def test_render_similarity_self_identity(seed: int, n: int) -> None:
    cam = Camera.look_at(
        (0.0, 0.0, 3.0), (0.0, 0.0, 0.0), fov_y=math.radians(50.0), image_height=24, image_width=24
    )
    img = render(_random_model(seed, n), cam, background=(0.0, 0.0, 0.0))
    assert psnr(img, img) == float("inf")
    assert ssim(img, img) == 1.0
    assert ms_ssim(img, img) == 1.0


@_SETTINGS
@given(seed=st.integers(0, 2**31 - 1), n=st.integers(1, 8))
def test_gaussian_serialization_round_trip(seed: int, n: int) -> None:
    model = _random_model(seed, n)
    before = model.to_numpy()
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "scene.ply"
        model.save_ply(path)
        loaded = GaussianSplatModel.load_ply(path).to_numpy()
    np.testing.assert_allclose(loaded["positions"], before["positions"], atol=1e-6)
    np.testing.assert_allclose(loaded["sh_coefficients"], before["sh_coefficients"], atol=1e-5)
    # scale survives exp(log(·)); opacity survives sigmoid(logit(·)).
    np.testing.assert_allclose(loaded["scales"], before["scales"], rtol=1e-4, atol=1e-6)
    np.testing.assert_allclose(loaded["opacities"], before["opacities"], atol=1e-5)
    # quaternions are unit on both sides (sign-gauge free up to ±, so compare |dot|).
    dots = np.abs(np.sum(loaded["rotations"] * before["rotations"], axis=1))
    np.testing.assert_allclose(dots, np.ones(n), atol=1e-4)
