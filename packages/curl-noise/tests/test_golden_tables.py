"""Sim-side cross-check of the committed golden tables A-F: the package's
own reference APIs must reproduce the load-bearing committed rows
(the generator-side producer tests live at
tools/testkit/golden/tests/test_curl_noise_generators.py)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from curl_noise.reference.discrete import (
    matched_curl_2d,
    matched_divergence_2d,
)
from curl_noise.reference.fields import (
    CurlNoiseConfig,
    abc_curl,
    abc_flow,
    clebsch_helicity_integrand,
    divergence_trace,
    gradient_orthogonality,
    helicity_density,
    velocity,
)

TABLES = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "closed-form"
)


def _load(name: str) -> dict:
    with (TABLES / f"curl-noise-{name}.json").open() as fh:
        return json.load(fh)


def _expected(table: dict, quantity: str) -> dict:
    for tp in table["test_points"]:
        if tp["inputs"]["quantity"] == quantity:
            return tp["expected"]
    raise KeyError(quantity)


def test_golden_a_matched_divergence():
    exp = _expected(_load("divergence"), "matched_staggered_machine_zero")
    rng = np.random.default_rng(64)
    psi = rng.standard_normal((65, 65))
    dx = 1.0 / 64
    u, w = matched_curl_2d(psi, dx)
    div = matched_divergence_2d(u, w, dx)
    flux = max(np.abs(u).max(), np.abs(w).max()) / dx
    got = float(np.abs(div).max() / flux)
    assert abs(got - exp["matched_2d_normalized_div_max"]) < 1e-13
    assert got <= 1e-13  # the machine-zero gate itself


def test_golden_c_hessian_trace():
    exp = _expected(_load("crossprod"), "hessian_trace_divergence_identity")
    cfg = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)
    rng = np.random.default_rng(7)
    pts = rng.uniform(-3.0, 3.0, size=(300, 3))
    got = float(np.abs(divergence_trace(pts, cfg)).max())
    assert abs(got - exp["hessian_trace_div_max"]) <= 1e-12 + 1e-6 * abs(got)
    assert got <= 1e-10


def test_golden_e_abc_samples():
    exp = _expected(_load("analytic-fields"), "abc_flow_ground_truth")
    sample = np.array([[0.3, 1.1, -0.7], [2.0, -1.0, 0.5], [-0.4, 0.9, 2.2]])
    v = abc_flow(sample, 1.0, 1.0, 1.0)
    assert np.allclose(
        v, np.asarray(exp["abc_velocity_samples"]), rtol=1e-12, atol=1e-14
    )
    assert np.abs(abc_curl(sample) - v).max() == exp["abc_beltrami_residual"] == 0.0


@pytest.mark.parametrize(
    "key,fn",
    [
        ("grad_orthogonality_over_vscale", "orth"),
        ("clebsch_integrand_over_vscale", "clebsch"),
    ],
)
def test_golden_f_confinement(key, fn):
    exp = _expected(_load("helicity"), "confinement_identities_machine_zero")
    cfg = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)
    rng = np.random.default_rng(7)
    pts = rng.uniform(-3.0, 3.0, size=(300, 3))
    vscale = float(np.abs(velocity(pts, cfg)).max())
    if fn == "orth":
        og1, og2 = gradient_orthogonality(pts, cfg)
        got = float(max(np.abs(og1).max(), np.abs(og2).max()) / vscale)
    else:
        got = float(np.abs(clebsch_helicity_integrand(pts, cfg)).max() / vscale)
    assert abs(got - exp[key]) < 1e-13
    assert got <= 1e-12


def test_golden_f_kinetic_helicity_control_row():
    """The committed refutation row: kinetic helicity is FAR from zero."""
    exp = _expected(_load("helicity"), "kinetic_helicity_nonzero_control")
    assert exp["helicity_counterexample_sympy"] == "-4*x*y"
    cfg = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)
    rng = np.random.default_rng(7)
    pts = rng.uniform(-3.0, 3.0, size=(300, 3))
    got = float(np.abs(helicity_density(pts, cfg)).max())
    assert got > 1.0
    assert abs(got - exp["kinetic_helicity_max"]) <= 1e-6 * got


def test_all_six_tables_exist_and_are_wellformed():
    for name in (
        "divergence",
        "gradient-mms",
        "crossprod",
        "boundary",
        "analytic-fields",
        "helicity",
    ):
        t = _load(name)
        assert t["schema_version"] == "1.0.0"
        assert t["category"] == "closed-form"
        assert len(t["test_points"]) >= 2
        for tp in t["test_points"]:
            assert "independent_reference" in tp
