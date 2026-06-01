"""Tests for the timing-line normalization in replay_failing_tests."""

from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

import pytest

import integrity.scripts.replay_failing_tests as rft
from integrity.scripts.replay_failing_tests import (
    _sync_worktree,
    generate_evidence,
    normalize_pytest_output,
    replay,
)


def test_strips_pytest_timing_field() -> None:
    line = b"=" * 29 + b" 10 failed, 4 passed in 0.52s " + b"=" * 29 + b"\n"
    raw = b"some test output\n" + line
    norm = normalize_pytest_output(raw)
    assert b"in NN.NNs" in norm
    assert b"0.52s" not in norm


def test_normalization_is_idempotent() -> None:
    raw = b"x\n============================= 3 failed in 12.34s =============================\n"
    norm1 = normalize_pytest_output(raw)
    norm2 = normalize_pytest_output(norm1)
    assert norm1 == norm2


def test_two_runs_at_different_timings_hash_identically() -> None:
    a = (
        b"== test session starts ==\n"
        b"tests/test_x.py::test_a FAILED\n"
        b"========================= 1 failed in 0.52s =========================\n"
    )
    b = a.replace(b"0.52s", b"0.53s")
    assert a != b
    assert normalize_pytest_output(a) == normalize_pytest_output(b)
    assert (
        hashlib.sha256(normalize_pytest_output(a)).hexdigest()
        == hashlib.sha256(normalize_pytest_output(b)).hexdigest()
    )


def test_passes_through_lines_without_timing_summary() -> None:
    raw = b"line 1\nline 2 with in 99.99s but not a summary\nline 3\n"
    assert normalize_pytest_output(raw) == raw


def test_strips_interpreter_path_from_platform_line() -> None:
    head = b"platform linux -- Python 3.12.3, pytest-9.0.3, pluggy-1.6.0 -- "
    a = head + b"/a/.venv/bin/python3\n"
    b = head + b"/b/.venv/bin/python\n"
    assert normalize_pytest_output(a) == normalize_pytest_output(b)
    assert b"<INTERPRETER>" in normalize_pytest_output(a)


def test_canonicalizes_repo_paths() -> None:
    real_root = b"/home/user/Projects/Bit-Physics"
    worktree = b"/tmp/.replay-abc123def456"
    real = (
        b"rootdir: " + real_root + b"/packages/rd-2d\n"
        b"E   AssertionError: missing " + real_root + b"/captures/foo.json\n"
    )
    fresh = (
        b"rootdir: " + worktree + b"/packages/rd-2d\n"
        b"E   AssertionError: missing " + worktree + b"/captures/foo.json\n"
    )
    paths = (real_root, worktree)
    assert normalize_pytest_output(real, paths) == normalize_pytest_output(fresh, paths)
    assert b"<REPO>" in normalize_pytest_output(real, paths)


def test_pytest_version_trio_is_normalized_away() -> None:
    """R3: a pytest/pluggy/Python upgrade must not change the hash."""
    a = b"platform linux -- Python 3.12.3, pytest-9.0.3, pluggy-1.6.0 -- /v/bin/python\n"
    b = b"platform linux -- Python 3.13.1, pytest-9.2.0, pluggy-1.7.1 -- /w/bin/python3\n"
    assert a != b
    assert normalize_pytest_output(a) == normalize_pytest_output(b)
    assert b"<VER>" in normalize_pytest_output(a)
    assert b"<PYVER>" in normalize_pytest_output(a)


def test_rootdir_collapses_without_a_matching_paths_arg() -> None:
    """R3: rootdir/cachedir from a DIFFERENT original checkout still matches.

    No `paths_to_canonicalize` is supplied — the generic rootdir/cachedir
    regex must collapse both lines so evidence recorded elsewhere replays.
    """
    a = b"rootdir: /home/alice/Bit-Physics\ncachedir: /home/alice/Bit-Physics/.pytest_cache\n"
    b = b"rootdir: /tmp/.replay-deadbeef00\ncachedir: /tmp/.replay-deadbeef00/.pytest_cache\n"
    assert a != b
    assert normalize_pytest_output(a) == normalize_pytest_output(b)
    assert b"rootdir: <REPO>" in normalize_pytest_output(a)


