"""Stage 1b — diagnostics (gate-5 Tier-1 health on the canonical capture).

Tier-1 health (NaN/Inf) on the seeded canonical capture. The Tier-2 generic
diagnostics are inherited from the testkit; the Tier-3 sim-specific diagnostics
live as a standalone module at ``tools/diagnostics/tier3/rigid_body_pedagogical/``
(mirrors the lenia/ising ``tier3`` precedent — standalone deliverable, validated
ad-hoc in the Stage-1b audit, not part of the installed ``diagnostics`` package
and so not pytest-wired here).
"""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health

import articulated_pedagogical as ap


def test_canonical_capture_is_healthy(tmp_path: Path) -> None:
    """gate-5 Tier-1: the seeded pendulum capture has no NaN/Inf."""
    manifest_path = ap.sim_runner_seeded(42, tmp_path)
    capture = load_capture(manifest_path)
    report = check_health(capture)
    assert report.ok, (
        f"canonical pendulum capture has NaN/Inf: nan={report.nan_count}, inf={report.inf_count}"
    )
