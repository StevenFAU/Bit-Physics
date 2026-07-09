"""G-Gammav (spec-ref.md § 3.5 / § 6.1): the finite-mobility gradient-flow
kernel (m = chi*dt = 1, the browser baseline) against the converged-elliptic
optimality solve on the same SENT scenario.

Measured 2026-07-09 at 64^2: peak rel diff 1.4e-3, final crack-path IoU
1.0, fracture-energy rel diff 2.5e-3 -> DECLARED peak <= 1 %, IoU >= 0.98,
E_frac <= 2 %. The disclosed Gamma(v) rate-toughness cost is invisible at
quasi-static loading with m = 1 — exactly what honesty boundary #3 requires
us to demonstrate, not assert.
"""

from __future__ import annotations

import pytest
from phase_field_fracture.invariants import crack_path_iou
from phase_field_fracture.solver import FractureConfig, TraceResult, run_trace


@pytest.fixture(scope="module")
def pair() -> tuple[TraceResult, TraceResult]:
    gf = run_trace(FractureConfig(n=64, mobility_m=1.0, capture_every=20000))
    ell = run_trace(FractureConfig(n=64, damage_mode="ell", capture_every=20000))
    return gf, ell


def test_peak_load_matches_converged_elliptic(
    pair: tuple[TraceResult, TraceResult],
) -> None:
    gf, ell = pair
    p_gf = max(d.reaction for d in gf.diagnostics)
    p_ell = max(d.reaction for d in ell.diagnostics)
    assert abs(p_gf - p_ell) / p_ell <= 0.01


def test_crack_path_matches_converged_elliptic(
    pair: tuple[TraceResult, TraceResult],
) -> None:
    gf, ell = pair
    assert crack_path_iou(gf.captures[-1].d, ell.captures[-1].d) >= 0.98


def test_fracture_energy_matches_converged_elliptic(
    pair: tuple[TraceResult, TraceResult],
) -> None:
    gf, ell = pair
    e_gf = gf.diagnostics[-1].e_frac
    e_ell = ell.diagnostics[-1].e_frac
    assert abs(e_gf - e_ell) / e_ell <= 0.02