def test_plugins_line_is_normalized_away() -> None:
    """C2: a differing installed-plugin set must not change the hash.

    Evidence captured in a narrow root .venv (cov/hypothesis/anyio) must match a
    replay in a worktree synced --all-packages --all-extras (the superset, with
    hydra-core/pytest-timeout/jaxtyping) — the plugin-set-leak root cause.
    """
    a = b"plugins: cov-7.1.0, hypothesis-6.152.8, anyio-4.13.0\n"
    b = (
        b"plugins: cov-7.1.0, hydra-core-1.3.2, timeout-2.4.0, "
        b"hypothesis-6.152.8, jaxtyping-0.3.10, anyio-4.13.0\n"
    )
    assert a != b
    assert normalize_pytest_output(a) == normalize_pytest_output(b)
    assert b"plugins: <PLUGINS>" in normalize_pytest_output(a)


# --- C2: worktree-sync + evidence-from-worktree refinement -------------------


def test_sync_worktree_runs_uv_sync_when_uv_managed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A uv-managed worktree (pyproject.toml + uv.lock) is `uv sync`-ed.

    Mirrors replay_prior_phase's sync so the replay runs against a built env
    with the SAME `--all-packages --all-extras` plugin set the committed
    evidence was captured under (batch-2-close §6 #3/#4 — the load-bearing
    gate-13 byte-stability fix).
    """
    target = tmp_path / "wt"
    target.mkdir()
    (target / "pyproject.toml").write_text("[project]\nname='x'\n", encoding="utf-8")
    (target / "uv.lock").write_text("version = 1\n", encoding="utf-8")

    calls: list[tuple[list[str], Path | None]] = []

    def fake_run(cmd, **kwargs):  # type: ignore[no-untyped-def]
        calls.append((cmd, kwargs.get("cwd")))
        return subprocess.CompletedProcess(cmd, 0, b"", b"")

    monkeypatch.setattr("integrity.scripts.replay_failing_tests.subprocess.run", fake_run)
    _sync_worktree(target)

    assert len(calls) == 1
    cmd, cwd = calls[0]
    assert cmd == ["uv", "sync", "--frozen", "--all-packages", "--all-extras"]
    assert cwd == target


def test_sync_worktree_skips_when_not_uv_managed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Stub fixtures (no pyproject/uv.lock) must NOT trigger a sync.

    Preserves the bare-git-repo unit-test path the other replay tests rely on.
    """
    target = tmp_path / "bare"
    target.mkdir()  # no pyproject.toml / uv.lock

    calls: list[list[str]] = []

    def fake_run(cmd, **kwargs):  # type: ignore[no-untyped-def]
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, b"", b"")

    monkeypatch.setattr("integrity.scripts.replay_failing_tests.subprocess.run", fake_run)
    _sync_worktree(target)
    assert calls == []


_PYTEST_RED = (
    b"============================= test session starts ==============================\n"
    b"platform linux -- Python 3.12.3, pytest-9.0.3, pluggy-1.6.0 -- /v/bin/python\n"
    b"plugins: cov-7.1.0, hypothesis-6.152.8, anyio-4.13.0\n"
    b"tests/test_x.py::test_a FAILED\n"
    b"========================= 1 failed in 0.52s =========================\n"
)


def test_generate_evidence_writes_worktree_stdout(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """generate_evidence captures the worktree's raw pytest stdout to disk."""
    monkeypatch.setattr(
        rft, "_run_target_in_worktree", lambda root, commit, target: (_PYTEST_RED, tmp_path / "wt")
    )
    out = generate_evidence("deadbeef", "packages/x", Path("ev.txt"), repo_root=tmp_path)
    assert out == (tmp_path / "ev.txt").resolve()
    assert out.read_bytes() == _PYTEST_RED  # RAW, un-normalized


def test_generate_then_replay_round_trips(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Evidence generated FROM the worktree matches when replayed against it.

    The B-2 contract: because generation and replay use the IDENTICAL
    worktree-run code path, the recorded evidence and the replay are
    byte-stable by construction (no root-.venv-vs-worktree plugin-set drift).
    """
    monkeypatch.setattr(
        rft, "_run_target_in_worktree", lambda root, commit, target: (_PYTEST_RED, tmp_path / "wt")
    )
    generate_evidence("deadbeef", "packages/x", Path("ev.txt"), repo_root=tmp_path)
    result = replay("deadbeef", Path("ev.txt"), "packages/x", repo_root=tmp_path)
    assert result.ok, f"expected round-trip match; failures={result.failures}"
    assert result.expected_normalized_sha256 == result.actual_normalized_sha256
