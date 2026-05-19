"""Class (d) — Diagnostics (plan § 7.8 item 4d).

Tier 1 health (NaN/Inf) + Tier 2 scalar_field monotone_bounds (U, V in
[0, 1]) applied to the canonical capture at seed 42.
"""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health
from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds


def test_canonical_capture_is_healthy(canonical_manifest_path: Path) -> None:
    capture = load_capture(canonical_manifest_path)
    report = check_health(capture)
    assert report.ok, (
        f"canonical capture has NaN/Inf: nan={report.nan_count}, "
        f"inf={report.inf_count}, first_step={report.first_offending_step}, "
        f"first_field={report.first_offending_field}"
    )


def test_canonical_capture_U_in_unit_interval(canonical_manifest_path: Path) -> None:
    capture = load_capture(canonical_manifest_path)
    report = check_bounds(capture, field="U", lo=0.0, hi=1.0)
    assert report.ok, f"U bounds violations: {report.violations[:3]}"


def test_canonical_capture_V_in_unit_interval(canonical_manifest_path: Path) -> None:
    capture = load_capture(canonical_manifest_path)
    report = check_bounds(capture, field="V", lo=0.0, hi=1.0)
    assert report.ok, f"V bounds violations: {report.violations[:3]}"
