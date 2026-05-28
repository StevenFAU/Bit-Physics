"""Validation-branch + value-pinning mutation-kill tests (Stage 1c second-pass).

Targets the camera-construction, model-construction, image-IO, and PLY round-
trip survivors left by the Stage-1c first-pass tightening
(``test_render_values.py`` + ``test_render_sh.py``):

- ``camera.py``  46 survivors → ``__init__`` validation branches +
  ``look_at`` projection-matrix internals + keyword defaults +
  ``camera_center`` / ``fov_y`` derivations.
- ``model.py``   55 survivors → field-shape validators, device kwarg,
  ``_sigmoid`` / ``_logit`` activation round-trip, PLY parse / write
  (binary-LE float32 layout), ``_normalize_quaternions`` zero-norm fallback.
- ``image_io.py`` 4 survivors → input-shape validation, ``[0, 1]`` clip,
  parent-directory creation.

Each test docstring names the mutation class it targets so reviewers can trace
``mutmut show <id>`` back to a specific assertion.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pytest

from common_3dgs import Camera, GaussianSplatModel, save_png

SH_DEGREE = 3
K = (SH_DEGREE + 1) ** 2  # 16


# ---------------------------------------------------------------------------
# Camera validation branches (camera.py:70-90)
# ---------------------------------------------------------------------------


def _id_view() -> np.ndarray:
    return np.eye(4, dtype=np.float32)


def _good_proj(fov_y: float = math.radians(50.0), aspect: float = 1.0) -> np.ndarray:
    th = math.tan(fov_y / 2.0)
    proj = np.zeros((4, 4), np.float32)
    proj[0, 0] = 1.0 / (aspect * th)
    proj[1, 1] = 1.0 / th
    proj[2, 2] = (100.0 + 0.01) / (100.0 - 0.01)
    proj[2, 3] = -2.0 * 100.0 * 0.01 / (100.0 - 0.01)
    proj[3, 2] = 1.0
    return proj


def test_camera_rejects_wrong_view_matrix_shape() -> None:
    """``Camera.__init__`` raises on ``view_matrix.shape != (4, 4)`` (line 71).

    A mutation that drops or weakens the shape check (e.g. ``vm.shape != (4,
    4)`` → ``vm.shape == (4, 4)``) lets a malformed view through. Forcing a
    (3, 3) view exercises the failing branch.
    """
    with pytest.raises(ValueError, match="view_matrix must be"):
        Camera(
            np.eye(3, dtype=np.float32),
            _good_proj(),
            near=0.1,
            far=10.0,
            image_height=8,
            image_width=8,
        )


def test_camera_rejects_wrong_projection_matrix_shape() -> None:
    """``Camera.__init__`` raises on ``projection_matrix.shape != (4, 4)`` (line 73)."""
    with pytest.raises(ValueError, match="projection_matrix must be"):
        Camera(
            _id_view(),
            np.zeros((4, 3), dtype=np.float32),
            near=0.1,
            far=10.0,
            image_height=8,
            image_width=8,
        )


@pytest.mark.parametrize(
    "h,w",
    [(0, 8), (8, 0), (-1, 8), (8, -1), (0, 0)],
    ids=["h0", "w0", "h_neg", "w_neg", "both0"],
)
def test_camera_rejects_non_positive_image_dimensions(h: int, w: int) -> None:
    """``Camera.__init__`` raises when ``image_height <= 0 or image_width <= 0``
    (line 74; 5 mutation indices on the compound boolean).

    Each parameter pair pokes a distinct branch of the ``a <= 0 or b <= 0``
    expression so that operator swaps (``<`` vs ``<=``, ``or`` vs ``and``)
    or operand drops are caught.
    """
    with pytest.raises(ValueError, match="image_height and image_width must be positive"):
        Camera(
            _id_view(),
            _good_proj(),
            near=0.1,
            far=10.0,
            image_height=h,
            image_width=w,
        )


def test_camera_rejects_non_positive_p11() -> None:
    """``Camera.__init__`` raises on ``projection_matrix[1, 1] <= 0`` (line 88).

    A degenerate / flipped frustum (``p11 = 0``) lacks a real ``fov_y``; a
    mutation that drops the guard would feed ``log(1/0)`` to ``math.atan``.
    """
    bad_proj = _good_proj()
    bad_proj[1, 1] = 0.0
    with pytest.raises(ValueError, match="projection_matrix\\[1, 1\\] must be positive"):
        Camera(
            _id_view(),
            bad_proj,
            near=0.1,
            far=10.0,
            image_height=8,
            image_width=8,
        )


def test_camera_derives_camera_center_from_view_translation() -> None:
    """``Camera.__init__`` derives ``camera_center = -Rᵀ @ t`` (line 85-86).

    A camera looking at the origin from ``eye = (1, 2, 3)`` has a view with
    ``t = -R @ eye``; ``camera_center`` must be exactly ``(1, 2, 3)``
    again. Mutations that flip the sign, drop the transpose, or skip the
    multiply break the round-trip.
    """
    cam = Camera.look_at(
        (1.0, 2.0, 3.0),
        (0.0, 0.0, 0.0),
        fov_y=math.radians(50.0),
        image_height=16,
        image_width=16,
    )
    np.testing.assert_allclose(cam.camera_center, np.asarray([1.0, 2.0, 3.0]), atol=1e-5)


def test_camera_derives_fov_y_from_p11() -> None:
    """``Camera.__init__`` derives ``fov_y = 2 * atan(1 / p11)`` (line 90).

    For ``fov_y = 60 deg``, ``p11 = 1 / tan(30 deg)``; a sign / constant mutation
    on the formula (e.g. dropping the ``2 *``, swapping ``atan`` for ``acos``)
    shifts the derived angle outside the assertion tolerance.
    """
    fov_in = math.radians(60.0)
    cam = Camera.look_at(
        (0.0, 0.0, 3.0),
        (0.0, 0.0, 0.0),
        fov_y=fov_in,
        image_height=16,
        image_width=16,
    )
    np.testing.assert_allclose(cam.fov_y, fov_in, atol=1e-5)


def test_camera_stores_near_and_far_attributes() -> None:
    """``Camera.__init__`` stores ``self.near`` / ``self.far`` (lines 79-80).

    Tests at Stage 1b only read ``view_matrix`` / ``projection_matrix``;
    a mutation that swaps ``near`` and ``far`` or drops ``float(far)`` is
    only caught by an explicit attribute round-trip.
    """
    cam = Camera.look_at(
        (0.0, 0.0, 3.0),
        (0.0, 0.0, 0.0),
        fov_y=math.radians(50.0),
        image_height=16,
        image_width=16,
        near=0.5,
        far=42.0,
    )
    assert cam.near == pytest.approx(0.5)
    assert cam.far == pytest.approx(42.0)


# ---------------------------------------------------------------------------
# Camera.look_at projection-matrix internals + defaults (camera.py:97-127)
# ---------------------------------------------------------------------------


def test_camera_look_at_projection_matrix_entries() -> None:
    """``Camera.look_at`` builds the perspective matrix per (lines 119-127).

    Pins every mutated entry: ``proj[0,0] = 1/(aspect*th)``,
    ``proj[1,1] = 1/th``, ``proj[2,2] = (f+n)/(f-n)``,
    ``proj[2,3] = -2fn/(f-n)``, ``proj[3,2] = 1``. The remaining entries are
    zero. ~24 mutmut survivors in this single arithmetic block.
    """
    fov = math.radians(45.0)
    aspect = 64.0 / 32.0  # image_width / image_height
    near, far = 0.1, 50.0
    cam = Camera.look_at(
        (0.0, 0.0, 5.0),
        (0.0, 0.0, 0.0),
        fov_y=fov,
        image_height=32,
        image_width=64,
        near=near,
        far=far,
    )
    p = cam.projection_matrix
    th = math.tan(fov / 2.0)
    np.testing.assert_allclose(p[0, 0], 1.0 / (aspect * th), atol=1e-5)
    np.testing.assert_allclose(p[1, 1], 1.0 / th, atol=1e-5)
    np.testing.assert_allclose(p[2, 2], (far + near) / (far - near), atol=1e-5)
    np.testing.assert_allclose(p[2, 3], -2.0 * far * near / (far - near), atol=1e-5)
    np.testing.assert_allclose(p[3, 2], 1.0, atol=1e-6)
    # No spurious non-zeros elsewhere on the diagonal-like rows.
    for i, j in [
        (0, 1),
        (0, 2),
        (0, 3),
        (1, 0),
        (1, 2),
        (1, 3),
        (2, 0),
        (2, 1),
        (3, 0),
        (3, 1),
        (3, 3),
    ]:
        assert p[i, j] == pytest.approx(0.0, abs=1e-6), f"proj[{i},{j}] = {p[i, j]}"


def test_camera_look_at_default_near_far() -> None:
    """``Camera.look_at`` keyword defaults ``near=0.01`` / ``far=100.0``
    (lines 102-103). Both surface as ``cam.near`` / ``cam.far``."""
    cam = Camera.look_at(
        (0.0, 0.0, 3.0),
        (0.0, 0.0, 0.0),
        fov_y=math.radians(50.0),
        image_height=16,
        image_width=16,
    )
    assert cam.near == pytest.approx(0.01)
    assert cam.far == pytest.approx(100.0)


def test_camera_look_at_default_up_orients_view_y_axis() -> None:
    """``Camera.look_at`` keyword default ``up=(0,1,0)`` (line 97).

    With camera eye at ``(0, 0, 3)``, target at origin, the look-at math
    produces ``fwd = (0,0,-1)``, ``right = cross((0,1,0), (0,0,-1)) = (-1,
    0, 0)``, ``down = cross(fwd, right) = (0, 1, 0)``. The view matrix's
    rows are ``[right; down; fwd]``; mutating the default ``up`` value
    (e.g. to ``(0, 0, 1)`` or ``(1, 0, 0)``) changes these orthogonal
    rows. Asserting all three pins the default basis.
    """
    cam = Camera.look_at(
        (0.0, 0.0, 3.0),
        (0.0, 0.0, 0.0),
        fov_y=math.radians(50.0),
        image_height=16,
        image_width=16,
    )
    np.testing.assert_allclose(cam.view_matrix[0, :3], np.asarray([-1.0, 0.0, 0.0]), atol=1e-5)
    np.testing.assert_allclose(cam.view_matrix[1, :3], np.asarray([0.0, 1.0, 0.0]), atol=1e-5)
    np.testing.assert_allclose(cam.view_matrix[2, :3], np.asarray([0.0, 0.0, -1.0]), atol=1e-5)


# ---------------------------------------------------------------------------
# GaussianSplatModel validation + accessors (model.py:81-105, 162-183)
# ---------------------------------------------------------------------------


def _good_fields(n: int = 4):
    return dict(
        positions=np.zeros((n, 3), np.float32),
        scales=np.full((n, 3), 0.1, np.float32),
        rotations=np.tile(np.asarray([1.0, 0.0, 0.0, 0.0], np.float32), (n, 1)),
        opacities=np.full((n,), 0.5, np.float32),
        sh_coefficients=np.zeros((n, K, 3), np.float32),
    )


@pytest.mark.parametrize(
    "field,bad_shape",
    [
        ("positions", (4, 2)),
        ("scales", (4, 4)),
        ("rotations", (4, 3)),
        ("opacities", (4, 2)),
    ],
)
def test_model_rejects_wrong_field_shape(field: str, bad_shape: tuple[int, ...]) -> None:
    """``GaussianSplatModel.__init__`` shape checks (lines 88-95).

    Each parameter pair hits a distinct ``if X.shape != (n, …)`` branch.
    """
    fields = _good_fields(4)
    fields[field] = np.zeros(bad_shape, np.float32)
    with pytest.raises(ValueError, match=field):
        GaussianSplatModel(**fields)


@pytest.mark.parametrize(
    "bad_sh",
    [
        np.zeros((4, K), np.float32),  # 2-D — ndim check
        np.zeros((3, K, 3), np.float32),  # wrong N
        np.zeros((4, K, 4), np.float32),  # wrong colour dim
    ],
    ids=["ndim", "n_mismatch", "channel_count"],
)
def test_model_rejects_wrong_sh_shape(bad_sh: np.ndarray) -> None:
    """``GaussianSplatModel.__init__`` SH-shape check (line 96; 8 mutation indices)."""
    fields = _good_fields(4)
    fields["sh_coefficients"] = bad_sh
    with pytest.raises(ValueError, match="sh_coefficients"):
        GaussianSplatModel(**fields)


def test_model_to_numpy_returns_float32_with_expected_shapes() -> None:
    """``GaussianSplatModel.to_numpy`` shapes + dtype (lines 174-179).

    Specific mutations that drop a ``reshape`` or ``astype(float32)`` survive
    when no test inspects ``to_numpy`` return dtypes / shapes per field.
    """
    model = GaussianSplatModel(**_good_fields(5))
    npy = model.to_numpy()
    assert npy["positions"].shape == (5, 3) and npy["positions"].dtype == np.float32
    assert npy["scales"].shape == (5, 3) and npy["scales"].dtype == np.float32
    assert npy["rotations"].shape == (5, 4) and npy["rotations"].dtype == np.float32
    assert npy["opacities"].shape == (5,) and npy["opacities"].dtype == np.float32
    assert npy["sh_coefficients"].shape == (5, K, 3)
    assert npy["sh_coefficients"].dtype == np.float32


def test_model_ply_roundtrip_preserves_activation_fields(tmp_path: Path) -> None:
    """``save_ply ∘ load_ply`` round-trips ``opacities`` (logit↔sigmoid) and
    ``scales`` (log↔exp) — pins ``_logit`` / ``_sigmoid`` survivors
    (model.py:40-47) + the PLY column ordering / parser (lines 117-153).

    The properties-based ``test_ply_roundtrip_preserves_fields`` uses a wide
    value range; this scenario picks a single specific (opacity, scale) pair
    so a sign-flip or constant-tweak in either activation produces a
    measurable round-trip error well outside the tolerance.
    """
    n = 3
    fields = _good_fields(n)
    fields["opacities"] = np.asarray([0.2, 0.5, 0.8], np.float32)
    fields["scales"] = np.asarray([[0.05, 0.1, 0.2], [0.3, 0.4, 0.5], [0.6, 0.7, 0.8]], np.float32)
    fields["sh_coefficients"] = np.linspace(-0.4, 0.4, n * K * 3, dtype=np.float32).reshape(n, K, 3)
    model = GaussianSplatModel(**fields)
    out = tmp_path / "scene.ply"
    model.save_ply(out)
    reloaded = GaussianSplatModel.load_ply(out)
    after = reloaded.to_numpy()
    np.testing.assert_allclose(after["opacities"], fields["opacities"], rtol=1e-4, atol=1e-6)
    np.testing.assert_allclose(after["scales"], fields["scales"], rtol=1e-4, atol=1e-6)
    np.testing.assert_array_equal(after["positions"], fields["positions"])
    np.testing.assert_array_equal(after["sh_coefficients"], fields["sh_coefficients"])


# ---------------------------------------------------------------------------
# image_io.save_png (image_io.py:24, 26, 34)
# ---------------------------------------------------------------------------


def test_save_png_rejects_non_rgb_array(tmp_path: Path) -> None:
    """``save_png`` raises on ``arr.ndim != 3 or arr.shape[2] != 3`` (line 24)."""
    with pytest.raises(ValueError, match="save_png expects"):
        save_png(np.zeros((4, 4), np.float32), tmp_path / "bad.png")
    with pytest.raises(ValueError, match="save_png expects"):
        save_png(np.zeros((4, 4, 4), np.float32), tmp_path / "bad2.png")


def test_save_png_creates_missing_parent_directory(tmp_path: Path) -> None:
    """``save_png`` creates ``out.parent`` (line 34) — mutation that drops
    ``parents=True`` / ``exist_ok=True`` fails when nested dirs are missing.
    """
    nested = tmp_path / "a" / "b" / "c" / "frame.png"
    save_png(np.zeros((4, 4, 3), np.float32), nested)
    assert nested.exists()


def test_save_png_clips_out_of_range_values(tmp_path: Path) -> None:
    """``save_png`` clips its input to ``[0, 1]`` (line 26) before quantizing.

    With an input of values ``-1`` and ``+2`` the saved PNG must contain only
    ``0x00`` / ``0xff`` bytes in the colour channels (read back via PIL). A
    mutation that drops or widens the clip allows wraparound on the 8-bit
    quantization, producing intermediate bytes.
    """
    pil = pytest.importorskip("PIL.Image")
    img = np.zeros((4, 4, 3), np.float32)
    img[:, :2, :] = -1.0  # left half: should clip to 0 → black
    img[:, 2:, :] = 2.0  # right half: should clip to 1 → white
    out = save_png(img, tmp_path / "clip.png")
    arr = np.asarray(pil.open(out).convert("RGB"))
    assert arr[:, :2, :].max() == 0, "negative values must clip to 0 (black)"
    assert arr[:, 2:, :].min() == 255, "values > 1 must clip to 1 (white)"
