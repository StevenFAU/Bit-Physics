"""1D optimal-profile / Gamma-convergence goldens (spec-ref.md § 4 G).

The AT2 profile d(x) = exp(-|x|/ell) and AT1 profile (1 - |x|/2ell)^2_+ have
regularized surface energy exactly Gc (= 1 non-dim) in the continuum; the
discrete energies must (a) match the committed table bit-tight and
(b) converge monotonically to 1 as h -> 0 (gate G-gamma's analytic core)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from phase_field_fracture.reference import (
    at1_profile_1d,
    at2_profile_1d,
    surface_energy_1d,
)

REPO = Path(__file__).resolve().parents[3]
TABLE = (
    REPO / "tools/testkit/golden/tables/fracture/phase-field-fracture-1d-profile.json"
)

PROFILES = {"at2": at2_profile_1d, "at1": at1_profile_1d}


def _energy(model: str, h: float, half_width: float) -> float:
    x = np.arange(-half_width, half_width + h / 2, h)
    d = PROFILES[model](x, 1.0)
    return surface_energy_1d(d, h, 1.0, model)


def test_golden_table_matches_reference_function() -> None:
    table = json.loads(TABLE.read_text())
    rel = float(table["tolerance"]["relative"])
    energy_points = [
        tp for tp in table["test_points"] if "surface_energy" in tp["expected"]
    ]
    assert len(energy_points) >= 6
    for tp in energy_points:
        inp = tp["inputs"]
        got = _energy(inp["model"], inp["h"], inp["half_width"])
        want = float(tp["expected"]["surface_energy"])
        assert abs(got - want) <= rel * abs(want), (inp, got, want)
        # the independent (closed-form / exact-rational) recomputation agrees
        recomputed = float(tp["independent_reference"]["surface_energy_recomputed"])
        assert abs(want - recomputed) <= 1e-10


def test_golden_table_pointwise_profile_anchors() -> None:
    table = json.loads(TABLE.read_text())
    pw = [tp for tp in table["test_points"] if "d_at_ell" in tp["expected"]]
    assert len(pw) == 2
    for tp in pw:
        prof = PROFILES[tp["inputs"]["model"]]
        x = np.array([0.0, 1.0, 2.0])
        d = prof(x, 1.0)
        assert abs(d[0] - tp["expected"]["d_at_0"]) <= 1e-15
        assert abs(d[1] - tp["expected"]["d_at_ell"]) <= 1e-15
        assert abs(d[2] - tp["expected"]["d_at_2ell"]) <= 1e-15


def test_gamma_convergence_to_gc() -> None:
    """Discrete surface energy -> 1 monotonically as h -> 0 (both models)."""
    for model in PROFILES:
        devs = [abs(_energy(model, h, 20.0) - 1.0) for h in (0.1, 0.05, 0.02, 0.01)]
        assert all(a > b for a, b in zip(devs, devs[1:], strict=False)), (model, devs)
        assert devs[-1] <= 2e-5, (model, devs[-1])


def test_profile_pointwise_values() -> None:
    """Profile closed forms at pinned abscissae (exact arithmetic)."""
    x = np.array([0.0, 1.0, 2.0])
    at2 = at2_profile_1d(x, 1.0)
    assert at2[0] == 1.0
    assert abs(at2[1] - float(np.exp(-1.0))) <= 1e-15
    at1 = at1_profile_1d(x, 1.0)
    assert at1[0] == 1.0
    assert abs(at1[1] - 0.25) <= 1e-15
    assert at1[2] == 0.0  # compact support at 2 ell
