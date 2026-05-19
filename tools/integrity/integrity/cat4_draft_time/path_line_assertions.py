"""Cat 4.path-line-assertions — backtick-fenced `path:line` citations in prose.

Spec § 3.2 grammar (a). HARD_FAIL at pre-commit.

Phase 0 scope: scans markdown files under ``docs/`` (spec + audits +
retros + per-tool docs) and the top-level README.md / CHANGELOG.md.
Grammar is identical to Cat 1's, but applied at commit-msg stage on
*staged* files, so a draft can be caught before it lands.
"""

from __future__ import annotations

import re
from pathlib import Path

from ..common.repo import is_excluded, repo_tracked_files
from ..common.types import FailureMode, Finding

CHECK_ID = "cat4.path-line-assertions"

_CITATION = re.compile(
    r"`(?P<path>[A-Za-z0-9_.\-][A-Za-z0-9_./\-]*)"
    r":(?P<start>\d+)(?:-(?P<end>\d+))?`"
)

_PROSE_SUFFIXES = {".md", ".markdown", ".rst", ".txt"}

_PROSE_ROOTS = ("docs/", "README.md", "CHANGELOG.md", "CONTRIBUTING.md")


def _is_in_scope(rel: Path) -> bool:
    s = rel.as_posix()
    if rel.suffix not in _PROSE_SUFFIXES:
        return False
    return any(s == prefix or s.startswith(prefix) for prefix in _PROSE_ROOTS)


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
                        message=(f"draft citation `{cited_path}:{start}` escapes repo root"),
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
                        message=(
                            f"draft citation `{cited_path}:{start}` target "
                            "does not exist at repo HEAD"
                        ),
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
                            f"draft citation `{cited_path}:{start}"
                            f"{('-' + str(end)) if end != start else ''}` "
                            f"out of range; target has {line_count} lines"
                        ),
                    )
                )
    return findings


def run_cat4_path_line_assertions(
    repo_root: Path, files: list[Path] | None = None
) -> list[Finding]:
    candidates = files if files is not None else repo_tracked_files(repo_root)
    findings: list[Finding] = []
    for rel in candidates:
        if is_excluded(rel):
            continue
        if not _is_in_scope(rel):
            continue
        findings.extend(_scan_file(repo_root, rel))
    return findings
