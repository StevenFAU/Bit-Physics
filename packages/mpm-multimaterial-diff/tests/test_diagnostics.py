"""Gates 5 + 6 - Tier-1 health + Tier-2 bounds for the inverse-solution capture."""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health

from mpm_multimaterial_diff.capture import default_capture


def test_capture_is_healthy(tmp_path: Path) -> None:
    """No NaN/Inf in the recovered positions or the gradient (Tier-1 health)."""
    manifest = default_capture(tmp_path)
    report = check_health(load_capture(manifest))
    assert report.ok, (
        f"capture has NaN/Inf: nan={report.nan_count}, inf={report.inf_count}, "
        f"first_step={report.first_offending_step}, first_field={report.first_offending_field}"
    )


def test_recovered_positions_bounded(tmp_path: Path) -> None:
    """The recovered particle positions stay in the physical [0,1] domain (Tier-2 bounds)."""
    from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds

    manifest = default_capture(tmp_path)
    report = check_bounds(load_capture(manifest), field="particle_pos", lo=0.0, hi=1.0)
    assert report.ok, f"particle_pos bounds violations: {report.violations[:3]}"
