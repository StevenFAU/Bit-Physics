"""Gates 5 + 6 — Tier-1 health + Tier-2 bounds for the Particle Lenia rollout capture."""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health

from particle_lenia.forward import ParticleLeniaConfig
from particle_lenia.sim import ParticleLeniaSim

_CANON = ParticleLeniaConfig(n_particles=64, seed=42, steps=40)


def test_capture_is_healthy(tmp_path: Path) -> None:
    """No NaN/Inf in the particle positions over the rollout (Tier-1 health)."""
    manifest = ParticleLeniaSim(_CANON).capture(tmp_path)
    report = check_health(load_capture(manifest))
    assert report.ok, (
        f"capture has NaN/Inf: nan={report.nan_count}, inf={report.inf_count}, "
        f"first_step={report.first_offending_step}, first_field={report.first_offending_field}"
    )


def test_positions_bounded(tmp_path: Path) -> None:
    """Positions stay bounded over the rollout (no blow-up; Tier-2 bounds)."""
    from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds

    manifest = ParticleLeniaSim(_CANON).capture(tmp_path)
    report = check_bounds(load_capture(manifest), field="P", lo=-500.0, hi=500.0)
    assert report.ok, f"position bounds violations: {report.violations[:3]}"
