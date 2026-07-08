"""FM Bessel sideband golden (table C) + the canonical gate scene (§ 4.4)."""

import json
from pathlib import Path

import numpy as np
import pytest
from scipy.special import jv

from signal_workbench.sim import max_rel_of_peak, run_canonical
from signal_workbench.synthesis import (
    fm_energy_identity_residual,
    fm_expected_dft,
    fm_line_bins,
    fm_signal,
)

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO
    / "tools/testkit/golden/tables/signal-processing/signal-workbench-fm-bessel.json"
)


def test_table_sidebands_match_scipy() -> None:
    table = json.loads(TABLE.read_text())
    rel = float(table["tolerance"]["relative"])
    absol = float(table["tolerance"]["absolute"])
    for tp in table["test_points"]:
        index = tp["inputs"]["index"]
        for order, want in tp["expected"]["sideband_j_n"].items():
            got = float(jv(int(order), index))
            assert abs(got - want) <= max(rel * abs(want), absol)


@pytest.mark.parametrize(
    ("n", "kc", "km", "index"),
    [(4096, 512, 37, 3.2), (1024, 128, 9, 1.0), (4096, 512, 37, 5.520078110286311)],
)
def test_measured_fft_matches_folded_line_golden(
    n: int, kc: int, km: int, index: float
) -> None:
    x = fm_signal(n, kc, km, index)
    measured = np.fft.fft(x)
    golden = fm_expected_dft(n, kc, km, index)
    assert max_rel_of_peak(measured, golden) <= 1e-12


def test_energy_identity() -> None:
    for index in (0.5, 2.404825557695773, 3.2, 8.0):
        assert fm_energy_identity_residual(index) <= 1e-12


def test_carrier_null_at_bessel_zero() -> None:
    amps = fm_line_bins(4096, 512, 37, 2.404825557695773)
    assert abs(amps[512]) <= 1e-12  # carrier line vanishes


def test_odd_lower_sidebands_negative() -> None:
    """Chowning's sign structure: J_{-n} = (-1)^n J_n."""
    amps = fm_line_bins(4096, 512, 37, 1.0)
    j1 = float(jv(1, 1.0))
    assert amps[512 + 37] == pytest.approx(j1, rel=1e-14)
    assert amps[512 - 37] == pytest.approx(-j1, rel=1e-14)


def test_canonical_scene_gate() -> None:
    res = run_canonical()
    assert max_rel_of_peak(res.spec_fm, res.golden_fm) <= 1e-12
