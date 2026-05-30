"""Shared sparse-topology diagnostic primitives (Phase 4.0 WU-B).

Tier-2 sparse-aware diagnostics operate on dense boolean active-cell masks (the
representation of the capture-manifest ``active_mask`` field, spec § 4.3). These
primitives are consumed by the ``scalar_field`` and ``vector_field`` substacks'
``sparse_topology`` modules — NOT a new tier-2 substack (spec § 3.3 fixes tier-2
at exactly four substacks: particle, scalar_field, vector_field, closed_form).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

BoolMask = NDArray[np.bool_]


@dataclass(frozen=True)
class MaskDiffReport:
    """Difference between two active-cell masks (same shape)."""

    added: int  # cells active in `after` but not `before`
    removed: int  # cells active in `before` but not `after`
    common: int  # cells active in both
    topology_changed: bool


def _as_bool(mask: BoolMask) -> BoolMask:
    return np.asarray(mask, dtype=bool)


def active_cell_count(mask: BoolMask) -> int:
    """Number of active cells in ``mask``."""
    return int(_as_bool(mask).sum())


def sparsity_ratio(mask: BoolMask) -> float:
    """Fraction of cells that are active (0.0 = empty, 1.0 = fully dense)."""
    m = _as_bool(mask)
    total = int(m.size)
    return int(m.sum()) / total if total else 0.0


def topology_change_detected(before: BoolMask, after: BoolMask) -> bool:
    """``True`` iff the active-cell set changed between ``before`` and ``after``."""
    a = _as_bool(before)
    b = _as_bool(after)
    if a.shape != b.shape:
        return True
    return not np.array_equal(a, b)


def mask_diff(before: BoolMask, after: BoolMask) -> MaskDiffReport:
    """Cell-wise difference between two equal-shape active-cell masks."""
    a = _as_bool(before)
    b = _as_bool(after)
    if a.shape != b.shape:
        raise ValueError(f"mask shapes differ: {a.shape} vs {b.shape}")
    added = int((b & ~a).sum())
    removed = int((a & ~b).sum())
    common = int((a & b).sum())
    return MaskDiffReport(
        added=added,
        removed=removed,
        common=common,
        topology_changed=(added > 0 or removed > 0),
    )
