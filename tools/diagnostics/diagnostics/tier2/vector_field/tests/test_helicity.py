"""IC-6 check_helicity tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.vector_field import check_helicity


def _shear_field_3d(n: int = 8) -> np.ndarray:
    """u = (z, 0, 0); curl = (0, 1, 0); helicity density u . omega = 0."""
    xs = np.linspace(-1.0, 1.0, n)
    _, _, Z = np.meshgrid(xs, xs, xs, indexing="ij")
    u = np.stack([Z, np.zeros_like(Z), np.zeros_like(Z)], axis=-1)
    return u


def _abc_like_field(n: int = 16) -> np.ndarray:
    """Beltrami-style field: u parallel to curl(u) — non-zero helicity.

    Use a simple ABC-like form with single-mode harmonics:
      u = (sin(z), sin(x), sin(y)) on a periodic [0, 2pi)^3 grid.
    Then curl(u) = (cos(y), cos(z), cos(x)).
    Their dot product is sin(z)cos(y) + sin(x)cos(z) + sin(y)cos(x);
    integrated over [0, 2pi]^3 it averages to zero in continuous limit
    but the discrete sum is small and non-degenerate enough to test
    the diagnostic-only branch.
    """
    xs = np.linspace(0.0, 2 * np.pi, n, endpoint=False)
    X, Y, Z = np.meshgrid(xs, xs, xs, indexing="ij")
    u = np.stack([np.sin(Z), np.sin(X), np.sin(Y)], axis=-1)
    return u


def test_shear_field_helicity_zero() -> None:
    u = _shear_field_3d(n=8)
    h = 2.0 / (8 - 1)
    result = check_helicity(u, h, expected_value=0.0, tolerance_rel=1e-9)
    assert result.passed
    assert result.value == pytest.approx(0.0, abs=1e-9)


def test_diagnostic_only_mode_passes() -> None:
    u = _abc_like_field(n=16)
    h = 2 * np.pi / 16
    result = check_helicity(u, h, expected_value=None)
    assert result.passed
    assert result.value is not None  # measured value present


def test_helicity_wrong_shape_raises() -> None:
    with pytest.raises(ValueError, match="3D-only"):
        check_helicity(np.zeros((4, 4, 2)), 1.0)  # 2D field


def test_helicity_grid_too_small_raises() -> None:
    with pytest.raises(ValueError, match="size >= 3"):
        check_helicity(np.zeros((2, 2, 2, 3)), 1.0)


def test_helicity_negative_tolerance_raises() -> None:
    with pytest.raises(ValueError, match="tolerance_rel"):
        check_helicity(np.zeros((4, 4, 4, 3)), 1.0, tolerance_rel=-1.0)


def test_helicity_anisotropic_spacing() -> None:
    u = _shear_field_3d(n=8)
    result = check_helicity(u, [1.0, 2.0, 1.0], expected_value=0.0, tolerance_rel=1e-9)
    assert result.passed
