"""Tests for the replay_prior_phase script (plan § 7.5 deliverable 10).

Phase 0 has no prior phase to replay against the real repo; these tests
use stub-phase fixtures.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from integrity.scripts.replay_prior_phase import (
    GATE_COMMANDS,
    GateResult,
    replay,
)


def _init_repo_with_tag(repo: Path, gate_passes: bool) -> str:
    subprocess.run(["git", "init", "-b", "main"], cwd=repo, capture_output=True, check=True)
    subprocess.run(["git", "config", "user.name", "test"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.email", "test@t.test"], cwd=repo, check=True)
    script = repo / "always.sh"
    script.write_text(
        "#!/bin/sh\nexit 0\n" if gate_passes else "#!/bin/sh\nexit 1\n",
        encoding="utf-8",
    )
    script.chmod(0o755)
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-m", "fixture"], cwd=repo, capture_output=True, check=True)
    subprocess.run(["git", "tag", "v0-stub-phase"], cwd=repo, check=True)
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=repo, capture_output=True, text=True, check=True
    )
    return head.stdout.strip()


def _write_landing_audit(repo: Path, verdict: str) -> Path:
    audit_path = repo / "landing.md"
    audit_path.write_text(
        f"---\n"
        f"date: 2026-05-19T00-00-00Z\n"
        f"author: stub\n"
        f"phase: 0\n"
        f"artifact: phase-landing\n"
        f"artifact_id: stub\n"
        f"verdict: {verdict}\n"
        f"evidence_paths: [always.sh]\n"
        f"head_sha: PLACEHOLDER\n"
        f"deferred_items: []\n"
        f"ci_activation: []\n"
        f"top_level_deps_to_merge: []\n"
        f"---\n\n# stub landing\n",
        encoding="utf-8",
    )
    return audit_path


def test_replay_passes_when_gates_pass_and_audit_confirmed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo_with_tag(repo, gate_passes=True)
    audit = _write_landing_audit(repo, "CONFIRMED")
    monkeypatch.setitem(
        GATE_COMMANDS,
        "stub-gate",
        ["sh", "always.sh"],
    )
    result = replay("v0-stub-phase", audit, ["stub-gate"], repo_root=repo)
    assert result.ok, f"expected ok; gates={result.gates}"
    assert len(result.gates) == 1
    assert isinstance(result.gates[0], GateResult)
    assert result.gates[0].passed
    assert result.gates[0].discrepancy is None


def test_replay_fails_when_audit_claims_pass_but_gate_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    _init_repo_with_tag(repo, gate_passes=False)
    audit = _write_landing_audit(repo, "CONFIRMED")
    monkeypatch.setitem(
        GATE_COMMANDS,
        "stub-gate",
        ["sh", "always.sh"],
    )
    result = replay("v0-stub-phase", audit, ["stub-gate"], repo_root=repo)
    assert not result.ok
    g = result.gates[0]
    assert not g.passed
    assert g.discrepancy is not None
    assert "audit claimed" in g.discrepancy
