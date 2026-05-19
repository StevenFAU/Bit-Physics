"""Performance aggregation tests."""

from __future__ import annotations

from capture import Capture

from diagnostics.tier1.performance import check_performance


def test_basic_aggregation(perf_capture: Capture) -> None:
    report = check_performance(perf_capture)
    assert report.wall_clock_seconds == 2.5
    assert report.step_count == 10
    assert report.seconds_per_step == 0.25
    assert report.capture_interval == 1


def test_optional_metadata_extracted(perf_capture: Capture) -> None:
    report = check_performance(perf_capture)
    assert report.gpu_dispatch_count == 1234
    assert report.memory_high_water_bytes == 4 * 1024 * 1024


def test_missing_metadata_returns_none(healthy_capture: Capture) -> None:
    report = check_performance(healthy_capture)
    assert report.gpu_dispatch_count is None
    assert report.memory_high_water_bytes is None
