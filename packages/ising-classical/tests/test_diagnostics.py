"""Class (d) — Diagnostics (Tier 1 health + Tier 2 scalar_field bounds).

Tier 1 health (NaN/Inf) + Tier 2 scalar_field bounds (spins ∈ [-1, 1])
applied to the canonical Ising capture at seed 42. The Tier-3
sim-specific diagnostics live as a standalone module at
``tools/diagnostics/tier3/ising_classical/`` (mirrors the lenia
``tier3/lenia`` precedent — standalone deliverable, verified in the
Stage-1b audit, not pytest-wired here).

Stage 1a: the canonical capture does not exist yet, so
``load_capture`` raises ``FileNotFoundError`` (allowed RED mode — "no
captures yet"). Stage 1b produces the capture and inverts to GREEN.
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
        f"canonical Ising capture has NaN/Inf: nan={report.nan_count}, "
        f"inf={report.inf_count}, first_step={report.first_offending_step}, "
        f"first_field={report.first_offending_field}"
    )


def test_canonical_capture_spins_in_pm_one(canonical_manifest_path: Path) -> None:
    capture = load_capture(canonical_manifest_path)
    report = check_bounds(capture, field="spins", lo=-1.0, hi=1.0)
    assert report.ok, f"spins bounds violations: {report.violations[:3]}"
