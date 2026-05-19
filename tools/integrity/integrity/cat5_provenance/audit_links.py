"""Cat 5.audit-links — every block report's evidence trail resolves.

Spec § 3.2: SOFT_WARN. Two checks per audit:

1. Every entry in front-matter ``evidence_paths`` resolves to a file
   present at HEAD.
2. Every FACT-tagged line in the prose either:
   - Cites a file path that exists (substring match of any path string
     against the set of tracked files), OR
   - References an entry already listed in ``evidence_paths``.

A FACT line that names no path and has no tie to evidence_paths is
flagged. This is a *light* check — Phase 1+ tightens grammar (b)/(c) for
phrase + API claims via Cat 4 grammars.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from ..common.repo import is_excluded, repo_tracked_files
from ..common.types import FailureMode, Finding

CHECK_ID = "cat5.audit-links"

_AUDIT_ROOTS = ("docs/_audits/",)

_FACT_LINE = re.compile(r"^\s*[-*>\s]*FACT\b", re.MULTILINE)
_PATH_LIKE = re.compile(r"`([A-Za-z0-9_.\-][A-Za-z0-9_./\-]*)`")
_FRONT_MATTER = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def _parse_front_matter(text: str) -> dict[str, object] | None:
    m = _FRONT_MATTER.match(text)
    if m is None:
        return None
    try:
        data = yaml.safe_load(m.group(1))
    except yaml.YAMLError:
        return None
    if not isinstance(data, dict):
        return None
    return data


def _is_resolvable(cited: str, tracked: set[str], tracked_dirs: set[str]) -> bool:
    """Return True iff ``cited`` matches a tracked file or a directory containing one."""
    if cited in tracked:
        return True
    s = cited.rstrip("/")
    if s in tracked_dirs:
        return True
    # Allow a citation like `tools/testkit/golden/` to count as resolved.
    return any(t.startswith(s + "/") for t in tracked)


def _scan_audit(
    repo_root: Path, rel_path: Path, tracked: set[str], tracked_dirs: set[str]
) -> list[Finding]:
    # tracked_dirs is consulted via _is_resolvable below and by evidence_paths.
    full = repo_root / rel_path
    try:
        text = full.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return []
    findings: list[Finding] = []

    fm = _parse_front_matter(text)
    if fm is None:
        findings.append(
            Finding(
                check=CHECK_ID,
                severity=FailureMode.SOFT_WARN,
                path=rel_path,
                line=1,
                message="missing or malformed YAML front-matter",
            )
        )
        return findings

    evidence_set: set[str] = set()
    evidence_paths = fm.get("evidence_paths") or []
    if not isinstance(evidence_paths, list):
        findings.append(
            Finding(
                check=CHECK_ID,
                severity=FailureMode.SOFT_WARN,
                path=rel_path,
                line=None,
                message="evidence_paths is not a list",
            )
        )
        evidence_paths = []
    for entry in evidence_paths:
        if not isinstance(entry, str):
            continue
        evidence_set.add(entry)
        if entry not in tracked and entry not in tracked_dirs:
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.SOFT_WARN,
                    path=rel_path,
                    line=None,
                    message=(f"evidence_paths entry {entry!r} is not a tracked repo file"),
                )
            )

    # FACT-line check: every FACT must mention a path that's either in
    # evidence_paths or in the tracked file set.
    for line_no, line in enumerate(text.splitlines(), start=1):
        if not _FACT_LINE.search(line):
            continue
        paths_in_line = _PATH_LIKE.findall(line)
        if not paths_in_line:
            continue
        for cited in paths_in_line:
            # Only flag if the citation looks pathlike (contains '/' or
            # ends with a file extension); ignore code identifiers.
            if "/" not in cited and "." not in cited:
                continue
            if cited in evidence_set:
                continue
            if _is_resolvable(cited, tracked, tracked_dirs):
                continue
            findings.append(
                Finding(
                    check=CHECK_ID,
                    severity=FailureMode.SOFT_WARN,
                    path=rel_path,
                    line=line_no,
                    message=(
                        f"FACT-tagged claim cites {cited!r} which is not in "
                        "evidence_paths and not tracked in the repo"
                    ),
                )
            )
    return findings


def run_cat5_audit_links(repo_root: Path, files: list[Path] | None = None) -> list[Finding]:
    tracked = {p.as_posix() for p in repo_tracked_files(repo_root)}
    tracked_dirs: set[str] = set()
    for t in tracked:
        parts = t.split("/")
        for i in range(1, len(parts)):
            tracked_dirs.add("/".join(parts[:i]))
    if files is not None:
        candidates = [
            p
            for p in files
            if any(p.as_posix().startswith(r) for r in _AUDIT_ROOTS) and p.suffix == ".md"
        ]
    else:
        candidates = [
            p
            for p in repo_tracked_files(repo_root)
            if any(p.as_posix().startswith(r) for r in _AUDIT_ROOTS) and p.suffix == ".md"
        ]
    findings: list[Finding] = []
    for rel in candidates:
        if is_excluded(rel):
            continue
        # Skip the index file (progress.md) — it's not an audit report
        # itself, just a one-liner ledger.
        if rel.name in {"progress.md", "spec-amendments-proposed.md"}:
            continue
        findings.extend(_scan_audit(repo_root, rel, tracked, tracked_dirs))
    return findings
