"""Vector-field circulation check (IC-6).

Computes the line integral of the velocity field along a discrete
closed loop. ``loop_specification`` is a sequence of grid-index
tuples ``[(i0_a, i1_a, ...), (i0_b, i1_b, ...), ...]`` describing the
loop's vertices in grid-index space; the loop is closed by an
implicit edge from the last vertex back to the first.

For each edge the contribution is the midpoint-rule sample of
``u · dl``: the velocity averaged at the two endpoints dotted with
the edge vector (in physical coordinates, i.e. index-delta scaled by
``grid_spacing``).

If ``expected_value`` is supplied, ``passed`` iff
``|circulation - expected_value| <= tolerance_rel * max(|expected|, 1)``.
If ``expected_value`` is ``None`` the check always passes and reports
the measured value (acts as a diagnostic surface only).
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


def check_circulation(
    velocity_field: np.ndarray,
    grid_spacing: float | Sequence[float],
    loop_specification: Sequence[Sequence[int]],
    expected_value: float | None = None,
    tolerance_rel: float = 1e-3,
) -> CheckResult:
    """See module docstring."""
    u = np.asarray(velocity_field, dtype=np.float64)
    if u.ndim < 2:
        raise ValueError(f"velocity_field must have ndim >= 2, got {u.ndim}")
    d = int(u.shape[-1])
    if d != u.ndim - 1:
        raise ValueError(f"velocity_field last-axis {d} must equal grid_dim {u.ndim - 1}")
    if tolerance_rel < 0.0:
        raise ValueError(f"tolerance_rel={tolerance_rel!r} must be non-negative")
    h = _normalize_spacing(grid_spacing, d)
    verts = [tuple(int(c) for c in v) for v in loop_specification]
    if len(verts) < 2:
        raise ValueError("loop_specification needs at least two vertices")
    for v in verts:
        if len(v) != d:
            raise ValueError(f"loop vertex {v} has dim {len(v)}, expected {d}")
        for axis, idx in enumerate(v):
            if idx < 0 or idx >= u.shape[axis]:
                raise ValueError(
                    f"loop vertex {v} out of range on axis {axis} (extent {u.shape[axis]})"
                )

    circ = 0.0
    n_verts = len(verts)
    for k in range(n_verts):
        a = verts[k]
        b = verts[(k + 1) % n_verts]
        u_a = u[a]
        u_b = u[b]
        u_mid = 0.5 * (u_a + u_b)
        dl = np.array([(b[axis] - a[axis]) * h[axis] for axis in range(d)])
        circ += float(u_mid @ dl)

    if expected_value is None:
        return CheckResult(
            passed=True,
            value=circ,
            tolerance=None,
            details={
                "n_edges": n_verts,
                "expected_value": None,
            },
        )
    expected = float(expected_value)
    abs_err = abs(circ - expected)
    threshold = tolerance_rel * max(abs(expected), 1.0)
    return CheckResult(
        passed=abs_err <= threshold,
        value=circ,
        tolerance=threshold,
        details={
            "n_edges": n_verts,
            "expected_value": expected,
            "abs_error": abs_err,
        },
    )
