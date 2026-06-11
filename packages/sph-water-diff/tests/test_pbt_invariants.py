"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``gradient_matches_finite_difference`` - the differentiable-specific invariant (autodiff
  dLoss/dv0z ~= central FD <= 1e-3). Regime: fixed-topology interior free-fall cloud.
* ``density_summation_positive`` - a forward-physics invariant: kernel positivity makes
  every SPH density strictly positive (self term ``m*sigma_3/h^3 > 0``; f(q) >= 0). Regime:
  any h > 0, finite positions, positive mass.
"""

from __future__ import annotations

import taichi as ti
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from sph_water_diff.forward import SphDiffConfig, cloud_initial_positions
from sph_water_diff.invariants import (
    density_summation_positive,
    gradient_matches_finite_difference,
)


def _fresh_runtime() -> None:
    # Each Hypothesis example runs on a fresh deterministic single-thread Taichi runtime so
    # per-example field allocations do not accumulate (the mpm-diff precedent).
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)


@given(v0z=st.floats(min_value=-0.4, max_value=0.4))
@settings(
    max_examples=10,
    deadline=None,
    derandomize=True,
    # Skip shrink: on the Stage-1a RED state every example fails (forward raises
    # NotImplementedError); shrinking would re-init Taichi hundreds of times. derandomize +
    # skip-shrink keep RED fast and the gate-13 evidence byte-stable (mpm-diff precedent).
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_gradient_matches_finite_difference_pbt(v0z: float) -> None:
    _fresh_runtime()
    cfg = SphDiffConfig(steps=5)
    x0 = cloud_initial_positions(cfg)
    assert gradient_matches_finite_difference(cfg, x0, v0z=v0z, rel_tol=1e-3)


@given(h=st.floats(min_value=0.03, max_value=0.12))
@settings(
    max_examples=10,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_density_summation_positive_pbt(h: float) -> None:
    _fresh_runtime()
    cfg = SphDiffConfig()
    x0 = cloud_initial_positions(cfg)
    assert density_summation_positive(cfg, x0, h=h)
