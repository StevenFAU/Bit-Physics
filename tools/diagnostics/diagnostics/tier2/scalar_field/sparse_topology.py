"""Scalar-field sparse-topology diagnostics (Phase 4.0 WU-B).

Sparse-aware tier-2 checks for scalar fields: derive an active-cell mask from a
scalar field (active = value differs from the sparse background) and report
active count, sparsity, and topology change across steps. Shares the mask
primitives in :mod:`diagnostics.tier2._sparse_common`.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from .._sparse_common import (
    MaskDiffReport,
    active_cell_count,
    mask_diff,
    sparsity_ratio,
    topology_change_detected,
)

__all__ = [
    "MaskDiffReport",
    "active_cell_count",
    "mask_diff",
    "scalar_field_active_mask",
    "sparsity_ratio",
    "topology_change_detected",
]


def scalar_field_active_mask(
    field: NDArray[np.floating], *, background: float = 0.0, atol: float = 0.0
) -> NDArray[np.bool_]:
    """Active-cell mask of a scalar field: ``|field - background| > atol``."""
    arr = np.asarray(field, dtype=np.float64)
    return np.abs(arr - background) > atol
