"""IC-7 check_output_stability tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.closed_form import check_output_stability


def test_smooth_sweep_passes_bounded_variation() -> None:
    p = np.linspace(0.0, 1.0, 101)
    y = np.sin(np.pi * p)
    result = check_output_stability(p, y, "bounded_variation", threshold=2.5)
    assert result.passed
    assert result.value is not None and 0.0 < result.value < 2.5


def test_smooth_sweep_passes_max_jump() -> None:
    p = np.linspace(0.0, 1.0, 101)
    y = np.sin(np.pi * p)
    result = check_output_stability(p, y, "max_jump", threshold=0.1)
    assert result.passed


def test_step_discontinuity_fails_max_jump() -> None:
    p = np.linspace(0.0, 1.0, 11)
    y = np.where(p < 0.5, 0.0, 1.0)
    result = check_output_stability(p, y, "max_jump", threshold=0.1)
    assert not result.passed
    assert result.value == pytest.approx(1.0)


def test_step_discontinuity_fails_bounded_variation() -> None:
    p = np.linspace(0.0, 1.0, 11)
    y = np.where(p < 0.5, 0.0, 1.0)
    result = check_output_stability(p, y, "bounded_variation", threshold=0.5)
    assert not result.passed


def test_unsorted_input_is_sorted_internally() -> None:
    p = np.array([0.5, 0.0, 1.0])
    y = np.array([2.0, 0.0, 4.0])
    sorted_result = check_output_stability(
        np.array([0.0, 0.5, 1.0]),
        np.array([0.0, 2.0, 4.0]),
        "bounded_variation",
        threshold=10.0,
    )
    result = check_output_stability(p, y, "bounded_variation", threshold=10.0)
    assert result.value == pytest.approx(sorted_result.value)


def test_singleton_sweep_passes() -> None:
    p = np.array([0.5])
    y = np.array([1.0])
    result = check_output_stability(p, y, "max_jump", threshold=0.0)
    assert result.passed
    assert result.value == 0.0


def test_shape_mismatch_raises() -> None:
    with pytest.raises(ValueError, match="shape"):
        check_output_stability(np.zeros(3), np.zeros(4))


def test_invalid_metric_raises() -> None:
    with pytest.raises(ValueError, match="stability_metric"):
        check_output_stability(np.zeros(3), np.zeros(3), "bogus")  # type: ignore[arg-type]


def test_negative_threshold_raises() -> None:
    with pytest.raises(ValueError, match="threshold"):
        check_output_stability(np.zeros(3), np.zeros(3), threshold=-1.0)
