"""Committed golden tables regenerate byte-consistent from goldens.py
(spec `docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md` § 7).

Every value in every committed table under
``tools/testkit/golden/tables/electromagnetics/`` is recomputed here from
the same generators and asserted to <= 1e-12 relative; the published
Wiscombe / BYU / handbook anchors are asserted at their quoted precision;
and the in-table identity anchors (Fresnel R+T=1, lossless ext==sca,
Rayleigh limit, grating mirror symmetry, dispersion convergence order) are
executed, not just cited.
"""

from __future__ import annotations

import json
from pathlib import Path

from fdtd_optics.goldens import (
    brewster_angle_deg,
    critical_angle_deg,
    dispersion_vp_ratio,
    fresnel_rs_rp,
    fresnel_ts_tp,
    grating_orders,
    mie_cylinder,
    mie_sphere,
    propagating_order_count,
    rayleigh_qsca_sphere,
    slab_neff,
    slab_v_number,
)

REPO = Path(__file__).resolve().parents[3]
TABLES = REPO / "tools/testkit/golden/tables/electromagnetics"


def _load(name: str) -> dict:
    return json.loads((TABLES / name).read_text())


def _close(got: float, want: float, rel: float = 1e-12) -> None:
    assert abs(got - want) <= rel * max(abs(want), 1e-30), f"{got} != {want}"


# ---------------------------------------------------------------------------
# Fresnel (goldens A-C)
# ---------------------------------------------------------------------------


def test_fresnel_table_regenerates() -> None:
    table = _load("fdtd-optics-fresnel.json")
    rel = float(table["tolerance"]["relative"])
    angle_points = [tp for tp in table["test_points"] if "theta_deg" in tp["inputs"]]
    assert len(angle_points) == 18  # theta 0..85 step 5
    for tp in angle_points:
        inp = tp["inputs"]
        rs, rp = fresnel_rs_rp(inp["theta_deg"], inp["n1"], inp["n2"])
        _close(rs, float(tp["expected"]["r_s"]), rel)
        _close(rp, float(tp["expected"]["r_p"]), rel)
        # Energy identity R + T = 1 (lossless interface) — the cited
        # in-test independent anchor, executed per angle.
        ts, tp_pow = fresnel_ts_tp(inp["theta_deg"], inp["n1"], inp["n2"])
        assert abs(rs + ts - 1.0) < 1e-12
        assert abs(rp + tp_pow - 1.0) < 1e-12


def test_fresnel_anchors() -> None:
    table = _load("fdtd-optics-fresnel.json")
    (anchor,) = [tp for tp in table["test_points"] if "anchor_set" in tp["inputs"]]
    exp = anchor["expected"]
    tol = float(exp["anchor_tolerance_absolute"])
    rs0, rp0 = fresnel_rs_rp(0.0, 1.0, 1.5)
    assert abs(rs0 - exp["r_normal"]) <= 1e-12  # ((1-1.5)/(1+1.5))^2 = 0.04 exact
    assert abs(rp0 - exp["r_normal"]) <= 1e-12
    assert abs(brewster_angle_deg(1.0, 1.5) - exp["brewster_deg"]) <= tol
    assert abs(critical_angle_deg(1.5, 1.0) - exp["critical_deg_glass_to_air"]) <= tol
    # R_p vanishes at Brewster; R = 1 above the critical angle (TIR).
    _, rp_b = fresnel_rs_rp(exp["brewster_deg"], 1.0, 1.5)
    assert rp_b < 1e-15
    rs_t, rp_t = fresnel_rs_rp(exp["critical_deg_glass_to_air"] + 1.0, 1.5, 1.0)
    assert rs_t == 1.0 and rp_t == 1.0


# ---------------------------------------------------------------------------
# Mie cylinder (golden E) + sphere trust-anchors (golden E')
# ---------------------------------------------------------------------------


def test_mie_cylinder_table_regenerates() -> None:
    table = _load("fdtd-optics-mie-cylinder.json")
    rel = float(table["tolerance"]["relative"])
    assert len(table["test_points"]) == 16
    for tp in table["test_points"]:
        inp = tp["inputs"]
        m = complex(inp["m_re"], inp["m_im"])
        qe_tm, qs_tm, qe_te, qs_te = mie_cylinder(inp["x"], m)
        qe, qs = (qe_tm, qs_tm) if inp["polarization"] == "TM" else (qe_te, qs_te)
        _close(qe, float(tp["expected"]["q_ext"]), rel)
        _close(qs, float(tp["expected"]["q_sca"]), rel)


def test_mie_cylinder_lossless_ext_equals_sca() -> None:
    """Lossless cylinder: extinction == scattering identically (< 1e-12 at
    every committed table point) — the cited optical-theorem self-check."""
    table = _load("fdtd-optics-mie-cylinder.json")
    for tp in table["test_points"]:
        inp = tp["inputs"]
        qe_tm, qs_tm, qe_te, qs_te = mie_cylinder(inp["x"], complex(inp["m_re"], 0.0))
        assert abs(qe_tm - qs_tm) < 1e-12 * max(qs_tm, 1.0)
        assert abs(qe_te - qs_te) < 1e-12 * max(qs_te, 1.0)


def test_mie_cylinder_stated_anchors() -> None:
    """The spec-stated x=5, m=1.5 anchors (validated at spec review)."""
    _, qs_tm, _, qs_te = mie_cylinder(5.0, 1.5)
    assert abs(qs_tm - 2.833381) <= 1e-5
    assert abs(qs_te - 2.902384) <= 1e-5


