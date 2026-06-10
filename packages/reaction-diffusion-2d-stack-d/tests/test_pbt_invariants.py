"""Gate 11 — Property-based invariants for the Stack-D Gray-Scott port.

Same three invariants Stack-B declares at spec-ref.md § 6 ported
verbatim (same algorithm, same invariants); Stage 1a establishes the
failing-RED state, Stage 1b implements them.

- ``monotone_bounds_uv``: U, V each stay within [-slack, 1+slack] at
  every step (slack 0.5 per Stack-B's PROXY-INVARIANT note for
  forward-Euler transient overshoots on Hypothesis-generated smooth
  ICs).
- ``mass_approximately_conserved``: Sum(U)+Sum(V) drift bounded by
  source/sink capacity (tolerance 0.5).
- ``periodic_bc_satisfied``: opposite-boundary values agree within
  tolerance.

The Stack-D invariants module ``reaction_diffusion_2d_stack_d.invariants``
and the sim module do NOT exist at the failing-tests commit — collection
fails with ``ModuleNotFoundError`` cleanly until Stage 1b implements them.
"""

from __future__ import annotations

from pathlib import Path

from property.harness import run_invariants
from property.strategies import smooth_scalar_field_in_unit_box

from reaction_diffusion_2d_stack_d.invariants import (  # type: ignore[import-not-found]
    mass_approximately_conserved,
    monotone_bounds_uv,
    periodic_bc_satisfied,
)
from reaction_diffusion_2d_stack_d.sim import sim_runner_pbt  # type: ignore[import-not-found]


def test_pbt_monotone_bounds(tmp_path: Path) -> None:
    verdict = run_invariants(
        sim_runner_pbt,
        [monotone_bounds_uv()],
        strategy=smooth_scalar_field_in_unit_box(shape=(16,), lo=0.0, hi=1.0),
        n_examples=20,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed, [(r.invariant, r.detail, r.counter_example) for r in verdict.results]


def test_pbt_mass_approximately_conserved(tmp_path: Path) -> None:
    verdict = run_invariants(
        sim_runner_pbt,
        [mass_approximately_conserved()],
        strategy=smooth_scalar_field_in_unit_box(shape=(16,), lo=0.0, hi=1.0),
        n_examples=20,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed, [(r.invariant, r.detail, r.counter_example) for r in verdict.results]


def test_pbt_periodic_bc_satisfied(tmp_path: Path) -> None:
    """Mirrors Stack-B's `periodic_bc_satisfied` boundary-smoothness
    proxy (tolerance 2.0)."""
    verdict = run_invariants(
        sim_runner_pbt,
        [periodic_bc_satisfied(tolerance=2.0)],
        strategy=smooth_scalar_field_in_unit_box(shape=(16,), lo=0.0, hi=1.0),
        n_examples=20,
        tmp_dir=tmp_path,
    )
    assert verdict.all_passed, [(r.invariant, r.detail, r.counter_example) for r in verdict.results]
