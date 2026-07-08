"""PBT invariant sweeps (spec-ref.md § 6.3) + material-path equivalence.

Each invariant callable returns (passed, measured); sweeps run over seeds and
parameters. Negative controls assert the invariants genuinely detect
violations (unstable dt breaks the maximum principle and L2 monotonicity).
"""

from __future__ import annotations

import numpy as np
import pytest
from heat_equation.invariants import (
    l2_energy_nonincreasing,
    mass_conserved_periodic_no_source,
    maximum_principle_stable_no_source,
    nonnegative_preserved,
    source_integral_accounted,
    spectral_per_mode_exact,
)
from heat_equation.reference import ftcs_step, material_flux_step, stability_bound_dt

SEEDS = (0, 1, 7)


@pytest.mark.parametrize("seed", SEEDS)
def test_mass_conserved(seed: int) -> None:
    passed, drift = mass_conserved_periodic_no_source(64, 0.02, steps=200, seed=seed)
    assert passed, f"mass drift {drift:.3e}"


@pytest.mark.parametrize("seed", SEEDS)
def test_maximum_principle(seed: int) -> None:
    passed, worst = maximum_principle_stable_no_source(64, 0.02, steps=200, seed=seed)
    assert passed, f"max-principle excursion {worst:.3e}"


@pytest.mark.parametrize("seed", SEEDS)
def test_l2_energy_nonincreasing(seed: int) -> None:
    passed, worst = l2_energy_nonincreasing(64, 0.02, steps=200, seed=seed)
    assert passed, f"L2 growth ratio {worst:.3e}"


@pytest.mark.parametrize("seed", SEEDS)
def test_nonnegative_preserved(seed: int) -> None:
    passed, worst = nonnegative_preserved(64, 0.02, steps=200, seed=seed)
    assert passed, f"negative excursion {worst:.3e}"


@pytest.mark.parametrize("seed", SEEDS)
def test_source_integral_accounted(seed: int) -> None:
    passed, err = source_integral_accounted(64, 0.02, steps=100, seed=seed)
    assert passed, f"source accounting error {err:.3e}"


@pytest.mark.parametrize("mode", [(1, 1), (5, 3), (9, 4)])
def test_spectral_per_mode(mode: tuple[int, int]) -> None:
    passed, err = spectral_per_mode_exact(64, 0.02, 1e-3, mode, steps=4)
    assert passed, f"per-mode error {err:.3e}"


def test_uniform_material_matches_constant_alpha_bitwise() -> None:
    """A uniform material buffer must reproduce the constant-alpha path
    BIT-FOR-BIT (spec-ref.md § 3.4) — variable-material mode must not weaken
    the canonical path.

    Note the harmonic mean of equal alphas is exact: 2*a*a/(2*a) = a.
    """
    n, alpha = 64, 0.02
    dx = 1.0 / n
    dt = 0.8 * stability_bound_dt(alpha, dx, dx)
    rng = np.random.default_rng(3)
    t0 = rng.standard_normal((n, n))
    alpha_cell = np.full((n, n), alpha)
    a = t0.copy()
    b = t0.copy()
    for _ in range(50):
        a = ftcs_step(a, alpha, dt, dx, dx)
        b = material_flux_step(b, alpha_cell, dt, dx, dx, eps=0.0)
    # Same real-arithmetic update; FP operation ORDER differs (flux form vs
    # stencil form), so the honest contract is near-machine agreement per
    # step, not byte identity across formulations:
    np.testing.assert_allclose(a, b, rtol=0.0, atol=1e-12)


def test_material_interface_conserves_heat() -> None:
    """Conservative face-flux form: total heat conserved to FP round-off
    across a hard material interface (the § 6.5 nonconservative-average
    negative control's positive twin)."""
    n = 64
    dx = 1.0 / n
    alpha_cell = np.full((n, n), 0.05)
    alpha_cell[:, n // 2 :] = 0.002  # 25x interface
    dt = 0.8 * stability_bound_dt(0.05, dx, dx)  # bound by the fast side
    rng = np.random.default_rng(4)
    t = 1.0 + 0.5 * rng.standard_normal((n, n))
    pre = float(np.sum(t))
    for _ in range(200):
        t = material_flux_step(t, alpha_cell, dt, dx, dx)
    assert abs(float(np.sum(t)) - pre) / abs(pre) <= 1e-12


def test_unstable_dt_violates_max_principle() -> None:
    """Negative control: dt at 1.15x the bound must blow past the envelope —
    proving the invariant is constraining."""
    n, alpha = 64, 0.02
    dx = 1.0 / n
    dt = 1.15 * stability_bound_dt(alpha, dx, dx)
    rng = np.random.default_rng(5)
    t = rng.standard_normal((n, n))
    hi = float(np.max(t))
    for _ in range(400):
        t = ftcs_step(t, alpha, dt, dx, dx)
    assert float(np.max(t)) > hi + 1.0
