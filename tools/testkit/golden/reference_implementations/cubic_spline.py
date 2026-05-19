"""Canonical Python reference implementation — Monaghan cubic-spline SPH kernel (3D).

Spec § 2.4 + Phase 0 plan § 3.3.4. This is **the** Python implementation of
the cubic-spline kernel in the repo: Block 5 INTEGRITY imports `evaluate`
from here for its Cat 3 (numerical-truth) check; no other module
re-implements the formula.

The derivation that fixes the formulas below is at
`tools/testkit/golden/derivations/cubic-spline-kernel.md`. The 3D
normalization $\\sigma_3 = 1/\\pi$ is canonical.
"""

from __future__ import annotations

from typing import Any

import numpy as np

_SIGMA_3D = 1.0 / np.pi


def _W(q: float, h: float) -> float:
    """Cubic-spline kernel value W(q, h) in 3D normalization."""
    if q < 0.0:
        raise ValueError(f"q must be non-negative; got {q!r}")
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    if q < 1.0:
        f = 1.0 - 1.5 * q * q + 0.75 * q * q * q
    elif q < 2.0:
        diff = 2.0 - q
        f = 0.25 * diff * diff * diff
    else:
        f = 0.0
    return float(_SIGMA_3D / (h * h * h) * f)


def _grad_W_magnitude(q: float, h: float) -> float:
    """Magnitude of the kernel gradient |∇W|(q, h) in 3D normalization."""
    if q < 0.0:
        raise ValueError(f"q must be non-negative; got {q!r}")
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    if q < 1.0:
        fp = -3.0 * q + 2.25 * q * q
    elif q < 2.0:
        diff = 2.0 - q
        fp = -0.75 * diff * diff
    else:
        fp = 0.0
    return float(_SIGMA_3D / (h * h * h * h) * abs(fp))


def evaluate(inputs: dict[str, Any]) -> dict[str, float]:
    """Evaluate the Monaghan 3D cubic-spline kernel at a single (q, h) point.

    Conforms to the `KernelEvaluator` Protocol in
    `bit_physics_testkit.golden.verifier`.

    Args:
        inputs: ``{"q": float, "h": float}`` — non-negative ``q``, strictly
            positive ``h``.

    Returns:
        ``{"W": float, "grad_W_magnitude": float}``.
    """
    q = float(inputs["q"])
    h = float(inputs["h"])
    return {"W": _W(q, h), "grad_W_magnitude": _grad_W_magnitude(q, h)}
