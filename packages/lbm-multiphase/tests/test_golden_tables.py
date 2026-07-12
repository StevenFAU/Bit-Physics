"""Committed golden-table invariants (cheap re-assertions of the offline
f64 measurements; regeneration is `python -m lbm_multiphase all`). Tables
are golden-v1 schema-pure: everything lives in test_points, looked up here
by inputs.name."""

import json
import math
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
TABLES = REPO / "tools" / "testkit" / "golden" / "tables" / "lattice"


def _points(name: str) -> dict[str, dict]:
    txt = (TABLES / name).read_text()
    assert "NaN" not in txt, f"{name} contains NaN — invalid strict JSON"
    table = json.loads(txt)
    return {tp["inputs"]["name"]: tp for tp in table["test_points"]}


def test_coexistence_table():
    pts = _points("lbm-multiphase-coexistence.json")
    # G_c convention control: bisection == analytic -4/rho0
    gc = pts["gc-negative-control-sc94"]["expected"]
    assert abs(gc["G_c_bisection"] - gc["G_c_analytic"]) < 1e-6
    # C-S critical point matches the Li 2012 anchors
    cs = pts["cs-critical-point"]["expected"]
    assert abs(cs["T_c"] - 0.0943) < 2e-4
    assert abs(cs["rho_c"] - 0.13044) < 2e-4
    # tau-independence: Guo coexistence tau-free at machine level; SC-shift
    # negative control drifts visibly
    tau = pts["measured-tau-independence"]["expected"]
    assert tau["tau_spread_rho_l"] < 1e-12
    assert tau["sc_shift_tau_drift_rho_l"] > 1e-2
    # measured lattice coexistence within 0.1% (liquid) / 0.5% (vapor) of
    # the equal-area targets at the canonical point
    tgt = pts["maxwell-exp-psi-G-9.0"]["expected"]
    m = pts["measured-flat-guo-tau1.0"]["expected"]
    assert abs(m["rho_l"] / tgt["rho_l"] - 1.0) < 1e-3
    assert abs(m["rho_v"] / tgt["rho_v"] - 1.0) < 5e-3
    # eps-discrimination (negative control iii): measured T/Tc=0.7 vapor
    # matches the eps-integral and rejects raw Maxwell
    d = pts["eps-discrimination-TTc0.7"]["expected"]
    err_eps = abs(d["measured_rho_v"] / d["eps_target_rho_v"] - 1.0)
    err_mx = abs(d["measured_rho_v"] / d["maxwell_target_rho_v"] - 1.0)
    assert err_eps < 0.01
    assert err_mx > 0.02
    assert err_mx > 3.0 * err_eps


def test_laplace_table():
    pts = _points("lbm-multiphase-laplace.json")
    for tier in ("A", "B"):
        fit = pts[f"laplace-{tier}-fit"]["expected"]
        assert fit["r_squared"] > 0.999
        assert fit["sigma"] > 0
        dps = [pts[f"laplace-{tier}-r{r}"]["expected"]["dp"] for r in (14, 18, 22, 26)]
        assert abs(fit["intercept"]) < 0.1 * min(dps)
    ceil = pts["spurious-current-ceiling"]["expected"]
    # measured spurious currents sit well below the published BGK anchor
    assert ceil["tier_a_max_u"] < ceil["published_bgk_yu_fan"]
    assert ceil["tier_b_max_u"] < ceil["published_bgk_yu_fan"]


def test_contact_angle_table():
    pts = _points("lbm-multiphase-contact-angle.json")
    rows = [
        (tp["inputs"]["rho_w"], tp["expected"]["theta_deg"])
        for tp in pts.values()
        if tp["expected"]["theta_deg"] is not None
    ]
    assert len(rows) >= 5
    thetas = [t for _, t in sorted(rows)]
    # theta strictly decreasing with rho_w (more wall density = more wetting)
    assert all(a > b for a, b in zip(thetas, thetas[1:]))
    assert thetas[0] > 95 and thetas[-1] < 35  # spans hydrophobic->wetting


def test_lamb_table():
    pts = _points("lbm-multiphase-lamb.json")
    e = pts["lamb-tierB-TTc0.8"]["expected"]
    assert e["zero_crossings"] >= 5
    assert math.isfinite(e["measured_period_steps"])
    assert e["measured_period_steps"] > 0
    # measured-then-declared band: the Tier-B period sits within 20% of the
    # two-density Lamb prediction (measured 16.9% at generation; the
    # condensable-vapor model mismatch is disclosed in the table)
    assert e["rel_err_vs_two_density"] < e["declared_band"]
