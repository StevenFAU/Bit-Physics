"""Property-based invariants (spec § 2.14 / phase-3-plan §6.0 item 11; Gate 11).

Three Hypothesis-driven invariants of the §3.2.1 surface (≥2 required):

1. ``render_output_shape_dtype`` — for any valid camera + non-empty model,
   ``render`` returns an ``(H, W, 3) float32`` image in ``[0, 1]``.
2. ``render_empty_model_is_background`` — rendering an empty model (``N == 0``)
   returns a background-filled image of the requested shape/dtype.
3. ``ply_roundtrip_preserves_fields`` — ``load_ply ∘ save_ply`` preserves the
   model fields (exact for the linearly-stored fields; within a documented float
   tolerance for the activation-round-tripped scales/opacities — Inria .ply stores
   ``log(scale)`` and ``logit(opacity)``).

RED at Stage 1a (bodies raise ``NotImplementedError``); GREEN at Stage 1b.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from common_3dgs import Camera, GaussianSplatModel, render

SH_DEGREE = 3
K = (SH_DEGREE + 1) ** 2  # 16


def _random_model(seed: int, n: int) -> GaussianSplatModel:
    rng = np.random.default_rng(seed)
    positions = rng.uniform(-1.0, 1.0, size=(n, 3)).astype(np.float32)
    # Scales/opacities kept away from 0/1 so the log/logit round-trip is stable.
    scales = rng.uniform(0.05, 1.0, size=(n, 3)).astype(np.float32)
    quats = rng.normal(size=(n, 4)).astype(np.float32)
    quats /= np.linalg.norm(quats, axis=1, keepdims=True)
    opacities = rng.uniform(0.1, 0.9, size=(n,)).astype(np.float32)
    sh = rng.uniform(-0.5, 0.5, size=(n, K, 3)).astype(np.float32)
    return GaussianSplatModel(positions, scales, quats, opacities, sh)


def _camera(h: int, w: int) -> Camera:
    return Camera.look_at(
        position=(0.0, 0.0, 3.0),
        target=(0.0, 0.0, 0.0),
        fov_y=math.radians(50.0),
        image_height=h,
        image_width=w,
    )


@settings(max_examples=40, deadline=None, derandomize=True, database=None)
@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n=st.integers(min_value=1, max_value=24),
    h=st.integers(min_value=8, max_value=40),
    w=st.integers(min_value=8, max_value=40),
)
def test_render_output_shape_dtype(seed: int, n: int, h: int, w: int) -> None:
    model = _random_model(seed, n)
    image = render(model, _camera(h, w), image_height=h, image_width=w)
    assert image.shape == (h, w, 3)
    assert image.dtype == np.float32
    assert float(image.min()) >= 0.0
    assert float(image.max()) <= 1.0


@settings(max_examples=20, deadline=None, derandomize=True, database=None)
@given(
    h=st.integers(min_value=8, max_value=40),
    w=st.integers(min_value=8, max_value=40),
    bg=st.tuples(
        st.floats(min_value=0.0, max_value=1.0),
        st.floats(min_value=0.0, max_value=1.0),
        st.floats(min_value=0.0, max_value=1.0),
    ),
)
def test_render_empty_model_is_background(h: int, w: int, bg: tuple[float, float, float]) -> None:
    empty = GaussianSplatModel(
        np.zeros((0, 3), np.float32),
        np.zeros((0, 3), np.float32),
        np.zeros((0, 4), np.float32),
        np.zeros((0,), np.float32),
        np.zeros((0, K, 3), np.float32),
    )
    image = render(empty, _camera(h, w), image_height=h, image_width=w, background=bg)
    assert image.shape == (h, w, 3)
    assert image.dtype == np.float32
    expected = np.broadcast_to(np.asarray(bg, np.float32), (h, w, 3))
    np.testing.assert_allclose(image, expected, atol=1e-6)


@settings(max_examples=30, deadline=None, derandomize=True, database=None)
@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n=st.integers(min_value=1, max_value=24),
)
def test_ply_roundtrip_preserves_fields(seed: int, n: int) -> None:
    import tempfile

    model = _random_model(seed, n)
    before = model.to_numpy()
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "scene.ply"
        model.save_ply(out)
        reloaded = GaussianSplatModel.load_ply(out)
    after = reloaded.to_numpy()
    assert reloaded.num_gaussians == n
    # Linearly-stored fields round-trip bit-exactly for f32 binary .ply.
    np.testing.assert_array_equal(after["positions"], before["positions"])
    np.testing.assert_array_equal(after["sh_coefficients"], before["sh_coefficients"])
    # Activation-round-tripped fields within a documented float tolerance.
    np.testing.assert_allclose(after["scales"], before["scales"], rtol=1e-4, atol=1e-6)
    np.testing.assert_allclose(after["opacities"], before["opacities"], rtol=1e-4, atol=1e-6)
