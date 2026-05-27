"""I2 -- bit-identity replay invariant (lock against Stage 1b regression).

Charter docs/phases/sub-phase-lfs-architecture.md section 7 (I2): the
phase-1 -> v0.1.0-phase-1 canonical replay
(9399fc33...718909f34) must hold across the sub-phase. GREEN at Stage 1a;
this test re-runs the canonical replay and asserts ``ok=True`` so a Stage 1b
regression in the audit/replay chain is caught immediately.
"""

from __future__ import annotations

from lfs_migration._helpers import repo_root, run_module

_PHASE1_LANDING = "docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md"
_GATES = "integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget"


def test_phase1_replay_ok() -> None:
    """The phase-1 canonical replay reports ok=True (8/8 gates PASS)."""
    result = run_module(
        [
            "integrity.scripts.replay_prior_phase",
            "--prior-phase",
            "phase-1",
            "--audit",
            str(repo_root() / _PHASE1_LANDING),
            "--gates",
            _GATES,
        ],
        cwd=repo_root() / "tools" / "integrity",
    )
    detail = f"replay exit {result.returncode}\n{result.stdout}\n{result.stderr}"
    assert result.returncode == 0, detail
    summary = result.stdout.strip().splitlines()[-1]
    assert "ok=True" in summary, f"replay summary not ok: {summary!r}"
