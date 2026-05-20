"""Closed-form precision-sensitivity check (IC-7).

Compares element-wise relative agreement of single- vs double-precision
evaluations of the same closed-form output. Passes iff every element's
relative difference (using the f64 element as the reference magnitude)
stays at or below ``tolerance_rel``. Both arrays are coerced to f64
for the comparison; reference is taken from the f64 input.

Zero-magnitude references fall back to absolute-difference comparison
against ``tolerance_rel``.
"""

from __future__ import annotations

import numpy as np

from .._types import CheckResult


def check_precision_sensitivity(
    output_f32: np.ndarray,
    output_f64: np.ndarray,
    tolerance_rel: float = 1e-6,
) -> CheckResult:
    """See module docstring."""
    a32 = np.asarray(output_f32).astype(np.float64, copy=False)
    a64 = np.asarray(output_f64, dtype=np.float64)
    if a32.shape != a64.shape:
        raise ValueError(f"output_f32 shape {a32.shape} != output_f64 shape {a64.shape}")
    if tolerance_rel < 0.0:
        raise ValueError(f"tolerance_rel={tolerance_rel!r} must be non-negative")

    abs_diff = np.abs(a32 - a64)
    ref_mag = np.abs(a64)
    safe = np.where(ref_mag > 0.0, ref_mag, 1.0)
    rel_diff = np.where(ref_mag > 0.0, abs_diff / safe, abs_diff)
    max_rel = float(rel_diff.max()) if rel_diff.size else 0.0
    max_abs = float(abs_diff.max()) if abs_diff.size else 0.0
    return CheckResult(
        passed=max_rel <= tolerance_rel,
        value=max_rel,
        tolerance=float(tolerance_rel),
        details={
            "max_abs_diff": max_abs,
            "max_rel_diff": max_rel,
            "n_elements": int(a64.size),
        },
    )
