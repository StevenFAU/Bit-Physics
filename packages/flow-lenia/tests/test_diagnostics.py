"""Gates 5 + 6 — Tier-1 health + Tier-2 bounds for the Flow Lenia rollout capture."""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health

from flow_lenia.forward import FlowLeniaConfig
from flow_lenia.sim import FlowLeniaSim

_CANON = FlowLeniaConfig(grid=32, seed=42, steps=40)


def test_capture_is_healthy(tmp_path: Path) -> None:
    """No NaN/Inf in the mass field over the rollout (Tier-1 health)."""
    manifest = FlowLeniaSim(_CANON).capture(tmp_path)
    report = check_health(load_capture(manifest))
    assert report.ok, (
        f"capture has NaN/Inf: nan={report.nan_count}, inf={report.inf_count}, "
        f"first_step={report.first_offending_step}, first_field={report.first_offending_field}"
    )


def test_mass_non_negative_bounded(tmp_path: Path) -> None:
    """The mass field stays non-negative and bounded over the rollout (Tier-2 bounds)."""
    from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds

    manifest = FlowLeniaSim(_CANON).capture(tmp_path)
    report = check_bounds(load_capture(manifest), field="A", lo=-1e-9, hi=1e6)
    assert report.ok, f"mass bounds violations: {report.violations[:3]}"
