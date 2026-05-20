"""IC-7 check_precision_sensitivity tests."""

from __future__ import annotations

import numpy as np
import pytest

from diagnostics.tier2.closed_form import check_precision_sensitivity


def test_identical_inputs_pass() -> None:
    a = np.array([1.0, 2.0, 3.0], dtype=np.float64)
    result = check_precision_sensitivity(a.astype(np.float32), a, tolerance_rel=0.0)
    assert result.passed
    assert result.value == pytest.approx(0.0, abs=1e-12)


def test_f32_truncation_within_tolerance_passes() -> None:
    rng = np.random.default_rng(42)
    a64 = rng.standard_normal(1024)
    a32 = a64.astype(np.float32)
    result = check_precision_sensitivity(a32, a64, tolerance_rel=1e-5)
    assert result.passed


def test_large_disagreement_fails() -> None:
    a64 = np.array([1.0, 1.0, 1.0])
    a32 = np.array([1.0, 1.0, 2.0], dtype=np.float32)
    result = check_precision_sensitivity(a32, a64, tolerance_rel=1e-3)
    assert not result.passed
    assert result.value is not None and result.value > 0.5


def test_zero_reference_uses_abs_diff() -> None:
    a64 = np.array([0.0, 0.0])
    a32 = np.array([1e-7, 0.0], dtype=np.float32)
    pass_result = check_precision_sensitivity(a32, a64, tolerance_rel=1e-6)
    assert pass_result.passed
    fail_result = check_precision_sensitivity(a32, a64, tolerance_rel=1e-9)
    assert not fail_result.passed


def test_shape_mismatch_raises() -> None:
    with pytest.raises(ValueError, match="shape"):
        check_precision_sensitivity(np.zeros(3, dtype=np.float32), np.zeros(4))


def test_negative_tolerance_raises() -> None:
    with pytest.raises(ValueError, match="tolerance_rel"):
        check_precision_sensitivity(np.zeros(3, dtype=np.float32), np.zeros(3), tolerance_rel=-1.0)
