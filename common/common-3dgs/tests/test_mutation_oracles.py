"""Oracle-grounded mutation-hardening tests for ``common_3dgs`` (Phase-4.1).

Every assertion is grounded in an INDEPENDENT ORACLE — scipy's rotation library,
a published formula re-derived in-test, or a hand-computed analytic value —
NEVER a snapshot of the code's current output. Targets the high-survivor buckets
the prior sub-phase's tests left uncovered: the ``_matrix_to_quat_wxyz`` 4-branch
recovery + eigendecompose path (coupling), the Adam/SGD optimiser + PSNR math
(training), the sigmoid/logit/SH-degree algebra (model), and the SH evaluator +
quaternion-to-matrix + perspective projection (render).

Oracle provenance:
- quaternion <-> rotation-matrix: ``scipy.spatial.transform.Rotation`` (independent).
- PhysGaussian Eq. (8) Sigma' = F Sigma F^T: hand-derived eigenvalue preservation
  under a pure rotation (Xie et al. 2024).
- Adam: Kingma & Ba 2015 Eq. (with bias correction) hand-evaluated at t=1, m=v=0.
- PSNR: 10*log10(MAX_I^2 / MSE) closed form.
- spherical harmonics: the real-SH DC term C0 + 0.5 bias (Inria sh_utils).
- perspective projection: an on-axis point maps to the principal point (cx, cy).
"""

from __future__ import annotations

import math

import numpy as np
import pytest
from scipy.spatial.transform import Rotation

from common_3dgs import Camera, GaussianSplatModel, PhysicsCoupling
from common_3dgs.coupling import (
    _matrix_to_quat_wxyz,
    _quat_wxyz_to_matrix,
    default_density_to_opacity,
)
from common_3dgs.model import _degree_for_k, _logit, _sigmoid
from common_3dgs.render import _eval_sh, _quaternions_to_matrices, render
from common_3dgs.training import TrainingLoop, _mse_to_psnr

K = 16  # sh_degree 3

# Unit quaternions (wxyz) chosen to hit ALL FOUR branches of _matrix_to_quat_wxyz:
# trace>0; r00 largest; r11 largest; r22 largest; plus generic mixes.
_QUATS_WXYZ = [
    (1.0, 0.0, 0.0, 0.0),  # identity → trace 3 > 0
    (0.0, 1.0, 0.0, 0.0),  # 180° about X → r00 largest
    (0.0, 0.0, 1.0, 0.0),  # 180° about Y → r11 largest
    (0.0, 0.0, 0.0, 1.0),  # 180° about Z → r22 largest
    (0.7071067811865476, 0.7071067811865476, 0.0, 0.0),  # 90° about X
    (0.7071067811865476, 0.0, 0.7071067811865476, 0.0),  # 90° about Y
    (0.5, 0.5, 0.5, 0.5),  # generic
    (0.5, -0.5, 0.5, -0.5),  # generic, mixed signs
]


def _scipy_matrix(q_wxyz: tuple[float, float, float, float]) -> np.ndarray:
    """Independent reference rotation matrix (scipy uses xyzw order)."""
    w, x, y, z = q_wxyz
    return Rotation.from_quat([x, y, z, w]).as_matrix()


# ----------------------------------------------------------------------------
# coupling — quaternion <-> matrix round-trip (all 4 recovery branches).
# ----------------------------------------------------------------------------


@pytest.mark.parametrize("q_wxyz", _QUATS_WXYZ)
def test_quat_to_matrix_matches_scipy(q_wxyz: tuple[float, float, float, float]) -> None:
    """``_quat_wxyz_to_matrix`` reproduces scipy's rotation matrix (forward)."""
    q = np.array(q_wxyz, dtype=np.float64)
    got = _quat_wxyz_to_matrix(q[None, :])[0]
    assert np.allclose(got, _scipy_matrix(q_wxyz), atol=1e-9)


@pytest.mark.parametrize("q_wxyz", _QUATS_WXYZ)
def test_matrix_to_quat_recovers_rotation(q_wxyz: tuple[float, float, float, float]) -> None:
    """``_matrix_to_quat_wxyz`` recovers the quaternion up to sign (double cover).

    Drives the matrix from scipy (independent), recovers the quaternion, and
    checks |q_rec . q| == 1 (the two unit quaternions encode the same rotation).
    Exercises all four trace/diagonal branches.
    """
    q = np.array(q_wxyz, dtype=np.float64)
    m = _scipy_matrix(q_wxyz)
    q_rec = _matrix_to_quat_wxyz(m[None, :, :])[0]
    assert abs(float(q_rec @ q)) == pytest.approx(1.0, abs=1e-7)


# ----------------------------------------------------------------------------
# coupling — PhysGaussian Eq. (8) under a pure rotation + shape guard.
# ----------------------------------------------------------------------------


def _model(n: int, scale: float = 0.1) -> GaussianSplatModel:
    return GaussianSplatModel(
        np.zeros((n, 3), np.float32),
        np.full((n, 3), scale, np.float32),
        np.tile(np.asarray([1.0, 0.0, 0.0, 0.0], np.float32), (n, 1)),
        np.full((n,), 0.5, np.float32),
        np.zeros((n, K, 3), np.float32),
    )


