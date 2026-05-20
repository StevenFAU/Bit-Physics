"""Vector-field energy-spectrum check (IC-6).

Computes the isotropic energy spectrum ``E(k)`` of a velocity field
by binning ``0.5 * |u_hat(k)|^2`` over shells of constant ``|k|`` in
wavenumber space. Optionally compares a log-log fit slope against an
``expected_slope`` (e.g. -5/3 for the inertial range of isotropic
turbulence).

Implementation:
  1. FFT each velocity component along all spatial axes.
  2. Bin ``sum_d |u_hat_d(k)|^2 / 2`` into integer-radius shells.
  3. If ``expected_slope`` is given, fit a linear regression on
     ``(log k, log E)`` over ``fit_range`` and assert the slope
     stays within ``tolerance_slope`` of the expected slope.

This is a coarse Phase 1 implementation — adequate for "test that the
check returns the right shape and detects gross deviations." Phase 2+
sims that depend on accurate spectral fits (eulerian-smoke, LBM) may
elect a finer-grained radial bin or a windowed FFT.
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np

from .._types import CheckResult


def _normalize_spacing(spacing: float | Sequence[float], d: int) -> np.ndarray:
    if np.isscalar(spacing):
        return np.full(d, float(spacing))  # type: ignore[arg-type]
    arr = np.asarray(spacing, dtype=np.float64)
    if arr.shape != (d,):
        raise ValueError(f"grid_spacing shape {arr.shape} != expected ({d},)")
    return arr


def _radial_spectrum(u: np.ndarray, grid_spacing: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    d = int(u.shape[-1])
    grid_shape = u.shape[:-1]
    # Wavenumbers along each axis in cycles per unit length.
    ks = [np.fft.fftfreq(n, d=h) for n, h in zip(grid_shape, grid_spacing, strict=True)]
    kgrids = np.meshgrid(*ks, indexing="ij")
    k_mag = np.sqrt(sum(kg**2 for kg in kgrids))

    energy = np.zeros(grid_shape, dtype=np.float64)
    for axis in range(d):
        comp = u[..., axis]
        u_hat = np.fft.fftn(comp) / comp.size
        energy += 0.5 * (np.abs(u_hat) ** 2)

    # Bin by integer radius (in units of the fundamental wavenumber).
    k_unit = 1.0 / max(grid_spacing * np.array(grid_shape, dtype=np.float64))
    radius = np.round(k_mag / k_unit).astype(np.int64)
    n_bins = int(radius.max()) + 1
    e_k = np.bincount(radius.ravel(), weights=energy.ravel(), minlength=n_bins)
    k_axis = np.arange(n_bins, dtype=np.float64) * k_unit
    return k_axis, e_k


def check_energy_spectrum(
    velocity_field: np.ndarray,
    grid_spacing: float | Sequence[float],
    expected_slope: float | None = None,
    fit_range: tuple[float, float] | None = None,
    tolerance_slope: float = 0.2,
) -> CheckResult:
    """See module docstring."""
    u = np.asarray(velocity_field, dtype=np.float64)
    if u.ndim < 2:
        raise ValueError(f"velocity_field must have ndim >= 2, got {u.ndim}")
    d = int(u.shape[-1])
    if d != u.ndim - 1:
        raise ValueError(f"velocity_field last-axis {d} must equal grid_dim {u.ndim - 1}")
    if tolerance_slope < 0.0:
        raise ValueError(f"tolerance_slope={tolerance_slope!r} must be non-negative")
    h = _normalize_spacing(grid_spacing, d)

    k_axis, e_k = _radial_spectrum(u, h)

    if expected_slope is None:
        return CheckResult(
            passed=True,
            value=None,
            tolerance=None,
            details={
                "k": k_axis.tolist(),
                "E_k": e_k.tolist(),
                "expected_slope": None,
            },
        )

    if fit_range is None:
        # Default: skip k=0; use the 25%-75% quartile by k count.
        valid = (k_axis > 0) & (e_k > 0)
        idx = np.where(valid)[0]
        if idx.size < 4:
            raise ValueError(
                "not enough non-zero spectrum bins for a slope fit; "
                "supply a coarser grid or fit_range explicitly"
            )
        lo = idx[idx.size // 4]
        hi = idx[(3 * idx.size) // 4]
        fit_mask = np.zeros_like(k_axis, dtype=bool)
        fit_mask[lo : hi + 1] = True
        fit_mask &= valid
    else:
        klo, khi = fit_range
        fit_mask = (k_axis >= klo) & (k_axis <= khi) & (e_k > 0)
    if int(fit_mask.sum()) < 2:
        raise ValueError(f"fit_range {fit_range} encloses fewer than 2 valid bins")

    log_k = np.log(k_axis[fit_mask])
    log_e = np.log(e_k[fit_mask])
    slope, intercept = np.polyfit(log_k, log_e, deg=1)
    abs_err = abs(float(slope) - float(expected_slope))
    return CheckResult(
        passed=abs_err <= tolerance_slope,
        value=float(slope),
        tolerance=float(tolerance_slope),
        details={
            "k": k_axis.tolist(),
            "E_k": e_k.tolist(),
            "expected_slope": float(expected_slope),
            "intercept": float(intercept),
            "n_fit_points": int(fit_mask.sum()),
            "abs_error": abs_err,
        },
    )
