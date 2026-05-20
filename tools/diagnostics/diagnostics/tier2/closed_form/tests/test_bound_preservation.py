"""IC-7 check_bound_preservation tests."""

from __future__ import annotations

import numpy as np

from diagnostics.tier2.closed_form import check_bound_preservation


def test_within_both_bounds_passes() -> None:
    y = np.array([0.1, 0.5, 0.9])
    result = check_bound_preservation(y, lower_bound=0.0, upper_bound=1.0)
    assert result.passed
    assert result.value == 0.0


def test_below_lower_fails() -> None:
    y = np.array([-0.1, 0.5, 0.9])
    result = check_bound_preservation(y, lower_bound=0.0, upper_bound=1.0)
    assert not result.passed
    assert result.details["n_below"] == 1
    assert result.details["n_above"] == 0


def test_above_upper_fails() -> None:
    y = np.array([0.1, 0.5, 1.1])
    result = check_bound_preservation(y, lower_bound=0.0, upper_bound=1.0)
    assert not result.passed
    assert result.details["n_below"] == 0
    assert result.details["n_above"] == 1


def test_both_sides_violated() -> None:
    y = np.array([-2.0, 0.0, 0.5, 2.0])
    result = check_bound_preservation(y, lower_bound=0.0, upper_bound=1.0)
    assert not result.passed
    assert result.value == 2.0
    assert result.details["n_below"] == 1
    assert result.details["n_above"] == 1


def test_only_lower_bound() -> None:
    y = np.array([-0.1, 100.0])
    result = check_bound_preservation(y, lower_bound=0.0)
    assert not result.passed
    assert result.details["n_below"] == 1
    assert result.details["n_above"] == 0


def test_only_upper_bound() -> None:
    y = np.array([-1.0, 100.0])
    result = check_bound_preservation(y, upper_bound=10.0)
    assert not result.passed
    assert result.details["n_above"] == 1


def test_no_bounds_trivially_passes() -> None:
    y = np.array([-1e30, 0.0, 1e30])
    result = check_bound_preservation(y)
    assert result.passed
    assert result.value == 0.0


def test_boundary_inclusive() -> None:
    y = np.array([0.0, 1.0])
    result = check_bound_preservation(y, lower_bound=0.0, upper_bound=1.0)
    assert result.passed
