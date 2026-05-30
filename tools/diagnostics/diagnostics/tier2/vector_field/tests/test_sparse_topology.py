"""Vector-field sparse-topology diagnostic tests (Phase 4.0 WU-B)."""

from __future__ import annotations

import numpy as np

from diagnostics.tier2.vector_field.sparse_topology import (
    active_cell_count,
    mask_diff,
    sparsity_ratio,
    topology_change_detected,
    vector_field_active_mask,
)


def test_vector_active_mask_any_component():
    # shape (2,2,3): a 2x2 grid of 3-vectors.
    field = np.zeros((2, 2, 3))
    field[0, 0, 1] = 4.0  # one component nonzero -> active
    field[1, 1, :] = [1.0, 2.0, 3.0]
    mask = vector_field_active_mask(field, background=0.0)
    assert mask.shape == (2, 2)
    assert active_cell_count(mask) == 2
    assert sparsity_ratio(mask) == 2 / 4


def test_vector_topology_change_and_diff():
    a = np.zeros((2, 2, 3))
    a[0, 0, 0] = 1.0
    ma = vector_field_active_mask(a)
    b = a.copy()
    b[1, 0, 2] = 1.0
    mb = vector_field_active_mask(b)
    assert topology_change_detected(ma, mb) is True
    report = mask_diff(ma, mb)
    assert report.added == 1
    assert report.removed == 0
    assert report.common == 1