def test_rotation_deformation_preserves_eigenvalues() -> None:
    """A pure-rotation F preserves the covariance eigenvalues (scales unchanged).

    PhysGaussian Eq. (8): Sigma' = F Sigma F^T. For an orthogonal F = R,
    eigenvalues of Sigma' equal those of Sigma, so the per-axis scales are a
    permutation of the originals (Xie et al. 2024). Anisotropic start so the
    eigenvalues are distinct.
    """
    m = GaussianSplatModel(
        np.zeros((1, 3), np.float32),
        np.array([[0.2, 0.3, 0.5]], np.float32),  # distinct scales
        np.tile(np.asarray([1.0, 0.0, 0.0, 0.0], np.float32), (1, 1)),
        np.full((1,), 0.5, np.float32),
        np.zeros((1, K, 3), np.float32),
    )
    r = _scipy_matrix((0.5, 0.5, 0.5, 0.5))  # a non-trivial rotation
    PhysicsCoupling(m).update_covariance_from_deformation(r[None, :, :])
    new_scales = np.sort(m.to_numpy()["scales"][0])
    np.testing.assert_allclose(new_scales, [0.2, 0.3, 0.5], atol=1e-5)


def test_covariance_deformation_shape_guard_is_disjunction() -> None:
    """``deformation_gradient`` must be (N, 3, 3): a (N, 2, 2) input raises.

    Pins the ``f.ndim != 3 or f.shape[1:] != (3, 3)`` guard against the ``and``
    mutation (which would let a 3-D-but-wrong-trailing-shape array through).
    """
    c = PhysicsCoupling(_model(2))
    with pytest.raises(ValueError, match=r"\(N, 3, 3\)"):
        c.update_covariance_from_deformation(np.zeros((2, 2, 2), np.float64))


def test_default_density_to_opacity_beer_lambert_values() -> None:
    """1 - exp(-density), clipped at 0 below (Beer-Lambert), hand-evaluated."""
    d = np.array([0.0, 1.0, 2.0, -5.0])
    got = default_density_to_opacity(d)
    expected = 1.0 - np.exp(-np.clip(d, 0.0, None))
    np.testing.assert_allclose(got, expected, atol=1e-12)
    assert got[0] == pytest.approx(0.0)  # density 0 → opacity 0
    assert got[3] == pytest.approx(0.0)  # negative density clipped to 0


# ----------------------------------------------------------------------------
# model — sigmoid/logit inverses, SH-degree algebra.
# ----------------------------------------------------------------------------


def test_sigmoid_logit_are_inverses() -> None:
    """sigmoid(logit(p)) == p; logit(0.5) == 0; sigmoid(0) == 0.5 (hand-derived)."""
    p = np.array([0.1, 0.25, 0.5, 0.75, 0.9])
    np.testing.assert_allclose(_sigmoid(_logit(p)), p, atol=1e-9)
    assert float(_logit(np.array([0.5]))[0]) == pytest.approx(0.0, abs=1e-9)
    assert float(_sigmoid(np.array([0.0]))[0]) == pytest.approx(0.5, abs=1e-12)


@pytest.mark.parametrize(("k", "deg"), [(1, 0), (4, 1), (9, 2), (16, 3), (25, 4)])
def test_degree_for_k(k: int, deg: int) -> None:
    """K = (degree + 1)^2 ⇒ degree = isqrt(K) - 1 (hand-derived)."""
    assert _degree_for_k(k) == deg


def test_degree_for_k_rejects_non_square() -> None:
    with pytest.raises(ValueError, match="perfect square"):
        _degree_for_k(15)


def test_ply_roundtrip_activation_values() -> None:
    """save_ply→load_ply preserves opacity (sigmoid∘logit) + scale (exp∘log) values.

    Inria stores scale=log(scale), opacity=logit(opacity); the loader applies
    exp/sigmoid. A round-trip recovers the activated values (the inverse pair),
    so a mutation to either activation breaks the recovery.
    """
    import tempfile
    from pathlib import Path

    rng = np.random.default_rng(0)
    n = 5
    scales = rng.uniform(0.05, 0.5, size=(n, 3)).astype(np.float32)
    opacities = rng.uniform(0.2, 0.8, size=(n,)).astype(np.float32)
    m = GaussianSplatModel(
        rng.standard_normal((n, 3)).astype(np.float32),
        scales,
        np.tile(np.asarray([1.0, 0.0, 0.0, 0.0], np.float32), (n, 1)),
        opacities,
        rng.standard_normal((n, K, 3)).astype(np.float32),
    )
    path = Path(tempfile.mkdtemp()) / "m.ply"
    m.save_ply(path)
    reloaded = GaussianSplatModel.load_ply(path)
    rnpy = reloaded.to_numpy()
    np.testing.assert_allclose(rnpy["opacities"], opacities, atol=1e-5)
    np.testing.assert_allclose(rnpy["scales"], scales, rtol=1e-4, atol=1e-5)


