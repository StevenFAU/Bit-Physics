"""Vector-field helicity check (IC-6).

Helicity is the volume integral of ``u . omega`` where ``omega = curl u``
is the vorticity. This check is 3D only (a 3D vector field is required
to take a curl). The integral is approximated by midpoint-rule on the
interior cells (boundary excluded from the curl evaluation, mirroring
:mod:`divergence_free`).

If ``expected_value`` is supplied, ``passed`` iff
``|helicity - expected| <= tolerance_rel * max(|expected|, 1)``.
``None`` ⇒ always-passes diagnostic-only mode.
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


def _central_diff(comp: np.ndarray, axis: int, h: float) -> np.ndarray:
    f = np.take(comp, range(2, comp.shape[axis]), axis=axis)
    b = np.take(comp, range(0, comp.shape[axis] - 2), axis=axis)
    out = (f - b) / (2.0 * h)
    return out


def check_helicity(
    velocity_field: np.ndarray,
    grid_spacing: float | Sequence[float],
    expected_value: float | None = None,
    tolerance_rel: float = 1e-3,
) -> CheckResult:
    """See module docstring."""
    u = np.asarray(velocity_field, dtype=np.float64)
    if u.ndim != 4 or u.shape[-1] != 3:
        raise ValueError(
            f"check_helicity is 3D-only; expected shape (Nx, Ny, Nz, 3), got {u.shape}"
        )
    if tolerance_rel < 0.0:
        raise ValueError(f"tolerance_rel={tolerance_rel!r} must be non-negative")
    h = _normalize_spacing(grid_spacing, 3)
    for axis_size in u.shape[:-1]:
        if axis_size < 3:
            raise ValueError(f"each grid axis must have size >= 3, got shape {u.shape[:-1]}")

    ux, uy, uz = u[..., 0], u[..., 1], u[..., 2]

    # Central differences along each axis, cropped to common interior.
    def crop(arr: np.ndarray, kept_axis: int) -> np.ndarray:
        slicer = [slice(1, -1)] * 3
        slicer[kept_axis] = slice(None)
        return arr[tuple(slicer)]

    duz_dy = crop(_central_diff(uz, axis=1, h=h[1]), kept_axis=1)
    duy_dz = crop(_central_diff(uy, axis=2, h=h[2]), kept_axis=2)
    dux_dz = crop(_central_diff(ux, axis=2, h=h[2]), kept_axis=2)
    duz_dx = crop(_central_diff(uz, axis=0, h=h[0]), kept_axis=0)
    duy_dx = crop(_central_diff(uy, axis=0, h=h[0]), kept_axis=0)
    dux_dy = crop(_central_diff(ux, axis=1, h=h[1]), kept_axis=1)

    omega_x = duz_dy - duy_dz
    omega_y = dux_dz - duz_dx
    omega_z = duy_dx - dux_dy

    inner = (slice(1, -1),) * 3
    helicity_density = ux[inner] * omega_x + uy[inner] * omega_y + uz[inner] * omega_z
    cell_volume = float(h[0] * h[1] * h[2])
    helicity = float(helicity_density.sum()) * cell_volume

    if expected_value is None:
        return CheckResult(
            passed=True,
            value=helicity,
            tolerance=None,
            details={
                "grid_shape": list(u.shape[:-1]),
                "grid_spacing": h.tolist(),
                "expected_value": None,
            },
        )
    expected = float(expected_value)
    abs_err = abs(helicity - expected)
    threshold = tolerance_rel * max(abs(expected), 1.0)
    return CheckResult(
        passed=abs_err <= threshold,
        value=helicity,
        tolerance=threshold,
        details={
            "grid_shape": list(u.shape[:-1]),
            "grid_spacing": h.tolist(),
            "expected_value": expected,
            "abs_error": abs_err,
        },
    )
