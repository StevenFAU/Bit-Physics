"""I7 -- no agent-pushed tags.

Charter docs/phases/sub-phase-lfs-architecture.md section 7 (I7): spec section
7.12 -- phase tags are operator-only; an agent-pushed tag is a HARD_FAIL. This
sub-phase pushes no tag.

GREEN at Stage 1a. Lock: no tag points at a commit in the sub-phase range
(v0.2.0-phase-2 .. HEAD) -- i.e. neither this sub-phase nor any later agent
work introduced a tag. ``git tag --contains v0.2.0-phase-2`` must list only
the phase tag itself.

NOTE (pre-existing baseline, Stage 1a probe): the repo also carries two
non-phase tags from *prior* work -- ``pre-lfs-migration-backup`` -> cf13d1c
(the prior sub-phase-git-lfs-migration history-rewrite backup, charter section
1.3) and ``v0.1.9`` -> 1ea43b9 (an mpm point-release). Both are ancestors of
v0.2.0-phase-2 (they predate this sub-phase) and are therefore out of scope for
this lock, which guards only against tags introduced from the phase boundary
onward.
"""

from __future__ import annotations

from lfs_migration._helpers import git

_PHASE_BOUNDARY = "v0.2.0-phase-2"
OPERATOR_PHASE_TAGS = frozenset({"v0.0.0-phase-0", "v0.1.0-phase-1", "v0.2.0-phase-2"})


def test_no_tag_points_into_subphase_range() -> None:
    """No tag references a commit at/after the phase boundary except the phase tag."""
    listed = git("tag", "--contains", _PHASE_BOUNDARY).splitlines()
    contains = frozenset(t.strip() for t in listed if t.strip())
    extra = contains - {_PHASE_BOUNDARY}
    assert not extra, f"tag(s) in sub-phase range (I7 forbids agent tags): {sorted(extra)}"


def test_operator_phase_tags_present() -> None:
    """The three operator phase tags all exist (sanity anchor for the lock)."""
    tags = frozenset(t.strip() for t in git("tag").splitlines() if t.strip())
    missing = OPERATOR_PHASE_TAGS - tags
    assert not missing, f"operator phase tag(s) missing: {sorted(missing)}"
