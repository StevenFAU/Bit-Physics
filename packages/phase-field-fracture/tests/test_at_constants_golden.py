"""AT1/AT2 closed-form constants vs the committed golden table
(spec-ref.md § 7.G: sigma_c, H_crit, homogeneous AT2 strain at peak)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from phase_field_fracture.reference import (
    at2_homogeneous_stress,
    h_crit_at1,
    sigma_c_at1,
    sigma_c_at2,
)

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO / "tools/testkit/golden/tables/fracture/phase-field-fracture-at-constants.json"
)


def test_golden_table_matches_reference_functions() -> None:
    table = json.loads(TABLE.read_text())
    rel = float(table["tolerance"]["relative"])
    assert len(table["test_points"]) >= 3
    for tp in table["test_points"]:
        e = tp["inputs"]["e"]
        gc = tp["inputs"]["gc"]
        ell = tp["inputs"]["ell"]
        exp = tp["expected"]
        for got, want in (
            (sigma_c_at1(e, gc, ell), exp["sigma_c_at1"]),
            (sigma_c_at2(e, gc, ell), exp["sigma_c_at2"]),
            (h_crit_at1(gc, ell), exp["h_crit_at1"]),
        ):
            assert abs(got - want) <= rel * abs(want), (tp["inputs"], got, want)
        # independent reordered-arithmetic recomputation agrees
        indep = tp["independent_reference"]
        assert abs(exp["sigma_c_at1"] - indep["sigma_c_at1_recomputed"]) <= (
            1e-9 * exp["sigma_c_at1"]
        )


def test_at2_homogeneous_peak_is_sigma_c() -> None:
    """The AT2 homogeneous stress-strain response (non-dim Gc = ell = 1)
    peaks at exactly sigma_c_at2 = sqrt(27 E/256) at eps_c = 1/sqrt(3E)."""
    table = json.loads(TABLE.read_text())
    for tp in table["test_points"]:
        if tp["inputs"]["gc"] != 1.0 or tp["inputs"]["ell"] != 1.0:
            continue
        e = tp["inputs"]["e"]
        eps_c = tp["expected"]["at2_homogeneous_eps_c"]
        eps = np.linspace(0.2 * eps_c, 3.0 * eps_c, 20001)
        sigma = at2_homogeneous_stress(eps, e)
        i = int(np.argmax(sigma))
        assert abs(eps[i] - eps_c) <= 2e-4 * eps_c
        assert abs(float(sigma[i]) - sigma_c_at2(e, 1.0, 1.0)) <= 1e-6 * sigma_c_at2(
            e, 1.0, 1.0
        )
        # analytic curvature check: sigma(eps_c +/- deps) < sigma(eps_c)
        s_peak = at2_homogeneous_stress(np.array([eps_c]), e)[0]
        for deps in (0.02 * eps_c, -0.02 * eps_c):
            assert at2_homogeneous_stress(np.array([eps_c + deps]), e)[0] < s_peak
