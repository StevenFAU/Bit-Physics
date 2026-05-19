"""NaN / Inf health-check tests."""

from __future__ import annotations

from capture import Capture

from diagnostics.tier1.health import check_health


def test_healthy_capture_passes(healthy_capture: Capture) -> None:
    report = check_health(healthy_capture)
    assert report.ok is True
    assert report.nan_count == 0
    assert report.inf_count == 0
    assert report.first_offending_step is None
    assert report.first_offending_field is None


def test_nan_inf_capture_fails(nan_capture: Capture) -> None:
    report = check_health(nan_capture)
    assert report.ok is False
    # Step 1 has one NaN; step 2 carries that NaN forward and adds one Inf,
    # so the aggregate is 2 NaN + 1 Inf.
    assert report.nan_count == 2
    assert report.inf_count == 1
    # First offending step is step 1 (where the NaN appears).
    assert report.first_offending_step == 1
    assert report.first_offending_field == "U"
