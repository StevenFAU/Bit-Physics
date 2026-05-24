"""Gate 14 (Phase-2-specific) -- Cross-stack equivalence between the Stack-D
Taichi Stam-Fedkiw port and the Phase-1 NumPy reference (CHAOTIC-REGIME pair).

This is the FIRST of five spec-Phase-2 cross-stack pairs to exercise the IC-15
R-P2 chaotic-regime escape-hatch (methodology
``docs/conventions/cross-stack-equivalence-methodology.md`` § 6, FORMALIZED at
Stage 2). BOTH canonical trajectories are numerically UNSTABLE (positive
Lyapunov): the 2D lid-driven shear layer is Kelvin-Helmholtz unstable; the 3D
Taylor-Green blows up under the collocated-grid / under-resolved-Jacobi numerics.
Cross-stack FP-round-off perturbations (the port matches the sealed NumPy
reference to ~1e-16 while stable) amplify to O(field), so gate-14
``within_tolerance=False`` is the CORRECT verdict (Option-2 operator routing) --
NOT a port defect (the blowup is in the SEALED Phase-1 reference, verified
independently). Full divergence-rate witness:
``docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md``.

These tests verify the escape-hatch is invoked CORRECTLY (not that the captures
are content-equivalent): the verdict is a genuine content-equivalence FAILURE
(tolerance resolved to smoke/1e-4 -- no KeyError / category-mismatch) AND the
divergence is O(field) (chaotic blow-up, not a marginal miss).
"""

from __future__ import annotations

from pathlib import Path

import pytest
from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from eulerian_smoke_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
    sim_runner_seeded_2d,  # noqa: F401  # contract-import (public-API surface)
)


def _worst_abs_err(verdict: object) -> float:
    """Max over all per-field per-frame max_abs_err in the verdict."""
    pfd = verdict.per_field_diff  # type: ignore[attr-defined]
    return max((d.get("max_abs_err", 0.0) for d in pfd.values()), default=0.0)


def test_lid_driven_cavity_chaotic_regime_escape_hatch(
    ref_lid_driven_cavity_manifest_path: Path,
    stack_d_lid_driven_cavity_manifest_path: Path,
) -> None:
    """Gate-14 2D: chaotic-regime escape-hatch is invoked CORRECTLY.

    Asserts (a) the verdict is ``within_tolerance=False`` (escape-hatch invoked
    per methodology § 6); (b) the tolerance RESOLVED to ``smoke``/``1e-4`` -- so
    the failure is a genuine content-equivalence failure, NOT a KeyError /
    category-mismatch harness error; (c) the worst ``max_abs_err`` is O(field)
    (>> tolerance), confirming chaotic blow-up rather than a marginal miss
    (Kelvin-Helmholtz instability; reference ``u`` reaches ~1.6e3 by step 5). The
    divergence-rate witness + step-1 port-faithfulness baseline (2D step-1
    ``max_abs_err = 0.0``) are documented in equivalence.md § 3-§ 4.
    """
    verdict = compare_captures(
        left=ref_lid_driven_cavity_manifest_path,
        right=stack_d_lid_driven_cavity_manifest_path,
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
    "D13). Chaotic-regime escape-hatch witnessed in equivalence.md § 4 "
    "(within_tolerance=False; reference max|u| -> 5.1e19; Stack-D -> 1.2e19). The 2D "
    "verdict test exercises the escape-hatch-invocation assertion against a "
    "committed capture."
)
def test_taylor_green_chaotic_regime_escape_hatch(
    ref_taylor_green_manifest_path: Path,
    stack_d_taylor_green_manifest_path: Path,
) -> None:
    """Gate-14 3D: chaotic-regime escape-hatch (witnessed in equivalence.md).

    SKIPPED because the 3D Stack-D capture is held local (the trajectory blows up
    to ~1e19 -- a 738MB artifact likely superseded by the Phase-1-canonical-
    regeneration question, banked per Option-2 routing). When the capture is
    available, the assertions mirror the 2D escape-hatch test: within_tolerance=
    False, resolved smoke/1e-4, worst max_abs_err O(field) (~5e20).
    """
    verdict = compare_captures(
        left=ref_taylor_green_manifest_path,
        right=stack_d_taylor_green_manifest_path,
    )
    assert not verdict.within_tolerance
    assert _worst_abs_err(verdict) > 1.0