# ----------------------------------------------------------------------------
# training — PSNR closed form, Adam + SGD update math.
# ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("mse", "expected"),
    [(0.01, 20.0), (1.0, 0.0), (0.0001, 40.0)],
)
def test_mse_to_psnr_closed_form(mse: float, expected: float) -> None:
    """PSNR = 10*log10(1/MSE) for MAX_I=1 (hand-derived); MSE=0 → +inf."""
    assert _mse_to_psnr(mse) == pytest.approx(expected, abs=1e-9)


def test_mse_to_psnr_identity_sentinel() -> None:
    assert _mse_to_psnr(0.0) == float("inf")


def test_sgd_update_is_lr_times_gradient() -> None:
    """One SGD step: theta -= lr * grad (hand-derived)."""
    loop = TrainingLoop(model=_model(1), optimizer="sgd")
    grad = np.array([1.0, 2.0, 3.0, 4.0])
    lr = loop._lr.copy()
    loop._update(grad)
    np.testing.assert_allclose(loop._theta, -lr * grad, atol=1e-12)


def test_adam_first_step_is_bias_corrected_sign() -> None:
    """One Adam step from (m=v=0, t=1): theta -= lr * g/(|g| + eps) (Kingma & Ba 2015).

    With m=v=0 and t=1, the bias-corrected moments give m_hat = g, v_hat = g^2, so
    the update is lr * g / (sqrt(g^2) + eps) = lr * sign(g) (for |g| >> eps). This
    pins the bias-correction (1 - b1^t / 1 - b2^t) and the moment recurrences.
    """
    loop = TrainingLoop(model=_model(1), optimizer="adam")
    g = np.array([1.0, -1.0, 1.0, -1.0])
    lr = loop._lr.copy()
    eps = 1e-8
    loop._update(g)
    expected = -lr * g / (np.sqrt(g * g) + eps)
    np.testing.assert_allclose(loop._theta, expected, rtol=1e-6, atol=1e-9)


# ----------------------------------------------------------------------------
# render — SH DC term, quaternion-to-matrix, perspective projection.
# ----------------------------------------------------------------------------


def test_eval_sh_degree0_is_c0_plus_half() -> None:
    """Degree-0 SH colour = C0 * sh[0] + 0.5 (Inria sh_utils; hand-derived).

    C0 = 0.28209479177387814. With sh DC = 1.0 (one channel), the evaluated
    colour before clamp is C0 * 1 + 0.5; degree 0 ignores the direction.
    """
    c0 = 0.28209479177387814
    sh = np.zeros((1, K, 3), dtype=np.float64)
    sh[0, 0, 0] = 1.0  # red DC
    dirs = np.array([[0.0, 0.0, 1.0]])
    out = _eval_sh(0, sh, dirs)[0]
    assert out[0] == pytest.approx(c0 * 1.0 + 0.5, abs=1e-12)
    assert out[1] == pytest.approx(0.5, abs=1e-12)  # no DC in green → just bias
    assert out[2] == pytest.approx(0.5, abs=1e-12)


@pytest.mark.parametrize("q_wxyz", _QUATS_WXYZ)
def test_render_quaternions_to_matrices_matches_scipy(
    q_wxyz: tuple[float, float, float, float],
) -> None:
    """render's own ``_quaternions_to_matrices`` reproduces scipy (independent)."""
    q = np.array(q_wxyz, dtype=np.float64)
    got = _quaternions_to_matrices(q[None, :])[0]
    assert np.allclose(got, _scipy_matrix(q_wxyz), atol=1e-9)


def test_on_axis_point_projects_to_principal_point() -> None:
    """A Gaussian on the camera's view axis renders brightest at the image centre.

    The perspective map sends an on-axis point to the principal point
    (cx, cy) = ((w-1)/2, (h-1)/2). A bright opaque splat there ⇒ the brightest
    pixel is at the image centre (within 1px of (h-1)/2, (w-1)/2). Pins the
    focal / cx / cy projection arithmetic (u = focal*x/z + cx, etc.).
    """
    h = w = 33  # odd → exact integer centre at 16
    cam = Camera.look_at(
        position=(0.0, 0.0, -3.0),
        target=(0.0, 0.0, 0.0),
        fov_y=math.radians(45.0),
        image_height=h,
        image_width=w,
    )
    sh = np.zeros((1, K, 3), np.float32)
    sh[0, 0, :] = (0.9 - 0.5) / 0.28209479177387814  # bright neutral DC
    model = GaussianSplatModel(
        np.zeros((1, 3), np.float32),
        np.full((1, 3), 0.05, np.float32),
        np.tile(np.asarray([1.0, 0.0, 0.0, 0.0], np.float32), (1, 1)),
        np.full((1,), 0.99, np.float32),
        sh,
    )
    img = render(model, cam)
    brightness = img.sum(axis=2)
    yx = np.unravel_index(int(np.argmax(brightness)), brightness.shape)
    assert abs(yx[0] - (h - 1) / 2.0) <= 1.0
    assert abs(yx[1] - (w - 1) / 2.0) <= 1.0
