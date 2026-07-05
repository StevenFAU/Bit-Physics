"""PBT invariant sweeps (spec-ref.md § 6.6) over hbar x N x dt."""

from __future__ import annotations

import pytest

from schrodinger_smoke.invariants import (
    irrotational_stays_curl_free,
    norm_mass_unitary_conserved,
    per_mode_phase_exact,
    projection_divergence_contracts,
)


@pytest.mark.parametrize("hbar", [0.05, 0.1, 0.3])
@pytest.mark.parametrize("n", [16, 32])
@pytest.mark.parametrize("dt", [1.0 / 24.0, 1.0 / 96.0])
def test_norm_mass_unitary_conserved(hbar: float, n: int, dt: float) -> None:
    ok, drift = norm_mass_unitary_conserved(n, hbar, dt, seed=42)
    assert ok, f"norm drift {drift} at hbar={hbar} n={n} dt={dt}"


@pytest.mark.parametrize("n", [16, 32])
@pytest.mark.parametrize("seed", [1, 7, 42])
def test_projection_divergence_contracts(n: int, seed: int) -> None:
    ok, ratio = projection_divergence_contracts(n, seed)
    assert ok, f"post/pre divergence ratio {ratio} at n={n} seed={seed}"


@pytest.mark.parametrize("hbar", [0.05, 0.2])
@pytest.mark.parametrize("mode", [(1, 0, 0), (3, 2, 1), (5, 5, 5)])
def test_per_mode_phase_exact(hbar: float, mode: tuple[int, int, int]) -> None:
    ok, err = per_mode_phase_exact(32, hbar, 1.0 / 24.0, mode)
    assert ok, f"phase err {err} at hbar={hbar} mode={mode}"


@pytest.mark.parametrize("n", [16, 32])
def test_irrotational_stays_curl_free(n: int) -> None:
    ok, worst = irrotational_stays_curl_free(n, hbar=0.1)
    assert ok, f"plaquette circulation {worst} at n={n}"
