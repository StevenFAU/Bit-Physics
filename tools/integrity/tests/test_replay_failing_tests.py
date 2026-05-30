"""Tests for the timing-line normalization in replay_failing_tests."""

from __future__ import annotations

import hashlib

from integrity.scripts.replay_failing_tests import normalize_pytest_output


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
