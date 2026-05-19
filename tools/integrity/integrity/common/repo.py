"""Repo helpers (find_repo_root, git ls-files, head SHA)."""

from __future__ import annotations

import subprocess
from collections.abc import Iterable
from functools import lru_cache
from pathlib import Path

# Paths excluded from every integrity check when scanning the live repo.
# Adversarial fixtures intentionally contain broken citations / phantom
# exports / wrong-golden tables; surfacing those as findings against the
# real repo would generate false positives. The meta-test invokes the
# checks against the fixture trees directly.
EXCLUDED_PREFIXES: tuple[str, ...] = (
    "tools/integrity/tests/fixtures/",
    "references/",  # vendored upstreams are read-only; not Cat 2's domain
)


def is_excluded(rel: Path) -> bool:
    s = rel.as_posix()
    return any(s.startswith(prefix) for prefix in EXCLUDED_PREFIXES)


def find_repo_root(start: Path | None = None) -> Path:
    """Walk upward from ``start`` (or cwd) until a `.git` directory is found.

    Raises FileNotFoundError if no repo root is found.
    """
    here = (start or Path.cwd()).resolve()
    for candidate in [here, *here.parents]:
        if (candidate / ".git").exists():
            return candidate
    raise FileNotFoundError(f"no .git found above {here}")


@lru_cache(maxsize=8)
def head_sha(repo_root: Path) -> str:
    """Return the 40-char SHA of repo_root's HEAD."""
    out = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    return out.stdout.strip()


def repo_tracked_files(repo_root: Path, paths: Iterable[str] | None = None) -> list[Path]:
    """Return repo-tracked files (optionally restricted to ``paths`` pathspecs).

    Wraps ``git ls-files``. Paths are returned relative to ``repo_root``,
    in POSIX form.
    """
    cmd = ["git", "ls-files", "--", *(paths or [])]
    out = subprocess.run(cmd, cwd=repo_root, capture_output=True, text=True, check=True)
    return [Path(line) for line in out.stdout.splitlines() if line.strip()]


def file_at_sha(repo_root: Path, sha: str, path: str) -> bytes | None:
    """Return the bytes of ``path`` at the given commit ``sha`` (or None if absent)."""
    result = subprocess.run(
        ["git", "show", f"{sha}:{path}"],
        cwd=repo_root,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    return result.stdout


def staged_files(repo_root: Path) -> list[Path]:
    """Return files staged for commit (added/copied/modified, not deleted)."""
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    return [Path(line) for line in out.stdout.splitlines() if line.strip()]
