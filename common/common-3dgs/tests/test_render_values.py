"""Value-level render assertions (mutation-kill coverage for render math).

The smoke-contract + PBT suites cover shape/dtype/range/round-trip; these tests
pin concrete rendered behaviour (projection centre, SH→colour, depth ordering,
opacity, background) so that a mutation flipping a sign/constant in the
projection / covariance / SH / compositing path is killed, not merely surviving
with a still-valid-shape image. Deterministic (fixed scenes; no Hypothesis).
"""

from __future__ import annotations

import math

import numpy as np

from common_3dgs import Camera, GaussianSplatModel, render

SH_DEGREE = 3
K = (SH_DEGREE + 1) ** 2
_C0 = 0.28209479177387814
RED = np.array([0.9, 0.05, 0.05], np.float32)
BLUE = np.array([0.05, 0.05, 0.9], np.float32)


def _gaussian(color: np.ndarray, pos=(0.0, 0.0, 0.0), scale=0.12, opacity=0.99):
    sh = np.zeros((1, K, 3), np.float32)
    sh[0, 0, :] = (color - 0.5) / _C0
    return GaussianSplatModel(
        np.asarray([pos], np.float32),
        np.full((1, 3), scale, np.float32),
        np.asarray([[1.0, 0.0, 0.0, 0.0]], np.float32),
        np.asarray([opacity], np.float32),
        sh,
    )


def _cam(h=64, w=64):
    return Camera.look_at(
        (0.0, 0.0, 3.0), (0.0, 0.0, 0.0), fov_y=math.radians(50.0), image_height=h, image_width=w
    )


def test_centered_gaussian_is_brightest_at_centre() -> None:
    img = render(_gaussian(RED), _cam(64, 64), background=(0.0, 0.0, 0.0))
    yx = np.unravel_index(int(np.argmax(img.sum(axis=2))), img.shape[:2])
    assert abs(yx[0] - 31.5) <= 3.0
    assert abs(yx[1] - 31.5) <= 3.0
    cr, cg, cb = img[32, 32]
    assert cr > cg and cr > cb  # SH DC encodes a red splat
    assert cr > 0.3


def test_corner_is_background_not_splat() -> None:
    bg = (0.0, 0.2, 0.4)
    img = render(_gaussian(RED), _cam(64, 64), background=bg)
    np.testing.assert_allclose(img[0, 0], np.asarray(bg, np.float32), atol=1e-5)


def test_near_zero_opacity_yields_background() -> None:
    bg = (0.1, 0.1, 0.1)
    img = render(_gaussian(RED, opacity=0.0), _cam(48, 48), background=bg)
    np.testing.assert_allclose(
        img, np.broadcast_to(np.asarray(bg, np.float32), img.shape), atol=1e-5
    )


def test_horizontal_offset_moves_splat_horizontally() -> None:
    cam = _cam(64, 64)
    left = render(_gaussian(RED, pos=(-0.6, 0.0, 0.0)), cam, background=(0.0, 0.0, 0.0))
    right = render(_gaussian(RED, pos=(0.6, 0.0, 0.0)), cam, background=(0.0, 0.0, 0.0))
    lum_left = left.sum(axis=2)
    lum_right = right.sum(axis=2)
    col_left = int(np.unravel_index(int(np.argmax(lum_left)), lum_left.shape)[1])
    col_right = int(np.unravel_index(int(np.argmax(lum_right)), lum_right.shape)[1])
    assert col_left != col_right  # the two opposite offsets land in different columns
    # both land on the same row (vertical centre) — no spurious vertical shift
    row_left = int(np.unravel_index(int(np.argmax(lum_left)), lum_left.shape)[0])
    assert abs(row_left - 31.5) <= 4.0


def test_front_gaussian_occludes_back() -> None:
    # Same screen position, different depth; the front (nearer-camera) splat wins.
    sh_front = np.zeros((1, K, 3), np.float32)
    sh_front[0, 0, :] = (RED - 0.5) / _C0
    sh_back = np.zeros((1, K, 3), np.float32)
    sh_back[0, 0, :] = (BLUE - 0.5) / _C0
    positions = np.asarray([[0.0, 0.0, 0.5], [0.0, 0.0, -0.5]], np.float32)  # front, back
    scales = np.full((2, 3), 0.12, np.float32)
    rots = np.tile(np.asarray([1.0, 0.0, 0.0, 0.0], np.float32), (2, 1))
    opac = np.asarray([0.99, 0.99], np.float32)
    sh = np.concatenate([sh_front, sh_back], axis=0)
    model = GaussianSplatModel(positions, scales, rots, opac, sh)
    img = render(model, _cam(64, 64), background=(0.0, 0.0, 0.0))
    cr, _cg, cb = img[32, 32]
    assert cr > cb  # red (front, nearer camera at z=+0.5) dominates blue (back)


def test_larger_scale_covers_more_pixels() -> None:
    cam = _cam(64, 64)
    small = render(_gaussian(RED, scale=0.06), cam, background=(0.0, 0.0, 0.0))
    large = render(_gaussian(RED, scale=0.30), cam, background=(0.0, 0.0, 0.0))
    lit_small = int(np.count_nonzero(small.max(axis=2) > 0.05))
    lit_large = int(np.count_nonzero(large.max(axis=2) > 0.05))
    assert lit_large > lit_small
