"""Vector-field sparse-topology diagnostics (Phase 4.0 WU-B).

Sparse-aware tier-2 checks for vector fields: a cell is active iff any component
differs from the sparse background. Shares the mask primitives in
:mod:`diagnostics.tier2._sparse_common`.
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
    "sparsity_ratio",
    "topology_change_detected",
    "vector_field_active_mask",
]


def vector_field_active_mask(
    field: NDArray[np.floating], *, background: float = 0.0, atol: float = 0.0
) -> NDArray[np.bool_]:
    """Active-cell mask of a vector field of shape ``(..., C)``.

    A cell is active iff ANY component differs from ``background`` by more than
    ``atol``. The component axis is the trailing axis.
    """
    arr = np.asarray(field, dtype=np.float64)
    active: NDArray[np.bool_] = np.any(np.abs(arr - background) > atol, axis=-1)
    return active
