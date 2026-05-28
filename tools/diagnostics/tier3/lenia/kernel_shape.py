"""Tier-3 Lenia: Quad4 kernel-shape diagnostic.

Verifies the three canonical Quad4 anchors (K(0)=0, K(0.5)=1, K(1)=0)
are present in the kernel window. Used by golden-table regression
suites and by spot-checks on alternate kernel implementations.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class KernelShapeReport:
    """Report for :func:`check_kernel_shape`."""

    anchor_zero_ok: bool
    anchor_half_ok: bool
    anchor_one_ok: bool
    K_at_zero: float
    K_at_half: float
    K_at_one: float
    max_abs_error: float
    ok: bool


def check_kernel_shape(
    kernel_fn,
    *,
    atol: float = 1e-6,
    rtol: float = 1e-5,
) -> KernelShapeReport:
    """Evaluate Quad4's three canonical anchors against ``kernel_fn``.

    Parameters
    ----------
    kernel_fn
        Callable ``r -> K(r)`` accepting a NumPy array of radii.
    atol
        Absolute tolerance (matches the golden-table
        ``golden_kernel_abs = 1e-6`` per § 3.2.4).
    rtol
        Relative tolerance.

    Returns
    -------
    :class:`KernelShapeReport` summarizing the per-anchor match.
    """
    r = np.array([0.0, 0.5, 1.0], dtype=np.float64)
    K = np.asarray(kernel_fn(r), dtype=np.float64)
    expected = np.array([0.0, 1.0, 0.0], dtype=np.float64)
    errors = np.abs(K - expected)
    max_err = float(np.max(errors))
    anchor_zero_ok = bool(errors[0] <= atol + rtol * abs(expected[0]))
    anchor_half_ok = bool(errors[1] <= atol + rtol * abs(expected[1]))
    anchor_one_ok = bool(errors[2] <= atol + rtol * abs(expected[2]))
    return KernelShapeReport(
        anchor_zero_ok=anchor_zero_ok,
        anchor_half_ok=anchor_half_ok,
        anchor_one_ok=anchor_one_ok,
        K_at_zero=float(K[0]),
        K_at_half=float(K[1]),
        K_at_one=float(K[2]),
        max_abs_error=max_err,
        ok=anchor_zero_ok and anchor_half_ok and anchor_one_ok,
    )
