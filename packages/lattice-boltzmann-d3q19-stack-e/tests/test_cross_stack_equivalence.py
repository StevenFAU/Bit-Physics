"""Gate 14 (Phase-2-specific) -- Cross-stack equivalence between the Stack-E
NVIDIA Warp D3Q19 BGK port and the Phase-1 NumPy reference, for BOTH canonical
captures (Poiseuille + Couette; D4) -- a LAMINAR-regime cross-stack BIT-EXACT pair.

The EIGHTH spec-Phase-2 cross-stack pair; the THIRD shape-(a) instance (after
MPM-E + smoke-E) and the FIRST on a LAMINAR trajectory (completing the D-S2-1
decoupling: shape (a) is a zero cross-stack seed-difference property, orthogonal
to the Lyapunov regime). BOTH canonical trajectories are LAMINAR / bounded /
dissipative (BGK tau=0.7 damps -- the inverse of smoke's positive-Lyapunov
blow-up). Per methodology § 6.1 R-P2 needs BOTH chaos (i) AND a non-zero step-1
seed-difference (ii); LBM has NEITHER (Task 1.6 Part A LAMINAR; Part B step-1
seed-difference MEASURED 0.0; Stage-0 Task 0.2 collision-surface max_abs_err=0.0
vs NumPy) -> gate-14 is a cross-stack BIT-EXACT witness: within_tolerance=True
AND max_abs_err=0.0 is the EXPECTED verdict (D10). The contrast to LBM-Stack-D
(Taichi, shape (b) ~6e-15) is the within-sim cross-backend confirmation of
methodology § 6.7 (the seed-difference is a backend-pair property, not the sim's).

Diffs each Stack-E Warp canonical capture against the NumPy-reference capture at
``captures/lbm-ref/`` via ``compare_captures`` at ``relative = 1e-5,
absolute = 0.0`` (the ``lbm`` tolerance category, resolved from
``sim.category='lattice'`` by the EXISTING ``[overrides.lattice-boltzmann-d3q19]``
entry -- D6 REUSE, established by Stack-D; no Stage-1c tolerance.toml edit).

**STOP-discipline (D10): a step-1 port-faithfulness failure (a step-1 diff >>
FP-round-off on a laminar trajectory) is the ONLY STOP; within_tolerance=True /
max_abs_err=0.0 is the EXPECTED verdict, NOT a STOP.** The per-field per-frame diff
witness + bit-exactness analysis (both descriptors, independent verdicts) lives in
``docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md`` (extended
additively at Stage 1c).

Both tests are SKIPPED at Stage 1a/1b: the Stack-E captures are the Stage-1b
deliverable, and gate-14 is un-skipped at Stage 1c (charter § 2). The Stack-E sim
module ``lattice_boltzmann_d3q19_stack_e.sim`` does NOT exist at the failing-tests
commit (Stage 1a) -- collection fails with ModuleNotFoundError cleanly until the
Stage-1b implementation lands.
"""

from __future__ import annotations

from pathlib import Path

from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from lattice_boltzmann_d3q19_stack_e.sim import (  # type: ignore[import-not-found]
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
    sim_runner_seeded_couette,  # noqa: F401  # contract-import (public-API surface)
)


def _worst_abs_err(verdict: object) -> float:
    """Max over all per-field per-frame max_abs_err in the verdict."""
    pfd = verdict.per_field_diff  # type: ignore[attr-defined]
    return max((d.get("max_abs_err", 0.0) for d in pfd.values()), default=0.0)


def test_poiseuille_capture_bit_exact_with_numpy_reference(
    ref_poiseuille_manifest_path: Path,
    stack_e_poiseuille_manifest_path: Path,
) -> None:
    """Gate-14 Poiseuille: cross-stack BIT-EXACT witness (shape (a)).

    Asserts (a) ``within_tolerance=True`` at the resolved lbm/1e-5 budget;
    (b) the worst ``max_abs_err == 0.0`` (BIT-EXACT, not merely within tolerance --
    the Warp f64 port reproduces the NumPy reference byte-for-byte, grounded by the
    Stage-0 collision-surface 0.0 + the probe full-step 0.0); (c) the tolerance
    RESOLVED to ``lbm``/``1e-5`` (D6 reuse: the existing
    ``[overrides.lattice-boltzmann-d3q19]`` resolves the LEFT/reference
    ``sim.name``; no KeyError / category-mismatch). STOP only on a step-1
    port-faithfulness failure (D10; inert per the MEASURED 0.0).
    """
    verdict = compare_captures(
        left=ref_poiseuille_manifest_path,
        right=stack_e_poiseuille_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"NumPy-ref <-> Stack-E Poiseuille cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
    resolved = verdict.tolerance_table_used
    assert resolved.get("category") == "lbm" and resolved.get("relative") == 1e-5, (
        f"tolerance must resolve to lbm/1e-5 (D6 reuse), not a harness error: {resolved}"
    )
    worst = _worst_abs_err(verdict)
    assert worst == 0.0, (
        f"shape-(a) gate-14 expects BIT-EXACT max_abs_err=0.0; got {worst:.3e} "
        f"(a non-zero value would be shape (b) FP-round-off -- still a gate-14 PASS "
        f"at 1e-5, but falsifies the Stage-0/probe MEASURED 0.0 prediction; surface it)"
    )


def test_couette_capture_bit_exact_with_numpy_reference(
    ref_couette_manifest_path: Path,
    stack_e_couette_manifest_path: Path,
) -> None:
    """Gate-14 Couette: cross-stack BIT-EXACT witness (shape (a)).

    The second of two independent gate-14 verdicts (D4; moving-wall Couette);
    documented separately in equivalence.md. Same assertions as the Poiseuille
    arm: within_tolerance=True, resolved lbm/1e-5, worst max_abs_err=0.0.
    """
    verdict = compare_captures(
        left=ref_couette_manifest_path,
        right=stack_e_couette_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"NumPy-ref <-> Stack-E Couette cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
    resolved = verdict.tolerance_table_used
    assert resolved.get("category") == "lbm" and resolved.get("relative") == 1e-5, (
        f"tolerance must resolve to lbm/1e-5 (D6 reuse), not a harness error: {resolved}"
    )
    worst = _worst_abs_err(verdict)
    assert worst == 0.0, (
        f"shape-(a) gate-14 expects BIT-EXACT max_abs_err=0.0; got {worst:.3e} "
        f"(a non-zero value would be shape (b) FP-round-off -- surface it)"
    )
