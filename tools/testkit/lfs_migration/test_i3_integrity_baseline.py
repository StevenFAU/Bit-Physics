"""I3 -- integrity baseline (lock against Stage 1b regression).

Charter docs/phases/sub-phase-lfs-architecture.md section 7 (I3): the gate is
**0 HARD_FAIL** from ``integrity --all --mode strict`` (SOFT_WARN count may
grow as new audits land; the exact digest c19492ad... only re-matches when no
new audit files have changed the report, so it is NOT asserted byte-for-byte).
GREEN at Stage 1a; a Stage 1b regression that introduces any HARD_FAIL fails
this test.
"""

from __future__ import annotations

from lfs_migration._helpers import repo_root, run_module


def test_integrity_zero_hard_fail() -> None:
    """``integrity --all --mode strict`` exits 0 (0 HARD_FAIL across all categories)."""
    result = run_module(
        ["integrity", "--all", "--mode", "strict"],
        cwd=repo_root() / "tools" / "integrity",
    )
    # strict mode exits 1 on any HARD_FAIL; the full report prints to stderr.
    assert result.returncode == 0, f"integrity HARD_FAIL present\n{result.stderr[-2000:]}"
    assert "0 HARD_FAIL" in result.stderr, f"summary missing 0 HARD_FAIL:\n{result.stderr[-500:]}"
