"""monotone-bounds tests."""

from __future__ import annotations

import pytest
from capture import Capture

from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds


def test_in_bounds_passes(bounded_capture: Capture) -> None:
    report = check_bounds(bounded_capture, "U", lo=0.0, hi=1.0)
    assert report.ok is True
    assert report.violations == []


def test_violations_flagged(violating_capture: Capture) -> None:
    report = check_bounds(violating_capture, "U", lo=0.0, hi=1.0)
    assert report.ok is False
    assert len(report.violations) == 2
    kinds = {v["kind"] for v in report.violations}
    assert kinds == {"below", "above"}


def test_invalid_bound_order_raises(bounded_capture: Capture) -> None:
    with pytest.raises(ValueError):
        check_bounds(bounded_capture, "U", lo=1.0, hi=0.0)
