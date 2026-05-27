"""I4 -- append-only audits (lock against Stage 1b regression).

Charter docs/phases/sub-phase-lfs-architecture.md section 7 (I4): spec section
7.5 append-only, enforced by ``.github/workflows/audit-append-only.yml`` on
``*.ledger.md`` files present at the most recent phase tag (net-new files
allowed; SHA back-fill of a non-``.ledger.md`` landing audit is permitted).

This lock has two parts: (1) a structural assertion that the enforcing
workflow remains present and correctly configured, so Stage 1b cannot silently
weaken it; (2) a faithful replication of the workflow's prefix check over the
``.ledger.md`` set at the latest tag. NOTE: that enforced set is currently
empty (no path matches ``\\.ledger\\.md$`` at v0.2.0-phase-2), so part (2) is
vacuously true today and activates if/when a ledger file lands -- the
structural assertion is the load-bearing lock at Stage 1a.
"""

from __future__ import annotations

import re

from lfs_migration._helpers import git, git_bytes, repo_root

_WORKFLOW = ".github/workflows/audit-append-only.yml"
_LEDGER_RE = re.compile(r"\.ledger\.md$")


def _latest_phase_tag() -> str:
    tags = [t for t in git("tag", "--list", "v*-phase-*").splitlines() if t.strip()]
    assert tags, "expected at least one v*-phase-* tag"
    # version-sort; mirror the workflow's `sort -V | tail -n1`.
    return sorted(tags, key=lambda t: [int(n) for n in re.findall(r"\d+", t)])[-1]


def test_append_only_workflow_present_and_configured() -> None:
    """The enforcing workflow exists with full-history checkout and the ledger rule."""
    text = (repo_root() / _WORKFLOW).read_text(encoding="utf-8")
    assert "fetch-depth: 0" in text, "workflow must do a full-history checkout"
    assert r"\.ledger\.md$" in text, "workflow must scope the check to *.ledger.md files"
    assert "docs/_audits/" in text, "workflow must scope the check to docs/_audits/"


def test_ledger_files_are_append_only_at_head() -> None:
    """Every ``.ledger.md`` present at the latest tag is an unchanged prefix at HEAD.

    Faithful replication of the workflow's per-file logic: prior-tag content
    must be a byte-prefix of the HEAD content (deletion / shortening / edit of
    historical content forbidden; growth allowed).
    """
    tag = _latest_phase_tag()
    tree = git("ls-tree", "-r", "--name-only", tag, "--", "docs/_audits/").splitlines()
    ledgers = [p for p in tree if _LEDGER_RE.search(p)]
    for path in ledgers:
        prior = git_bytes("show", f"{tag}:{path}")
        head_file = repo_root() / path
        assert head_file.exists(), f"{path}: deleted since {tag} (append-only violation)"
        head = head_file.read_bytes()
        assert len(head) >= len(prior), f"{path}: shortened since {tag}"
        assert head[: len(prior)] == prior, f"{path}: prior-tag content edited (not a prefix)"
