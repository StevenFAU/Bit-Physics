"""IC-5 check_count_invariance tests."""

from __future__ import annotations

from diagnostics.tier2.particle import check_count_invariance


def test_equal_counts_pass() -> None:
    result = check_count_invariance(1024, 1024)
    assert result.passed
    assert result.value == 0.0
    assert result.details["delta"] == 0


def test_drop_one_fails() -> None:
    result = check_count_invariance(1024, 1023)
    assert not result.passed
    assert result.value == -1.0
    assert result.details["delta"] == -1


def test_gain_one_fails() -> None:
    result = check_count_invariance(1024, 1025)
    assert not result.passed
    assert result.value == 1.0
    assert result.details["delta"] == 1


def test_zero_counts_pass() -> None:
    result = check_count_invariance(0, 0)
    assert result.passed
