"""Gates 5 + 6 — Tier-1 health + Tier-2 bounds for the inverse-solution capture."""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health

from eulerian_smoke_diff.capture import default_capture


def test_capture_is_healthy(tmp_path: Path) -> None:
    """No NaN/Inf in the recovered field or the gradient (Tier-1 health)."""
    manifest = default_capture(tmp_path)
    report = check_health(load_capture(manifest))
    assert report.ok, (
        f"capture has NaN/Inf: nan={report.nan_count}, inf={report.inf_count}, "
        f"first_step={report.first_offending_step}, first_field={report.first_offending_field}"
    )


def test_recovered_field_bounded(tmp_path: Path) -> None:
    """The recovered smoke density stays within the planted Gaussian range (Tier-2 bounds)."""
    from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds

    manifest = default_capture(tmp_path)
    report = check_bounds(load_capture(manifest), field="smoke_density", lo=-0.05, hi=1.05)
    assert report.ok, f"smoke_density bounds violations: {report.violations[:3]}"
