"""IC-6 check_divergence_free tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.vector_field import check_divergence_free


def _solid_body_rotation_2d(n: int = 16) -> np.ndarray:
    """u = (-y, x); analytically divergence-free."""
    xs = np.linspace(-1.0, 1.0, n)
    ys = np.linspace(-1.0, 1.0, n)
    X, Y = np.meshgrid(xs, ys, indexing="ij")
    u = np.stack([-Y, X], axis=-1)
    return u


def _solid_body_rotation_3d(n: int = 8) -> np.ndarray:
    """u = (-y, x, 0); divergence-free in 3D."""
    xs = np.linspace(-1.0, 1.0, n)
    ys = np.linspace(-1.0, 1.0, n)
    zs = np.linspace(-1.0, 1.0, n)
    X, Y, _ = np.meshgrid(xs, ys, zs, indexing="ij")
    u = np.stack([-Y, X, np.zeros_like(X)], axis=-1)
    return u


def _radial_outflow_2d(n: int = 16) -> np.ndarray:
    """u = (x, y); divergence is 2 everywhere — NOT divergence-free."""
    xs = np.linspace(-1.0, 1.0, n)
    ys = np.linspace(-1.0, 1.0, n)
    X, Y = np.meshgrid(xs, ys, indexing="ij")
    u = np.stack([X, Y], axis=-1)
    return u


def test_solid_body_rotation_2d_passes() -> None:
    u = _solid_body_rotation_2d(n=16)
    h = 2.0 / (16 - 1)
    result = check_divergence_free(u, grid_spacing=h, tolerance_abs=1e-10)
    assert result.passed
    assert result.value is not None and result.value < 1e-10


def test_solid_body_rotation_3d_passes() -> None:
    u = _solid_body_rotation_3d(n=8)
    h = 2.0 / (8 - 1)
    result = check_divergence_free(u, grid_spacing=h, tolerance_abs=1e-10)
    assert result.passed


def test_radial_outflow_fails() -> None:
    u = _radial_outflow_2d(n=16)
    h = 2.0 / (16 - 1)
    result = check_divergence_free(u, grid_spacing=h, tolerance_abs=0.1)
    assert not result.passed
    assert result.value is not None and result.value == pytest.approx(2.0, rel=1e-6)


def test_anisotropic_spacing() -> None:
    u = _solid_body_rotation_2d(n=16)
    result = check_divergence_free(u, grid_spacing=[1.0, 2.0], tolerance_abs=1e-10)
    assert result.passed


def test_invalid_ndim_raises() -> None:
    with pytest.raises(ValueError, match="ndim"):
        check_divergence_free(np.zeros(5), grid_spacing=1.0)


def test_wrong_component_axis_raises() -> None:
    with pytest.raises(ValueError, match="grid_dim"):
        check_divergence_free(np.zeros((4, 4, 4, 2)), grid_spacing=1.0)


def test_grid_too_small_raises() -> None:
    with pytest.raises(ValueError, match="size >= 3"):
        check_divergence_free(np.zeros((2, 2, 2)), grid_spacing=1.0)


def test_negative_tolerance_raises() -> None:
    with pytest.raises(ValueError, match="tolerance_abs"):
        check_divergence_free(np.zeros((4, 4, 2)), 1.0, tolerance_abs=-1.0)
