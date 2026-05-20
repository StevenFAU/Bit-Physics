"""IC-5 check_neighbor_list_integrity tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.particle import check_neighbor_list_integrity


def test_symmetric_in_cutoff_passes() -> None:
    pos = np.array([[0.0, 0.0], [1.0, 0.0], [10.0, 0.0]])
    lists = [[1], [0], []]
    result = check_neighbor_list_integrity(pos, lists, cutoff_radius=2.0)
    assert result.passed
    assert result.value == 0.0


def test_self_inclusion_fails() -> None:
    pos = np.array([[0.0, 0.0], [1.0, 0.0]])
    lists = [[0, 1], [0]]
    result = check_neighbor_list_integrity(pos, lists, cutoff_radius=2.0)
    assert not result.passed
    assert result.details["n_self_inclusion"] == 1


def test_out_of_cutoff_fails() -> None:
    pos = np.array([[0.0, 0.0], [5.0, 0.0]])
    lists = [[1], [0]]
    result = check_neighbor_list_integrity(pos, lists, cutoff_radius=1.0)
    assert not result.passed
    assert result.details["n_out_of_cutoff"] == 2  # counted from both ends


def test_asymmetric_fails() -> None:
    pos = np.array([[0.0, 0.0], [1.0, 0.0]])
    lists = [[1], []]
    result = check_neighbor_list_integrity(pos, lists, cutoff_radius=2.0)
    assert not result.passed
    assert result.details["n_asymmetric"] == 1


def test_wrong_length_raises() -> None:
    with pytest.raises(ValueError, match="length"):
        check_neighbor_list_integrity(np.zeros((3, 2)), [[1], [0]], cutoff_radius=1.0)


def test_out_of_range_neighbor_raises() -> None:
    with pytest.raises(ValueError, match="out of range"):
        check_neighbor_list_integrity(np.zeros((2, 2)), [[1], [99]], cutoff_radius=1.0)


def test_negative_cutoff_raises() -> None:
    with pytest.raises(ValueError, match="cutoff_radius"):
        check_neighbor_list_integrity(np.zeros((2, 2)), [[1], [0]], cutoff_radius=-1.0)
