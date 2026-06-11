"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``hard_limit_matches_truth_table`` - the variant-axis invariant: every gate exact at
  binary corners (no tolerance).
* ``gradient_matches_finite_difference`` - the WU-A differentiable invariant (autodiff
  dLoss/dalpha ~= central FD <= 1e-3). Regime: alpha in [0,1], smooth polynomial map.
"""

from __future__ import annotations

import taichi as ti
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from neural_ca_frontier_difflogic.forward import DiffLogicConfig, soft_gate
from neural_ca_frontier_difflogic.invariants import (
    gradient_matches_finite_difference,
    hard_limit_matches_truth_table,
)


def _fresh_runtime() -> None:
    # Fresh deterministic single-thread Taichi runtime per Hypothesis example (the
    # batch-1 / U-1 precedent; field allocations must not accumulate).
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)


@given(gate=st.integers(min_value=0, max_value=15))
@settings(
    max_examples=16,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_hard_limit_matches_truth_table_pbt(gate: int) -> None:
    assert hard_limit_matches_truth_table(gate)


@given(
    gate=st.integers(min_value=0, max_value=15),
    a=st.floats(min_value=0.0, max_value=1.0),
    b=st.floats(min_value=0.0, max_value=1.0),
)
@settings(
    max_examples=32,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_soft_gate_output_bounded_pbt(gate: int, a: float, b: float) -> None:
    """Multilinear extensions map [0,1]^2 into [0,1] (convex corner combination)."""
    v = soft_gate(gate, a, b)
    assert -1e-15 <= v <= 1.0 + 1e-15


@given(alpha=st.floats(min_value=0.05, max_value=0.95))
@settings(
    max_examples=8,
    deadline=None,
    derandomize=True,
    # Skip shrink: on the stage-1a RED state every example fails (forward raises
    # NotImplementedError); derandomize + skip-shrink keep RED fast and the gate-13
    # evidence byte-stable (banked precedent).
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_gradient_matches_finite_difference_pbt(alpha: float) -> None:
    _fresh_runtime()
    cfg = DiffLogicConfig()
    assert gradient_matches_finite_difference(cfg, alpha=alpha, rel_tol=1e-3)
