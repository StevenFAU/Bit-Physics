"""Gate 14 (Phase-2-specific) -- Cross-stack equivalence between the Stack-D
Taichi Stam-Fedkiw port and the Phase-1 NumPy reference.

HISTORY (P6-FPEDGE re-attribution). This pair originally exercised the IC-15
R-P2 chaotic-regime escape-hatch: the 2D lid-driven trajectory appeared
Kelvin-Helmholtz unstable (reference ``u`` -> ~1.6e3 by step 5) and gate-14
``within_tolerance=False`` was routed as the correct chaotic-regime verdict.
The P6-FPEDGE discovery audit re-attributed that 2D blow-up to a REFERENCE
BUG: the periodic-wrap FP-edge (``np.mod(-tiny, N) == N``) left the bilinear
interpolation FRACTION unguarded -- a xN extrapolation, firing in f64 on the
canonical's own IC. Post-fix (guard applied to the NumPy reference AND this
Taichi port; both 2D canonicals regenerated), the true 2D trajectory is a
quiet diffusive shear-layer decay and the port matches the reference to
~1.4e-16 -- near machine epsilon, a faithful port.

The verdict is STILL ``within_tolerance=False``, for a fully-understood
non-physics reason: the symmetric IC keeps the reference ``v`` field at
EXACTLY zero (~1e-17 round-off), so the per-field relative criterion
``max_abs <= rel * max|field|`` degenerates (threshold ~1e-20) and 1e-17-level
cross-stack round-off "fails" it. The 3D Taylor-Green case remains a REAL
parameter-level instability (explicit-diffusion CFL nu*dt/dx^2 ~= 0.82 >> the
7-point bound ~1/6; edge-probe CLEAN -- see the P6-FPEDGE audit), unchanged
by the fix.

These tests therefore verify: the port is content-faithful (near-bit
agreement), the tolerance wiring is intact (resolved smoke/1e-4, no KeyError),
and the residual False verdict is exactly the zero-field degeneracy -- not a
port defect and no longer a chaos story.
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


def test_lid_driven_cavity_post_fpedge_faithful_port(
    ref_lid_driven_cavity_manifest_path: Path,
    stack_d_lid_driven_cavity_manifest_path: Path,
) -> None:
    """Gate-14 2D, post-P6-FPEDGE: near-bit content faithfulness.

    Asserts (a) the port matches the regenerated reference to <= 1e-12 on
    EVERY field at EVERY checkpoint (MEASURED 1.4e-16 worst -- near machine
    epsilon; declared with ~4 orders of margin, measure-then-declare);
    (b) the tolerance RESOLVED to ``smoke``/``1e-4`` (harness wiring intact,
    no KeyError / category-mismatch); (c) the residual
    ``within_tolerance=False`` verdict is EXACTLY the zero-field relative-
    criterion degeneracy on ``v`` (see module docstring) -- the reference's
    ``v`` scale is itself <= 1e-12, so the relative threshold collapses below
    round-off. A True verdict OR an O(field) divergence would BOTH be
    regressions worth investigating (the former means the criterion changed;
    the latter means a trajectory bug returned).
    """
    verdict = compare_captures(
        left=ref_lid_driven_cavity_manifest_path,
        right=stack_d_lid_driven_cavity_manifest_path,
    )
    worst = _worst_abs_err(verdict)
    assert worst <= 1e-12, (
        f"post-P6-FPEDGE the 2D lid trajectory is quiet and the Taichi port is "
        f"near-bit faithful (measured 1.4e-16); worst max_abs_err={worst:.3e} "
        f"suggests a trajectory regression"
    )
    resolved = verdict.tolerance_table_used
    assert resolved.get("category") == "smoke" and resolved.get("relative") == 1e-4, (
        f"tolerance must resolve to smoke/1e-4, not a harness error: {resolved}"
    )
    assert not verdict.within_tolerance, (
        "within_tolerance unexpectedly True: the v-field zero-scale relative-"
        "criterion degeneracy documented in the module docstring should still "
        "produce False at 1e-17-level round-off diffs; if the criterion gained "
        "an absolute term, update this test AND equivalence.md deliberately"
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
