"""Higher-order SH mutation-kill tests (render.py:83-113 ``_eval_sh``).

The Stage-1c first-pass ``test_render_values.py`` only exercised the DC term
(SH degree 0), leaving 33+ ``_C1`` / ``_C2`` / ``_C3`` coefficient mutants in
``render._eval_sh`` and the ``_quaternions_to_matrices`` rotation helper
unkilled. Each test below isolates **one** SH coefficient (or one rotation
component), predicts the centre-pixel response from the closed-form Inria SH
formula (``references/3DGS-reference/utils/sh_utils.py``), and asserts the
rendered value matches — so flipping a sign, changing a constant, or
short-circuiting a branch in ``_eval_sh`` falsifies the assertion.

Determinism (D-C): single-splat scenes; alpha-composited over black; centre
pixel sampled with ``atol=0.04`` slack for the per-pixel-centre Gaussian
density (~0.98 at the splat centre with scale=0.2, focal-from-fov 50 deg).
"""

from __future__ import annotations

import math

import numpy as np

from common_3dgs import Camera, GaussianSplatModel, render

SH_DEGREE = 3
K = (SH_DEGREE + 1) ** 2  # 16

# Real SH basis constants — must match ``render._C0/_C1/_C2/_C3`` exactly.
_C0 = 0.28209479177387814
_C1 = 0.4886025119029199
_C2 = (
    1.0925484305920792,
    -1.0925484305920792,
    0.31539156525252005,
    -1.0925484305920792,
    0.5462742152960396,
)
_C3 = (
    -0.5900435899266435,
    2.890611442640554,
    -0.4570457994644658,
    0.3731763325901154,
    -0.4570457994644658,
    1.445305721320277,
    -0.5900435899266435,
)


def _zero_sh() -> np.ndarray:
    return np.zeros((1, K, 3), np.float32)


def _splat(sh: np.ndarray, opacity: float = 0.99, scale: float = 0.2) -> GaussianSplatModel:
    """A single Gaussian at the origin, identity orientation, fixed opacity / scale."""
    return GaussianSplatModel(
        np.zeros((1, 3), np.float32),
        np.full((1, 3), scale, np.float32),
        np.asarray([[1.0, 0.0, 0.0, 0.0]], np.float32),
        np.asarray([opacity], np.float32),
        sh,
    )


def _cam(
    position: tuple[float, float, float] = (0.0, 0.0, 3.0),
    *,
    target: tuple[float, float, float] = (0.0, 0.0, 0.0),
    up: tuple[float, float, float] = (0.0, 1.0, 0.0),
    h: int = 64,
    w: int = 64,
) -> Camera:
    return Camera.look_at(
        position,
        target,
        up=up,
        fov_y=math.radians(50.0),
        image_height=h,
        image_width=w,
    )


