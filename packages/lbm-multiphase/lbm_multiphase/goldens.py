"""Golden-table + gate-asset generators (offline f64, CLI-invoked).

Everything committed under ``tools/testkit/golden/tables/lattice/`` and
``packages/lbm-multiphase/web/public/`` is produced here, in one place, so
the provenance chain is a single command:

    uv run --no-sync python -m lbm_multiphase all

Protocol notes (measured decisions, spec § 4):
- Flat coexistence runs equilibrate 60k steps from tanh ICs; at the
  canonical Tier-A point (G = -9, exp-psi, Guo) the final state is
  machine-static (max|u| ~ 1e-15) and EXACTLY tau-independent.
- Gate scenes start from COMMITTED pre-equilibrated rho fields (the ICs
  written here), so the CI/browser gate window is short (2000 steps) and
  transient-free.
- Laplace sigma is the least-squares slope of dp vs 1/R over four radii
  (linearity gated via R^2); dp is evaluated through the bulk EOS on
  measured densities — the same arithmetic the browser uses.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np

from .reference import (
    CS2,
    CX,
    CY,
    W,
    MultiphaseScene,
    build_psi_lut,
    bulk_pressure_field,
    droplet_ic,
    flat_interface_ic,
    psi_cs_field,
    psi_from_lut,
    run_scene,
)
from .thermo import (
    CS_G,
    coexistence_maxwell,
    coexistence_mechanical,
    cs_critical_point,
    gc_analytic_sc94,
    gc_bisection,
    psi_cs,
    psi_exp,
    psi_sc94,
)

REPO = Path(__file__).resolve().parents[3]
TABLES = REPO / "tools" / "testkit" / "golden" / "tables" / "lattice"
WEB_PUBLIC = Path(__file__).resolve().parents[1] / "web" / "public"

# ---------------------------------------------------------------------------
# Canonical operating points (measured-then-declared at generation)
# ---------------------------------------------------------------------------
TIER_A_G = -9.0  # exp-psi Guo BGK; machine-static flat equilibrium, tau-free
TIER_A_TAUS = (0.8, 1.0, 1.2)
TIER_B_TTC = 0.8  # C-S + Li sigma-forcing; ratio ~14
TIER_B_TAU = 0.8
TIER_B_SIGMA = 0.105  # Li-Luo-Li 2012: eps = 16 sigma = 1.68 (spec § 3.2)
TIER_B_EPS = 1.68
LAPLACE_RADII = (14.0, 18.0, 22.0, 26.0)
NOSEP_G = -5.0  # above G_c = -e^2: must homogenize (negative control ii)


def _sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n")
    print(f"  wrote {path.relative_to(REPO)}")


def _write_bin(path: Path, arr: np.ndarray) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = np.ascontiguousarray(arr, dtype=np.float64).tobytes()
    path.write_bytes(payload)
    sha = _sha(payload)
    print(f"  wrote {path.relative_to(REPO)} sha={sha[:12]}… ({len(payload)} B)")
    return sha


# ---------------------------------------------------------------------------
# 1. D2Q9 equilibrium golden table
# ---------------------------------------------------------------------------


def feq_shifted(rho: float, ux: float, uy: float) -> list[float]:
    """The pinned shifted equilibrium (reference.py collide order), f64."""
    out = []
    u2 = ux * ux + uy * uy
    for i in range(9):
        cu = 3.0 * (float(CX[i]) * ux + float(CY[i]) * uy)
        out.append(float(W[i] * ((rho - 1.0) + rho * (cu + 0.5 * cu * cu - 1.5 * u2))))
    return out


# Cat-3 anchor rotation (>= 3 DISTINCT independent sources per table):
_REF_QIAN = {
    "source": "Qian, d'Humieres & Lallemand, Europhys. Lett. 17:479 (1992) — D2Q9 weights and second-order equilibrium",
    "doi": "10.1209/0295-5075/17/6/001",
    "derived_by": "shifted-equilibrium evaluation (reference.py pinned order)",
}
_REF_KRUGER = {
    "source": "Kruger et al., The Lattice Boltzmann Method (2017) ch. 3 — textbook cross-check, citation-only per the R8 amendment",
    "doi": "10.1007/978-3-319-44649-3",
    "derived_by": "shifted-equilibrium evaluation (reference.py pinned order)",
}
_REF_DERIVATION = {
    "source": "first-principles isotropy derivation, tools/testkit/golden/derivations/d2q9.md section 2 (re-executed by packages/lbm-multiphase/tests/test_reference.py)",
    "doi": "n/a-in-repo-derivation",
    "derived_by": "moment-isotropy constraint solve",
}


def gen_equilibrium_table() -> None:
    refs = [_REF_QIAN, _REF_KRUGER, _REF_DERIVATION]
    pts = []
    for k, (name, rho, u) in enumerate(
        [
            ("rest-rho1", 1.0, (0.0, 0.0)),
            ("rest-rho2p5", 2.5, (0.0, 0.0)),
            ("ux0p1", 1.0, (0.1, 0.0)),
            ("uy-neg0p05", 1.7, (0.0, -0.05)),
            ("diag0p08", 0.4, (0.08, 0.08)),
        ]
    ):
        fbar = feq_shifted(rho, *u)
        f = [fb + float(W[i]) for i, fb in enumerate(fbar)]
        pts.append(
            {
                "inputs": {
                    "name": f"d2q9-eq-{name}",
                    "rho": rho,
                    "u": list(u),
                    "cs_squared": CS2,
                    "velocity_indexing": (
                        "0=rest; 1..4=axis (+x,+y,-x,-y); "
                        "5..8=diagonals (+1,+1),(-1,+1),(-1,-1),(+1,-1) "
                        "(see derivation doc section 1)"
                    ),
                },
                "expected": {
                    "f_eq": f,
                    "f_eq_shifted": fbar,
                    "density_moment": float(np.sum(f)),
                    "momentum_x": float(np.sum(np.array(f) * CX)),
                    "momentum_y": float(np.sum(np.array(f) * CY)),
                },
                "independent_reference": refs[k % 3],
            }
        )
    _write_json(
        TABLES / "d2q9-equilibrium.json",
        {
            "schema_version": "1.0.0",
            "algorithm": "lattice-boltzmann-d2q9-equilibrium-qian-1992",
            "category": "lattice",
            "derivation": {
                "doc": "tools/testkit/golden/derivations/d2q9.md",
                "upstream": "Qian-d-Humieres-Lallemand-1992",
                "upstream_sha": "n/a-no-vendored-code-per-R8-amendment",
                "upstream_path": "n/a-no-vendored-code-per-R8-amendment",
            },
            "tolerance": {"absolute": 1e-15, "relative": 0.0},
            "test_points": pts,
        },
    )


# ---------------------------------------------------------------------------
# 2. Coexistence table (thermo targets + measured lattice rows)
# ---------------------------------------------------------------------------


def _measure_flat(scene: MultiphaseScene) -> dict[str, float]:
    res = run_scene(scene)
    rho, vx, vy = res.checkpoints[scene.steps]
    nx = scene.nx
    rho_l = float(rho[nx // 2 - 8 : nx // 2 + 8].mean())
    rho_v = float(np.concatenate([rho[: nx // 16], rho[nx - nx // 16 :]]).mean())
    return {
        "rho_l": rho_l,
        "rho_v": rho_v,
        "max_u": float(max(np.abs(vx).max(), np.abs(vy).max())),
    }


def _flat_scene(
    name: str,
    g: float,
    tau: float,
    forcing: str,
    ic: np.ndarray,
    steps: int = 60000,
    **kw: Any,
) -> MultiphaseScene:
    return MultiphaseScene(
        name=name,
        nx=128,
        ny=8,
        psi_kind=kw.pop("psi_kind", "exp-lut"),
        g=g,
        tau=tau,
        forcing=forcing,  # type: ignore[arg-type]
        steps=steps,
        checkpoints=(steps,),
        rho_ic=ic,
        **kw,
    )


def gen_coexistence_table() -> dict[str, Any]:
    print("coexistence: thermo curves…")
    tier_a_curve = []
    for g in (-8.0, -9.0, -10.0, -11.0):
        c = coexistence_maxwell(g, psi_exp())
        tier_a_curve.append(
            {"G": g, "rho_v": c.rho_v, "rho_l": c.rho_l, "p0": c.p0, "ratio": c.ratio}
        )
    t_c, rho_c = cs_critical_point()
    tier_b_curve = []
    for f in (0.9, 0.8, 0.7):
        pcs = psi_cs(f * t_c)
        cm = coexistence_maxwell(CS_G, pcs, rho_lo=1e-3, rho_hi=0.44)
        ce = coexistence_mechanical(CS_G, pcs, TIER_B_EPS, rho_lo=1e-3, rho_hi=0.44)
        tier_b_curve.append(
            {
                "T_over_Tc": f,
                "maxwell": {"rho_v": cm.rho_v, "rho_l": cm.rho_l},
                "mech_eps_1p68": {"rho_v": ce.rho_v, "rho_l": ce.rho_l},
                "vapor_split_pct": (cm.rho_v / ce.rho_v - 1.0) * 100.0,
            }
        )

    print("coexistence: lattice measurements (60k-step flats)…")
    cmA = coexistence_maxwell(TIER_A_G, psi_exp())
    icA = flat_interface_ic(128, 8, cmA.rho_v, cmA.rho_l, 32.0, 96.0, 4.0)
    measured_a = []
    for tau in TIER_A_TAUS:
        m = _measure_flat(_flat_scene(f"coexA-tau{tau}", TIER_A_G, tau, "guo", icA))
        m["tau"] = tau
        measured_a.append(m)
        print(f"  A tau={tau}: {m}")
    # negative control (i): SC velocity-shift forcing must drift with tau
    measured_sc = []
    for tau in (0.8, 1.2):
        m = _measure_flat(
            _flat_scene(f"coexSC-tau{tau}", TIER_A_G, tau, "sc-shift", icA)
        )
        m["tau"] = tau
        measured_sc.append(m)
        print(f"  SC tau={tau}: {m}")

    ceB = coexistence_mechanical(
        CS_G, psi_cs(TIER_B_TTC * t_c), TIER_B_EPS, rho_lo=1e-3, rho_hi=0.44
    )
    icB = flat_interface_ic(128, 8, ceB.rho_v, ceB.rho_l, 32.0, 96.0, 4.0)
    mB = _measure_flat(
        _flat_scene(
            "coexB",
            CS_G,
            TIER_B_TAU,
            "li-sigma",
            icB,
            psi_kind="cs",
            sigma=TIER_B_SIGMA,
            cs_temp=TIER_B_TTC * t_c,
        )
    )
    print(f"  B T/Tc=0.8: {mB}")
    ce7 = coexistence_mechanical(
        CS_G, psi_cs(0.7 * t_c), TIER_B_EPS, rho_lo=1e-3, rho_hi=0.44
    )
    cm7 = coexistence_maxwell(CS_G, psi_cs(0.7 * t_c), rho_lo=1e-3, rho_hi=0.44)
    ic7 = flat_interface_ic(128, 8, ce7.rho_v, ce7.rho_l, 32.0, 96.0, 4.0)
    m7 = _measure_flat(
        _flat_scene(
            "coexB07",
            CS_G,
            TIER_B_TAU,
            "li-sigma",
            ic7,
            psi_kind="cs",
            sigma=TIER_B_SIGMA,
            cs_temp=0.7 * t_c,
            steps=80000,
        )
    )
    print(f"  B T/Tc=0.7: {m7}")

    tau_spread_l = max(m["rho_l"] for m in measured_a) - min(
        m["rho_l"] for m in measured_a
    )
    sc_drift_l = abs(measured_sc[1]["rho_l"] - measured_sc[0]["rho_l"])
    # schema-pure golden table (golden-v1.json is additionalProperties:false;
    # everything lives in test_points). Cat-3 anchors: >= 3 distinct sources.
    ref_sc94 = {
        "source": "Shan & Chen, Phys. Rev. E 49:2941 (1994) — coexistence from mechanical balance / equal-area (exp-psi is the Maxwell-exact family)",
        "doi": "10.1103/PhysRevE.49.2941",
        "derived_by": "f64 Maxwell equal-area binodal solver (thermo.py)",
    }
    ref_li = {
        "source": "Li, Luo & Li, Phys. Rev. E 86:016709 (2012) — eps-weighted mechanical-stability integral, sigma scheme; C-S T_c = 0.0943, rho_c ~ 0.13044",
        "doi": "10.1103/PhysRevE.86.016709",
        "derived_by": "f64 eps-weighted binodal solver (thermo.py, eps = 16 sigma)",
    }
    ref_kruger = {
        "source": "Kruger et al., The Lattice Boltzmann Method (2017) ch. 9 — lattice-weight pseudopotential convention (G_c = -4/rho0; spec section 3.3 derivation)",
        "doi": "10.1007/978-3-319-44649-3",
        "derived_by": "dp/drho double-root bisection vs analytic -4/rho0",
    }
    ref_li_review = {
        "source": "Li et al., Prog. Energy Combust. Sci. 55:52 (2016) — Guo+exp-psi coexistence tau-independent and Maxwell-consistent",
        "doi": "10.1016/j.pecs.2015.10.001",
        "derived_by": "60000-step 128x8 flat-interface lattice measurement (Guo forcing)",
    }
    tps = [
        {
            "inputs": {"name": "gc-negative-control-sc94", "psi": "sc94", "rho0": 1.0},
            "expected": {
                "rho_c_analytic": gc_analytic_sc94()[0],
                "G_c_analytic": gc_analytic_sc94()[1],
                "G_c_bisection": gc_bisection(psi_sc94()),
            },
            "independent_reference": ref_kruger,
        },
        {
            "inputs": {"name": "cs-critical-point", "a": 1.0, "b": 4.0, "R": 1.0},
            "expected": {"T_c": t_c, "rho_c": rho_c},
            "independent_reference": ref_li,
        },
    ]
    for row in tier_a_curve:
        tps.append(
            {
                "inputs": {
                    "name": f"maxwell-exp-psi-G{row['G']}",
                    "G": row["G"],
                    "psi": "exp(-1/rho)",
                    "canonical": row["G"] == TIER_A_G,
                },
                "expected": {k: v for k, v in row.items() if k != "G"},
                "independent_reference": ref_sc94,
            }
        )
    for row in tier_b_curve:
        tps.append(
            {
                "inputs": {
                    "name": f"cs-eps-targets-TTc{row['T_over_Tc']}",
                    "T_over_Tc": row["T_over_Tc"],
                    "sigma": TIER_B_SIGMA,
                    "epsilon": TIER_B_EPS,
                    "G": CS_G,
                },
                "expected": {k: v for k, v in row.items() if k != "T_over_Tc"},
                "independent_reference": ref_li,
            }
        )
    for m in measured_a:
        tps.append(
            {
                "inputs": {
                    "name": f"measured-flat-guo-tau{m['tau']}",
                    "G": TIER_A_G,
                    "tau": m["tau"],
                    "forcing": "guo",
                    "protocol": "128x8 flat, 60000 steps, slab/edge probes",
                },
                "expected": {k: v for k, v in m.items() if k != "tau"},
                "independent_reference": ref_li_review,
            }
        )
    tps.append(
        {
            "inputs": {
                "name": "measured-tau-independence",
                "taus": list(TIER_A_TAUS),
            },
            "expected": {
                "tau_spread_rho_l": tau_spread_l,
                "sc_shift_tau_drift_rho_l": sc_drift_l,
                "sc_shift_measurements": measured_sc,
            },
            "independent_reference": ref_li_review,
        }
    )
    tps.append(
        {
            "inputs": {
                "name": "measured-flat-tierB-TTc0.8",
                "forcing": "li-sigma",
                "tau": TIER_B_TAU,
                "protocol": "128x8 flat, 60000 steps",
            },
            "expected": mB,
        }
    )
    tps.append(
        {
            "inputs": {
                "name": "eps-discrimination-TTc0.7",
                "forcing": "li-sigma",
                "tau": TIER_B_TAU,
                "protocol": "128x8 flat, 80000 steps; negative control iii",
            },
            "expected": {
                "measured_rho_v": m7["rho_v"],
                "measured_rho_l": m7["rho_l"],
                "eps_target_rho_v": ce7.rho_v,
                "maxwell_target_rho_v": cm7.rho_v,
            },
            "independent_reference": ref_li,
        }
    )
    doc = {
        "schema_version": "1.0.0",
        "algorithm": "lbm-multiphase-coexistence",
        "category": "lattice",
        "derivation": {
            "doc": "docs/sim-specs/lattice/lbm-multiphase/spec-ref.md",
            "upstream": "Shan-Chen-1994-pseudopotential-Kruger-convention",
            "upstream_sha": "n/a-no-vendored-code-per-R8-amendment",
            "upstream_path": "n/a-no-vendored-code-per-R8-amendment",
        },
        "tolerance": {"absolute": 0.0, "relative": 1e-6},
        "test_points": tps,
    }
    _write_json(TABLES / "lbm-multiphase-coexistence.json", doc)
    return {
        "cmA": cmA,
        "ceB": ceB,
        "t_c": t_c,
        "measured_a": measured_a,
        "measured_b": mB,
        "icA_equilibrated": None,
    }


# ---------------------------------------------------------------------------
# 3. Laplace table + equilibrated droplet ICs for the browser
# ---------------------------------------------------------------------------


def _laplace_run(
    tier: str, radius: float, ctx: dict[str, Any]
) -> tuple[dict[str, float], np.ndarray]:
    if tier == "A":
        cm = ctx["cmA"]
        ic = droplet_ic(128, 128, cm.rho_v, cm.rho_l, 64.0, 64.0, radius, radius, 3.0)
        sc = MultiphaseScene(
            name=f"lapA-r{radius}",
            nx=128,
            ny=128,
            psi_kind="exp-lut",
            g=TIER_A_G,
            tau=1.0,
            forcing="guo",
            steps=14000,
            checkpoints=(12000, 14000),
            rho_ic=ic,
        )
        mid = 0.5 * (cm.rho_l + cm.rho_v)
    else:
        ce = ctx["ceB"]
        ic = droplet_ic(128, 128, ce.rho_v, ce.rho_l, 64.0, 64.0, radius, radius, 3.0)
        sc = MultiphaseScene(
            name=f"lapB-r{radius}",
            nx=128,
            ny=128,
            psi_kind="cs",
            g=CS_G,
            tau=TIER_B_TAU,
            forcing="li-sigma",
            sigma=TIER_B_SIGMA,
            cs_temp=TIER_B_TTC * ctx["t_c"],
            steps=14000,
            checkpoints=(12000, 14000),
            rho_ic=ic,
        )
        mid = 0.5 * (ce.rho_l + ce.rho_v)
    res = run_scene(sc)
    r1 = res.checkpoints[12000][0]
    rho, vx, vy = res.checkpoints[14000]
    if tier == "A":
        lut = build_psi_lut()
        psi = psi_from_lut(rho, lut)
        g = TIER_A_G
    else:
        psi = psi_cs_field(rho, TIER_B_TTC * ctx["t_c"], CS_G)
        g = CS_G
    p = bulk_pressure_field(rho, psi, g)
    p_in = float(p[60:68, 60:68].mean())
    p_out = float(p[:6, :6].mean())
    area = float((rho > mid).sum())
    r_meas = float(np.sqrt(area / np.pi))
    row = {
        "R_init": radius,
        "R_measured": r_meas,
        "dp": p_in - p_out,
        "max_u": float(max(np.abs(vx).max(), np.abs(vy).max())),
        "settle_drift": float(np.abs(rho - r1).max()),
    }
    return row, rho


def _fit_slope(rows: list[dict[str, float]]) -> dict[str, float]:
    x = np.array([1.0 / r["R_measured"] for r in rows])
    y = np.array([r["dp"] for r in rows])
    a = np.vstack([x, np.ones_like(x)]).T
    coef, *_ = np.linalg.lstsq(a, y, rcond=None)
    yhat = a @ coef
    r2 = 1.0 - float(((y - yhat) ** 2).sum() / ((y - y.mean()) ** 2).sum())
    return {"sigma": float(coef[0]), "intercept": float(coef[1]), "r_squared": r2}


def gen_laplace_table(ctx: dict[str, Any]) -> dict[str, Any]:
    print("laplace: tier A…")
    rows_a: list[dict[str, float]] = []
    ics_a: dict[float, np.ndarray] = {}
    for r in LAPLACE_RADII:
        row, rho = _laplace_run("A", r, ctx)
        print(f"  A r={r}: {row}")
        rows_a.append(row)
        ics_a[r] = rho
    fit_a = _fit_slope(rows_a)
    print(f"  A fit: {fit_a}")
    print("laplace: tier B…")
    rows_b: list[dict[str, float]] = []
    drop_b_final: np.ndarray | None = None
    for r in LAPLACE_RADII:
        row, rho = _laplace_run("B", r, ctx)
        print(f"  B r={r}: {row}")
        rows_b.append(row)
        if r == 22.0:
            drop_b_final = rho
    fit_b = _fit_slope(rows_b)
    print(f"  B fit: {fit_b}")
    # schema-pure table; a measured NUMERICAL BASELINE (the sigma values are
    # this repo's own f64 measurements — the law is exact, the numbers are
    # ours), so derivation.upstream carries the explicit § 2.4 exemption
    # marker. Protocol anchors ride the fit points' independent_reference.
    ref_law = {
        "source": "Young-Laplace 2D: dp = sigma/R (exact continuum statement); Li, Luo & Li, Phys. Rev. E 87:053301 (2013) — published SC Laplace-fit practice",
        "doi": "10.1103/PhysRevE.87.053301",
        "derived_by": "dp-vs-1/R least squares over four radii, dp through the bulk EOS on measured densities, R from mid-density area, 14000 steps from tanh ICs",
    }
    ref_yufan = {
        "source": "Yu & Fan, Phys. Rev. E 82:046708 (2010) — spurious-current anchors 0.028 BGK / 0.0053 MRT",
        "doi": "10.1103/PhysRevE.82.046708",
        "derived_by": "max|u| over the settled droplet fields (ceiling sanity range)",
    }
    tps = []
    for tier, rows, extra in (
        ("A", rows_a, {"G": TIER_A_G, "tau": 1.0}),
        (
            "B",
            rows_b,
            {"T_over_Tc": TIER_B_TTC, "tau": TIER_B_TAU, "sigma_forcing": TIER_B_SIGMA},
        ),
    ):
        for r in rows:
            tps.append(
                {
                    "inputs": {
                        "name": f"laplace-{tier}-r{int(r['R_init'])}",
                        "tier": tier,
                        **extra,
                        "R_init": r["R_init"],
                    },
                    "expected": {k: v for k, v in r.items() if k != "R_init"},
                }
            )
    tps.append(
        {
            "inputs": {
                "name": "laplace-A-fit",
                "tier": "A",
                **{"G": TIER_A_G, "tau": 1.0},
            },
            "expected": fit_a,
            "independent_reference": ref_law,
        }
    )
    tps.append(
        {
            "inputs": {
                "name": "laplace-B-fit",
                "tier": "B",
                "T_over_Tc": TIER_B_TTC,
                "tau": TIER_B_TAU,
            },
            "expected": fit_b,
            "independent_reference": ref_law,
        }
    )
    tps.append(
        {
            "inputs": {"name": "spurious-current-ceiling"},
            "expected": {
                "tier_a_max_u": max(r["max_u"] for r in rows_a),
                "tier_b_max_u": max(r["max_u"] for r in rows_b),
                "published_bgk_yu_fan": 0.028,
                "published_mrt_yu_fan": 0.0053,
            },
            "independent_reference": ref_yufan,
        }
    )
    doc = {
        "schema_version": "1.0.0",
        "algorithm": "lbm-multiphase-young-laplace",
        "category": "lattice",
        "derivation": {
            "doc": "docs/sim-specs/lattice/lbm-multiphase/spec-ref.md",
            "upstream": "n/a-numerical-baseline (repo f64 measurements; exact-law protocol per the fit points' references)",
            "upstream_sha": "n/a-numerical-baseline",
            "upstream_path": "n/a-numerical-baseline",
        },
        "tolerance": {"absolute": 0.0, "relative": 1e-6},
        "test_points": tps,
    }
    _write_json(TABLES / "lbm-multiphase-laplace.json", doc)
    return {
        "rows_a": rows_a,
        "fit_a": fit_a,
        "rows_b": rows_b,
        "fit_b": fit_b,
        "ics_a": ics_a,
        "drop_b_final": drop_b_final,
    }


# ---------------------------------------------------------------------------
# 4. Contact-angle map (rho_w -> theta, Tier A)
# ---------------------------------------------------------------------------


def _interp_crossing(vals: np.ndarray, mid: float, rising: bool) -> float:
    """First index (linear-interpolated) where vals crosses mid."""
    above = vals > mid
    idx = np.nonzero(above[:-1] != above[1:])[0]
    if len(idx) == 0:
        return float("nan")
    k = idx[0] if rising else idx[-1]
    v0, v1 = vals[k], vals[k + 1]
    return float(k + (mid - v0) / (v1 - v0))


def measure_contact_angle(
    rho: np.ndarray, mid: float, wall_rows: int
) -> dict[str, float]:
    """Spherical-cap protocol (spec golden D): H at the center column, L at
    the first fluid row, both mid-density linear-interpolated;
    R = (4H^2+L^2)/(8H), theta = atan2(L/2, R-H). Heights measured from the
    halfway bounce-back wall plane (wall_rows - 0.5)."""
    nx = rho.shape[0]
    cx = nx // 2
    col = rho[cx, wall_rows:]
    h_raw = _interp_crossing(col, mid, rising=False)
    row = rho[:, wall_rows]
    left = _interp_crossing(row[:cx], mid, rising=True)
    right_seg = row[cx:]
    above = right_seg > mid
    idx = np.nonzero(above[:-1] != above[1:])[0]
    right = (
        float(
            cx
            + idx[0]
            + (mid - right_seg[idx[0]]) / (right_seg[idx[0] + 1] - right_seg[idx[0]])
        )
        if len(idx)
        else float("nan")
    )
    if not (np.isfinite(h_raw) and np.isfinite(left) and np.isfinite(right)):
        return {"H": float("nan"), "L": float("nan"), "theta_deg": float("nan")}
    h = h_raw + 0.5  # from wall plane at (wall_rows - 0.5)
    length = right - left
    r_cap = (4.0 * h * h + length * length) / (8.0 * h)
    theta = float(np.degrees(np.arctan2(length / 2.0, r_cap - h)))
    return {"H": h, "L": length, "theta_deg": theta}


def gen_contact_angle_table(ctx: dict[str, Any]) -> None:
    print("contact angle: rho_w sweep…")
    cm = ctx["cmA"]
    nx, ny = 96, 48
    solid = np.zeros((nx, ny), bool)
    solid[:, :2] = True
    x = np.arange(nx, dtype=np.float64)[:, None]
    y = np.arange(ny, dtype=np.float64)[None, :]
    r = np.sqrt((x - 48.0) ** 2 + (y - 2.0) ** 2)
    rho = cm.rho_v + (cm.rho_l - cm.rho_v) * 0.5 * (1.0 - np.tanh((r - 20.0) / 3.0))
    rho[solid] = 1.0
    mid = 0.5 * (cm.rho_l + cm.rho_v)
    rows = []
    for rho_w in (0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0):
        sc = MultiphaseScene(
            name=f"ca-{rho_w}",
            nx=nx,
            ny=ny,
            psi_kind="exp-lut",
            g=TIER_A_G,
            tau=1.0,
            forcing="guo",
            steps=16000,
            checkpoints=(14000, 16000),
            solid=solid,
            rho_wall=rho_w,
            rho_ic=rho,
        )
        res = run_scene(sc)
        r1 = res.checkpoints[14000][0]
        r2, vx, vy = res.checkpoints[16000]
        m = measure_contact_angle(r2, mid, wall_rows=2)
        m["rho_w"] = rho_w
        m["settle_drift"] = float(np.abs(r2 - r1).max())
        m["max_u"] = float(max(np.abs(vx).max(), np.abs(vy).max()))
        # out-of-range rows (dewetted / fully spreading) are honest Nones,
        # never NaN — NaN is invalid strict JSON and poisons every consumer
        clean = {
            k: (None if isinstance(v, float) and not np.isfinite(v) else v)
            for k, v in m.items()
        }
        rows.append(clean)
        print(f"  rho_w={rho_w}: {clean}")
    _write_json(
        TABLES / "lbm-multiphase-contact-angle.json",
        {
            "schema_version": "1.0.0",
            "algorithm": "lbm-multiphase-contact-angle-map",
            "category": "lattice",
            # a measured NUMERICAL BASELINE (the rho_w -> theta map is this
            # repo's own f64 calibration; the CONTROL MECHANISM is Huang
            # 2007 / Young's equation, anchored on the map endpoints)
            "derivation": {
                "doc": "docs/sim-specs/lattice/lbm-multiphase/spec-ref.md",
                "upstream": "n/a-numerical-baseline (repo f64 calibration; spherical-cap protocol per test-point references)",
                "upstream_sha": "n/a-numerical-baseline",
                "upstream_path": "n/a-numerical-baseline",
            },
            "tolerance": {"absolute": 0.0, "relative": 1e-6},
            "test_points": [
                {
                    "inputs": {
                        "name": f"contact-angle-rhow{r['rho_w']}",
                        "rho_w": r["rho_w"],
                        "protocol": (
                            "zero-g sessile half-droplet r=20 on a 2-row wall, "
                            "96x48, Tier A (G=-9, Guo, tau=1), 16000 steps; "
                            "theta by the interpolated spherical-cap "
                            "measurement; wall psi = psi(rho_w)"
                        ),
                    },
                    "expected": {k: v for k, v in r.items() if k != "rho_w"},
                    "independent_reference": {
                        "source": (
                            "Huang, Thorne, Schaap & Sukop, Phys. Rev. E 76:066701 (2007) — wall-affinity contact-angle control"
                            if i % 3 == 0
                            else "Young's equation — theta from interfacial-tension balance (continuum statement)"
                            if i % 3 == 1
                            else "spherical-cap protocol R=(4H^2+L^2)/8H, tan(theta)=L/(2(R-H)) — spec section 4 D / Sukop & Thorne (2006)"
                        ),
                        "doi": "10.1103/PhysRevE.76.066701"
                        if i % 3 == 0
                        else "n/a-continuum-statement",
                        "derived_by": "f64 spherical-cap measurement at 16000 steps",
                    },
                }
                for i, r in enumerate(rows)
            ],
        },
    )


# ---------------------------------------------------------------------------
# 5. Lamb oscillation golden (Tier A)
# ---------------------------------------------------------------------------


def gen_lamb(ctx: dict[str, Any], sigma_b: float) -> None:
    """Tier-B Lamb golden. Protocol note (measured decision): the first
    attempt ran Tier A (density ratio ~5) and landed 22% off the two-density
    prediction — at ratio 5 the vapor is a condensable, mass-exchanging
    phase, not the textbook passive outer fluid (Li 2013's few-% agreement
    is at ratio ~700). Tier B at ratio ~14 with tau = 0.6 (viscous
    zero-crossing shift < 1%) is the honest scene; the Tier-A result is
    recorded in the table as a disclosed model-mismatch exhibit."""
    print("lamb oscillation (tier B)…")
    ce = ctx["ceB"]
    n = 192
    ic = droplet_ic(n, n, ce.rho_v, ce.rho_l, 96.0, 96.0, 36.0, 30.0, 2.5)
    steps = 20000
    every = 40
    cps = tuple(range(every, steps + 1, every))
    sc = MultiphaseScene(
        name="lamb",
        nx=n,
        ny=n,
        psi_kind="cs",
        g=CS_G,
        tau=0.6,
        forcing="li-sigma",
        sigma=TIER_B_SIGMA,
        cs_temp=TIER_B_TTC * ctx["t_c"],
        steps=steps,
        checkpoints=cps,
        rho_ic=ic,
    )
    res = run_scene(sc)
    xs = np.arange(n, dtype=np.float64)[:, None]
    ys = np.arange(n, dtype=np.float64)[None, :]
    ts, sig = [], []
    for t in cps:
        rho = res.checkpoints[t][0]
        m = rho - ce.rho_v
        m = np.maximum(m, 0.0)
        tot = m.sum()
        cx = float((m * xs).sum() / tot)
        cy = float((m * ys).sum() / tot)
        ixx = float((m * (xs - cx) ** 2).sum() / tot)
        iyy = float((m * (ys - cy) ** 2).sum() / tot)
        ts.append(t)
        sig.append(ixx - iyy)
    ts_a = np.array(ts, dtype=np.float64)
    s = np.array(sig)
    # period from interpolated zero crossings with HYSTERESIS: a crossing
    # only arms again after |s| exceeds 15% of the running envelope —
    # baseline jitter otherwise double-counts crossings and halves the
    # apparent period (caught at generation: 26 crossings where the mode
    # predicts 13).
    env = float(np.abs(s).max())
    zc: list[float] = []
    armed = abs(s[0]) > 0.15 * env
    for k in range(len(s) - 1):
        if armed and (s[k] > 0) != (s[k + 1] > 0):
            zc.append(float(ts_a[k] + every * s[k] / (s[k] - s[k + 1])))
            armed = False
        if not armed and abs(s[k + 1]) > 0.15 * env:
            armed = True
    diffs = np.diff(zc)
    period_crossings = float(2.0 * diffs.mean()) if len(diffs) >= 3 else -1.0
    # primary estimator: damped-cosine fit s(t) ~ A e^{-g t} cos(w t + p)
    # (grid over w,g; linear lsq for the amplitude pair) — robust to the
    # baseline jitter that biases crossing counts
    t_rel = ts_a - ts_a[0]
    best = (1e18, 0.0, 0.0)
    w_grid = 2.0 * np.pi / np.linspace(1200.0, 8000.0, 600)
    for w in w_grid:
        for gdec in (0.0, 5e-5, 1e-4, 2e-4, 4e-4):
            e = np.exp(-gdec * t_rel)
            c = e * np.cos(w * t_rel)
            s2 = e * np.sin(w * t_rel)
            a_mat = np.vstack([c, s2, np.ones_like(c)]).T
            coef, *_ = np.linalg.lstsq(a_mat, s, rcond=None)
            resid = float(((a_mat @ coef - s) ** 2).sum())
            if resid < best[0]:
                best = (resid, float(w), float(gdec))
    period_measured = float(2.0 * np.pi / best[1])
    # equilibrated radius from the final field (the tanh IC redistributes
    # mass; predicting with the nominal ellipse R0 overestimates R)
    rho_fin = res.checkpoints[steps][0]
    mid = 0.5 * (ce.rho_l + ce.rho_v)
    r_eq = float(np.sqrt((rho_fin > mid).sum() / np.pi))
    r0 = float(np.sqrt(36.0 * 30.0))
    rho_l, rho_v = ce.rho_l, ce.rho_v
    om2_two = 6.0 * sigma_b / ((rho_l + rho_v) * r_eq**3)
    om2_liq = 6.0 * sigma_b / (rho_l * r_eq**3)
    t_two = float(2.0 * np.pi / np.sqrt(om2_two))
    t_liq = float(2.0 * np.pi / np.sqrt(om2_liq))
    rel = abs(period_measured - t_two) / t_two
    print(
        f"  measured T={period_measured:.1f} (crossings est {period_crossings:.1f}, "
        f"n={len(zc)}), R_eq={r_eq:.2f} (R0 {r0:.2f}), predicted two-density "
        f"{t_two:.1f} (rel {rel:.3f}), liquid-only {t_liq:.1f}"
    )
    _write_json(
        TABLES / "lbm-multiphase-lamb.json",
        {
            "schema_version": "1.0.0",
            "algorithm": "lbm-multiphase-lamb-oscillation",
            "category": "lattice",
            # a measured NUMERICAL BASELINE and disclosed TREND exhibit: the
            # measured period sits ~17% below the immiscible-fluid Lamb
            # prediction at ratio ~14 (and ~22% at Tier A's ratio ~5) — the
            # pseudopotential vapor is a CONDENSABLE, mass-exchanging phase,
            # outside the Lamb assumptions; published few-percent agreements
            # (Li-Luo-Li 2013) are at ratio >= 500 where the vapor
            # decouples. Reaching that regime needs the weighted-MRT v1.x
            # tier (deep C-S quenches also exit the Yuan-Schaefer psi
            # envelope: the sqrt clamp fires for rho >~ 0.55 at T/Tc = 0.65
            # — measured, disclosed, not gated). Declared band 20%.
            "derivation": {
                "doc": "docs/sim-specs/lattice/lbm-multiphase/spec-ref.md",
                "upstream": "n/a-numerical-baseline (repo f64 measurement; disclosed condensable-vapor model mismatch vs the immiscible Lamb law — see test-point fields)",
                "upstream_sha": "n/a-numerical-baseline",
                "upstream_path": "n/a-numerical-baseline",
            },
            "tolerance": {"absolute": 0.0, "relative": 1e-6},
            "test_points": [
                {
                    "inputs": {
                        "name": "lamb-tierB-TTc0.8",
                        "protocol": (
                            "192^2, Tier B (C-S T/Tc=0.8, li-sigma, tau=0.6), "
                            "ellipse 36x30, period by damped-cosine fit of "
                            "Ixx-Iyy over 20000 steps (hysteresis crossings "
                            "as sanity); sigma from the Tier-B Laplace fit "
                            "(two-golden consistency loop); prediction uses "
                            "the equilibrated radius R_eq"
                        ),
                        "law": (
                            "2D two-fluid mode n=2: omega^2 = (n^3-n) sigma / "
                            "(R^3 (rho_in + rho_out)); liquid-only limit "
                            "omega^2 = n(n^2-1) sigma/(rho_l R^3) — Lamb, "
                            "Hydrodynamics (1932) section 275; protocol per "
                            "Li, Luo & Li, Phys. Rev. E 87:053301 (2013)"
                        ),
                        "sigma_from_laplace": sigma_b,
                        "R0": r0,
                        "R_eq": r_eq,
                    },
                    "expected": {
                        "measured_period_steps": period_measured,
                        "period_crossings_estimate": period_crossings,
                        "predicted_period_two_density": t_two,
                        "predicted_period_liquid_only": t_liq,
                        "rel_err_vs_two_density": rel,
                        "zero_crossings": len(zc),
                        "declared_band": 0.20,
                    },
                    "independent_reference": {
                        "source": "Lamb, Hydrodynamics (1932) section 275 — capillary oscillation frequency (trend anchor; condensable-vapor mismatch disclosed in derivation.upstream)",
                        "doi": "n/a-classical-text",
                        "derived_by": "damped-cosine fit of the n=2 moment signal",
                    },
                }
            ],
        },
    )


# ---------------------------------------------------------------------------
# 6. Gate assets (committed ICs + f64 reference trajectories + manifest)
# ---------------------------------------------------------------------------


def gen_gate_assets(ctx: dict[str, Any], lap: dict[str, Any]) -> None:
    from .sim import GATE_DROP_B, GATE_FLAT_A, NOSEP_SCENE_STEPS, gate_scene_defs

    print("gate assets: equilibrated ICs…")
    cmA = ctx["cmA"]
    # flat A: equilibrate once at tau=1.0 for 60k, commit final rho as IC
    icA0 = flat_interface_ic(128, 8, cmA.rho_v, cmA.rho_l, 32.0, 96.0, 4.0)
    eq = run_scene(_flat_scene("flat-eq", TIER_A_G, 1.0, "guo", icA0))
    flat_ic = eq.checkpoints[60000][0]
    sha_flat_ic = _write_bin(WEB_PUBLIC / "lbm-gate-ic-flatA.bin", flat_ic)

    drop_ic = lap["drop_b_final"]
    assert drop_ic is not None
    sha_drop_ic = _write_bin(WEB_PUBLIC / "lbm-gate-ic-dropletB.bin", drop_ic)

    x = np.arange(128, dtype=np.float64)[:, None]
    nosep_ic = (1.0 + 0.08 * np.sin(2.0 * np.pi * x / 128.0)) * np.ones((1, 8))
    sha_nosep = _write_bin(WEB_PUBLIC / "lbm-gate-ic-nosep.bin", nosep_ic)

    lut = build_psi_lut()
    sha_lut = _write_bin(WEB_PUBLIC / "lbm-psi-lut-f64.bin", lut)

    lap_ic_shas = {}
    for r, rho in lap["ics_a"].items():
        lap_ic_shas[str(int(r))] = _write_bin(
            WEB_PUBLIC / f"lbm-gate-ic-laplaceA-r{int(r)}.bin", rho
        )

    print("gate assets: f64 reference trajectories…")
    from .sim import run_canonical, write_reference_bins

    res = run_canonical(flat_ic=flat_ic, drop_ic=drop_ic)
    shas = write_reference_bins(WEB_PUBLIC, res)

    nosep = run_scene(
        MultiphaseScene(
            name="nosep",
            nx=128,
            ny=8,
            psi_kind="exp-lut",
            g=NOSEP_G,
            tau=1.0,
            forcing="guo",
            steps=NOSEP_SCENE_STEPS,
            checkpoints=(NOSEP_SCENE_STEPS,),
            rho_ic=nosep_ic,
        )
    )
    r_no = nosep.checkpoints[NOSEP_SCENE_STEPS][0]
    nosep_spread = float(r_no.max() - r_no.min())
    print(f"  no-sep spread after {NOSEP_SCENE_STEPS}: {nosep_spread:.2e}")

    flat_final = res["flat"].checkpoints[GATE_FLAT_A.steps]
    rho_f = flat_final[0]
    coex_measured = {
        "rho_l": float(rho_f[56:72].mean()),
        "rho_v": float(np.concatenate([rho_f[:8], rho_f[120:]]).mean()),
    }
    drop_final = res["droplet"].checkpoints[GATE_DROP_B.steps]
    spurious = float(max(np.abs(drop_final[1]).max(), np.abs(drop_final[2]).max()))

    # f64 run of the BROWSER Laplace protocol (1000 steps from the committed
    # equilibrated ICs) — the browser's sigma is gated against THIS, not the
    # long-run tanh-IC protocol, so the two protocols' small offset never
    # eats gate budget.
    print("gate assets: browser-protocol Laplace (f64)…")
    lut = build_psi_lut()
    cmA = ctx["cmA"]
    mid = 0.5 * (cmA.rho_l + cmA.rho_v)
    bp_rows = []
    for r, ic_rho in sorted(lap["ics_a"].items()):
        # 3000 steps: the rest-reseed transient decays with 1/(nu k^2) ~ 2500;
        # measured f64: sigma(1000)=0.0431 (transient-polluted), sigma(3000)=
        # 0.028481, sigma(5000)=0.028556 vs long-run 0.028568.
        bp_steps = 3000
        sc = MultiphaseScene(
            name=f"lapA-bp-r{r}",
            nx=128,
            ny=128,
            psi_kind="exp-lut",
            g=TIER_A_G,
            tau=1.0,
            forcing="guo",
            steps=bp_steps,
            checkpoints=(bp_steps,),
            rho_ic=ic_rho,
        )
        rr = run_scene(sc)
        rho, _vx, _vy = rr.checkpoints[bp_steps]
        psi = psi_from_lut(rho, lut)
        p = bulk_pressure_field(rho, psi, TIER_A_G)
        p_in = float(p[60:68, 60:68].mean())
        p_out = float(p[:6, :6].mean())
        area = float((rho > mid).sum())
        bp_rows.append({"R": float(np.sqrt(area / np.pi)), "dp": p_in - p_out})
    x = np.array([1.0 / r["R"] for r in bp_rows])
    y = np.array([r["dp"] for r in bp_rows])
    a = np.vstack([x, np.ones_like(x)]).T
    coef, *_ = np.linalg.lstsq(a, y, rcond=None)
    bp_sigma = float(coef[0])
    print(f"  browser-protocol sigma (f64): {bp_sigma}")
    manifest = {
        "generated_by": "packages/lbm-multiphase/lbm_multiphase/goldens.py",
        "scenes": gate_scene_defs(),
        "assets": {
            "psi_lut": {
                "file": "lbm-psi-lut-f64.bin",
                "sha256": sha_lut,
                "n": 8192,
                "rho_max": 6.0,
            },
            "ic_flatA": {"file": "lbm-gate-ic-flatA.bin", "sha256": sha_flat_ic},
            "ic_dropletB": {"file": "lbm-gate-ic-dropletB.bin", "sha256": sha_drop_ic},
            "ic_nosep": {"file": "lbm-gate-ic-nosep.bin", "sha256": sha_nosep},
            "ic_laplaceA": lap_ic_shas,
            "reference_bins": shas,
        },
        "targets": {
            "maxwell_tier_a": {"rho_v": cmA.rho_v, "rho_l": cmA.rho_l},
            "coexistence_measured_f64": coex_measured,
            "tier_b_mech_targets": {
                "rho_v": ctx["ceB"].rho_v,
                "rho_l": ctx["ceB"].rho_l,
            },
            "laplace_sigma_a": lap["fit_a"]["sigma"],
            "laplace_rows_f64": lap["rows_a"],
            "laplace_browser_protocol": {
                "sigma": bp_sigma,
                "rows": bp_rows,
                "steps": 3000,
            },
            "spurious_max_u_f64": spurious,
            "nosep_spread_f64": nosep_spread,
            "nosep_G": NOSEP_G,
            "nosep_ic_spread": 0.16,
        },
    }
    _write_json(WEB_PUBLIC / "lbm-gate-manifest.json", manifest)


# ---------------------------------------------------------------------------
# entry
# ---------------------------------------------------------------------------


def gen_all() -> None:
    gen_equilibrium_table()
    ctx = gen_coexistence_table()
    lap = gen_laplace_table(ctx)
    gen_contact_angle_table(ctx)
    gen_lamb(ctx, sigma_b=lap["fit_b"]["sigma"])
    gen_gate_assets(ctx, lap)
    print("goldens: all tables + gate assets generated.")


def _ctx_cheap() -> dict[str, Any]:
    """Rebuild the thermo context (seconds) without the 60k-step lattice
    measurements — for targeted asset regeneration."""
    t_c, _rho_c = cs_critical_point()
    return {
        "cmA": coexistence_maxwell(TIER_A_G, psi_exp()),
        "ceB": coexistence_mechanical(
            CS_G, psi_cs(TIER_B_TTC * t_c), TIER_B_EPS, rho_lo=1e-3, rho_hi=0.44
        ),
        "t_c": t_c,
    }


def _laplace_table_points() -> dict[str, dict]:
    """Committed laplace table test_points keyed by inputs.name."""
    lap_table = json.loads((TABLES / "lbm-multiphase-laplace.json").read_text())
    return {tp["inputs"]["name"]: tp for tp in lap_table["test_points"]}


def gen_assets_standalone() -> None:
    """Regenerate gate assets + manifest from COMMITTED artifacts (the
    equilibrated IC bins and the laplace golden table) — no 60k re-runs."""
    from .sim import load_ic

    ctx = _ctx_cheap()
    pts = _laplace_table_points()
    ics_a = {
        r: load_ic(f"lbm-gate-ic-laplaceA-r{int(r)}.bin", 128, 128)
        for r in LAPLACE_RADII
    }
    rows_a = [
        {"R_init": float(r), **pts[f"laplace-A-r{int(r)}"]["expected"]}
        for r in LAPLACE_RADII
    ]
    lap = {
        "rows_a": rows_a,
        "fit_a": pts["laplace-A-fit"]["expected"],
        "ics_a": ics_a,
        "drop_b_final": load_ic("lbm-gate-ic-dropletB.bin", 128, 128),
    }
    gen_gate_assets(ctx, lap)


def gen_lamb_standalone() -> None:
    ctx = _ctx_cheap()
    gen_lamb(ctx, sigma_b=_laplace_table_points()["laplace-B-fit"]["expected"]["sigma"])


__all__ = [
    "LAPLACE_RADII",
    "NOSEP_G",
    "TIER_A_G",
    "TIER_A_TAUS",
    "TIER_B_EPS",
    "TIER_B_SIGMA",
    "TIER_B_TAU",
    "TIER_B_TTC",
    "feq_shifted",
    "gen_all",
    "gen_coexistence_table",
    "gen_contact_angle_table",
    "gen_equilibrium_table",
    "gen_gate_assets",
    "gen_lamb",
    "gen_laplace_table",
    "measure_contact_angle",
]
