"""Smoke tests for the runner + CLI surface."""

from __future__ import annotations

from pathlib import Path

import pytest

from integrity.common.repo import find_repo_root
from integrity.common.types import FailureMode, Finding
from integrity.runner import emit, resolve_checks, run


def test_resolve_checks_aliases() -> None:
    assert resolve_checks("1") == ["cat1.intra-repo"]
    assert resolve_checks("tolerance-budget") == ["catx.tolerance-budget"]
    assert resolve_checks("4") == [
        "cat4.path-line-assertions",
        "cat4.phrase-in-file",
        "cat4.api-shape",
    ]
    assert resolve_checks(None) == [
        "cat1.intra-repo",
        "cat2.python-exports",
        "cat3.golden-values",
        "cat4.path-line-assertions",
        "cat4.phrase-in-file",
        "cat4.api-shape",
        "cat5.audit-links",
        "catx.tolerance-budget",
    ]


def test_resolve_checks_unknown_raises() -> None:
    with pytest.raises(ValueError):
        resolve_checks("bogus-cat")


def test_emit_strict_returns_one_on_hard_fail(capsys: pytest.CaptureFixture[str]) -> None:
    from integrity.runner import RunResult

    f = Finding(
        check="cat1.intra-repo",
        severity=FailureMode.HARD_FAIL,
        path=Path("foo.md"),
        line=1,
        message="x",
    )
    rc = emit(RunResult(findings=[f]), mode="strict")
    assert rc == 1


def test_emit_strict_returns_zero_on_only_soft_warn() -> None:
    from integrity.runner import RunResult

    f = Finding(
        check="cat5.audit-links",
        severity=FailureMode.SOFT_WARN,
        path=Path("audit.md"),
        line=None,
        message="x",
    )
    rc = emit(RunResult(findings=[f]), mode="strict")
    assert rc == 0


def test_emit_advisory_always_returns_zero() -> None:
    from integrity.runner import RunResult

    f = Finding(
        check="cat1.intra-repo",
        severity=FailureMode.HARD_FAIL,
        path=Path("foo.md"),
        line=1,
        message="x",
    )
    assert emit(RunResult(findings=[f]), mode="advisory") == 0


def test_run_against_live_repo_has_no_hard_fail() -> None:
    """The live repo MUST be HARD_FAIL-clean across all integrity checks."""
    root = find_repo_root()
    result = run(category=None, files=None, repo_root=root)
    hard_fails = [f for f in result.findings if f.severity == FailureMode.HARD_FAIL]
    assert hard_fails == [], (
        f"live repo has {len(hard_fails)} HARD_FAIL findings: "
        f"{[(f.check, str(f.path), f.message) for f in hard_fails]}"
    )
