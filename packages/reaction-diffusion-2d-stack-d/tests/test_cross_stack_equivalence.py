"""Gate 14 (Phase-2-specific) — Cross-stack equivalence between Stack-D
Taichi port and Stack-B WGSL/WebGPU reference.

PLACEHOLDER at Stage 1a — Stage 1c populates the substantive
cross-stack-equivalence work + extends ``docs/sim-specs/continuous-ca/
reaction-diffusion-2d/equivalence.md`` with the per-field diff witness
+ step-horizon documentation. D3 + D4 ratifications: tolerance
``relative = 1e-4, absolute = 0.0`` per HEAD ``tolerance.toml`` category
default; step-horizon = full canonical step-2000.

This file fails cleanly at module-collection time on the missing
Stack-D sim module; Stage 1b makes it collectable; Stage 1c activates
the substantive cross-stack diff against the Stack-B canonical capture
at ``captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}``.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from reaction_diffusion_2d_stack_d.sim import (
    sim_runner_seeded,  # type: ignore[import-not-found]  # noqa: F401
)

pytestmark = pytest.mark.skip(
    reason=(
        "Gate-14 cross-stack equivalence is Stage-1c scope per charter § 4.2.3. "
        "Stage 1b ships the Stack-D canonical capture; Stage 1c authors "
        "docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md + "
        "removes this skip + activates the harness invocation."
    )
)


def test_stack_d_capture_within_tolerance_of_stack_b(
    stack_d_manifest_path: Path,
    stack_b_manifest_path: Path,
) -> None:
    """Stack-D Taichi capture diffs against Stack-B WGSL reference within
    ``relative = 1e-4, absolute = 0.0`` (RD category default).

    Stage 1c activates this test substantively. At Stage 1a + 1b the
    test fails because the Stack-D capture does not yet exist; at
    Stage 1c the Stack-D canonical capture is produced + diffed
    against Stack-B at the canonical descriptor.
    """
    verdict = compare_captures(
        left=stack_b_manifest_path,
        right=stack_d_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"Stack-B↔Stack-D cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
