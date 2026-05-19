"""Cat 1.intra-repo — every backtick-fenced ``path:line[-end]`` citation resolves.

Spec § 3.2: HARD_FAIL. Phase 0 scope is repo-local relative paths only;
absolute paths and URLs are out of scope (URL checking lives in Phase 1+
external-link checks).

Grammar (matched inside backtick spans of markdown/text files only):
    <path/to/file.ext>:<line>            single line
    <path/to/file.ext>:<start>-<end>     range; end >= start

Resolution rules (against repo HEAD via ``find_repo_root``):
    - The file must exist under the repo root.
    - The cited line (or end of range) must be ``<= line_count(file)``.

Out of scope at Phase 0 (deferred to Phase 1+):
    - Phrase-present-in-file citations (grammar b).
    - Public-API-shape citations (grammar c).
    - URLs and absolute paths.
"""

from __future__ import annotations

import re
from pathlib import Path

from ..common.repo import is_excluded, repo_tracked_files
from ..common.types import FailureMode, Finding

CHECK_ID = "cat1.intra-repo"

# Backtick-fenced citation: `path:line` or `path:start-end`. The path must
# look like a relative posix-ish path (no leading slash, no protocol).
_CITATION = re.compile(
    r"`(?P<path>[A-Za-z0-9_.\-][A-Za-z0-9_./\-]*)"
    r":(?P<start>\d+)(?:-(?P<end>\d+))?`"
)

# File extensions whose text we scan. Binary types are skipped.
_TEXT_SUFFIXES = {
    ".md",
    ".txt",
    ".rst",
    ".toml",
    ".yaml",
    ".yml",
    ".json",
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".wgsl",
    ".glsl",
    ".sh",
    ".cfg",
    ".ini",
}


def _scan_file(repo_root: Path, rel_path: Path) -> list[Finding]:
    full = repo_root / rel_path
    try:
        text = full.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return []
    findings: list[Finding] = []
    line_count_cache: dict[Path, int | None] = {}
    for line_no, line in enumerate(text.splitlines(), start=1):
        for m in _CITATION.finditer(line):
            cited_path = Path(m.group("path"))
            start = int(m.group("start"))
            end = int(m.group("end")) if m.group("end") else start
            if end < start:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(f"citation `{cited_path}:{start}-{end}` has end < start"),
                    )
                )
                continue
            # Resolve relative to repo root; reject paths escaping the repo.
            target = (repo_root / cited_path).resolve()
            try:
                target.relative_to(repo_root.resolve())
            except ValueError:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(f"citation `{cited_path}:{start}` escapes repo root"),
                    )
                )
                continue
            if not target.exists() or not target.is_file():
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(f"citation `{cited_path}:{start}` target does not exist"),
                    )
                )
                continue
            line_count = line_count_cache.get(cited_path)
            if line_count is None:
                try:
                    cited_text = target.read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError):
                    line_count_cache[cited_path] = None
                    continue
                line_count = cited_text.count("\n") + (
                    0 if cited_text.endswith("\n") or not cited_text else 1
                )
                line_count_cache[cited_path] = line_count
            if line_count is None:
                continue
            if end > line_count:
                findings.append(
                    Finding(
                        check=CHECK_ID,
                        severity=FailureMode.HARD_FAIL,
                        path=rel_path,
                        line=line_no,
                        message=(
                            f"citation `{cited_path}:{start}"
                            f"{('-' + str(end)) if end != start else ''}` "
                            f"out of range; file has {line_count} lines"
                        ),
                    )
                )
    return findings


def run_cat1_intra_repo(repo_root: Path, files: list[Path] | None = None) -> list[Finding]:
    """Entry point. Returns one Finding per failing citation."""
    candidates = files if files is not None else repo_tracked_files(repo_root)
    findings: list[Finding] = []
    for rel in candidates:
        if rel.suffix not in _TEXT_SUFFIXES:
            continue
        if is_excluded(rel):
            continue
        findings.extend(_scan_file(repo_root, rel))
    return findings
