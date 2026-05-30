"""``common_3dgs.viewer`` tests — headless render-to-image + interactive guard."""

from __future__ import annotations

import math

import numpy as np
import pytest

from common_3dgs import Camera, GaussianSplatModel, launch_interactive_viewer, render_to_image

K = 16


def _model() -> GaussianSplatModel:
    sh = np.zeros((1, K, 3), np.float32)
    sh[0, 0, :] = 1.0
    return GaussianSplatModel(
        np.zeros((1, 3), np.float32),
        np.full((1, 3), 0.15, np.float32),
        np.asarray([[1.0, 0.0, 0.0, 0.0]], np.float32),
        np.asarray([0.9], np.float32),
        sh,
    )


def _cam() -> Camera:
    return Camera.look_at(
        (0.0, 0.0, 3.0), (0.0, 0.0, 0.0), fov_y=math.radians(50.0), image_height=16, image_width=16
    )


def test_render_to_image_writes_png(tmp_path) -> None:
    out = tmp_path / "frame.png"
    render_to_image(_model(), _cam(), str(out))
    assert out.exists() and out.stat().st_size > 0
    assert out.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"  # PNG magic


def test_interactive_viewer_raises_headless(monkeypatch) -> None:
    monkeypatch.delenv("DISPLAY", raising=False)
    monkeypatch.delenv("WAYLAND_DISPLAY", raising=False)
    with pytest.raises(RuntimeError, match="interactive display"):
        launch_interactive_viewer(_model())


def test_interactive_viewer_empty_model_raises() -> None:
    empty = GaussianSplatModel(
        np.zeros((0, 3), np.float32),
        np.zeros((0, 3), np.float32),
        np.zeros((0, 4), np.float32),
        np.zeros((0,), np.float32),
        np.zeros((0, K, 3), np.float32),
    )
    with pytest.raises(ValueError, match="no Gaussians"):
        launch_interactive_viewer(empty)
