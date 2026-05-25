"""Gate 14 (Phase-2-specific) -- Cross-stack equivalence between the Stack-E
NVIDIA Warp Stam-Fedkiw port and the Phase-1 NumPy reference (CHAOTIC-REGIME pair).

The SECOND spec-Phase-2 cross-stack pair to exercise the IC-15 R-P2
chaotic-regime escape-hatch (methodology
``docs/conventions/cross-stack-equivalence-methodology.md`` § 6; FORMALIZED at the
eulerian-smoke Stack-D Stage 2) -- the FIRST on Stack-E, evidencing the escape-hatch
is stack-portable (Taichi → Warp). BOTH canonical trajectories are numerically
UNSTABLE (positive Lyapunov): the 2D lid-driven shear layer is Kelvin-Helmholtz
unstable (reference ``max|u| -> ~1.6e3`` by step 5); the 3D Taylor-Green blows up
under the collocated-grid / under-resolved-Jacobi numerics at canonical resolution
(R-SME9). Cross-stack FP-round-off perturbations (the port matches the sealed NumPy
reference to ~1e-16 at step 1) amplify to O(field), so gate-14
``within_tolerance=False`` is the CORRECT verdict (D10 routing) -- NOT a port defect
(the blowup is in the SEALED Phase-1 reference, verified independently at Stage 0
plan-drafting Task 1.6). Full divergence-rate witness:
``docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md`` (Stack-E section;
Stage 1c).

These tests verify the escape-hatch is invoked CORRECTLY (not that the captures are
content-equivalent): the verdict is a genuine content-equivalence FAILURE (tolerance
resolved to smoke/1e-4 -- no KeyError / category-mismatch) AND the divergence is
O(field) (chaotic blow-up, not a marginal miss). **STOP-discipline (D10): a step-1
port-faithfulness failure is the only STOP; ``within_tolerance=False`` is EXPECTED.**

Both tests are SKIPPED at Stage 1a/1b: the Stack-E captures are the Stage-1b
deliverable, and gate-14 is un-skipped at Stage 1c (charter § 2). The Stack-E
sim module ``eulerian_smoke_stack_e.sim`` does NOT exist at the failing-tests
commit (Stage 1a) -- collection fails with ModuleNotFoundError cleanly until the
Stage-1b implementation lands.
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


@pytest.mark.skip(
    reason="gate-14 un-skipped at Stage 1c (charter § 2); the Stack-E 2D "
    "lid-driven-cavity capture is the Stage-1b deliverable."
)
def test_lid_driven_cavity_chaotic_regime_escape_hatch(
    ref_lid_driven_cavity_manifest_path: Path,
    stack_e_lid_driven_cavity_manifest_path: Path,
) -> None:
    """Gate-14 2D: chaotic-regime escape-hatch is invoked CORRECTLY.

    Asserts (a) the verdict is ``within_tolerance=False`` (escape-hatch invoked
    per methodology § 6); (b) the tolerance RESOLVED to ``smoke``/``1e-4`` -- so
    the failure is a genuine content-equivalence failure, NOT a KeyError /
    category-mismatch harness error (D6 reuse: the existing
    ``[overrides.eulerian-smoke]`` resolves the LEFT/reference ``sim.name``); (c)
    the worst ``max_abs_err`` is O(field) (>> tolerance), confirming chaotic
    blow-up rather than a marginal miss (Kelvin-Helmholtz instability; reference
    ``u`` reaches ~1.6e3 by step 5). The divergence-rate witness + step-1
    port-faithfulness baseline are documented in equivalence.md § 3-§ 4 (Stage 1c).
    """
    verdict = compare_captures(
        left=ref_lid_driven_cavity_manifest_path,
        right=stack_e_lid_driven_cavity_manifest_path,
    )
    assert not verdict.within_tolerance, (
        "chaotic-regime escape-hatch expects within_tolerance=False; got True "
        "(the 2D lid-driven canonical is Kelvin-Helmholtz unstable -- a True "
        "verdict would contradict the methodology § 6 finding)"
    )
    resolved = verdict.tolerance_table_used
    assert resolved.get("category") == "smoke" and resolved.get("relative") == 1e-4, (
        f"verdict must be a genuine content-equivalence failure at the resolved "
        f"smoke/1e-4 tolerance, not a harness error: {resolved}"
    )
    worst = _worst_abs_err(verdict)
    assert worst > 1.0, (
        f"chaotic-regime divergence is O(field); worst max_abs_err={worst:.3e} "
        f"(expected >> 1e-4; a small value would indicate a near-miss, not chaos)"
    )


@pytest.mark.skip(
    reason="3D Taylor-Green capture held local (738MB; LFS-bandwidth conservation, "
    "D14). Chaotic-regime escape-hatch witnessed in equivalence.md (Stage 1c; "
    "within_tolerance=False; reference max|u| -> ~5e19). The 2D verdict test "
    "exercises the escape-hatch-invocation assertion against a committed capture."
)
def test_taylor_green_chaotic_regime_escape_hatch(
    ref_taylor_green_manifest_path: Path,
    stack_e_taylor_green_manifest_path: Path,
) -> None:
    """Gate-14 3D: chaotic-regime escape-hatch (witnessed in equivalence.md).

    SKIPPED because the 3D Stack-E capture is held local (the trajectory blows up
    to ~1e19 -- a 738MB artifact, D14). When the capture is available, the
    assertions mirror the 2D escape-hatch test: within_tolerance=False, resolved
    smoke/1e-4, worst max_abs_err O(field).
    """
    verdict = compare_captures(
        left=ref_taylor_green_manifest_path,
        right=stack_e_taylor_green_manifest_path,
    )
    assert not verdict.within_tolerance
    assert _worst_abs_err(verdict) > 1.0
