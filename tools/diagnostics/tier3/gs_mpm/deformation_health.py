"""Tier-3 3dgs-mpm: coupling deformation-health diagnostic.

Verifies the coupling stays physically valid (spec-ref § 6 / § 10):

1. every per-particle deformation gradient ``F`` is finite with ``det(F) > 0`` (no element
   inversion — the ``def_grad_determinant_positive`` envelope), AND
2. the coupled Gaussian covariances ``Σ' = F·A·Fᵀ`` are finite and SPD (positive output
   scales), so each deformed Gaussian remains a valid ellipsoid.

A positive-determinant ``F`` applied to an SPD ``A`` always yields an SPD ``Σ'``; this
diagnostic is the runtime witness of that invariant over a captured trajectory.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class DeformationHealthReport:
    """Report for :func:`check_deformation_health`."""

    min_det_f: float
    min_output_scale: float
    all_finite: bool
    ok: bool


def check_deformation_health(
    deformation_gradients: NDArray[np.floating],
    output_scales: NDArray[np.floating],
    *,
    eps: float = 0.0,
) -> DeformationHealthReport:
    """Verify ``det(F) > eps`` for all particles and all coupled scales ``> eps``, finite."""
    f = np.asarray(deformation_gradients, dtype=np.float64).reshape(-1, 3, 3)
    s = np.asarray(output_scales, dtype=np.float64)
    dets = np.linalg.det(f)
    all_finite = bool(np.isfinite(f).all() and np.isfinite(s).all())
    min_det = float(dets.min(initial=np.inf))
    min_scale = float(s.min(initial=np.inf))
    return DeformationHealthReport(
        min_det_f=min_det,
        min_output_scale=min_scale,
        all_finite=all_finite,
        ok=all_finite and min_det > eps and min_scale > eps,
    )
