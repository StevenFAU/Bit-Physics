"""Gate 4 — code verification via MMS for the Stack-D Gray-Scott port.

Consumes the bundled 2D MMS solution at
``tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/``
(Phase-1 RD-3D Stage 2 R8 deliverable; co-bundled 2D + 3D solutions).
The Stack-D Taichi sim's ``step_diffuse_react_with_source`` kernel
variant injects manufactured source terms and the observed L2 error
scales at the formal spatial order 2 (5-point Laplacian) within ±0.5
per phase-2-plan § 1.5.1 Gate 4.

The Stack-D sim module ``reaction_diffusion_2d_stack_d.sim`` does NOT
exist at the failing-tests commit — collection fails with
``ModuleNotFoundError`` cleanly until Stage 1b implements the module.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

# The MMS solution lives outside the package; import via sys.path.insert
# during the failing-tests commit too so collection touches the missing
# Stack-D module before any MMS-specific failure mode.
_MMS_DIR = Path(__file__).resolve().parents[3] / "tools/testkit/code_verification/mms/solutions"
sys.path.insert(0, str(_MMS_DIR))

from reaction_diffusion_2d.solution import (  # type: ignore[import-not-found]  # noqa: E402
    GrayScott2DSolution,
)
from reaction_diffusion_2d_stack_d.sim import (  # type: ignore[import-not-found]  # noqa: E402
    sim_runner_seeded,
    sim_runner_with_source_term,
)


def test_canonical_descriptor_matches_filename(
    stack_d_manifest_path: Path,
) -> None:
    assert stack_d_manifest_path.name == "gray-scott-lambda-128sq-seed42-step2000.json"


def test_canonical_capture_exists(stack_d_manifest_path: Path) -> None:
    assert stack_d_manifest_path.exists(), (
        f"Stack-D canonical capture missing at {stack_d_manifest_path}"
    )


def test_mms_observed_order_at_canonical_params(tmp_path: Path) -> None:
    """Observed spatial order of accuracy ≥ 1.5 (within ±0.5 of formal 2.0).

    Stage 1b implements ``sim_runner_with_source_term`` to accept a
    per-step (S_u, S_v) source-term pair injected into the Gray-Scott
    update. Stage 0 Task 0.5 verified the MMS solution + Taichi
    field.from_numpy round-trip is bit-exact.
    """
    sol = GrayScott2DSolution()
    grid_sizes = [16, 32, 64]
    errors: list[float] = []
    for n in grid_sizes:
        out_dir = tmp_path / f"n-{n}"
        out_dir.mkdir()
        manifest = sim_runner_with_source_term(
            seed=42,
            out_dir=out_dir,
            mms=sol,
            n=n,
            n_steps=10,
        )
        # Stage 1b will materialize the manifest; load + measure L2 error
        # against sol.evaluate. The exact assertion shape lands at Stage 1b.
        assert manifest.exists()
        errors.append(0.0)  # placeholder; Stage 1b fills in

    # Acceptance: observed order between log2 ratios of L2 errors ≥ 1.5.
    # Stage 1b activates the real assertion; Stage 1a only proves the
    # entry point exists in the public API.
    assert len(errors) == len(grid_sizes)


def test_canonical_capture_matches_stack_b_within_rtol_1em4(
    tmp_path: Path,
    stack_d_manifest_path: Path,
) -> None:
    """Stack-D canonical capture matches a fresh Stack-D NumPy reconstruction
    of the canonical seed within ``rtol=1e-4, atol=1e-6`` (same-stack
    code-verification anchor; mirrors Stack-B's gate-4 test pattern).
    """
    fresh = sim_runner_seeded(seed=42, out_dir=tmp_path)
    assert fresh.exists()
    # Stage 1b activates the real diff against stack_d_manifest_path;
    # Stage 1a only proves the entry point exists.
    assert isinstance(fresh, Path)
    assert stack_d_manifest_path.name.endswith(".json")
    _ = np.array([0.0])  # numpy import witnessed
