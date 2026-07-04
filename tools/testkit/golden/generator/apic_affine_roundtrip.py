"""Generator/verifier for the APIC affine round-trip golden (Prop 5.1).

Direction: **grid -> particle (G2P) -> grid (P2G)** at dt = 0 — the tech
report's actual statement (sim spec v0.2 correction; v0.1 had it
inverted). An affine grid field ``v_i = v0 + C x_i`` is sampled to
particles (velocity + affine matrix reconstruction ``C_p = B_p Dp^-1``)
and transferred back; the generator proves **in exact rational
arithmetic** (``fractions.Fraction``) that

- ``v_p == v0 + C x_p``  and  ``C_p == C``  after G2P, and
- ``mom_i / m_i == v0 + C x_i``  at every massed node after P2G,

for arbitrary particle placement (derivation at
``tools/testkit/golden/derivations/apic-transfers.md`` § 4). The PIC
path (``B_p`` discarded) does NOT reproduce the field — its maximum
per-component deviation is pinned as the paired negative control.

FP-honesty rule (sim spec § 7): dyadic-rational configurations make
every binary64 intermediate exactly representable, so the f64 mirror
asserts bit-for-bit equality; the generic (non-dyadic) point pins its
measured f64 residual under a 1e-14 relative bound.

Usage: ``--verify`` / ``--write`` / ``--print``.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "particle-fluids"
    / "apic-affine-roundtrip.json"
)

Frac = Fraction


def _weights_1d(fp):
    return (
        Frac(1, 2) * (Frac(3, 2) - fp) ** 2,
        Frac(3, 4) - (fp - 1) ** 2,
        Frac(1, 2) * (fp - Frac(1, 2)) ** 2,
    )


def _stencil(x, dx):
    """Yield (node_index_tuple, weight, offset r = x_i - x_p) over 3^d nodes."""
    d = len(x)
    bases = []
    axis_w = []
    for xa in x:
        fx = xa / dx
        base = math.floor(fx + Frac(1, 2)) - 1
        bases.append(base)
        axis_w.append(_weights_1d(fx - base))
    for offs in itertools.product(range(3), repeat=d):
        w = Frac(1)
        node = []
        r = []
        for a in range(d):
            w *= axis_w[a][offs[a]]
            idx = bases[a] + offs[a]
            node.append(idx)
            r.append(idx * dx - x[a])
        if w != 0:
            yield tuple(node), w, tuple(r)


def _matvec(m, v):
    return tuple(sum(row[j] * v[j] for j in range(len(v))) for row in m)


def _vadd(a, b):
    return tuple(x + y for x, y in zip(a, b, strict=True))


def _affine(v0, c_mat, x):
    return _vadd(v0, _matvec(c_mat, x))


def _g2p_from_affine(x_p, v0, c_mat, dx):
    """Sample the analytic affine grid field at the particle. Returns (v_p, C_p)."""
    d = len(x_p)
    v_new = (Frac(0) * x_p[0],) * d
    b_new = [[Frac(0) * x_p[0]] * d for _ in range(d)]
    for node, w, r in _stencil(x_p, dx):
        x_i = tuple(idx * dx for idx in node)
        v_i = _affine(v0, c_mat, x_i)
        v_new = _vadd(v_new, tuple(w * comp for comp in v_i))
        for a in range(d):
            for b in range(d):
                b_new[a][b] += w * v_i[a] * r[b]
    inv_dp = 4 / (dx * dx) if isinstance(dx, float) else Frac(4) / (dx * dx)
    c_p = tuple(tuple(inv_dp * e for e in row) for row in b_new)
    return v_new, c_p


def _p2g(particles, dx):
    """Affine P2G. particles: list of (x, m, v, C). Returns {node: [mass, mom]}."""
    d = len(particles[0][0])
    grid = {}
    for x_p, m_p, v_p, c_p in particles:
        for node, w, r in _stencil(x_p, dx):
            va = _vadd(v_p, _matvec(c_p, r))
            cell = grid.setdefault(node, [Frac(0) * m_p, (Frac(0) * m_p,) * d])
            cell[0] += w * m_p
            cell[1] = _vadd(cell[1], tuple(w * m_p * comp for comp in va))
    return grid


def _zero_mat(d):
    return tuple((Frac(0),) * d for _ in range(d))


def _run(cfg, numeric: str):
    """Run G2P -> P2G. numeric: 'exact' (Fraction) or 'f64' (floats)."""
    if numeric == "exact":
        dx = cfg["dx"]
        v0 = cfg["v0"]
        c_mat = cfg["C"]
        positions = cfg["positions"]
        masses = cfg["masses"]
    else:
        dx = float(cfg["dx"])
        v0 = tuple(float(c) for c in cfg["v0"])
        c_mat = tuple(tuple(float(e) for e in row) for row in cfg["C"])
        positions = [tuple(float(c) for c in x) for x in cfg["positions"]]
        masses = [float(m) for m in cfg["masses"]]
    d = len(positions[0])
    apic_parts = []
    pic_parts = []
    for x_p, m_p in zip(positions, masses, strict=True):
        v_p, c_p = _g2p_from_affine(x_p, v0, c_mat, dx)
        apic_parts.append((x_p, m_p, v_p, c_p))
        zero = tuple(tuple(0 * v_p[0] for _ in range(d)) for _ in range(d))
        pic_parts.append((x_p, m_p, v_p, zero))
    grid_apic = _p2g(apic_parts, dx)
    grid_pic = _p2g(pic_parts, dx)
    recon = {}
    for node in sorted(grid_apic):
        mass, mom = grid_apic[node]
        if mass == 0:
            continue
        recon[node] = tuple(comp / mass for comp in mom)
    pic_dev = 0 * dx
    for node in sorted(grid_pic):
        mass, mom = grid_pic[node]
        if mass == 0:
            continue
        x_i = tuple(idx * dx for idx in node)
        want = _affine(v0, c_mat, x_i)
        got = tuple(comp / mass for comp in mom)
        for a in range(d):
            dev = abs(got[a] - want[a])
            if dev > pic_dev:
                pic_dev = dev
    return apic_parts, recon, pic_dev


def _evaluate_config(cfg):
    dx = cfg["dx"]
    v0 = cfg["v0"]
    c_mat = cfg["C"]
    apic_parts, recon, pic_dev = _run(cfg, "exact")
    # Rational identities (Prop 5.1) — hard assertions.
    for x_p, _m, v_p, c_p in apic_parts:
        if v_p != _affine(v0, c_mat, x_p):
            raise AssertionError(f"{cfg['name']}: G2P velocity not affine-exact")
        if c_p != c_mat:
            raise AssertionError(f"{cfg['name']}: reconstructed C_p != C")
    for node, got in recon.items():
        x_i = tuple(idx * dx for idx in node)
        if got != _affine(v0, c_mat, x_i):
            raise AssertionError(f"{cfg['name']}: P2G node {node} not affine-exact")
    if pic_dev == 0:
        raise AssertionError(f"{cfg['name']}: PIC negative control vanished")
    # f64 mirror.
    _parts64, recon64, pic_dev64 = _run(cfg, "f64")
    worst = 0.0
    for node, got in recon64.items():
        x_i = tuple(idx * float(dx) for idx in node)
        want = _affine(
            tuple(float(c) for c in v0),
            tuple(tuple(float(e) for e in row) for row in c_mat),
            x_i,
        )
        for a in range(len(got)):
            denom = max(abs(want[a]), 1e-30)
            worst = max(worst, abs(got[a] - want[a]) / denom)
    if cfg["dyadic"]:
        if worst != 0.0:
            raise AssertionError(f"{cfg['name']}: dyadic f64 run not bit-exact ({worst})")
    elif worst > 1e-14:
        raise AssertionError(f"{cfg['name']}: f64 residual {worst} > 1e-14")
    sample_node = sorted(recon)[len(recon) // 2]
    return {
        "roundtrip_identity": "mom_i/m_i == v0 + C x_i at every massed node (exact)",
        "n_massed_nodes_checked": len(recon),
        "sample_node": list(sample_node),
        "sample_node_velocity": [float(c) for c in recon[sample_node]],
        "sample_node_velocity_exact_rational": [str(c) for c in recon[sample_node]],
        "pic_max_abs_deviation": float(pic_dev),
        "pic_max_abs_deviation_exact_rational": str(pic_dev),
        "f64_bit_exact": bool(cfg["dyadic"]),
        "f64_max_rel_err_measured": worst,
        "f64_pic_max_abs_deviation_measured": float(pic_dev64),
    }


_CONFIGS = [
    {
        "name": "2d-dyadic-general-affine",
        "dx": Frac(1),
        "v0": (Frac(1, 2), Frac(-1, 4)),
        "C": ((Frac(1, 8), Frac(-1, 2)), (Frac(1, 4), Frac(1, 16))),
        "positions": [(Frac(3), Frac(3)), (Frac(17, 4), Frac(7, 2))],
        "masses": [Frac(1), Frac(2)],
        "dyadic": True,
    },
    {
        "name": "2d-dyadic-pure-rotation",
        "dx": Frac(1),
        "v0": (Frac(0), Frac(0)),
        "C": ((Frac(0), Frac(-1, 2)), (Frac(1, 2), Frac(0))),
        "positions": [(Frac(3), Frac(3)), (Frac(15, 4), Frac(9, 2))],
        "masses": [Frac(1), Frac(1, 2)],
        "dyadic": True,
    },
    {
        "name": "2d-generic-nondyadic",
        "dx": Frac(1, 2),
        "v0": (Frac(1, 3), Frac(-2, 7)),
        "C": ((Frac(1, 9), Frac(-2, 11)), (Frac(5, 13), Frac(1, 7))),
        "positions": [(Frac(23, 20), Frac(27, 20)), (Frac(37, 20), Frac(33, 20))],
        "masses": [Frac(3, 7), Frac(7, 5)],
        "dyadic": False,
    },
    {
        "name": "3d-dyadic-general-affine",
        "dx": Frac(1),
        "v0": (Frac(1, 2), Frac(-1, 4), Frac(3, 8)),
        "C": (
            (Frac(1, 8), Frac(-1, 2), Frac(1, 4)),
            (Frac(1, 4), Frac(1, 16), Frac(-1, 8)),
            (Frac(-3, 8), Frac(1, 2), Frac(1, 32)),
        ),
        "positions": [
            (Frac(3), Frac(3), Frac(3)),
            (Frac(17, 4), Frac(7, 2), Frac(11, 4)),
        ],
        "masses": [Frac(1), Frac(2)],
        "dyadic": True,
    },
]


def compute_canonical():
    return [_evaluate_config(cfg) for cfg in _CONFIGS]


def build_table():
    expecteds = compute_canonical()
    # One GENUINELY DISTINCT independent anchor per test point (spec
    # § 2.4 / integrity cat3: distinct sources, not restatements).
    anchors = [
        {
            "source": (
                "Hand derivation at tools/testkit/golden/derivations/"
                "apic-transfers.md § 4: G2P of an affine field reconstructs "
                "(v0 + C x_p, C) exactly (weight moments sum w = 1, "
                "sum w r = 0, sum w r r^T = (1/4) dx^2 I), and P2G then "
                "reproduces v0 + C x_i at every massed node for arbitrary "
                "particle placement. Generator re-proves both as exact "
                "rational identities at verify time; PIC deviation pinned "
                "as the negative control."
            ),
            "doi": "n/a (in-repo hand-derivation, exact rational arithmetic)",
            "derived_by": (
                "fractions.Fraction identity proof; dyadic configuration "
                "additionally bit-exact in binary64 by construction "
                "(FP-honesty rule, sim spec docs/sim-specs/particle-fluids/"
                "pic-flip/spec-ref.md § 7)"
            ),
            "expected": {
                "roundtrip": "exact reproduction (rational identity)",
                "pic_negative_control": "max deviation > 0 (pinned)",
            },
        },
        {
            "source": (
                "Jiang, Schroeder, Selle, Teran & Stomakhin (2015), 'The "
                "Affine Particle-In-Cell Method', ACM TOG 34(4); companion "
                "tech report Proposition 5.1 — the published affine round-"
                "trip statement, whose motivating special case is exactly "
                "this test point's pure rigid rotation (v = omega x r; the "
                "APIC paper's headline claim is that the rotation survives "
                "the grid transfer, unlike PIC). Direction grid -> particle "
                "-> grid verified verbatim against the tech-report text "
                "during the spec v0.2 review (2026-07-04)."
            ),
            "doi": "10.1145/2766996 (Jiang et al. 2015; tech-report Prop 5.1)",
            "derived_by": (
                "published proposition; table values are the exact-rational "
                "instantiation at the rotation configuration"
            ),
            "expected": {
                "roundtrip": "pure rotation reproduced exactly",
            },
        },
        {
            "source": (
                "Hu, Fang, Ge, Qu, Zhu, Pradhana & Jiang (2018), 'A Moving "
                "Least Squares Material Point Method...', ACM TOG 37(4) § 3-4 "
                "and the committed repo MLS-MPM reference packages/"
                "mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py: "
                "the affine reconstruction coefficient 4/dx^2 (the "
                "affine_scale constant in the repo's independently verified "
                "g2p kernel) is the same constant that makes this round "
                "trip exact — an independent, already-landed in-repo "
                "verification chain for the reconstruction. This test "
                "point exercises it at non-unit dx (dx = 1/2) and "
                "non-dyadic positions."
            ),
            "doi": "10.1145/3197517.3201293 (Hu et al. 2018 MLS-MPM)",
            "derived_by": (
                "cross-anchor to the MLS-MPM verification chain; measured "
                "f64 residual pinned under 1e-14 relative"
            ),
            "expected": {
                "affine_scale": "4 / dx^2 (constant Dp inverse)",
            },
        },
        {
            "source": (
                "Independent binary64 mirror computation: the identical "
                "G2P -> P2G pipeline evaluated in IEEE-754 double "
                "precision (a different arithmetic system from the "
                "rational-arithmetic proof) reproduces the 3D affine field "
                "bit-for-bit at every massed node under the dyadic "
                "construction — every product, sum, and the mom/mass "
                "division exactly representable, so agreement is by "
                "construction, not tolerance (asserted at generator "
                "verify time and replayed through the numba kernels by "
                "the gate-5 test)."
            ),
            "doi": "n/a (in-repo binary64 mirror; IEEE-754 exactness argument)",
            "derived_by": (
                "f64 pipeline run compared elementwise against the exact "
                "rationals; bit-equality asserted"
            ),
            "expected": {
                "f64_bit_exact": True,
            },
        },
    ]
    test_points = []
    for cfg, expected, anchor in zip(_CONFIGS, expecteds, anchors, strict=True):
        test_points.append(
            {
                "inputs": {
                    "name": cfg["name"],
                    "dx": float(cfg["dx"]),
                    "v0": [float(c) for c in cfg["v0"]],
                    "C": [[float(e) for e in row] for row in cfg["C"]],
                    "positions": [[float(c) for c in x] for x in cfg["positions"]],
                    "masses": [float(m) for m in cfg["masses"]],
                    "exact": {
                        "dx": str(cfg["dx"]),
                        "v0": [str(c) for c in cfg["v0"]],
                        "C": [[str(e) for e in row] for row in cfg["C"]],
                        "positions": [[str(c) for c in x] for x in cfg["positions"]],
                        "masses": [str(m) for m in cfg["masses"]],
                    },
                    "direction": "grid -> particle (G2P) -> grid (P2G), dt = 0",
                    "dyadic_exact_configuration": bool(cfg["dyadic"]),
                },
                "expected": expected,
                "independent_reference": anchor,
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "apic-affine-roundtrip-grid-particle-grid",
        "category": "particle-fluids",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/apic-transfers.md",
            "upstream": "Jiang-APIC-2015-tech-report-prop-5.1",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "https://cs.ucr.edu/~craigs/papers/2015-apic/tech-doc.pdf",
        },
        "tolerance": {
            "absolute": 0.0,
            "relative": 1e-14,
            "note": (
                "dyadic test points assert bit-for-bit f64 equality "
                "(tolerance 0); the generic point pins its measured f64 "
                "residual under the 1e-14 relative bound"
            ),
        },
        "test_points": test_points,
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    fresh = build_table()
    if len(table["test_points"]) != len(fresh["test_points"]):
        print("FAIL: test point count drift", file=sys.stderr)
        return 1
    for idx, (got, want) in enumerate(zip(table["test_points"], fresh["test_points"], strict=True)):
        if got["expected"] != want["expected"]:
            print(f"FAIL: test point {idx} expected-block drift", file=sys.stderr)
            return 1
    print(f"OK — {table_path} matches exact-rational re-derivation (identities re-proven).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--print", action="store_true")
    args = parser.parse_args()
    if args.write:
        TABLE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with TABLE_PATH.open("w") as fh:
            json.dump(build_table(), fh, indent=2)
            fh.write("\n")
        print(f"wrote {TABLE_PATH}")
        return 0
    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