def test_mie_sphere_anchor_table() -> None:
    table = _load("fdtd-optics-mie-sphere-anchors.json")
    rel = float(table["tolerance"]["relative"])
    for tp in table["test_points"]:
        inp = tp["inputs"]
        m = complex(inp["m_re"], inp["m_im"])
        qext, qsca = mie_sphere(inp["x"], m)
        exp = tp["expected"]
        _close(qsca, float(exp["q_sca"]), rel)
        if "q_ext" in exp:
            _close(qext, float(exp["q_ext"]), rel)
        if "published_q_ext" in exp:
            tol = float(exp["published_tolerance_absolute"])
            assert abs(qext - float(exp["published_q_ext"])) <= tol
            assert abs(qsca - float(exp["published_q_sca"])) <= tol
        if "rayleigh_q_sca" in exp:
            # Independent closed-form limit: series -> Rayleigh as x -> 0.
            ray = rayleigh_qsca_sphere(inp["x"], m)
            _close(ray, float(exp["rayleigh_q_sca"]), rel)
            rtol = float(exp["rayleigh_tolerance_relative"])
            assert abs(qsca - ray) <= rtol * ray
    # Lossless sphere: ext == sca (Wiscombe x=5.21282 case).
    qext, qsca = mie_sphere(5.21282, 1.55)
    assert abs(qext - qsca) < 1e-12 * qsca


# ---------------------------------------------------------------------------
# Slab waveguide n_eff (golden F)
# ---------------------------------------------------------------------------


def test_slab_neff_table_regenerates() -> None:
    table = _load("fdtd-optics-slab-neff.json")
    rel = float(table["tolerance"]["relative"])
    for tp in table["test_points"]:
        inp = tp["inputs"]
        exp = tp["expected"]
        if "v_number" in exp:
            got = slab_v_number(
                inp["wavelength_um"], inp["thickness_um"], inp["n_core"], inp["n_clad"]
            )
            _close(got, float(exp["v_number"]), rel)
            assert got < 3.14159 / 2.0  # single-moded precondition
            continue
        got = slab_neff(
            inp["wavelength_um"],
            inp["thickness_um"],
            inp["n_core"],
            inp["n_clad"],
            inp["polarization"],
        )
        _close(got, float(exp["n_eff"]), rel)
        assert inp["n_clad"] < got < inp["n_core"]  # guided-mode bound
        tol = float(exp["published_tolerance_absolute"])
        assert abs(got - float(exp["published_n_eff"])) <= tol
    # The validated spec pair (TE0/TM0 split is the polarization demo).
    assert abs(slab_neff(1.525, 0.220, 3.48, 1.44, "TE") - 2.8631679) <= 1e-6
    assert abs(slab_neff(1.525, 0.220, 3.48, 1.44, "TM") - 2.0826428) <= 1e-6


# ---------------------------------------------------------------------------
# Grating orders (golden D)
# ---------------------------------------------------------------------------


def test_grating_orders_table_regenerates() -> None:
    table = _load("fdtd-optics-grating-orders.json")
    rel = float(table["tolerance"]["relative"])
    orders = grating_orders(1.0, 0.5)
    for tp in table["test_points"]:
        m = tp["inputs"]["m"]
        _close(orders[m], float(tp["expected"]["theta_deg"]), rel)
        assert tp["expected"]["grazing_cutoff"] == (abs(m) == 2)
        if m == 0:
            count = tp["expected"]["propagating_order_count"]
            assert count == propagating_order_count(1.0, 0.5) == 3
    assert abs(orders[1] - 30.0) <= 1e-12  # sin(theta_1) = 0.5 => 30.0 exact
    # Mirror symmetry theta_{-m} = -theta_m — the cited in-test identity.
    for m in (1, 2):
        assert abs(orders[m] + orders[-m]) <= 1e-12


# ---------------------------------------------------------------------------
# Numerical dispersion (golden K, spec § 3.7)
# ---------------------------------------------------------------------------


def test_numerical_dispersion_table_regenerates() -> None:
    table = _load("fdtd-optics-numerical-dispersion.json")
    rel = float(table["tolerance"]["relative"])
    for tp in table["test_points"]:
        inp = tp["inputs"]
        got = dispersion_vp_ratio(inp["sc"], inp["n_lambda"], inp["theta_deg"])
        _close(got, float(tp["expected"]["vp_ratio"]), rel)
        assert 0.9 < got < 1.0  # subluminal, near-unity


def test_dispersion_anisotropy_pattern() -> None:
    """Spec § 3.7 / Taflove Ch. 4: phase-velocity error largest on-axis,
    smallest on the 45-degree diagonal at fixed S_c and resolution."""
    for n_lambda in (10, 20, 31):
        on_axis = dispersion_vp_ratio(0.5, n_lambda, 0.0)
        diagonal = dispersion_vp_ratio(0.5, n_lambda, 45.0)
        assert (1.0 - diagonal) < (1.0 - on_axis)


def test_dispersion_second_order_convergence() -> None:
    """The cited convergence-order identity: the deficit 1 - vp/c scales as
    N_lambda^-2 (Yee is O(Delta^2)), so doubling the resolution quarters it."""
    for theta in (0.0, 15.0, 30.0, 45.0):
        d10 = 1.0 - dispersion_vp_ratio(0.5, 10, theta)
        d20 = 1.0 - dispersion_vp_ratio(0.5, 20, theta)
        ratio = d10 / d20
        assert 3.5 < ratio < 4.5, f"theta={theta}: deficit ratio {ratio}"