def _center_rgb(img: np.ndarray) -> tuple[float, float, float]:
    h, w, _ = img.shape
    px = img[h // 2, w // 2]
    return float(px[0]), float(px[1]), float(px[2])


def _predict_center(channel_color: float, opacity: float = 0.99) -> float:
    """Predicted centre-pixel value: ``alpha * max(0, sh_eval)`` over black bg.

    ``alpha = min(opacity, ALPHA_MAX=0.99) * gaussian_density_at_pixel_centre``;
    the half-pixel offset between the (cx, cy) splat centre and the pixel
    centre gives a density of ~0.98 at scale=0.2, fov_y=50 deg, image=64x64.
    """
    return max(0.0, min(1.0, opacity * max(0.0, channel_color)))


# ---- Degree-0 (DC) --------------------------------------------------------


def test_sh_degree0_dc_plus_half_bias() -> None:
    """``_eval_sh`` adds a constant ``+0.5`` after the DC term — fix the bias.

    Targets the ``return result + 0.5`` line in ``render._eval_sh``: with every
    SH coefficient zero the centre pixel must equal ``alpha * 0.5`` exactly
    (the +0.5 bias = grey when no SH energy is present).
    """
    sh = _zero_sh()
    img = render(_splat(sh), _cam(), background=(0.0, 0.0, 0.0))
    r, g, b = _center_rgb(img)
    expected = _predict_center(0.5)
    np.testing.assert_allclose([r, g, b], [expected] * 3, atol=0.04)


# ---- Degree-1 (linear) ----------------------------------------------------


def test_sh_degree1_z_axis_negative_sign() -> None:
    """``+ _C1 * z * sh[:, 2, :]`` — z-direction SH coefficient.

    Camera at +Z, splat at origin → dir from camera to splat ``(0,0,-1)``;
    setting ``sh[:, 2, R] = +1`` predicts ``_C1 * (-1) * 1 + 0.5 ≈ 0.011`` →
    the RED channel must be dark. A sign-flip on the ``+ _C1 * z`` term
    instead produces ``0.989`` (almost-saturated) and is killed.
    """
    sh = _zero_sh()
    sh[0, 2, 0] = 1.0  # red channel only
    img = render(_splat(sh), _cam(position=(0.0, 0.0, 3.0)), background=(0.0, 0.0, 0.0))
    r, g, b = _center_rgb(img)
    expected_r = _predict_center(0.5 + _C1 * (-1.0) * 1.0)
    assert r < 0.2, f"expected dark red ≈{expected_r:.3f}, got {r:.3f}"
    np.testing.assert_allclose(r, expected_r, atol=0.04)
    # Green/blue are pure +0.5 bias (no SH energy in those channels).
    np.testing.assert_allclose([g, b], [_predict_center(0.5)] * 2, atol=0.04)


def test_sh_degree1_x_axis_negative_sign() -> None:
    """``- _C1 * x * sh[:, 3, :]`` — x-direction SH coefficient.

    Camera at +X (looking back at origin), splat at origin → dir ``(-1,0,0)``;
    setting ``sh[:, 3, G] = +1`` predicts ``- _C1 * (-1) * 1 + 0.5 = 0.989`` →
    GREEN channel is near-saturated. A sign flip yields ``0.011`` (dark) and
    is killed.
    """
    sh = _zero_sh()
    sh[0, 3, 1] = 1.0  # green channel
    img = render(_splat(sh), _cam(position=(3.0, 0.0, 0.0)), background=(0.0, 0.0, 0.0))
    r, g, b = _center_rgb(img)
    expected_g = _predict_center(0.5 - _C1 * (-1.0) * 1.0)
    assert g > 0.85, f"expected bright green ≈{expected_g:.3f}, got {g:.3f}"
    np.testing.assert_allclose(g, expected_g, atol=0.04)
    np.testing.assert_allclose([r, b], [_predict_center(0.5)] * 2, atol=0.04)


def test_sh_degree1_y_axis_negative_sign() -> None:
    """``- _C1 * y * sh[:, 1, :]`` — y-direction SH coefficient.

    Camera at +Y (up vector +Z to keep the basis well-defined), splat at
    origin → dir ``(0,-1,0)``; setting ``sh[:, 1, B] = +1`` predicts
    ``- _C1 * (-1) * 1 + 0.5 = 0.989`` → BLUE near-saturated.
    """
    sh = _zero_sh()
    sh[0, 1, 2] = 1.0  # blue channel
    img = render(
        _splat(sh),
        _cam(position=(0.0, 3.0, 0.0), up=(0.0, 0.0, 1.0)),
        background=(0.0, 0.0, 0.0),
    )
    _r, _g, b = _center_rgb(img)
    expected_b = _predict_center(0.5 - _C1 * (-1.0) * 1.0)
    assert b > 0.85, f"expected bright blue ~{expected_b:.3f}, got {b:.3f}"
    np.testing.assert_allclose(b, expected_b, atol=0.04)


# ---- Degree-2 (quadratic) -------------------------------------------------


def test_sh_degree2_c2_index2_z_lobe() -> None:
    """``_C2[2] * (2 zz - xx - yy) * sh[:, 6, :]`` — z² lobe.

    Camera at +Z → dir ``(0,0,-1)``: ``2*1 - 0 - 0 = 2``. Setting
    ``sh[:, 6, R] = 0.4`` predicts red ``= _C2[2] * 2 * 0.4 + 0.5 = 0.752``.
    A flipped sign on the ``2 zz - xx - yy`` polynomial yields ``0.248`` → killed.
    """
    sh = _zero_sh()
    sh[0, 6, 0] = 0.4
    img = render(_splat(sh), _cam(position=(0.0, 0.0, 3.0)), background=(0.0, 0.0, 0.0))
    r, _g, _b = _center_rgb(img)
    expected = _predict_center(0.5 + _C2[2] * (2.0 * 1.0) * 0.4)
    np.testing.assert_allclose(r, expected, atol=0.04)


def test_sh_degree2_c2_index0_xy_lobe() -> None:
    """``_C2[0] * xy * sh[:, 4, :]`` — xy off-axis lobe.

    Camera at ``(2, 2, 2)``, splat at origin → dir
    ``(-1,-1,-1)/√3``; ``xy = 1/3``. ``sh[:, 4, R] = 0.6`` → red
    ``= _C2[0] * (1/3) * 0.6 + 0.5 ≈ 0.718``.
    """
    sh = _zero_sh()
    sh[0, 4, 0] = 0.6
    img = render(
        _splat(sh),
        _cam(position=(2.0, 2.0, 2.0), up=(0.0, 1.0, 0.0)),
        background=(0.0, 0.0, 0.0),
    )
    r, _g, _b = _center_rgb(img)
    xy = (-1.0 / math.sqrt(3.0)) * (-1.0 / math.sqrt(3.0))
    expected = _predict_center(0.5 + _C2[0] * xy * 0.6)
    np.testing.assert_allclose(r, expected, atol=0.04)


# ---- Degree-3 (cubic) — the highest-survivor bucket -----------------------


def test_sh_degree3_c3_index3_z_cubic_lobe() -> None:
    """``_C3[3] * z * (2 zz - 3 xx - 3 yy) * sh[:, 12, :]`` — 11 of the 215
    render.py survivors map to this term alone.

    Camera at +Z → ``z = -1, xx = yy = 0``: polynomial ``= -1 * 2 = -2``.
    ``sh[:, 12, R] = 0.5`` → red ``= _C3[3] * (-2) * 0.5 + 0.5
    = 0.4570 + 0.5 = 0.957``.
    """
    sh = _zero_sh()
    sh[0, 12, 0] = 0.5
    img = render(_splat(sh), _cam(position=(0.0, 0.0, 3.0)), background=(0.0, 0.0, 0.0))
    r, _g, _b = _center_rgb(img)
    # poly = z*(2zz-3xx-3yy) = -1 * 2 = -2; _C3[3] = +0.3732 (positive!).
    expected = _predict_center(0.5 + _C3[3] * (-1.0) * (2.0 * 1.0) * 0.5)
    np.testing.assert_allclose(r, expected, atol=0.04)
    # Sign-bound check: this term contributes NEGATIVELY here (poly < 0); a
    # sign-flip on either ``_C3[3]`` or the ``z * (…)`` factor produces a
    # POSITIVE red ≈ 0.86. Asserting r < 0.3 catches every such flip.
    assert r < 0.3, f"expected dark red ≈{expected:.3f}, got {r:.3f}"


def test_sh_degree3_c3_index4_x_cubic_lobe() -> None:
    """``_C3[4] * x * (4 zz - xx - yy) * sh[:, 13, :]`` — x-cubic lobe (8 survivors).

    Camera at +X → dir ``(-1, 0, 0)``: poly ``= -1 * (0 - 1 - 0) = 1``.
    ``sh[:, 13, G] = 0.6`` → green ``= _C3[4] * 1 * 0.6 + 0.5
    = -0.4570 * 0.6 + 0.5 ≈ 0.226``.
    """
    sh = _zero_sh()
    sh[0, 13, 1] = 0.6
    img = render(_splat(sh), _cam(position=(3.0, 0.0, 0.0)), background=(0.0, 0.0, 0.0))
    _r, g, _b = _center_rgb(img)
    expected = _predict_center(0.5 + _C3[4] * (-1.0) * (0.0 - 1.0 - 0.0) * 0.6)
    np.testing.assert_allclose(g, expected, atol=0.04)


# ---- Rotation: kill _quaternions_to_matrices off-diagonal survivors ------


def test_anisotropic_splat_rotates_long_axis_under_quaternion() -> None:
    """``render._quaternions_to_matrices`` — 30+ off-diagonal-rotation survivors.

    An anisotropic splat elongated along world-X (scales ``(0.4, 0.04, 0.04)``)
    projects to a horizontally-wide footprint when its quaternion is the
    identity. Rotating it 90 deg about world-Z (wxyz ``= (cos pi/4, 0, 0, sin pi/4)``)
    swaps the long axis to world-Y → the footprint becomes vertically tall.
    The test asserts the lit-pixel bounding box reverses its aspect ratio,
    which a sign-flip or constant-tweak on any ``r[i, j] = 2 * (x * y ± w * z)``
    style off-diagonal mutates away from.
    """
    cam = _cam(position=(0.0, 0.0, 3.0))
    bg = (0.0, 0.0, 0.0)
    sh = _zero_sh()
    sh[0, 0, :] = (0.5 - 0.5) / _C0  # neutral DC → centre ≈ alpha * 0.5 grey
    sh[0, 0, 0] = (0.9 - 0.5) / _C0  # bias R high so the splat is unmistakably bright red

    s = float(np.sin(math.pi / 4.0))
    c = float(np.cos(math.pi / 4.0))
    # identity rotation
    m_iden = GaussianSplatModel(
        np.zeros((1, 3), np.float32),
        np.asarray([[0.4, 0.04, 0.04]], np.float32),
        np.asarray([[1.0, 0.0, 0.0, 0.0]], np.float32),
        np.asarray([0.99], np.float32),
        sh,
    )
    # 90 deg about world-Z (wxyz)
    m_rot = GaussianSplatModel(
        np.zeros((1, 3), np.float32),
        np.asarray([[0.4, 0.04, 0.04]], np.float32),
        np.asarray([[c, 0.0, 0.0, s]], np.float32),
        np.asarray([0.99], np.float32),
        sh,
    )

    img_i = render(m_iden, cam, background=bg)
    img_r = render(m_rot, cam, background=bg)
    lit_i = img_i.max(axis=2) > 0.1
    lit_r = img_r.max(axis=2) > 0.1

    # Bounding-box width/height of lit region.
    def _bbox_wh(mask: np.ndarray) -> tuple[int, int]:
        ys, xs = np.where(mask)
        if ys.size == 0:
            return 0, 0
        return int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)

    iw, ih = _bbox_wh(lit_i)
    rw, rh = _bbox_wh(lit_r)
    assert iw > ih, f"identity-rotation splat must be wider than tall (got {iw}x{ih})"
    assert rh > rw, f"90deg-rotated splat must be taller than wide (got {rw}x{rh})"
