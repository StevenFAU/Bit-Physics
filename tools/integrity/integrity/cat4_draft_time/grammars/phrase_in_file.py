"""Cat 4 grammar (b) — ``<phrase "X" in Y>`` assertion.

Syntax (case-sensitive, anchored on angle brackets so it does not
collide with grammar (a)'s backtick-fenced ``path:line`` form):

    <phrase "X" in Y>      (double-quoted phrase)
    <phrase 'X' in Y>      (single-quoted phrase)

Semantics
---------

- ``X`` is the literal phrase to search for. The verifier searches
  case-sensitively, treating ``X`` as a literal substring (no regex
  metacharacters honored). Whitespace inside ``X`` is matched
  byte-for-byte.
- ``Y`` is a path relative to repo root OR a glob (``*``, ``?``,
  ``**`` supported via :func:`pathlib.Path.glob`). The verifier
  resolves ``Y`` against repo HEAD's working tree.
- PASS when ``X`` appears at least once in ``Y`` (or in at least one
  file matched by ``Y`` when ``Y`` is a glob).
- FAIL with HARD_FAIL severity when (i) ``Y`` does not resolve to any
  file, or (ii) ``X`` is absent from every file matched by ``Y``.

Scope (where the verifier looks for assertions)
-----------------------------------------------

Same prose-file scope as grammar (a): ``docs/`` recursively,
``README.md``, ``CHANGELOG.md``, ``CONTRIBUTING.md``. Stage 1
deliverable per charter § 1.7 R8 amendment.

Path resolution
---------------

Globs that resolve OUTSIDE the repo root (e.g., ``../etc/passwd``,
``/absolute/path``) HARD_FAIL with a distinct diagnostic — the
verifier never reads outside the repo.
"""

from __future__ import annotations

import re
from pathlib import Path

from ...common.repo import is_excluded, repo_tracked_files
from ...common.types import FailureMode, Finding
from ._md_scope import iter_narrative_lines

CHECK_ID = "cat4.phrase-in-file"

# <phrase "X" in Y>  or  <phrase 'X' in Y>
# - X = phrase capture, double- or single-quoted, must not span the
#   closing quote of its own kind. Newlines disallowed inside X so a
#   malformed assertion (missing closing quote) does not silently
#   consume the rest of the file.
# - Y = path or glob; allows the usual path chars plus glob metachars.
_ASSERTION = re.compile(
    r"<phrase\s+"
    r"(?:\"(?P<phrase_d>[^\"\n]*)\"|'(?P<phrase_s>[^'\n]*)')"
    r"\s+in\s+"
    r"(?P<target>[A-Za-z0-9_./\-*?\[\]]+)"
    r"\s*>"
)

_PROSE_SUFFIXES = {".md", ".markdown", ".rst", ".txt"}

_PROSE_ROOTS = ("docs/", "README.md", "CHANGELOG.md", "CONTRIBUTING.md")


def _is_in_scope(rel: Path) -> bool:
    s = rel.as_posix()
    if rel.suffix not in _PROSE_SUFFIXES:
        return False
    return any(s == prefix or s.startswith(prefix) for prefix in _PROSE_ROOTS)


def _resolve_target(repo_root: Path, target: str) -> tuple[list[Path], str | None]:
    """Resolve ``target`` (path or glob) to repo-relative files.

    Returns (matches, error_diag). When ``error_diag`` is non-None, the
    target either escapes the repo or is otherwise malformed; matches
    will be empty.
    """
    if target.startswith("/"):
        return ([], f"target {target!r} is absolute (must be repo-relative)")
    repo_resolved = repo_root.resolve()
    is_glob = any(ch in target for ch in "*?[")
    if is_glob:
        matches: list[Path] = []
        for p in repo_root.glob(target):
            if not p.is_file():
                continue
            try:
                resolved_p = p.resolve()
                resolved_p.relative_to(repo_resolved)
            except ValueError:
                # Glob escaped repo root via symlink; skip.
                continue
            matches.append(p.resolve().relative_to(repo_resolved))
        return (matches, None)
    candidate = (repo_root / target).resolve()
    try:
        rel = candidate.relative_to(repo_resolved)
    except ValueError:
        return ([], f"target {target!r} escapes repo root")
    if not candidate.exists() or not candidate.is_file():
        return ([], None)  # absent — let caller HARD_FAIL with the standard message
    return ([rel], None)


def _scan_file(repo_root: Path, rel_path: Path) -> list[Finding]:
    full = repo_root / rel_path
    try:
        text = full.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return []
    findings: list[Finding] = []
    cache: dict[Path, bytes] = {}
    for line_no, line in iter_narrative_lines(text):
        for m in _ASSERTION.finditer(line):
            phrase = m.group("phrase_d") or m.group("phrase_s") or ""
            target = m.group("target")
            matches, err = _resolve_target(repo_root, target)
            if err is not None:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(
                            f"draft assertion <phrase {phrase!r} in {target}> rejected: {err}"
                        ),
                    )
                )
                continue
            if not matches:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(
                            f"draft assertion <phrase {phrase!r} in {target}> "
                            f"target does not resolve to any file at repo HEAD"
                        ),
                    )
                )
                continue
            needle = phrase.encode("utf-8")
            hit = False
            for cited_rel in matches:
                full_target = repo_root / cited_rel
                body = cache.get(cited_rel)
                if body is None:
                    try:
                        body = full_target.read_bytes()
                    except OSError:
                        continue
                    cache[cited_rel] = body
                if needle in body:
                    hit = True
                    break
            if not hit:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(
                            f"draft assertion <phrase {phrase!r} in {target}> "
                            f"failed: phrase not found in "
                            f"{len(matches)} matched file(s)"
                        ),
                    )
                )
    return findings


def run_cat4_phrase_in_file(repo_root: Path, files: list[Path] | None = None) -> list[Finding]:
    """Scan prose files for ``<phrase "X" in Y>`` assertions and verify each."""
    candidates = files if files is not None else repo_tracked_files(repo_root)
    findings: list[Finding] = []
    for rel in candidates:
        if is_excluded(rel):
            continue
        if not _is_in_scope(rel):
            continue
        findings.extend(_scan_file(repo_root, rel))
    return findings
