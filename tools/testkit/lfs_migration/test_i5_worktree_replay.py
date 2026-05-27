"""I5 -- worktree replay at prior tags (the real migration risk).

Charter docs/phases/sub-phase-lfs-architecture.md section 7 (I5): checking out
v0.2.0-phase-2 / v0.1.0-phase-1 / v0.0.0-phase-0 must still resolve captures.
This is the one invariant the backend migration can actually threaten -- if the
old backend's content goes away before the new backend has it, historical-tag
checkouts cannot smudge.

Stage 1a lock (offline, env-robust): for each prior tag, every LFS pointer is
well-formed and -- when present in the local object store -- has matching bytes
(size). The live worktree-checkout-and-smudge sample is the Stage 1c boundary
per charter (it requires the backend to be reachable, which Stage 1a does not
exercise). A pre-existing failure here (a prior tag that cannot resolve at HEAD
*before* any migration) was checked at the Stage 1a probe and is a Hard-Rule-2
STOP, not something this offline lock can paper over.
"""

from __future__ import annotations

from lfs_migration._helpers import (
    git_bytes,
    lfs_object_local_path,
    lfs_paths_at,
    pointer_oid,
    pointer_size,
)

PRIOR_TAGS = ("v0.0.0-phase-0", "v0.1.0-phase-1", "v0.2.0-phase-2")


def test_prior_tags_have_well_formed_resolvable_pointers() -> None:
    """Across all prior tags, every LFS pointer parses and resolves where cached.

    phase-0 / phase-1 carry zero captures (added during Phase 2); phase-2
    carries all 31. The union across tags must be non-empty so this lock is not
    globally vacuous.
    """
    total_pointers = 0
    for tag in PRIOR_TAGS:
        for path in lfs_paths_at(tag):
            total_pointers += 1
            stub = git_bytes("show", f"{tag}:{path}")
            oid = pointer_oid(stub)
            size = pointer_size(stub)
            assert oid is not None, f"{tag}:{path}: not a parseable LFS pointer"
            assert size is not None and size > 0, f"{tag}:{path}: missing/zero size"
            obj = lfs_object_local_path(oid)
            if obj.exists():
                assert obj.stat().st_size == size, (
                    f"{tag}:{path}: local object size {obj.stat().st_size} != {size}"
                )
    assert total_pointers > 0, "expected at least one LFS pointer across prior tags"
