"""Check orchestration + finding aggregation.

The runner owns the canonical registry of check IDs → callables and the
exit-code mapping. Per-category modules expose a ``run(repo_root, files)``
callable returning ``list[Finding]``.
"""

from __future__ import annotations

import sys
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path

from .cat1_citations.intra_repo import run_cat1_intra_repo
from .cat2_contracts.python_module_exports import run_cat2_python_exports
from .cat3_numerical.golden_values import run_cat3_golden_values
from .cat4_draft_time.path_line_assertions import run_cat4_path_line_assertions
from .cat5_provenance.audit_links import run_cat5_audit_links
from .catx_tolerance_budget.tolerance_budget import run_catx_tolerance_budget
from .common.repo import find_repo_root
from .common.suppressions import applies, parse_suppressions
from .common.types import FailureMode, Finding

CheckFn = Callable[[Path, list[Path] | None], list[Finding]]

_REGISTRY: dict[str, CheckFn] = {
    "cat1.intra-repo": run_cat1_intra_repo,
    "cat2.python-exports": run_cat2_python_exports,
    "cat3.golden-values": run_cat3_golden_values,
    "cat4.path-line-assertions": run_cat4_path_line_assertions,
    "cat5.audit-links": run_cat5_audit_links,
    "catx.tolerance-budget": run_catx_tolerance_budget,
}

_CATEGORY_ALIASES: dict[str, list[str]] = {
    "1": ["cat1.intra-repo"],
    "2": ["cat2.python-exports"],
    "3": ["cat3.golden-values"],
    "4": ["cat4.path-line-assertions"],
    "5": ["cat5.audit-links"],
    "tolerance-budget": ["catx.tolerance-budget"],
    "x": ["catx.tolerance-budget"],
}


@dataclass
class RunResult:
    findings: list[Finding]

    def hard_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == FailureMode.HARD_FAIL)

    def soft_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == FailureMode.SOFT_WARN)


def resolve_checks(category: str | None) -> list[str]:
    """Map a `--cat` argument (or None for all) to a concrete list of check IDs."""
    if category is None:
        return list(_REGISTRY.keys())
    if category in _CATEGORY_ALIASES:
        return _CATEGORY_ALIASES[category]
    if category in _REGISTRY:
        return [category]
    raise ValueError(
        f"unknown category {category!r}; available: {sorted(_CATEGORY_ALIASES) + sorted(_REGISTRY)}"
    )


def _filter_suppressed(repo_root: Path, findings: Iterable[Finding]) -> list[Finding]:
    """Drop findings shadowed by a matching `# integrity-allow:` annotation.

    Annotations live in the same file as the finding, on any line (a file
    declaring `integrity-allow: cat1.intra-repo; <reason>; <id>` suppresses
    all cat1.intra-repo findings on that file).
    """
    surviving: list[Finding] = []
    cache: dict[Path, list[str]] = {}
    for f in findings:
        full = repo_root / f.path if not f.path.is_absolute() else f.path
        try:
            text = full.read_text(encoding="utf-8", errors="ignore")
        except (OSError, UnicodeDecodeError):
            surviving.append(f)
            continue
        annotations = parse_suppressions(f.path, text)
        if any(applies(a, f.check) for a in annotations):
            cache.setdefault(f.path, []).append(f.check)
            continue
        surviving.append(f)
    return surviving


def run(
    category: str | None,
    files: list[Path] | None,
    repo_root: Path | None = None,
) -> RunResult:
    """Run the requested checks; return aggregated findings.

    Args:
        category: None for all categories, else a key from
            ``_CATEGORY_ALIASES`` or a literal check ID (e.g. "cat1.intra-repo").
        files: Optional path restriction; None means whole repo.
        repo_root: Optional override; falls back to ``find_repo_root()``.
    """
    root = repo_root or find_repo_root()
    check_ids = resolve_checks(category)
    all_findings: list[Finding] = []
    for check_id in check_ids:
        fn = _REGISTRY[check_id]
        all_findings.extend(fn(root, files))
    return RunResult(findings=_filter_suppressed(root, all_findings))


def emit(result: RunResult, *, mode: str = "strict") -> int:
    """Print findings to stderr; return exit code per ``mode``.

    - strict: exit 1 on any HARD_FAIL.
    - advisory: always exit 0 (findings still printed).
    """
    for f in result.findings:
        line_part = f":{f.line}" if f.line is not None else ""
        print(
            f"[{f.severity.value}] {f.check} {f.path}{line_part} — {f.message}",
            file=sys.stderr,
        )
    summary = f"summary: {result.hard_count()} HARD_FAIL, {result.soft_count()} SOFT_WARN"
    print(summary, file=sys.stderr)
    if mode == "advisory":
        return 0
    return 1 if result.hard_count() > 0 else 0
