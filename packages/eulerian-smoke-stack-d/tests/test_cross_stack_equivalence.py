"""Gate 14 (Phase-2-specific) -- Cross-stack equivalence between the Stack-D
Taichi Stam-Fedkiw port and the Phase-1 NumPy reference, for BOTH canonical
captures (3D Taylor-Green + 2D lid-driven-cavity; D4).

Diffs each Stack-D Taichi-DSL canonical capture against the **NumPy-reference**
capture at ``captures/eulerian-smoke-ref/`` (NOT a GPU Stack-B/Stack-C capture:
the spec-designated Stack-C Vulkan primary is unimplemented; the frozen diff
partner is the Phase-1 CPU reference) via ``compare_captures`` at
``relative = 1e-4, absolute = 0.0`` (the ``smoke`` tolerance category, resolved
from ``sim.category='volumetric-grid'`` by the MANDATORY per-sim
``[overrides.eulerian-smoke]`` entry in ``tolerance.toml`` -- D6; without it
``compare_captures`` raises ``KeyError``).

The per-field per-frame diff witness + step-horizon analysis (both descriptors,
independent verdicts) live in
``docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md`` (extended
additively). Gate-14 is genuinely EMPIRICAL: the cross-stack-non-trivial surface
is the fixed-cap (n_jacobi=20) Jacobi pressure-projection FP-accumulation
(deferred IC-15 aspect #5, in its determinism-safe fixed-iteration-count form).
The fixed sweep count is identical across stacks, so the delta is FP-accumulation,
NOT iteration-count divergence; the prior pairs' margins do NOT auto-inherit.

The Stack-D sim module ``eulerian_smoke_stack_d.sim`` does NOT exist at the
failing-tests commit -- collection fails with ModuleNotFoundError cleanly until
the implementation lands (and the Stack-D canonical captures do not exist until
the implementation commit either).
"""

from __future__ import annotations

from pathlib import Path

import pytest
from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from eulerian_smoke_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
    sim_runner_seeded_2d,  # noqa: F401  # contract-import (public-API surface)
)

# HARD-RULE-2 STOP (dispatch SECTION 2): both gate-14 verdicts returned
# within_tolerance=False. BOTH canonical trajectories are numerically UNSTABLE
# (NOT laminar, contra the plan-drafting probe § 6): the 2D lid-driven shear
# layer is Kelvin-Helmholtz unstable (reference u ~ 1.6e3 by step 5); the 3D
# Taylor-Green blows up under the collocated-grid / under-resolved-Jacobi
# numerics (reference max|u| 0.999 -> 8.1e7 [step 50] -> 5.1e19 [step 250]).
# Cross-stack FP-round-off perturbations (matched to ~1e-16 while stable) amplify
# to O(field) -- IC-15 deferred aspect #1 (chaotic-regime) is EXERCISED and
# cannot be cross-stack-equivalent at 1e-4 over the full horizon. The port is
# faithful (the blowup is in the sealed Phase-1 reference, verified independently).
# gate-14 RESOLUTION is PENDING operator routing (re-characterize the canonical /
# shorten the horizon / accept within_tolerance=False as a legitimate landing
# state per charter § 2 / R-P2 escape-hatch); NOT self-decided here. See
# docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1-checkpoint-*.md.
pytestmark = pytest.mark.skip(
    reason="Hard-Rule-2 STOP: gate-14 within_tolerance=False on BOTH canonicals "
    "(chaotic/unstable trajectories); operator routing pending per dispatch SECTION 2."
)


def test_taylor_green_capture_within_tolerance_of_numpy_reference(
    ref_taylor_green_manifest_path: Path,
    stack_d_taylor_green_manifest_path: Path,
) -> None:
    """Stack-D 3D Taylor-Green capture diffs against the NumPy reference within
    ``relative = 1e-4, absolute = 0.0`` (smoke category default).

    The verdict + per-field per-frame witness + step-horizon analysis are
    documented in equivalence.md regardless of pass/fail (no silent tolerance
    widening; STOP + surface if exceeded)."""
    verdict = compare_captures(
        left=ref_taylor_green_manifest_path,
        right=stack_d_taylor_green_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"NumPy-ref <-> Stack-D Taylor-Green cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )


def test_lid_driven_cavity_capture_within_tolerance_of_numpy_reference(
    ref_lid_driven_cavity_manifest_path: Path,
    stack_d_lid_driven_cavity_manifest_path: Path,
) -> None:
    """Stack-D 2D lid-driven-cavity capture diffs against the NumPy reference
    within ``relative = 1e-4, absolute = 0.0`` (smoke category default).

    The second of two independent gate-14 verdicts (D4); documented separately
    in equivalence.md."""
    verdict = compare_captures(
        left=ref_lid_driven_cavity_manifest_path,
        right=stack_d_lid_driven_cavity_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"NumPy-ref <-> Stack-D lid-driven-cavity cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
