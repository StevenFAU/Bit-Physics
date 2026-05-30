"""``PhysicsCoupling`` value tests — PhysGaussian Eq. (8) covariance transform.

D-ANCHOR Anchor 2 (PhysGaussian Eq. (8) Σ' = F Σ Fᵀ) + Anchor 3 (hand-derived
trivial case: identity F preserves the covariance) live here. Deterministic.
"""

from __future__ import annotations

import numpy as np

from common_3dgs import GaussianSplatModel, PhysicsCoupling
from common_3dgs.coupling import default_density_to_opacity

K = 16  # sh_degree 3


def _model(n: int, scale: float = 0.1) -> GaussianSplatModel:
    return GaussianSplatModel(
        np.zeros((n, 3), np.float32),
        np.full((n, 3), scale, np.float32),
        np.tile(np.asarray([1.0, 0.0, 0.0, 0.0], np.float32), (n, 1)),
        np.full((n,), 0.5, np.float32),
        np.zeros((n, K, 3), np.float32),
    )


def test_update_positions_sets_centres() -> None:
    m = _model(4)
    pts = np.asarray(
        [[1.0, 2.0, 3.0], [-1.0, 0.0, 1.0], [0.0, 0.0, 0.0], [5.0, 5.0, 5.0]], np.float32
    )
    PhysicsCoupling(m).update_positions_from_particles(pts)
    np.testing.assert_allclose(m.to_numpy()["positions"], pts, atol=1e-6)


def test_identity_deformation_preserves_scales() -> None:
    """Anchor 3 — hand-derivation: F = I ⇒ Σ' = Σ ⇒ scales unchanged."""
    m = _model(3, scale=0.1)
    before = np.sort(m.to_numpy()["scales"], axis=1)
    f = np.tile(np.eye(3), (3, 1, 1))
    PhysicsCoupling(m).update_covariance_from_deformation(f)
    after = np.sort(m.to_numpy()["scales"], axis=1)
    np.testing.assert_allclose(after, before, atol=1e-5)


def test_diagonal_deformation_scales_axes_physgaussian_eq8() -> None:
    """Anchor 2 — PhysGaussian Eq. (8): axis-aligned Σ, F = diag(2,3,5).

    Σ = diag(s²) = diag(0.01); Σ' = F Σ Fᵀ = diag(0.04, 0.09, 0.25);
    new scales = sqrt(eigvals) = {0.2, 0.3, 0.5}.
    """
    m = _model(1, scale=0.1)
    f = np.array([[[2.0, 0.0, 0.0], [0.0, 3.0, 0.0], [0.0, 0.0, 5.0]]])
    PhysicsCoupling(m).update_covariance_from_deformation(f)
    new_scales = np.sort(m.to_numpy()["scales"][0])
    np.testing.assert_allclose(new_scales, [0.2, 0.3, 0.5], atol=1e-5)


def test_update_opacity_default_beer_lambert() -> None:
    m = _model(3)
    PhysicsCoupling(m).update_opacity_from_density(np.array([0.0, 1.0, 10.0]))
    expected = 1.0 - np.exp(-np.array([0.0, 1.0, 10.0]))
    np.testing.assert_allclose(m.to_numpy()["opacities"], expected, atol=1e-6)


def test_update_opacity_custom_fn() -> None:
    m = _model(2)
    PhysicsCoupling(m).update_opacity_from_density(
        np.array([0.3, 0.7]), density_to_opacity_fn=lambda d: np.clip(d, 0.0, 1.0)
    )
    np.testing.assert_allclose(m.to_numpy()["opacities"], [0.3, 0.7], atol=1e-6)


def test_default_density_to_opacity_monotone_bounded() -> None:
    d = np.linspace(0.0, 20.0, 50)
    op = default_density_to_opacity(d)
    assert np.all(np.diff(op) >= 0.0)  # monotone increasing
    assert np.all((op >= 0.0) & (op < 1.0))


def test_shape_and_count_guards() -> None:
    import pytest

    c = PhysicsCoupling(_model(3))
    with pytest.raises(ValueError, match="num_gaussians"):
        c.update_positions_from_particles(np.zeros((4, 3), np.float32))
    with pytest.raises(ValueError, match=r"\(N, 3\)"):
        c.update_positions_from_particles(np.zeros((3, 2), np.float32))
    with pytest.raises(ValueError, match=r"\(N, 3, 3\)"):
        c.update_covariance_from_deformation(np.zeros((3, 3), np.float32))
    with pytest.raises(ValueError, match="num_gaussians"):
        c.update_opacity_from_density(np.zeros(2))
