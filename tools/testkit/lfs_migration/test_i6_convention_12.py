"""I6 -- Convention #12: SHA back-fill is always a separate commit.

Charter docs/phases/sub-phase-lfs-architecture.md section 7 (I6): conventions
section B.2 -- a SHA back-fill is always its own commit, never a ``git --amend``
of a published commit (spec section 7.5 / server-side hook #2 no-history-rewrite).

GREEN at Stage 1a. Lock: across the sub-phase commit range (v0.2.0-phase-2 ..
HEAD), every back-fill commit is a standalone commit that cites Convention #12
and touches only documentation files (no code / workflow / config). This same
lock guards Stage 1a's own back-fill commit once it lands.
"""

from __future__ import annotations

from lfs_migration._helpers import git

_RANGE = "v0.2.0-phase-2..HEAD"


def _backfill_commits() -> list[str]:
    """SHAs of actual back-fill commits in range, matched by SUBJECT.

    Matching the whole message would falsely catch commits that merely *mention*
    back-fill in prose (e.g. an audit body describing this very lock); a back-fill
    commit is identified by its subject line carrying "back-fill" / "backfill".
    """
    out = git("log", "--format=%H%x1f%s", _RANGE)
    commits: list[str] = []
    for line in out.splitlines():
        if "\x1f" not in line:
            continue
        sha, subject = line.split("\x1f", 1)
        low = subject.lower()
        if "back-fill" in low or "backfill" in low:
            commits.append(sha.strip())
    return commits


def test_backfill_commits_are_separate_and_doc_only() -> None:
    """Each back-fill commit cites Convention #12 and changes only docs/ files."""
    commits = _backfill_commits()
    assert commits, f"expected >=1 back-fill commit in {_RANGE} (Stage 0 chain has one)"
    for sha in commits:
        message = git("show", "-s", "--format=%B", sha)
        assert "Convention #12" in message, f"{sha[:12]}: back-fill must cite Convention #12"
        names = git("show", "--name-only", "--format=", sha).splitlines()
        changed = [p for p in names if p.strip()]
        assert changed, f"{sha[:12]}: back-fill changed no files"
        offending = [p for p in changed if not p.startswith("docs/")]
        assert not offending, f"{sha[:12]}: back-fill touched non-doc files: {offending}"
