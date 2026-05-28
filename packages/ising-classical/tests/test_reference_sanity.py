"""Pure-NumPy reference sanity tests.

These exercise the reference Ising implementation directly without the
testkit's SimRunner protocol. Mirrors spec § 5.10 unit-test
expectations: closed-form Onsager/Yang anchors, fully-aligned-lattice
observables, sweep shape/spin-value preservation.

Stage 1a: every call raises ``NotImplementedError`` (the reference
module imports cleanly — shells exist — but the bodies land at Stage
1b). Stage 1b inverts to GREEN.
"""

from __future__ import annotations

import numpy as np

from ising_classical.reference import (
    IsingParams,
    canonical_params,
    critical_temperature,
    energy_per_spin,
    initial_condition,
    magnetization_per_spin,
    metropolis_sweep,
    onsager_magnetization,
)


def test_critical_temperature_is_onsager_closed_form() -> None:
    tc = critical_temperature()
    assert abs(tc - 2.0 / np.log(1.0 + np.sqrt(2.0))) < 1e-12
    assert abs(tc - 2.2691853142) < 1e-6


def test_onsager_magnetization_zero_at_and_above_tc() -> None:
    assert onsager_magnetization(3.0) == 0.0
    assert onsager_magnetization(critical_temperature() + 0.1) == 0.0


def test_onsager_magnetization_near_unity_deep_in_ordered_phase() -> None:
    m = onsager_magnetization(1.0)
    assert 0.99 < m <= 1.0


def test_fully_aligned_lattice_observables() -> None:
    p = IsingParams(n=8, J=1.0, h=0.0, T=2.27)
    spins = np.ones((p.n, p.n), dtype=np.int8)
    assert magnetization_per_spin(spins) == 1.0
    # All-aligned, J=1, 2N bonds each +1 → E/N = -2.
    assert abs(energy_per_spin(spins, p) - (-2.0)) < 1e-12


def test_canonical_params_lock() -> None:
    p = canonical_params()
    assert p.n == 128
    assert p.J == 1.0
    assert p.h == 0.0
    assert abs(p.T - 2.27) < 1e-12


def test_metropolis_sweep_preserves_shape_and_spin_alphabet() -> None:
    p = IsingParams(n=16, J=1.0, h=0.0, T=2.27)
    rng = np.random.default_rng(0)
    spins = initial_condition(p, seed=0)
    out = metropolis_sweep(spins, p, rng)
    assert out.shape == (p.n, p.n)
    assert set(int(v) for v in np.unique(out)).issubset({-1, 1})
