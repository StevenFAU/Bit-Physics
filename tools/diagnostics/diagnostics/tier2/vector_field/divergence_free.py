"""Vector-field divergence-free check (IC-6).

For a velocity field on a uniform Cartesian grid, the pointwise
divergence ``sum_d ∂u_d/∂x_d`` should vanish for an incompressible
flow. The check evaluates the divergence using second-order central
differences on the interior of the grid (boundary cells are excluded
from the maximum). ``passed`` iff the maximum absolute divergence on
the interior stays at or below ``tolerance_abs``.

Velocity-field shape: ``(*grid_shape, D)`` with ``D == len(grid_shape)``
(2D ⇒ ``(Nx, Ny, 2)``, 3D ⇒ ``(Nx, Ny, Nz, 3)``).

Grid spacing: scalar (isotropic) or sequence of length ``D``.
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


def check_divergence_free(
    velocity_field: np.ndarray,
    grid_spacing: float | Sequence[float],
    tolerance_abs: float = 1e-6,
) -> CheckResult:
    """See module docstring."""
    u = np.asarray(velocity_field, dtype=np.float64)
    if u.ndim < 2:
        raise ValueError(f"velocity_field must have ndim >= 2, got {u.ndim}")
    d = int(u.shape[-1])
    if d != u.ndim - 1:
        raise ValueError(f"velocity_field last-axis {d} must equal grid_dim {u.ndim - 1}")
    if tolerance_abs < 0.0:
        raise ValueError(f"tolerance_abs={tolerance_abs!r} must be non-negative")
    h = _normalize_spacing(grid_spacing, d)
    for axis_size in u.shape[:-1]:
        if axis_size < 3:
            raise ValueError(
                f"each grid axis must have size >= 3 for central differences, "
                f"got shape {u.shape[:-1]}"
            )

    # Central differences along each spatial axis using forward+backward
    # slicing; the result is defined on the interior cells.
    div_interior: np.ndarray | None = None
    for axis in range(d):
        comp = u[..., axis]
        f = np.take(comp, range(2, comp.shape[axis]), axis=axis)
        b = np.take(comp, range(0, comp.shape[axis] - 2), axis=axis)
        d_along = (f - b) / (2.0 * h[axis])
        # Crop other axes' boundary cells to align all partials on the
        # common interior.
        slicer = [slice(1, -1)] * d
        slicer[axis] = slice(None)
        d_along = d_along[tuple(slicer)]
        div_interior = d_along if div_interior is None else div_interior + d_along

    assert div_interior is not None
    max_abs = float(np.abs(div_interior).max())
    return CheckResult(
        passed=max_abs <= tolerance_abs,
        value=max_abs,
        tolerance=float(tolerance_abs),
        details={
            "grid_shape": list(u.shape[:-1]),
            "grid_spacing": h.tolist(),
            "interior_shape": list(div_interior.shape),
        },
    )
