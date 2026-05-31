"""Gate-11 property-based invariants (regime-scoped; re-declared never widened).

* ``force_matches_finite_difference`` — the variant-axis invariant: the engine force == -∇E (central
  FD) for random configs. The operator's "force = -∇E identity" rigorous core. (Energy MONOTONICITY
  is NOT a PBT — unsound for the canonical LOCAL rule.)
* ``total_energy_translation_invariant`` — E_total(P + δ) == E_total(P) for random configs + shifts
  (exact symmetry; Σ∇E_total = 0). The LOCAL force sum is NOT zero, so the sound symmetry anchor is
  the GLOBAL-energy invariance.
"""

from __future__ import annotations

import numpy as np
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from particle_lenia.forward import ParticleLeniaConfig
from particle_lenia.invariants import (
    force_matches_finite_difference,
    total_energy_translation_invariant,
)

_SETTINGS = settings(
    max_examples=8,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)


def _positions(seed: int, n: int = 10) -> np.ndarray:
    return np.random.default_rng(seed).uniform(-6.0, 6.0, size=(n, 2))


@given(seed=st.integers(min_value=0, max_value=10_000))
@_SETTINGS
def test_force_matches_finite_difference_pbt(seed: int) -> None:
    cfg = ParticleLeniaConfig(n_particles=10, seed=seed)
    assert force_matches_finite_difference(cfg, _positions(seed), rel_tol=1e-5)


@given(
    seed=st.integers(min_value=0, max_value=10_000),
    dx=st.floats(min_value=-9.0, max_value=9.0),
    dy=st.floats(min_value=-9.0, max_value=9.0),
)
@_SETTINGS
def test_total_energy_translation_invariant_pbt(seed: int, dx: float, dy: float) -> None:
    cfg = ParticleLeniaConfig(n_particles=10, seed=seed)
    assert total_energy_translation_invariant(cfg, _positions(seed), np.array([dx, dy]), atol=1e-8)
