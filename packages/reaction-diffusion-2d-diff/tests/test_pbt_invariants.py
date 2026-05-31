"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``gradient_matches_finite_difference`` — the differentiable-specific invariant
  (autodiff grad ≈ central FD ≤ 1e-3). Regime: smooth interior, small step-count.
* ``concentration_change_bounded`` — a forward-physics invariant (re-scoped from the
  reference's ``monotone_bounds``): no explicit-Euler step exceeds its rate budget.
"""

from __future__ import annotations

import taichi as ti
from hypothesis import given, settings
from hypothesis import strategies as st

from reaction_diffusion_2d_diff.forward import RD2DDiffConfig
from reaction_diffusion_2d_diff.invariants import (
    concentration_change_bounded,
    gradient_matches_finite_difference,
)
from reaction_diffusion_2d_diff.sim import smooth_initial_condition


def _fresh_runtime() -> None:
    # Each Hypothesis example runs on a fresh deterministic Taichi runtime so
    # per-example field allocations do not accumulate.
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)


@given(du=st.floats(min_value=0.06, max_value=0.30))
@settings(max_examples=12, deadline=None)
def test_gradient_matches_finite_difference_pbt(du: float) -> None:
    _fresh_runtime()
    cfg = RD2DDiffConfig(n=16, steps=6)
    u0, v0 = smooth_initial_condition(cfg.n)
    assert gradient_matches_finite_difference(cfg, u0, v0, du=du, rel_tol=1e-3)


@given(du=st.floats(min_value=0.04, max_value=0.40))
@settings(max_examples=12, deadline=None)
def test_concentration_change_bounded_pbt(du: float) -> None:
    _fresh_runtime()
    cfg = RD2DDiffConfig(n=16, steps=8)
    u0, v0 = smooth_initial_condition(cfg.n)
    assert concentration_change_bounded(cfg, u0, v0, du=du)
