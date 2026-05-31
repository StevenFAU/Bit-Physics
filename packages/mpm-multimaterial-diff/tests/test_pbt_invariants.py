"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``gradient_matches_finite_difference`` - the differentiable-specific invariant (autodiff
  dLoss/dv0 ~= central FD <= 1e-3). Regime: interior small-strain elastic, short horizon.
* ``momentum_change_bounded_by_impulse`` - a forward-physics invariant: the total particle
  momentum change equals the external gravity impulse (internal elastic + APIC transfer add
  no net momentum). Regime: interior (no boundary clamp).
"""

from __future__ import annotations

import numpy as np
import taichi as ti
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from mpm_multimaterial_diff.forward import MpmDiffConfig, cluster_initial_positions
from mpm_multimaterial_diff.invariants import (
    gradient_matches_finite_difference,
    momentum_change_bounded_by_impulse,
)


def _fresh_runtime() -> None:
    # Each Hypothesis example runs on a fresh deterministic single-thread Taichi runtime so
    # per-example field allocations do not accumulate and the P2G scatter stays serialised.
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)


@given(
    vx=st.floats(min_value=-0.4, max_value=0.4),
    vy=st.floats(min_value=-0.4, max_value=0.4),
    vz=st.floats(min_value=-0.4, max_value=0.4),
)
@settings(
    max_examples=10,
    deadline=None,
    derandomize=True,
    # Skip shrink: on the Stage-1a RED state every example fails (forward raises
    # NotImplementedError); shrinking would re-init Taichi hundreds of times, pushing the
    # failing suite past 60s and emitting a `(H:MM:SS)` summary suffix the gate-13 replay
    # normalizer does not strip. derandomize + skip-shrink keep RED fast (<60s) and byte-stable.
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_gradient_matches_finite_difference_pbt(vx: float, vy: float, vz: float) -> None:
    _fresh_runtime()
    cfg = MpmDiffConfig(steps=5)
    x0 = cluster_initial_positions(cfg)
    v0 = np.array([vx, vy, vz])
    assert gradient_matches_finite_difference(cfg, x0, v0=v0, rel_tol=1e-3)


@given(
    vx=st.floats(min_value=-0.5, max_value=0.5),
    vy=st.floats(min_value=-0.5, max_value=0.5),
    vz=st.floats(min_value=-0.5, max_value=0.5),
)
@settings(
    max_examples=10,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_momentum_change_bounded_by_impulse_pbt(vx: float, vy: float, vz: float) -> None:
    _fresh_runtime()
    cfg = MpmDiffConfig(steps=6)
    x0 = cluster_initial_positions(cfg)
    v0 = np.array([vx, vy, vz])
    assert momentum_change_bounded_by_impulse(cfg, x0, v0=v0)
