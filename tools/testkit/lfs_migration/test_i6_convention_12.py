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


# Operator-ratified SHA-keyed citation exceptions (Phase-4 D4). Mirrors the I7
# OPERATOR_NONPHASE_TAGS allowlist pattern: each entry is keyed to a FULL 40-hex
# SHA (this-SHA-only — NO category-wide loophole) and carries a REQUIRED reason
# recording why the immutable-history commit is exempted from the literal
# "Convention #12" citation. The agent never adds entries on its own behalf — a
# new entry accompanies an operator ratification only. The doc-only invariant
# (a back-fill changes only docs/ files) is STILL enforced for exempted commits.
_CITATION_EXEMPT_SHAS: dict[str, str] = {
    "abf1d46621c313db8998da8e40be1db2627feaee": (
        "Phase-4 D4 (operator-ratified). (i) VALID back-fill: this commit "
        "re-back-filled the render-similarity Stage-0 audit head_sha to the full "
        "parser-clean 40-hex SHA 463283aa8415b3b2e27ec7c4e0e7017a97931256, "
        "replacing the partial/parser-unclean '463283a (back-fill via Convention "
        "#12; the Stage-0 audit commit)'; it changed exactly one docs/_audits/ "
        "file (1 insertion, 1 deletion). (ii) It omits the literal 'Convention "
        "#12' string in its commit MESSAGE (subject 're-back-fill render-similarity "
        "Stage 0 head_sha (full SHA, parser-clean)', empty body) — ironically the "
        "head_sha VALUE it replaced contained the citation. (iii) It is immutable "
        "Phase-3 history under tag v0.3.0-phase-3, so the citation cannot be added "
        "retroactively without a forbidden history rewrite. THIS SHA ONLY."
    ),
}


def _citation_ok(sha: str, message: str) -> bool:
    """A back-fill commit's citation is OK iff it cites 'Convention #12' in its
    message, OR the FULL SHA is an operator-ratified exception. Keyed to the
    full 40-hex SHA only — a non-exempt SHA with an uncited message is NEVER OK
    (the exception does not hollow the detector)."""
    if "Convention #12" in message:
        return True
    return sha in _CITATION_EXEMPT_SHAS


def test_backfill_commits_are_separate_and_doc_only() -> None:
    """Each back-fill commit cites Convention #12 (or is an operator-ratified
    SHA-keyed exception) and changes only docs/ files."""
    commits = _backfill_commits()
    assert commits, f"expected >=1 back-fill commit in {_RANGE} (Stage 0 chain has one)"
    for sha in commits:
        message = git("show", "-s", "--format=%B", sha)
        assert _citation_ok(sha, message), (
            f"{sha[:12]}: back-fill must cite Convention #12 "
            f"(or be an operator-ratified SHA-keyed exception in _CITATION_EXEMPT_SHAS)"
        )
        names = git("show", "--name-only", "--format=", sha).splitlines()
        changed = [p for p in names if p.strip()]
        assert changed, f"{sha[:12]}: back-fill changed no files"
        offending = [p for p in changed if not p.startswith("docs/")]
        assert not offending, f"{sha[:12]}: back-fill touched non-doc files: {offending}"


def test_citation_exception_is_sha_keyed_and_not_a_loophole() -> None:
    """D4: prove the SHA-keyed exception does NOT hollow the detector.

    A synthetic uncited back-fill from ANY non-exempt SHA is still flagged; only
    the exact exempted SHA passes uncited; a genuine citation passes regardless
    of SHA; and every exemption key is a full 40-hex SHA carrying a documented
    reason.
    """
    exempt = next(iter(_CITATION_EXEMPT_SHAS))
    # The exempt SHA passes even without the literal citation...
    assert _citation_ok(exempt, "re-back-fill foo (full SHA, parser-clean)")
    # ...but any OTHER sha with an uncited back-fill message is STILL flagged.
    assert not _citation_ok("0" * 40, "re-back-fill foo (full SHA, parser-clean)")
    assert not _citation_ok("deadbeef" * 5, "chore: back-fill head_sha")
    # A genuine citation passes regardless of SHA (the rule is not SHA-gated).
    assert _citation_ok("0" * 40, "back-fill head_sha per Convention #12")
    # Every exemption is keyed to a full 40-hex SHA and carries a real reason.
    for sha, reason in _CITATION_EXEMPT_SHAS.items():
        assert len(sha) == 40 and all(c in "0123456789abcdef" for c in sha), (
            f"exemption key must be a full 40-hex SHA: {sha!r}"
        )
        assert len(reason) > 120, f"exemption {sha[:12]} must carry a documented reason"
