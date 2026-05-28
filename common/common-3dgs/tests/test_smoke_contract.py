"""Smoke-contract tests (spec § 2.11 infrastructure-verification surrogate).

One test per §3.2.1 public symbol: imports + instantiates + calls + asserts the
return shape/type. RED at Stage 1a (every body raises ``NotImplementedError``);
flips GREEN at Stage 1b. The verbatim RED output + its sha256 are recorded in the
Stage-1a RED-tests commit footer (spec § 1.3 step 4 / v9 amendment).
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np

import common_3dgs
from common_3dgs import Camera, GaussianSplatModel, render, save_png

SH_DEGREE = 3
K = (SH_DEGREE + 1) ** 2  # 16


def _make_model_fields(n: int, seed: int = 0) -> dict[str, np.ndarray]:
    """Build valid per-field NumPy arrays for an N-Gaussian scene."""
    rng = np.random.default_rng(seed)
    positions = rng.uniform(-1.0, 1.0, size=(n, 3)).astype(np.float32)
    scales = rng.uniform(0.02, 0.3, size=(n, 3)).astype(np.float32)
    quats = rng.normal(size=(n, 4)).astype(np.float32)
    quats /= np.linalg.norm(quats, axis=1, keepdims=True)
    opacities = rng.uniform(0.2, 0.9, size=(n,)).astype(np.float32)
    sh = rng.uniform(-0.5, 0.5, size=(n, K, 3)).astype(np.float32)
    return {
        "positions": positions,
        "scales": scales,
        "rotations": quats,
        "opacities": opacities,
        "sh_coefficients": sh,
    }


def _make_camera(h: int = 32, w: int = 32) -> Camera:
    return Camera.look_at(
        position=(0.0, 0.0, 3.0),
        target=(0.0, 0.0, 0.0),
        up=(0.0, 1.0, 0.0),
        fov_y=math.radians(50.0),
        image_height=h,
        image_width=w,
    )


def test_package_surface() -> None:
    """The package exports the §3.2.1 public symbols + a version string."""
    assert common_3dgs.__version__
    for name in ("Camera", "GaussianSplatModel", "render", "save_png"):
        assert name in common_3dgs.__all__


def test_gaussian_splat_model_construct() -> None:
    fields = _make_model_fields(8)
    model = GaussianSplatModel(**fields)
    assert model.num_gaussians == 8
    assert model.sh_degree == SH_DEGREE
    npy = model.to_numpy()
    assert npy["positions"].shape == (8, 3)


def test_gaussian_splat_model_save_load_ply(tmp_path: Path) -> None:
    fields = _make_model_fields(8)
    model = GaussianSplatModel(**fields)
    out = tmp_path / "scene.ply"
    model.save_ply(out)
    assert out.exists()
    reloaded = GaussianSplatModel.load_ply(out)
    assert reloaded.num_gaussians == 8


def test_camera_look_at() -> None:
    cam = _make_camera(48, 64)
    assert cam.view_matrix.shape == (4, 4)
    assert cam.projection_matrix.shape == (4, 4)
    assert cam.image_height == 48
    assert cam.image_width == 64


def test_render_returns_image() -> None:
    model = GaussianSplatModel(**_make_model_fields(16))
    cam = _make_camera(32, 32)
    image = render(model, cam, image_height=32, image_width=32)
    assert image.shape == (32, 32, 3)
    assert image.dtype == np.float32


def test_save_png(tmp_path: Path) -> None:
    image = np.zeros((16, 16, 3), dtype=np.float32)
    out = save_png(image, tmp_path / "frame.png")
    assert Path(out).exists()


def test_smoke_sim_renders_a_frame(tmp_path: Path) -> None:
    from smoke_3dgs import sim

    assert callable(sim.run_3dgs_smoke)
    result = sim.run_3dgs_smoke(tmp_path)
    assert result.image is not None
    assert result.image.shape[-1] == 3
    assert result.image.dtype == np.float32
    assert result.num_gaussians > 0
