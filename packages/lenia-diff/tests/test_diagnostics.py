"""Gates 5 + 6 — Tier-1 health + Tier-2 bounds for the inverse-solution capture."""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health

from lenia_diff.capture import default_capture


def test_capture_is_healthy(tmp_path: Path) -> None:
    """No NaN/Inf in the recovered field or the gradients (Tier-1 health)."""
    manifest = default_capture(tmp_path)
    report = check_health(load_capture(manifest))
    assert report.ok, (
        f"capture has NaN/Inf: nan={report.nan_count}, inf={report.inf_count}, "
        f"first_step={report.first_offending_step}, first_field={report.first_offending_field}"
    )


def test_recovered_field_bounded(tmp_path: Path) -> None:
    """The recovered field stays in the physical [0,1] range (Tier-2 scalar bounds)."""
    from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds

    manifest = default_capture(tmp_path)
    report = check_bounds(load_capture(manifest), field="A", lo=-0.5, hi=1.5)
    assert report.ok, f"A bounds violations: {report.violations[:3]}"
