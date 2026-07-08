"""THD/SINAD/SFDR/ENOB closed forms vs the measured pipeline (§ 4.7)."""

import json
from math import gcd
from pathlib import Path

import numpy as np

from signal_workbench.metrology import (
    enob_from_sinad,
    ideal_snr_db,
    quantize,
    sfdr_db,
    sinad_db,
    thd,
    thd_closed_form,
)
from signal_workbench.synthesis import sine

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO
    / "tools/testkit/golden/tables/signal-processing/signal-workbench-metrology.json"
)


def _table() -> dict:
    return json.loads(TABLE.read_text())


def _prescribed(n: int, k0: int, amps: list[float]) -> np.ndarray:
    x = np.zeros(n)
    for h, v in enumerate(amps, start=1):
        x += v * np.sin(2.0 * np.pi * ((h * k0) % n) * np.arange(n) / n)
    return x


def test_measured_pipeline_reproduces_closed_forms() -> None:
    tp = _table()["test_points"][0]
    n, k0, amps = tp["inputs"]["n"], tp["inputs"]["k0"], tp["inputs"]["amplitudes"]
    assert gcd(k0, n) == 1
    big_x = np.fft.fft(_prescribed(n, k0, amps))
    ceiling = float(tp["expected"]["measured_ceiling_rel"])
    got_thd = thd(big_x, k0, n_harmonics=len(amps) - 1)
    want_thd = float(tp["expected"]["thd"])
    assert abs(got_thd - want_thd) <= ceiling * want_thd
    assert abs(got_thd - thd_closed_form(amps)) <= ceiling * want_thd
    got_sinad = sinad_db(big_x, k0)
    assert abs(got_sinad - float(tp["expected"]["sinad_db"])) <= 1e-8
    got_sfdr = sfdr_db(big_x, k0)
    assert abs(got_sfdr - float(tp["expected"]["sfdr_db"])) <= 1e-8


def test_quantizer_bench_deterministic_golden() -> None:
    tp = _table()["test_points"][1]
    n, k0 = tp["inputs"]["n"], tp["inputs"]["k0"]
    bits, amp = tp["inputs"]["bits"], tp["inputs"]["amplitude"]
    xq = quantize(sine(n, k0, amp), bits)
    s = sinad_db(np.fft.fft(xq), k0)
    assert abs(s - float(tp["expected"]["measured_sinad_db"])) <= 1e-9
    assert abs(enob_from_sinad(s) - float(tp["expected"]["measured_enob"])) <= 1e-9
    assert ideal_snr_db(bits) == float(tp["expected"]["ideal_model_snr_db"])


def test_incoherent_thd_is_wrong_negative_control() -> None:
    """Off-bin tone + no window smears the harmonics: the THD reading must be
    visibly wrong — the IEEE-1241 lesson (§ 3.6), never a gate."""
    tp = _table()["test_points"][0]
    n, k0, amps = tp["inputs"]["n"], tp["inputs"]["k0"], tp["inputs"]["amplitudes"]
    i = np.arange(n)
    x = np.zeros(n)
    f0 = k0 + 0.5  # deliberately half-bin off
    for h, v in enumerate(amps, start=1):
        x += v * np.sin(2.0 * np.pi * h * f0 * i / n)
    got = thd(np.fft.fft(x), k0, n_harmonics=len(amps) - 1)
    want = thd_closed_form(amps)
    assert abs(got - want) / want > 0.5, (got, want)
