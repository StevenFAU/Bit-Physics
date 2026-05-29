"""Diagnostics (gate-5 Tier-1 health on the canonical inference capture).

Tier-1 health (NaN/Inf) on the trained-PINN inference capture, produced via the
torch→wp→Capture bridge from the session-cached canonical model (no extra
training). The Tier-2 generic diagnostics are inherited from the testkit; the
Tier-3 sim-specific diagnostics live as a standalone module at
``tools/diagnostics/tier3/pinn_poisson/`` (mirrors the lenia/ising/rigid-body
``tier3`` precedent — standalone deliverable, validated ad-hoc in the Stage-1c
audit, NOT pytest-wired here because its package name shadows the installed
``pinn_poisson`` sim package).
"""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health

from pinn_poisson import CANONICAL_PROBLEM, PINNConfig
from pinn_poisson.infer import write_inference_capture


def test_canonical_capture_is_healthy(train_cached, tmp_path: Path) -> None:
    """gate-5 Tier-1: the trained-PINN inference capture has no NaN/Inf."""
    model = train_cached(CANONICAL_PROBLEM, PINNConfig()).model
    manifest_path = write_inference_capture(model, CANONICAL_PROBLEM, 64, tmp_path)
    capture = load_capture(manifest_path)
    report = check_health(capture)
    assert report.ok, (
        f"canonical PINN capture has NaN/Inf: nan={report.nan_count}, inf={report.inf_count}"
    )
