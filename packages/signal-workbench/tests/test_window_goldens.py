"""Window figures-of-merit vs golden table A (Nuttall/Heinzel anchors, § 4.2).

Includes the errata teeth: the committed Hann/BH3 values must be the
CORRECTED ones (-31.47 / -70.83 dB), i.e. materially different from
Harris 1978 Table I's printed -32 / -67 — a table that regressed to the
hand-copied Harris numbers must fail here.
"""

import json
from pathlib import Path

import numpy as np

from signal_workbench.windows import (
    WINDOW_COEFFS,
    cola_ripple,
    figures_of_merit,
    window,
)

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO / "tools/testkit/golden/tables/signal-processing/signal-workbench-windows.json"
)


def _table() -> dict:
    return json.loads(TABLE.read_text())


def test_figures_match_table() -> None:
    table = _table()
    rel = float(table["tolerance"]["relative"])
    checked = 0
    for tp in table["test_points"]:
        name = tp["inputs"]["window"]
        if "check" in tp["inputs"] or name not in figures_names():
            continue
        fom = figures_of_merit(name, tp["inputs"]["n"])
        for key in ("coherent_gain", "enbw_bins", "scallop_db", "wcpl_db", "psl_db"):
            want = float(tp["expected"][key])
            assert abs(fom[key] - want) <= rel * max(abs(want), 1e-300), (
                f"{name}.{key}: {fom[key]} != {want}"
            )
        checked += 1
    assert checked >= 8


def figures_names() -> set[str]:
    return set(WINDOW_COEFFS) | {"triangle"}


def test_harris_errata_teeth() -> None:
    """The goldens are the CORRECTED values, not Harris's printed ones."""
    hann = figures_of_merit("hann")["psl_db"]
    bh3 = figures_of_merit("blackmanharris3")["psl_db"]
    assert abs(hann - (-31.47)) < 0.02, hann
    assert abs(hann - (-32.0)) > 0.4, "regressed to Harris's printed Hann value"
    assert abs(bh3 - (-70.83)) < 0.02, bh3
    assert abs(bh3 - (-67.0)) > 3.0, "regressed to Harris's printed BH3 value"


def test_nuttall_4b_is_not_scipy_nuttall() -> None:
    """scipy's `nuttall` is the 4c min-sidelobe set; committed 4b must differ."""
    from scipy.signal.windows import nuttall

    n = 1024
    w4b = window("nuttall4b", n)
    w4c = window("nuttall4c", n)
    sp = nuttall(n, sym=False)
    assert np.max(np.abs(w4c - sp)) < 1e-6, "4c should match scipy nuttall"
    assert np.max(np.abs(w4b - sp)) > 1e-3, "4b must NOT match scipy nuttall"


def test_hamming_pinned_alpha_beats_exact_rational() -> None:
    fom_054 = figures_of_merit("hamming")["psl_db"]
    from signal_workbench.windows import _peak_sidelobe_db

    n = 4096
    k = np.arange(n)
    w2546 = 25 / 46 - 21 / 46 * np.cos(2 * np.pi * k / n)
    psl_2546 = _peak_sidelobe_db(w2546, n, 64)
    assert fom_054 < psl_2546, (fom_054, psl_2546)  # 0.54 is BETTER (lower)


def test_cola_trio() -> None:
    assert cola_ripple("hann", 512, 256, periodic=True) <= 1e-13
    assert cola_ripple("hann", 513, 256, periodic=False) <= 1e-13
    # wrong pairing is wrong: periodic Hann at R=(M-1)/2 does NOT sum flat
    assert cola_ripple("hann", 512, 255, periodic=True) > 1e-3
