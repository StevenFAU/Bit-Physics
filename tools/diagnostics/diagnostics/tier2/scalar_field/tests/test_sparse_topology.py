"""Scalar-field sparse-topology diagnostic tests (Phase 4.0 WU-B)."""

from __future__ import annotations

import numpy as np

from diagnostics.tier2.scalar_field.sparse_topology import (
    active_cell_count,
    mask_diff,
    scalar_field_active_mask,
    sparsity_ratio,
    topology_change_detected,
)


def test_active_mask_and_counts():
    field = np.zeros((4, 4))
    field[0, 0] = 1.0
    field[2, 3] = -2.0
    mask = scalar_field_active_mask(field, background=0.0)
    assert active_cell_count(mask) == 2
    assert sparsity_ratio(mask) == 2 / 16


def test_background_atol():
    field = np.full((3, 3), 5.0)
    field[1, 1] = 5.0 + 1e-3
    # With background=5.0 and atol=1e-2, the +1e-3 perturbation is NOT active.
    assert active_cell_count(scalar_field_active_mask(field, background=5.0, atol=1e-2)) == 0
    # With a tighter atol it becomes active.
    assert active_cell_count(scalar_field_active_mask(field, background=5.0, atol=1e-6)) == 1


def test_topology_change_and_diff():
    a = np.zeros((3, 3), dtype=bool)
    a[0, 0] = True
    b = a.copy()
    assert topology_change_detected(a, b) is False
    b[1, 1] = True  # one cell activated
    assert topology_change_detected(a, b) is True
    report = mask_diff(a, b)
    assert report.added == 1
    assert report.removed == 0
    assert report.common == 1
    assert report.topology_changed is True


def test_mask_diff_shape_mismatch_raises():
    import pytest

    with pytest.raises(ValueError, match="shapes differ"):
        mask_diff(np.zeros((2, 2), dtype=bool), np.zeros((3, 3), dtype=bool))
