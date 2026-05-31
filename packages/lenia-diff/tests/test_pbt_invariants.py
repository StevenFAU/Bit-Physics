"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``gradient_matches_finite_difference`` — the differentiable-specific invariant (autodiff
  (∂Loss/∂mu,∂Loss/∂sigma) ≈ central FD ≤ 1e-3). Regime: smooth interior, params away from clip
  saturation.
* ``field_bounded`` — a forward-physics invariant (the Phase-3 lenia ``monotone_bounds``
  re-scoped): the clip-Euler field stays in [0,1] over the horizon.
"""

from __future__ import annotations

import taichi as ti
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from lenia_diff.forward import LeniaDiffConfig
from lenia_diff.invariants import field_bounded, gradient_matches_finite_difference
from lenia_diff.sim import smooth_initial_condition


def _fresh_runtime() -> None:
    # Each Hypothesis example runs on a fresh deterministic Taichi runtime so per-example
    # field allocations do not accumulate.
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)


@given(
    mu=st.floats(min_value=0.25, max_value=0.35), sigma=st.floats(min_value=0.12, max_value=0.20)
)
@settings(
    max_examples=12,
    deadline=None,
    derandomize=True,
    # Skip the shrink phase: on the Stage-1a RED state every example fails (the forward
    # raises NotImplementedError), and shrinking would re-init Taichi hundreds of times,
    # pushing the failing-suite wall-clock past 60s. Pytest then prints a `(H:MM:SS)`
    # suffix on its summary line that the gate-13 replay normalizer does not strip, so the
    # committed RED evidence and the worktree replay would never match. derandomize pins
    # the example sequence; skipping shrink keeps the RED run fast (<60s) and byte-stable.
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_gradient_matches_finite_difference_pbt(mu: float, sigma: float) -> None:
    _fresh_runtime()
    cfg = LeniaDiffConfig(grid=16, R=3, steps=3, mu=mu, sigma=sigma)
    a0 = smooth_initial_condition(cfg.grid, mu)
    assert gradient_matches_finite_difference(cfg, a0, mu=mu, sigma=sigma, rel_tol=1e-3)


@given(
    mu=st.floats(min_value=0.20, max_value=0.40), sigma=st.floats(min_value=0.10, max_value=0.25)
)
@settings(
    max_examples=12,
    deadline=None,
    derandomize=True,
    # Skip the shrink phase: on the Stage-1a RED state every example fails (the forward
    # raises NotImplementedError), and shrinking would re-init Taichi hundreds of times,
    # pushing the failing-suite wall-clock past 60s. Pytest then prints a `(H:MM:SS)`
    # suffix on its summary line that the gate-13 replay normalizer does not strip, so the
    # committed RED evidence and the worktree replay would never match. derandomize pins
    # the example sequence; skipping shrink keeps the RED run fast (<60s) and byte-stable.
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)
def test_field_bounded_pbt(mu: float, sigma: float) -> None:
    _fresh_runtime()
    cfg = LeniaDiffConfig(grid=16, R=3, steps=6, mu=mu, sigma=sigma)
    a0 = smooth_initial_condition(cfg.grid, mu)
    assert field_bounded(cfg, a0, mu=mu, sigma=sigma)
