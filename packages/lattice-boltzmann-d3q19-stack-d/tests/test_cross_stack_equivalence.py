"""Gate 14 (Phase-2-specific) -- Cross-stack equivalence between the Stack-D
Taichi D3Q19 BGK port and the Phase-1 NumPy reference, for BOTH canonical
captures (Poiseuille + Couette; D4).

ACTIVE at Stage 1c (gate 14). Diffs each Stack-D Taichi-DSL canonical capture
against the **NumPy-reference** capture at ``captures/lbm-ref/`` (NOT a GPU
Stack-B/Stack-C capture: the spec-designated Stack-C Vulkan primary is
unimplemented; the frozen diff partner is the Phase-1 CPU reference) via
``compare_captures`` at ``relative = 1e-5, absolute = 0.0`` (the ``lbm``
tolerance category, resolved from ``sim.category='lattice'`` by the MANDATORY
per-sim ``[overrides.lattice-boltzmann-d3q19]`` entry added to ``tolerance.toml``
at Stage 1c -- D6; without it ``compare_captures`` raises ``KeyError`` per
Stage-0 Task 0.5).

The per-field per-frame diff witness + step-horizon analysis (both descriptors,
independent verdicts) will live in
``docs/sim-specs/lattice/lattice-boltzmann-d3q19/equivalence.md`` (extended
additively at Stage 1c). Gate-14 is genuinely EMPIRICAL: the 1e-5 budget is 10x
tighter than the prior pairs' 1e-4 (less headroom), and the trajectory invokes
genuine per-cell collision-step FP-accumulation (D9) -- the prior pairs' margins
do NOT auto-inherit.

The Stack-D sim module ``lattice_boltzmann_d3q19_stack_d.sim`` does NOT exist at
the failing-tests commit -- collection fails with ModuleNotFoundError cleanly
until Stage 1b implements it (and the Stack-D canonical captures do not exist
until Stage 1b either). Stage 1b re-skips this file; Stage 1c activates it.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from equivalence.harness import compare_captures  # type: ignore[import-not-found]

from lattice_boltzmann_d3q19_stack_d.sim import (  # type: ignore[import-not-found]
    sim_runner_seeded,  # noqa: F401  # contract-import (public-API surface)
    sim_runner_seeded_couette,  # noqa: F401  # contract-import (public-API surface)
)

# Gate-14 is a Stage 1c deliverable: it needs the Stack-D canonical captures
# (Stage 1b produces them) AND the MANDATORY [overrides.lattice-boltzmann-d3q19]
# tolerance entry (D6; Stage 1c adds it -- without it compare_captures raises
# KeyError per Stage-0 Task 0.5). Stage 1a left this file as module-import RED;
# Stage 1b adds this SKIP; Stage 1c removes it and activates both verdicts.
pytestmark = pytest.mark.skip(
    reason="gate-14 cross-stack equivalence: Stage 1c implements "
    "(needs Stack-D captures + [overrides.lattice-boltzmann-d3q19] @ 1e-5)"
)


def test_poiseuille_capture_within_tolerance_of_numpy_reference(
    ref_poiseuille_manifest_path: Path,
    stack_d_poiseuille_manifest_path: Path,
) -> None:
    """Stack-D Poiseuille capture diffs against the NumPy reference within
    ``relative = 1e-5, absolute = 0.0`` (lbm category default).

    Stage 1c activates this substantively. The verdict + per-field per-frame
    witness + step-horizon analysis are documented in equivalence.md regardless
    of pass/fail (no silent tolerance widening; STOP + surface if exceeded).
    """
    verdict = compare_captures(
        left=ref_poiseuille_manifest_path,
        right=stack_d_poiseuille_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"NumPy-ref <-> Stack-D Poiseuille cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )


def test_couette_capture_within_tolerance_of_numpy_reference(
    ref_couette_manifest_path: Path,
    stack_d_couette_manifest_path: Path,
) -> None:
    """Stack-D Couette capture diffs against the NumPy reference within
    ``relative = 1e-5, absolute = 0.0`` (lbm category default).

    The second of two independent gate-14 verdicts (D4); documented separately
    in equivalence.md.
    """
    verdict = compare_captures(
        left=ref_couette_manifest_path,
        right=stack_d_couette_manifest_path,
    )
    assert verdict.within_tolerance, (
        f"NumPy-ref <-> Stack-D Couette cross-stack equivalence FAILED: "
        f"per_field_diff={verdict.per_field_diff}, "
        f"tolerance_table_used={verdict.tolerance_table_used}"
    )
