"""Gate 14 (Phase-2-specific) -- Cross-stack equivalence between the Stack-D
Taichi MLS-MPM port and the Phase-1 NumPy+numba reference, for the single
canonical capture (drop-impact-128cube-seed42-step500; D4).

ACTIVE at Stage 1c (gate 14). Diffs the Stack-D Taichi-DSL canonical capture
against the **NumPy+numba-reference** capture at ``captures/mpm-ref/`` (NOT a
GPU Stack-B/Stack-C capture: the spec-designated Stack-E Warp port is
unimplemented; the frozen diff partner is the Phase-1 CPU reference -- the
sph-water/LBM Stack-D pattern) via ``compare_captures`` at
``relative = 1e-4, absolute = 0.0`` (the ``mpm`` tolerance category, resolved
from ``sim.category='hybrid-pg'`` by the MANDATORY per-sim
``[overrides.mpm-multimaterial]`` entry added to ``tolerance.toml`` at Stage 1c
-- D6; without it ``compare_captures`` raises ``KeyError`` per Stage-0 Task 0.4).

Gate-14 is genuinely EMPIRICAL: this is the FIRST cross-stack pair to exercise
the P2G atomic-scatter surface (IC-15 deferred aspect #3) on the Stack-D side.
The Stage-0 Task 0.3 probe measured a posture-(i) serialised cross-stack diff of
~8.5e-10 single-step (~5 orders below 1e-4; ~6 orders larger than the prior 3
pairs' ~1e-15). The full-canonical step-500 roll-up (R-M2 drop-impact
amplification) is the load-bearing Stage-1c datum; the per-field per-frame diff
witness + step-horizon analysis live in
``docs/sim-specs/hybrid-pg/mpm-multimaterial/equivalence.md`` (extended additively
at Stage 1c) regardless of pass/fail.

The Stack-D sim module ``mpm_multimaterial_stack_d.sim`` does NOT exist at the
failing-tests commit -- collection fails with ModuleNotFoundError cleanly until
Stage 1b implements it (and the Stack-D canonical capture does not exist until
Stage 1b either). Stage 1b re-skips this file; Stage 1c activates it.
"""

from __future__ import annotations

from pathlib import Path

from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from mpm_multimaterial_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
)

# Gate-14 ACTIVE at Stage 1c: the MANDATORY [overrides.mpm-multimaterial]
# category="mpm" entry (D6) is in tolerance.toml, so compare_captures resolves
# sim.category='hybrid-pg' -> 'mpm' @ 1e-4 (no KeyError) and the verdict runs
# against the Phase-1 captures/mpm-ref reference partner. GREEN with ~24-order
# margin (rigid free-fall; particle_pos bit-exact; see equivalence.md).


def test_canonical_capture_within_tolerance_of_numpy_reference(
    ref_manifest_path: Path,
    stack_d_manifest_path: Path,
) -> None:
    """Stack-D drop-impact capture diffs against the NumPy+numba reference within
    ``relative = 1e-4, absolute = 0.0`` (mpm category default).

    Stage 1c activates this substantively. The verdict + per-field per-frame
    witness (particle_pos, particle_vel, grid_mom) + step-horizon analysis are
    documented in equivalence.md regardless of pass/fail (no silent tolerance
    widening; STOP + surface if exceeded -- R-M1).
    """
    verdict = compare_captures(
        left=ref_manifest_path,
        right=stack_d_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"NumPy+numba-ref <-> Stack-D drop-impact cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
