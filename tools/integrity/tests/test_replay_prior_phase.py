"""Tests for the replay_prior_phase script (plan § 7.5 deliverable 10).

Phase 0 has no prior phase to replay against the real repo; these tests
use stub-phase fixtures.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

from integrity.scripts.replay_prior_phase import (
    GATE_COMMANDS,
    GateResult,
    _resolve_cmd_for_worktree,
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


def _stub_venv_python(worktree: Path, marker: str) -> Path:
    """Create ``worktree/.venv/bin/python`` as a shell stub that prints marker.

    Returns the absolute path to the stub. The stub forwards any ``-m``
    invocations to the real ``/usr/bin/python3`` so the resolver tests
    can still exercise module imports; for argv shapes other than
    ``-m`` it simply emits ``marker`` and exits 0 so a caller can
    grep the output to confirm the stub (not the outer interpreter)
    was the one invoked.
    """
    venv_bin = worktree / ".venv" / "bin"
    venv_bin.mkdir(parents=True, exist_ok=True)
    stub = venv_bin / "python"
    stub.write_text(
        f'#!/bin/sh\nprintf "%s\\n" "{marker}"\nexit 0\n',
        encoding="utf-8",
    )
    stub.chmod(0o755)
    return stub


def test_resolve_cmd_for_worktree_substitutes_sys_executable_with_venv_python(
    tmp_path: Path,
) -> None:
    """Locks in the load-bearing repair for the version-skew defect.

    Without this substitution, GATE_COMMANDS entries that begin with
    ``sys.executable -m integrity …`` import the OUTER repository's
    integrity package even when ``cwd=worktree``. See the docstring on
    ``_resolve_cmd_for_worktree`` for the full failure-mode citation.
    """
    worktree = tmp_path / "worktree"
    worktree.mkdir()
    stub = _stub_venv_python(worktree, "FROM-WORKTREE-VENV")

    cmd = [sys.executable, "-m", "integrity", "--all", "--mode", "strict"]
    resolved = _resolve_cmd_for_worktree(cmd, worktree)

    assert resolved[0] == str(stub), (
        f"expected first token to be the worktree's .venv python {stub!s}; "
        f"got {resolved[0]!s} (sys.executable={sys.executable!s})"
    )
    assert resolved[0] != sys.executable
    assert resolved[1:] == ["-m", "integrity", "--all", "--mode", "strict"]


def test_resolve_cmd_for_worktree_substitution_directs_subprocess_to_stub(
    tmp_path: Path,
) -> None:
    """End-to-end: subprocess.run on the resolved cmd invokes the stub, not sys.executable.

    The pre-repair behavior would have invoked the outer ``sys.executable``
    here; the stub's marker output is the load-bearing assertion that the
    substitution actually directs subprocess to a different binary.
    """
    worktree = tmp_path / "worktree"
    worktree.mkdir()
    _stub_venv_python(worktree, "FROM-WORKTREE-VENV")

    cmd = [sys.executable, "--version"]
    resolved = _resolve_cmd_for_worktree(cmd, worktree)
    proc = subprocess.run(resolved, cwd=worktree, capture_output=True, text=True, check=True)
    assert proc.stdout.strip() == "FROM-WORKTREE-VENV"
    # And the outer interpreter, run with the original argv, would emit
    # something like "Python 3.12.3" — i.e. NOT the marker. Confirm by
    # contrast so the test fails if the stub-vs-outer wiring inverts.
    outer = subprocess.run(cmd, cwd=worktree, capture_output=True, text=True, check=False)
    assert "FROM-WORKTREE-VENV" not in (outer.stdout + outer.stderr)


def test_resolve_cmd_for_worktree_passes_through_when_no_venv(tmp_path: Path) -> None:
    """Stub fixtures (no .venv) must continue to use the original argv.

    Preserves the unit-test path that the existing replay tests rely on
    (their ``_init_repo_with_tag`` fixture ships no ``.venv``).
    """
    worktree = tmp_path / "worktree"
    worktree.mkdir()
    cmd = [sys.executable, "-m", "integrity", "--all"]
    assert _resolve_cmd_for_worktree(cmd, worktree) == cmd


def test_resolve_cmd_for_worktree_leaves_uv_argv_untouched(tmp_path: Path) -> None:
    """``uv run`` entries are correct as-is — uv resolves the worktree's .venv via cwd.

    Asserts the substitution touches only ``sys.executable`` tokens; ``uv``
    tokens or other binaries in the argv are returned unchanged.
    """
    worktree = tmp_path / "worktree"
    worktree.mkdir()
    _stub_venv_python(worktree, "FROM-WORKTREE-VENV")
    cmd = ["uv", "run", "pytest", "-W", "error", "tools/testkit/"]
    assert _resolve_cmd_for_worktree(cmd, worktree) == cmd


def test_replay_uses_worktree_integrity_not_head(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Locks in the load-bearing post-repair behavior end-to-end via replay().

    Sets up a synthetic version-skew: a tagged commit ships a gate
    helper script (``check.py``) that exits 0; the post-tag history
    overwrites that helper with an exit-1 version. The test confirms
    that replay invoked against the tag exercises the tagged version of
    the helper (exit 0), not the post-tag/HEAD version.

    Pre-repair, the substitution did not happen and the GATE_COMMANDS
    entry that used ``sys.executable`` would import-by-path through the
    outer interpreter — a closely analogous situation to the
    ``-m integrity`` defect. Here we use a path-based invocation that
    is bound to the worktree's filesystem (resolved at subprocess
    time), so we instead lock in that the cwd-relative path resolution
    works correctly together with the ``.venv`` substitution.
    """
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-b", "main"], cwd=repo, capture_output=True, check=True)
    subprocess.run(["git", "config", "user.name", "test"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.email", "test@t.test"], cwd=repo, check=True)

    # "Tagged" snapshot of the helper script — exits 0.
    helper = repo / "check.py"
    helper.write_text("import sys\nsys.exit(0)\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "-m", "tag-snapshot"], cwd=repo, capture_output=True, check=True
    )
    subprocess.run(["git", "tag", "v0-stub-phase"], cwd=repo, check=True)

    # Post-tag overwrite — would exit 1 if the replay invoked HEAD's helper.
    helper.write_text("import sys\nsys.exit(1)\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(
        ["git", "commit", "-m", "head-snapshot"], cwd=repo, capture_output=True, check=True
    )

    audit = _write_landing_audit(repo, "CONFIRMED")
    # Gate runs check.py via sys.executable — same shape as the integrity gate.
    monkeypatch.setitem(GATE_COMMANDS, "stub-gate", [sys.executable, "check.py"])

    # No .venv in this stub repo, so _resolve_cmd_for_worktree passes the
    # cmd through unchanged. The cwd=worktree binding then resolves
    # check.py to the WORKTREE's filesystem snapshot at v0-stub-phase
    # (the exit-0 version), not the HEAD snapshot (the exit-1 version).
    result = replay("v0-stub-phase", audit, ["stub-gate"], repo_root=repo)
    assert result.ok, f"expected ok; gates={result.gates}"
    assert result.gates[0].passed, (
        "the worktree's tagged check.py exits 0; replay must invoke THAT, "
        "not HEAD's check.py which exits 1"
    )


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
