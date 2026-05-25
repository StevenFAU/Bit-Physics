"""Gate 14 — cross-stack equivalence (Phase-2 14th gate; ACTIVE at Stage 1c).

At Stage 1a the Stack-E **canonical** capture
(``captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500``) does
NOT yet exist — it is the Stage 1b deliverable. This test therefore SKIPS until
both partners are present; Stage 1c executes the assertion. The Stage-1b
canonical capture landed (S1b-ME2), so this gate now RUNS (no longer skipped):
the achieved verdict is ``within_tolerance=True`` — in fact **BIT-EXACT**
(``max_abs_err = max_rel_err = 0.0`` across all 4 fields x 11 frames), exceeding
the FP-round-off prediction on the BOUNDED rigid-free-fall canonical. Tolerance
is the ``[overrides.mpm-multimaterial]`` 1e-4 ``mpm`` category, REUSED per D7.
See ``docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md`` (Stack-E § 2).
"""

from __future__ import annotations

from pathlib import Path

import pytest


def _both_present(ref: Path, cand: Path) -> bool:
    return ref.exists() and cand.exists()


def test_canonical_capture_within_tolerance_of_numpy_reference(
    ref_manifest_path: Path,
    stack_e_manifest_path: Path,
) -> None:
    """Stack-E drop-impact capture diffs against the NumPy+numba reference within
    ``relative = 1e-4`` (mpm category; LEFT = reference). Stage 1b populated the
    canonical capture (the RIGHT partner); Stage 1c executes this assertion
    formally. With both partners present the skip-guard is released and the gate
    runs — the verdict is BIT-EXACT (``max_abs_err = 0.0``), the strongest form
    of ``within_tolerance=True``.
    """
    if not _both_present(ref_manifest_path, stack_e_manifest_path):
        pytest.skip(
            "gate-14 deferred to Stage 1c: Stack-E canonical capture not yet "
            f"emitted ({stack_e_manifest_path.name}); Stage 1b produces it."
        )
    from equivalence.harness import compare_captures

    verdict = compare_captures(left=ref_manifest_path, right=stack_e_manifest_path)
    assert verdict.within_tolerance, (
        f"NumPy+numba-ref <-> Stack-E drop-impact cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
