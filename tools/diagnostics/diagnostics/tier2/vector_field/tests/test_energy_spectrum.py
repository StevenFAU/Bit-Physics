"""IC-6 check_energy_spectrum tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.vector_field import check_energy_spectrum


def _single_mode_2d(n: int = 32, k_idx: int = 4) -> np.ndarray:
    """u = (sin(k * x), 0); energy concentrated at one wavenumber bin."""
    xs = np.linspace(0.0, 2 * np.pi, n, endpoint=False)
    X, _ = np.meshgrid(xs, xs, indexing="ij")
    u = np.stack([np.sin(k_idx * X), np.zeros_like(X)], axis=-1)
    return u


def test_diagnostic_only_returns_spectrum() -> None:
    u = _single_mode_2d(n=32, k_idx=4)
    h = 2 * np.pi / 32
    result = check_energy_spectrum(u, h, expected_slope=None)
    assert result.passed
    e_k = np.asarray(result.details["E_k"])
    assert e_k.sum() > 0.0
    # Energy should peak at exactly the injected mode (or its neighbour bin).
    peak_bin = int(np.argmax(e_k))
    assert peak_bin in {4, 5}


def test_default_fit_range_returns_finite_slope() -> None:
    # Construct a velocity field by inverse FFT from a designed
    # amplitude that decays in k. The test verifies the slope-fit
    # branch returns a finite number and the default fit_range
    # selection finds at least two valid bins on a 64x64 grid.
    n = 64
    rng = np.random.default_rng(seed=12345)
    k = np.fft.fftfreq(n, d=1.0)
    KX, KY = np.meshgrid(k, k, indexing="ij")
    k_mag = np.sqrt(KX**2 + KY**2)
    with np.errstate(divide="ignore"):
        amp = np.where(k_mag > 0, np.where(k_mag > 0, k_mag, 1.0) ** (-2.0), 0.0)
    phase = rng.uniform(0.0, 2 * np.pi, size=k_mag.shape)
    u_hat = amp * np.exp(1j * phase)
    u_x = np.real(np.fft.ifftn(u_hat))
    u_y = np.real(np.fft.ifftn(u_hat * np.exp(1j * 0.5)))
    u = np.stack([u_x, u_y], axis=-1)
    result = check_energy_spectrum(
        u,
        grid_spacing=1.0,
        expected_slope=-2.0,
        fit_range=None,  # auto-select
        tolerance_slope=10.0,  # deliberately loose; not the assertion under test
    )
    assert result.value is not None
    assert np.isfinite(result.value)
    assert result.details["n_fit_points"] >= 2


def test_invalid_velocity_ndim_raises() -> None:
    with pytest.raises(ValueError, match="ndim"):
        check_energy_spectrum(np.zeros(5), 1.0)


def test_negative_tolerance_raises() -> None:
    with pytest.raises(ValueError, match="tolerance_slope"):
        check_energy_spectrum(np.zeros((4, 4, 2)), 1.0, tolerance_slope=-0.1)
