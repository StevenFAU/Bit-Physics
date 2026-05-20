"""IC-5 check_no_overlap tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.particle import check_no_overlap


def test_well_separated_grid_passes() -> None:
    xs, ys = np.meshgrid(np.arange(4), np.arange(4))
    pos = np.column_stack([xs.ravel(), ys.ravel()]).astype(np.float64)
    result = check_no_overlap(pos, epsilon=0.5)
    assert result.passed
    assert result.value == pytest.approx(1.0)


def test_colocated_pair_fails() -> None:
    pos = np.array([[0.0, 0.0], [1e-9, 0.0], [1.0, 0.0]])
    result = check_no_overlap(pos, epsilon=1e-6)
    assert not result.passed
    assert result.details["n_violating_pairs"] == 1


def test_singleton_passes_trivially() -> None:
    pos = np.array([[0.0, 0.0]])
    result = check_no_overlap(pos, epsilon=1.0)
    assert result.passed


def test_empty_passes_trivially() -> None:
    pos = np.zeros((0, 2))
    result = check_no_overlap(pos, epsilon=1.0)
    assert result.passed


def test_3d_positions() -> None:
    pos = np.array([[0.0, 0.0, 0.0], [0.1, 0.0, 0.0], [10.0, 10.0, 10.0]])
    result = check_no_overlap(pos, epsilon=0.05)
    assert result.passed
    result_fail = check_no_overlap(pos, epsilon=0.5)
    assert not result_fail.passed


def test_invalid_shape_raises() -> None:
    with pytest.raises(ValueError, match="shape"):
        check_no_overlap(np.zeros(5), epsilon=1.0)


def test_negative_epsilon_raises() -> None:
    with pytest.raises(ValueError, match="epsilon"):
        check_no_overlap(np.zeros((3, 2)), epsilon=-1.0)
