"""I7 -- no agent-pushed tags.

Charter docs/phases/sub-phase-lfs-architecture.md section 7 (I7): spec section
7.12 -- phase tags are operator-only; an *agent*-pushed tag is a HARD_FAIL.
The agent never runs ``git tag`` / ``git push origin <tag>``.

I7 forbids AGENT-pushed tags. It does NOT forbid operator-pushed tags: per
conventions section D.2, an operator MAY push an intermediate non-phase tag
when the sub-phase adds an external dependency, marks durable architecture, or
the operator judges historical significance (default NO for hygiene sub-phases).
Precedent: ``v0.2.1-sub-phase-lfs-architecture`` (the R2/LFS backend), pushed by
the operator at the lfs-architecture landing.

Git does not record *who* pushed a tag, so this guard cannot distinguish
operator from agent by provenance. Instead it encodes the invariant
*declaratively*: every tag pointing at a commit at/after the phase boundary
(``v0.2.0-phase-2`` .. HEAD) must be **operator-sanctioned** -- i.e. listed
below. A tag in range that is NOT on the allowlist is presumed agent-pushed (or
otherwise unsanctioned) and is a HARD_FAIL. Adding an entry to
``OPERATOR_NONPHASE_TAGS`` is the deliberate, reviewable record of an operator
sanction per conventions section D.2.

(Prior baseline, Stage 1a probe: the repo also carries two non-phase tags from
*prior* work -- ``pre-lfs-migration-backup`` -> cf13d1c and ``v0.1.9`` -> an mpm
point-release. Both are ancestors of ``v0.2.0-phase-2`` and so are out of the
``--contains`` range this guard inspects.)

History: this guard was originally ``test_no_tag_points_into_subphase_range``,
which forbade *any* tag in range -- an over-strict proxy that went red when the
operator legitimately pushed ``v0.2.1-sub-phase-lfs-architecture`` (no
``-phase-N`` segment; permitted by D.2 / spec section 7.12). Re-encoded to the
actual invariant at sub-phase-phase-2-cleanup Stage 1.D (PD-1).
"""

from __future__ import annotations

from lfs_migration._helpers import git

_PHASE_BOUNDARY = "v0.2.0-phase-2"
OPERATOR_PHASE_TAGS = frozenset({"v0.0.0-phase-0", "v0.1.0-phase-1", "v0.2.0-phase-2"})

# Operator-sanctioned non-phase tags (conventions section D.2). Each entry is a
# deliberate operator-sanction record: an intermediate non-phase tag the
# operator chose to push for a sub-phase meeting a D.2 condition. The agent
# never adds tags here on its own behalf -- a new entry accompanies an
# operator-pushed tag only.
OPERATOR_NONPHASE_TAGS = frozenset({"v0.2.1-sub-phase-lfs-architecture"})

OPERATOR_SANCTIONED_TAGS = OPERATOR_PHASE_TAGS | OPERATOR_NONPHASE_TAGS


def test_no_agent_pushed_tag_in_subphase_range() -> None:
    """Every tag at/after the phase boundary must be operator-sanctioned.

    I7 forbids AGENT-pushed tags. A tag in range absent from
    ``OPERATOR_SANCTIONED_TAGS`` is presumed agent-pushed (or unsanctioned) and
    HARD_FAILs. Operator-pushed intermediate non-phase tags (conventions D.2)
    are sanctioned via ``OPERATOR_NONPHASE_TAGS`` and pass.
    """
    listed = git("tag", "--contains", _PHASE_BOUNDARY).splitlines()
    contains = frozenset(t.strip() for t in listed if t.strip())
    unsanctioned = contains - OPERATOR_SANCTIONED_TAGS
    assert not unsanctioned, (
        "unsanctioned tag(s) in sub-phase range -- I7 forbids AGENT-pushed tags. "
        "If operator-pushed per conventions section D.2, add to "
        f"OPERATOR_NONPHASE_TAGS: {sorted(unsanctioned)}"
    )


def test_operator_phase_tags_present() -> None:
    """The three operator phase tags all exist (sanity anchor for the lock)."""
    tags = frozenset(t.strip() for t in git("tag").splitlines() if t.strip())
    missing = OPERATOR_PHASE_TAGS - tags
    assert not missing, f"operator phase tag(s) missing: {sorted(missing)}"
