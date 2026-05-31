"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``total_mass_conserved`` — the variant-axis invariant (the genuine Flow Lenia delta): the
  reintegration step conserves Σ A to summation roundoff (~Nε, NOT bit-exact) for random configs.
  The SOUND home of the Phase-3 plain-Lenia ``mass_approximately_conserved`` invariant FALSIFIED
  under Quad4 (re-routed, not widened).
* ``mass_non_negative`` — a forward-physics invariant: the bilinear-splat keeps A ≥ 0 for random
  non-negative ICs.
"""

from __future__ import annotations

import numpy as np
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from flow_lenia.forward import FlowLeniaConfig
from flow_lenia.invariants import mass_non_negative, total_mass_conserved

_SETTINGS = settings(
    max_examples=8,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)


def _mass(seed: int, n: int = 24) -> np.ndarray:
    return np.random.default_rng(seed).uniform(0.0, 1.0, size=(n, n))


@given(seed=st.integers(min_value=0, max_value=10_000))
@_SETTINGS
def test_total_mass_conserved_pbt(seed: int) -> None:
    cfg = FlowLeniaConfig(grid=24, seed=seed)
    assert total_mass_conserved(cfg, _mass(seed), rel_tol=1e-12)


@given(seed=st.integers(min_value=0, max_value=10_000))
@_SETTINGS
def test_mass_non_negative_pbt(seed: int) -> None:
    cfg = FlowLeniaConfig(grid=24, seed=seed)
    assert mass_non_negative(cfg, _mass(seed))
