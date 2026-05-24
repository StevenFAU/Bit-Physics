"""Gate 14 (Phase-2-specific) — Cross-stack equivalence between the Stack-D
Taichi DFSPH port and the Phase-1 NumPy reference.

ACTIVE at Stage 1c (gate 14). Diffs the Stack-D Taichi-DSL canonical capture
against the **NumPy-reference** capture (NOT a GPU Stack-B/Stack-C capture —
probe § 9 F1: the spec Stack-C Vulkan primary is unimplemented; the frozen
diff partner is the Phase-1 CPU reference) via ``compare_captures`` at
``relative = 1e-4, absolute = 0.0`` (the ``sph`` tolerance category, resolved
from ``sim.category='particle-fluids'`` by the MANDATORY per-sim
``[overrides.sph-water]`` entry added to ``tolerance.toml`` at Stage 1c —
D6; without it ``compare_captures`` raises ``KeyError`` per Stage-0 Task 0.4).

The per-field per-frame diff witness + step-horizon analysis will live in
``docs/sim-specs/particle-fluids/sph-water/equivalence.md`` (extended additively
at Stage 1c). Gate-14 is genuinely EMPIRICAL (R-S1): RD-2D's ~10-orders-of-margin
outcome does NOT auto-inherit (DFSPH's iterative pressure solve is more
FP-sensitive than RD-2D's single-pass explicit stencil).

The Stack-D sim module ``sph_water_stack_d.sim`` does NOT exist at the
failing-tests commit — collection fails with ``ModuleNotFoundError`` cleanly
until Stage 1b implements it (and the Stack-D canonical capture does not exist
until Stage 1b either).
"""

from __future__ import annotations

from pathlib import Path

import pytest
from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from sph_water_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_seeded,  # noqa: F401  # contract-import (probe § 5)
)


@pytest.mark.skip(
    reason="gate 14 activated at Stage 1c: needs [overrides.sph-water] category='sph' "
    "in tolerance.toml (D6; without it compare_captures raises KeyError per Stage-0 "
    "Task 0.4). Stage 1b ships the Stack-D canonical capture this test diffs against."
)
def test_stack_d_capture_within_tolerance_of_numpy_reference(
    ref_manifest_path: Path,
    stack_d_manifest_path: Path,
) -> None:
    """Stack-D Taichi capture diffs against the NumPy reference within
    ``relative = 1e-4, absolute = 0.0`` (sph category default).

    Stage 1c activates this test substantively. At Stage 1a + 1b it fails
    because neither the Stack-D capture nor the ``[overrides.sph-water]``
    tolerance entry exists yet. The verdict + per-field per-frame witness +
    step-horizon analysis are documented in ``equivalence.md`` regardless of
    pass/fail (R-S1; no silent tolerance widening).
    """
    verdict = compare_captures(
        left=ref_manifest_path,
        right=stack_d_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"NumPy-ref <-> Stack-D cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
