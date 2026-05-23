"""Gate 14 (Phase-2-specific) — Cross-stack equivalence between Stack-D
Taichi port and Stack-B WGSL/WebGPU reference.

ACTIVE at Stage 1c (gate 14). Diffs the Stack-D Taichi-DSL canonical
capture against the Stack-B WGSL/WebGPU reference capture via
``compare_captures`` at ``relative = 1e-4, absolute = 0.0`` (the
``reaction-diffusion`` tolerance-category, resolved from
``sim.category='continuous-ca'`` by the per-sim
``[overrides.reaction-diffusion-2d]`` entry in ``tolerance.toml``;
D3 + D4 ratifications, step-horizon = full canonical step-2000). The
per-field diff witness + step-horizon analysis live in
``docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md``.
"""

from __future__ import annotations

from pathlib import Path

from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from reaction_diffusion_2d_stack_d.sim import (
    sim_runner_seeded,  # type: ignore[import-not-found]  # noqa: F401
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
