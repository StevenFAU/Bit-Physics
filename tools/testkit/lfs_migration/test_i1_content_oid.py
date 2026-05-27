"""I1 -- LFS content-OID semantics (the load-bearing invariant).

Charter docs/phases/sub-phase-lfs-architecture.md section 7 (I1): the sha256
in every pointer stub is the content OID; ``verify_evidence`` resolves it
offline and compares it against an audit's ``evidence_hashes``. A
pointer-byte-preserving backend migration is transparent to I1.

These tests are GREEN at Stage 1a. They exist to LOCK the invariant against a
Stage 1b regression: if the migration alters any pointer stub's bytes, or
breaks content<->OID identity, the locks below go RED.
"""

from __future__ import annotations

import hashlib
import os

from lfs_migration._helpers import (
    git_bytes,
    lfs_object_local_path,
    lfs_paths_at,
    pointer_oid,
    pointer_size,
    repo_root,
    run_module,
)

# Three Phase-2 audits with LFS-tracked evidence_hashes (probe section P4.3).
# pass counts pinned so a future drop in coverage is caught, not just 0 fails.
_P2 = "docs/_audits/phase-2"
PINNED_AUDITS: dict[str, int] = {
    f"{_P2}/sub-phase-eulerian-smoke-stack-e/landing-2026-05-25T13-21-16Z.md": 9,
    f"{_P2}/sub-phase-lattice-boltzmann-d3q19-stack-d/landing-2026-05-24T04-15-37Z.md": 48,
    f"{_P2}/sub-phase-reaction-diffusion-2d-stack-c/landing-2026-05-25T23-30-00Z.md": 13,
}

# Content-hash witness cap: hashing all 31 objects (~4.85 GiB) on every run is
# impractical, so the end-to-end content<->OID hash is witnessed on objects at
# or under this size, while every object gets the cheap offline checks below.
# Set LFS_MIGRATION_FULL_CONTENT=1 to hash every locally-present object (the
# Stage 1b/1c A5 bulk-sweep posture, charter section A5).
_CONTENT_HASH_CAP_BYTES = 32 * 1024 * 1024


def test_pinned_audits_verify_evidence_pass() -> None:
    """verify_evidence (offline OID resolution) passes on the 3 pinned audits."""
    for audit, expected_pass in PINNED_AUDITS.items():
        result = run_module(
            ["integrity.scripts.verify_evidence", "--audit", str(repo_root() / audit)],
            cwd=repo_root() / "tools" / "integrity",
        )
        detail = f"{audit}: exit {result.returncode}\n{result.stdout}\n{result.stderr}"
        assert result.returncode == 0, detail
        summary = result.stdout.strip().splitlines()[-1]
        assert f"{expected_pass} pass / 0 fail" in summary, f"{audit}: {summary!r}"


def test_every_pointer_at_head_is_well_formed() -> None:
    """Every LFS path at HEAD has a stub that parses to a 64-hex OID + a size.

    Offline, network-free: ``git show HEAD:<path>`` returns the stub bytes
    (git never smudges under ``git show``). This is the cheap universal lock.
    """
    paths = lfs_paths_at("HEAD")
    assert paths, "expected a non-empty LFS pointer set at HEAD"
    for path in paths:
        stub = git_bytes("show", f"HEAD:{path}")
        oid = pointer_oid(stub)
        size = pointer_size(stub)
        assert oid is not None, f"{path}: not a parseable LFS pointer stub"
        assert len(oid) == 64, f"{path}: OID not 64 hex chars: {oid!r}"
        assert size is not None and size > 0, f"{path}: missing/zero pointer size"


def test_local_object_store_sizes_match_pointers() -> None:
    """For every locally-present LFS object, the stored byte size matches the stub.

    A cheap (stat-only, no hashing) consistency check across all 31 objects.
    Objects absent from the local store (a pointer-only checkout) are skipped:
    presence depends on whether the backend was pulled, which is exactly what
    the migration changes -- so absence is not an I1 failure.
    """
    for path in lfs_paths_at("HEAD"):
        stub = git_bytes("show", f"HEAD:{path}")
        oid = pointer_oid(stub)
        size = pointer_size(stub)
        assert oid is not None and size is not None, f"{path}: unparseable stub"
        obj = lfs_object_local_path(oid)
        if not obj.exists():
            continue
        assert obj.stat().st_size == size, (
            f"{path}: local object size {obj.stat().st_size} != pointer size {size}"
        )


def test_content_hash_matches_oid_for_witnessed_objects() -> None:
    """sha256(smudged content) == pointer OID -- the end-to-end content-address proof.

    Witnessed on objects at or under the size cap (or all, with
    LFS_MIGRATION_FULL_CONTENT=1). Reads the working-tree file only when it is
    the smudged artifact (not itself a pointer stub), so the test is correct
    both with content present and in a pointer-only checkout (where it skips).
    """
    full = os.environ.get("LFS_MIGRATION_FULL_CONTENT") == "1"
    witnessed = 0
    for path in lfs_paths_at("HEAD"):
        stub = git_bytes("show", f"HEAD:{path}")
        oid = pointer_oid(stub)
        size = pointer_size(stub)
        assert oid is not None and size is not None, f"{path}: unparseable stub"
        if not full and size > _CONTENT_HASH_CAP_BYTES:
            continue
        wt = repo_root() / path
        if not wt.exists():
            continue
        data = wt.read_bytes()
        if pointer_oid(data) is not None:
            # Working-tree file is still a pointer (not smudged): nothing to hash.
            continue
        assert hashlib.sha256(data).hexdigest() == oid, f"{path}: sha256 != OID"
        witnessed += 1
    assert witnessed > 0, "expected to witness content<->OID identity on at least one object"
