"""Repo helpers (find_repo_root, git ls-files, head SHA)."""

from __future__ import annotations

import re
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
    # Exhaustive back-test re-audit deliverables: by construction these quote
    # citations-to-defects (stale names, removed targets, wrong line numbers)
    # as the SUBJECT of study — a finding that a cited path+line "target does
    # not exist" is correct precisely because the target is gone. Scanning
    # them as live citations (cat1/cat4) or as audit records needing
    # front-matter (cat5) is a false positive on read-only findings data.
    # Same class as the fixtures above. Landing audits (docs/_audits/phase-*)
    # are NOT excluded — their FACT-tagged citations are real claims and
    # stay checked.
    "docs/_audits/back-test-",
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
    """Return the bytes of ``path`` at the given commit ``sha`` (or None if absent).

    For LFS-tracked paths this returns the **pointer stub** text (``git show``
    does not smudge); callers that hash content must resolve the content OID via
    :func:`lfs_pointer_oid`.
    """
    result = subprocess.run(
        ["git", "show", f"{sha}:{path}"],
        cwd=repo_root,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    return result.stdout


_LFS_POINTER_PREFIX = b"version https://git-lfs.github.com/spec/v1"
_LFS_OID_RE = re.compile(rb"(?m)^oid sha256:([0-9a-f]{64})$")


def lfs_pointer_oid(blob: bytes) -> str | None:
    """Return the content sha256 OID if ``blob`` is a git-lfs pointer stub, else None.

    A git-lfs pointer stub (spec v1) embeds the content's sha256 directly::

        version https://git-lfs.github.com/spec/v1
        oid sha256:<64-hex>
        size <bytes>

    The ``oid`` is the content-addressed sha256 of the *smudged* artifact —
    exactly the value an audit's ``evidence_hashes`` records for LFS-tracked
    captures (conventions doc § B.1 content-OID load-bearing posture; § B.6).
    Parsing it from the pointer text needs no ``git lfs smudge`` / network /
    working-tree access: the OID is deterministic, offline, and content-addressed.

    Non-pointer blobs return ``None`` (the caller then hashes the blob directly,
    preserving normal git-blob sha256 semantics for non-LFS evidence).
    """
    if not blob.startswith(_LFS_POINTER_PREFIX):
        return None
    match = _LFS_OID_RE.search(blob)
    return match.group(1).decode("ascii") if match else None


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
