"""RBJ biquad response vs golden table D + scipy cross-check (§ 4.5)."""

import json
from pathlib import Path

import numpy as np
import pytest
from scipy.signal import freqz

from signal_workbench.filters import (
    BIQUAD_KINDS,
    freq_response,
    group_delay,
    impulse_response_dft,
    is_stable,
    rbj_coeffs,
)

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO / "tools/testkit/golden/tables/signal-processing/signal-workbench-biquad.json"
)


def test_table_responses_match_analytic() -> None:
    table = json.loads(TABLE.read_text())
    rel = float(table["tolerance"]["relative"])
    absol = float(table["tolerance"]["absolute"])
    for tp in table["test_points"]:
        inp = tp["inputs"]
        b, a = rbj_coeffs(inp["kind"], inp["f0"], inp["fs"], inp["q"], inp["gain_db"])
        omega = 2.0 * np.pi * np.asarray(inp["omega_fracs_of_fs"])
        h = freq_response(b, a, omega)
        tau = group_delay(b, a, omega)
        for got, want in zip(np.abs(h), tp["expected"]["mag"], strict=True):
            assert abs(got - want) <= max(rel * abs(want), absol)
        for got, want in zip(tau, tp["expected"]["group_delay"], strict=True):
            assert abs(got - want) <= max(rel * abs(want), absol)
        assert tp["expected"]["max_pole_radius"] < 1.0


@pytest.mark.parametrize("kind", BIQUAD_KINDS)
def test_scipy_freqz_agrees(kind: str) -> None:
    b, a = rbj_coeffs(kind, 1500.0, 48000.0, 3.0, 4.0)
    omega = 2.0 * np.pi * np.linspace(0.01, 0.45, 40)
    _, h_sp = freqz(b, a, worN=omega)
    h = freq_response(b, a, omega)
    assert np.max(np.abs(h - h_sp)) / np.max(np.abs(h)) <= 1e-12


@pytest.mark.parametrize("kind", BIQUAD_KINDS)
def test_stability_on_open_interval(kind: str) -> None:
    for f0_frac in (1e-3, 0.01, 0.1, 0.25, 0.49):
        for q in (0.1, 0.7071, 10.0, 100.0):
            b, a = rbj_coeffs(kind, f0_frac * 48000.0, 48000.0, q, 6.0)
            assert is_stable(a), (kind, f0_frac, q)


def test_impulse_response_dft_matches_closed_form() -> None:
    b, a = rbj_coeffs("lpf", 1200.0, 48000.0, 4.0, 0.0)
    n = 65536
    measured = impulse_response_dft(b, a, n)
    omega = 2.0 * np.pi * np.arange(n) / n
    golden = freq_response(b, a, omega)
    err = np.max(np.abs(measured - golden)) / np.max(np.abs(golden))
    assert err <= 1e-9, f"impulse-DFT vs H(e^jw) {err:.3e}"
