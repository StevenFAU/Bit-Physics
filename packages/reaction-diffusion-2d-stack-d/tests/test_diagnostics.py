"""Gates 5 + 6 — Tier 1 health + Tier 2 scalar_field bounds for the
Stack-D Gray-Scott canonical capture.

Applies ``diagnostics.tier1.health.check_health`` (NaN/Inf scan) and
``diagnostics.tier2.scalar_field.monotone_bounds.check_bounds`` (U, V ∈
[0, 1]) to the Stack-D canonical capture.

The Stack-D sim module ``reaction_diffusion_2d_stack_d.sim`` does NOT
exist at the failing-tests commit — collection fails with
``ModuleNotFoundError`` cleanly until Stage 1b implements the module.
"""

from __future__ import annotations

from pathlib import Path

from capture import load_capture
from diagnostics.tier1.health import check_health
from diagnostics.tier2.scalar_field.monotone_bounds import check_bounds
from reaction_diffusion_2d_stack_d.sim import (
    sim_runner_seeded,  # type: ignore[import-not-found]  # noqa: F401
)


def test_stack_d_canonical_capture_is_healthy(stack_d_manifest_path: Path) -> None:
    """No NaN/Inf in any captured frame of the Stack-D canonical."""
    capture = load_capture(stack_d_manifest_path)
    report = check_health(capture)
    assert report.ok, (
        f"Stack-D canonical capture has NaN/Inf: nan={report.nan_count}, "
        f"inf={report.inf_count}, first_step={report.first_offending_step}, "
        f"first_field={report.first_offending_field}"
    )


def test_stack_d_canonical_capture_U_in_unit_interval(stack_d_manifest_path: Path) -> None:
    """U remains in [0, 1] across every captured step (Tier 2 scalar_field)."""
    capture = load_capture(stack_d_manifest_path)
    report = check_bounds(capture, field="U", lo=0.0, hi=1.0)
    assert report.ok, f"Stack-D U bounds violations: {report.violations[:3]}"


def test_stack_d_canonical_capture_V_in_unit_interval(stack_d_manifest_path: Path) -> None:
    """V remains in [0, 1] across every captured step (Tier 2 scalar_field)."""
    capture = load_capture(stack_d_manifest_path)
    report = check_bounds(capture, field="V", lo=0.0, hi=1.0)
    assert report.ok, f"Stack-D V bounds violations: {report.violations[:3]}"
