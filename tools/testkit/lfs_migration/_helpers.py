"""Shared helpers for the ``lfs_migration`` invariant test surface.

Not a test module (leading underscore; pytest collects ``test_*.py`` only).
See ``tools/testkit/lfs_migration/README.md`` for the RED-to-GREEN contract
and the mapping of each test file to the charter invariants I1-I7.

The surface is deliberately self-contained: it shells out to the *same*
commands the charter (docs/phases/sub-phase-lfs-architecture.md section 7)
names for each invariant rather than importing the integrity package, so it
exercises the real invariant entry points and stays importable from the
testkit venv alone.
"""

from __future__ import annotations

import re
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import pytest

# --------------------------------------------------------------------------
# Repo geometry
# --------------------------------------------------------------------------


@lru_cache(maxsize=1)
def repo_root() -> Path:
    """Walk up from this file to the directory that contains ``.git``."""
    here = Path(__file__).resolve()
    for parent in (here, *here.parents):
        if (parent / ".git").exists():
            return parent
    msg = "repo root (.git) not found above lfs_migration helpers"
    raise RuntimeError(msg)


def workspace_python() -> str:
    """The workspace venv interpreter (all members importable), else ``sys.executable``."""
    venv = repo_root() / ".venv" / "bin" / "python"
    return str(venv) if venv.exists() else sys.executable


# --------------------------------------------------------------------------
# git / git-lfs primitives (all offline; never smudge or hit the network)
# --------------------------------------------------------------------------


def git(*args: str) -> str:
    """Run ``git`` at the repo root and return decoded stdout."""
    out = subprocess.run(
        ["git", *args],
        cwd=repo_root(),
        capture_output=True,
        text=True,
        check=True,
    )
    return out.stdout


def git_bytes(*args: str) -> bytes:
    """Run ``git`` at the repo root and return raw stdout bytes."""
    out = subprocess.run(
        ["git", *args],
        cwd=repo_root(),
        capture_output=True,
        check=True,
    )
    return out.stdout


_LFS_POINTER_PREFIX = b"version https://git-lfs.github.com/spec/v1"
_LFS_OID_RE = re.compile(rb"(?m)^oid sha256:([0-9a-f]{64})$")
_LFS_SIZE_RE = re.compile(rb"(?m)^size ([0-9]+)$")


def pointer_oid(blob: bytes) -> str | None:
    """Return the content sha256 OID if ``blob`` is an LFS pointer stub, else None.

    Inline mirror of ``integrity.common.repo.lfs_pointer_oid``
    (tools/integrity/integrity/common/repo.py); kept here so this surface is
    self-contained. The OID is parsed offline from the stub text -- no
    ``git lfs smudge``, no network, no working-tree access.
    """
    if not blob.startswith(_LFS_POINTER_PREFIX):
        return None
    match = _LFS_OID_RE.search(blob)
    return match.group(1).decode("ascii") if match else None


def pointer_size(blob: bytes) -> int | None:
    """Return the declared ``size`` from an LFS pointer stub, else None."""
    match = _LFS_SIZE_RE.search(blob)
    return int(match.group(1)) if match else None


def lfs_paths_at(ref: str) -> list[str]:
    """Repo-relative paths tracked by git-lfs at ``ref`` (e.g. HEAD or a tag)."""
    out = git("lfs", "ls-files", "--name-only", ref)
    return [line for line in out.splitlines() if line.strip()]


def lfs_object_local_path(oid: str) -> Path:
    """Local LFS object-store path for ``oid`` (may or may not exist)."""
    return repo_root() / ".git" / "lfs" / "objects" / oid[:2] / oid[2:4] / oid


# --------------------------------------------------------------------------
# Invariant-command subprocess runner
# --------------------------------------------------------------------------


def run_module(
    module_args: list[str],
    cwd: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    """Invoke ``python -m <module_args>`` under the workspace interpreter.

    ``check=False``: callers assert on ``returncode`` / output themselves so
    that a non-zero exit surfaces as a readable test failure, not an exception.
    """
    return subprocess.run(
        [workspace_python(), "-m", *module_args],
        cwd=str(cwd or repo_root()),
        capture_output=True,
        text=True,
        check=False,
    )


# --------------------------------------------------------------------------
# RED-until-Stage-1b marker
# --------------------------------------------------------------------------


def red_until_stage_1b(target: str) -> pytest.MarkDecorator:
    """Mark a test RED until Stage 1b satisfies ``target``.

    Implemented with the built-in ``xfail`` marker so the surface stays clean
    under ``filterwarnings = ["error"]`` (a custom ``@pytest.mark.<name>``
    would raise ``PytestUnknownMarkWarning`` -> error). ``strict=True`` means
    that once Stage 1b makes the test pass, the unexpected XPASS *fails* the
    suite -- forcing the marker to be removed. That is the mechanical
    RED-to-GREEN contract: a passing test may not keep wearing the RED badge.

    To observe the genuine RED failure mode (e.g. when recording the
    failing-tests output hash), run with ``--runxfail`` so the marker is
    ignored and the assertions fail normally.
    """
    return pytest.mark.xfail(
        reason=f"red_until_stage_1b -- Stage 1b satisfaction target: {target}",
        strict=True,
    )
