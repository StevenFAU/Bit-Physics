"""Gate 14 (Phase-2-specific) -- Cross-stack equivalence between the Stack-E
NVIDIA Warp Stam-Fedkiw port and the Phase-1 NumPy reference (BIT-EXACT pair).

The SECOND ``eulerian-smoke`` spec-Phase-2 cross-stack pair. The plan-drafting
prediction (chaotic-regime R-P2 escape-hatch; ``within_tolerance=False``) was
**empirically FALSIFIED** at Stage 1c: gate-14 is **cross-stack BIT-EXACT** -- the
Warp port matches the sealed Phase-1 NumPy reference **byte-for-byte** across the
full horizon of BOTH canonicals (``within_tolerance=True``, ``max_abs_err=0.0``),
INCLUDING through the 3D Taylor-Green blow-up (reference AND port both reach
``|u| ~5.1e19`` at step 500, bit-for-bit). This is the logical consequence of the
Stage-1b step-1 BIT-EXACT cross-stack baseline (S1b-SME2): with a step-1 cross-stack
difference of exactly zero, a positive-Lyapunov trajectory has nothing to amplify,
so the trajectories stay byte-identical regardless of Lyapunov regime. The
chaotic-regime escape-hatch is therefore NOT stack-portable Taichi → Warp (the
Stack-D Taichi port DID diverge; S1c-SME2). Full bit-exactness witness +
distinct-provenance evidence (this is not a copy/wiring defect):
``docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md`` (§ E; Stack-E).
Empirical record: the Stage-1c gate-14 STOP-evidence audit under
``docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/``.

These tests assert the achieved verdict: ``within_tolerance=True`` AND bit-exactness
(worst ``max_abs_err == 0.0`` over all per-field per-frame entries) AND that the
tolerance RESOLVED to ``smoke``/``1e-4`` (genuine cross-stack equivalence via the
REUSED ``[overrides.eulerian-smoke]`` -- not a KeyError / category-mismatch harness
no-op; D6). **STOP-discipline (R-SME1): a step-1 port-faithfulness failure is the
only STOP; bit-exactness is EXPECTED.** The 3D test is skip-guarded on the held-local
3D capture (738 MB; D14) -- it RUNS + asserts where the capture is present (local),
and skips cleanly in a capture-less checkout; the 2D capture is LFS-committed and
runs everywhere.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from eulerian_smoke_stack_e.sim import (  # type: ignore[import-not-found]
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
    sim_runner_seeded_2d,  # noqa: F401  # contract-import (public-API surface)
)


def _worst_abs_err(verdict: object) -> float:
    """Max over all per-field per-frame max_abs_err in the verdict."""
    pfd = verdict.per_field_diff  # type: ignore[attr-defined]
    return max((d.get("max_abs_err", 0.0) for d in pfd.values()), default=0.0)


def _both_present(left: Path, right: Path) -> bool:
    """Both capture manifests are on disk (the 3D RIGHT partner is held local; D14)."""
    return left.exists() and right.exists()


def test_lid_driven_cavity_cross_stack_bit_exact(
    ref_lid_driven_cavity_manifest_path: Path,
    stack_e_lid_driven_cavity_manifest_path: Path,
) -> None:
    """Gate-14 2D: the Warp port is cross-stack BIT-EXACT vs the NumPy reference.

    Asserts (a) ``within_tolerance=True``; (b) **bit-exactness** -- the worst
    ``max_abs_err`` over all per-field per-frame entries is exactly ``0.0`` (the
    strongest form of ``within_tolerance=True``, far inside the 1e-4 budget); (c)
    the tolerance RESOLVED to ``smoke``/``1e-4`` -- so this is a genuine cross-stack
    equivalence, NOT a KeyError / category-mismatch harness no-op (D6 reuse: the
    existing ``[overrides.eulerian-smoke]`` resolves the LEFT/reference ``sim.name``).
    The bit-exactness witness + distinct-provenance evidence are documented in
    equivalence.md § E (Stage 1c-revisited).
    """
    if not _both_present(
        ref_lid_driven_cavity_manifest_path, stack_e_lid_driven_cavity_manifest_path
    ):
        pytest.skip(f"gate-14 2D capture(s) absent: {stack_e_lid_driven_cavity_manifest_path.name}")
    verdict = compare_captures(
        left=ref_lid_driven_cavity_manifest_path,
        right=stack_e_lid_driven_cavity_manifest_path,
    )
    assert verdict.within_tolerance, (
        "cross-stack BIT-EXACT pair expects within_tolerance=True; got False -- "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
    worst = _worst_abs_err(verdict)
    assert worst == 0.0, (
        f"the Warp port is byte-identical to the NumPy reference; worst "
        f"max_abs_err={worst:.3e} (expected exactly 0.0 -- a non-zero value would "
        f"contradict the Stage-1c bit-exact finding / S1b-SME2 step-1 bit-exactness)"
    )
    resolved = verdict.tolerance_table_used
    assert resolved.get("category") == "smoke" and resolved.get("relative") == 1e-4, (
        f"verdict must be a genuine cross-stack equivalence at the resolved "
        f"smoke/1e-4 tolerance, not a harness error: {resolved}"
    )


def test_taylor_green_cross_stack_bit_exact(
    ref_taylor_green_manifest_path: Path,
    stack_e_taylor_green_manifest_path: Path,
) -> None:
    """Gate-14 3D: the Warp port is cross-stack BIT-EXACT through the blow-up.

    Skip-guarded on the held-local 3D capture (738 MB; LFS-bandwidth conservation,
    D14): RUNS + asserts where the capture is present (local), skips cleanly in a
    capture-less checkout. The assertions mirror the 2D test -- within_tolerance=
    True, worst max_abs_err == 0.0, resolved smoke/1e-4 -- and hold even though the
    trajectory blows up to ~5e19 (reference AND port reach it bit-for-bit; the
    cross-stack difference is exactly 0.0; equivalence.md § E.3).
    """
    if not _both_present(ref_taylor_green_manifest_path, stack_e_taylor_green_manifest_path):
        pytest.skip(
            "gate-14 3D Taylor-Green capture held local (738 MB; D14): "
            f"{stack_e_taylor_green_manifest_path.name} not present in this checkout"
        )
    verdict = compare_captures(
        left=ref_taylor_green_manifest_path,
        right=stack_e_taylor_green_manifest_path,
    )
    assert verdict.within_tolerance, (
        "cross-stack BIT-EXACT pair expects within_tolerance=True; got False -- "
        f"per_field_diff keys={list(verdict.per_field_diff)[:8]}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
    worst = _worst_abs_err(verdict)
    assert worst == 0.0, (
        f"the Warp port is byte-identical to the NumPy reference through the 3D "
        f"blow-up; worst max_abs_err={worst:.3e} (expected exactly 0.0)"
    )
    resolved = verdict.tolerance_table_used
    assert resolved.get("category") == "smoke" and resolved.get("relative") == 1e-4, (
        f"verdict must be a genuine cross-stack equivalence at smoke/1e-4: {resolved}"
    )
