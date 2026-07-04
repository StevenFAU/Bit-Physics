"""Generator/verifier for the APIC transfer-weights + Dp closed-form golden.

Proves, in exact rational arithmetic (``fractions.Fraction``), the three
weight-moment identities of the quadratic B-spline transfer stencil
(derivation at ``tools/testkit/golden/derivations/apic-transfers.md`` § 2):

- partition of unity        sum_k w_k       == 1
- linear reproduction       sum_k w_k r_k   == 0
- APIC inertia (Dp)         sum_k w_k r_k^2 == 1/4    (=> Dp = (1/4) dx^2 I)

and pins the same 10 shape-function sample values as the MLS-MPM golden
``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json``
(FP-equivalence anchor; absolute 1e-15).

Usage: ``--verify`` re-derives every table value and compares;
``--write`` regenerates the table (idempotent at HEAD); ``--print``
dumps the computed values.
"""

from __future__ import annotations

import argparse
import json
import sys
from fractions import Fraction
from pathlib import Path

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "particle-fluids"
    / "apic-transfer-weights.json"
)

# Same 10 sample points as the MLS-MPM shape-function golden (the repo
# cross-anchor; values must FP-match that table at 1e-15).
_SAMPLE_XS = [
    Fraction(0),
    Fraction(1, 2),
    Fraction(-1, 2),
    Fraction(1),
    Fraction(-1),
    Fraction(3, 2),
    Fraction(-3, 2),
    Fraction(1, 4),
    Fraction(-1, 4),
    Fraction(3, 10),
]

# Rational fp probes for the moment identities. The three moments are
# polynomials in fp of degree <= 4; five distinct probe points prove a
# degree-4 polynomial identity (plus fp = 1, the dyadic cell-center).
_FP_PROBES = [
    Fraction(1),
    Fraction(1, 2),
    Fraction(3, 4),
    Fraction(13, 10),
    Fraction(7, 6),
    Fraction(59, 40),
]

_DX_PROBES = [Fraction(1), Fraction(1, 2), Fraction(1, 32)]


def n_exact(x: Fraction) -> Fraction:
    """Quadratic B-spline N(x) in exact rational arithmetic."""
    ax = abs(x)
    if ax < Fraction(1, 2):
        return Fraction(3, 4) - x * x
    if ax < Fraction(3, 2):
        return Fraction(1, 2) * (Fraction(3, 2) - ax) ** 2
    return Fraction(0)


def weights_exact(fp: Fraction) -> tuple[Fraction, Fraction, Fraction]:
    """The 3 stencil weights at fractional offset fp in [1/2, 3/2)."""
    w0 = Fraction(1, 2) * (Fraction(3, 2) - fp) ** 2
    w1 = Fraction(3, 4) - (fp - 1) ** 2
    w2 = Fraction(1, 2) * (fp - Fraction(1, 2)) ** 2
    return (w0, w1, w2)


def moments_exact(fp: Fraction) -> tuple[Fraction, Fraction, Fraction]:
    """(sum w, sum w r, sum w r^2) with node offsets r_k = k - fp."""
    ws = weights_exact(fp)
    m0 = sum(ws, Fraction(0))
    m1 = sum(w * (k - fp) for k, w in enumerate(ws))
    m2 = sum(w * (k - fp) ** 2 for k, w in enumerate(ws))
    return (m0, m1, m2)


def compute_canonical() -> dict[str, object]:
    """All table-pinned values, derived from the exact-rational identities."""
    samples = {f"x={float(x):+.4f}": float(n_exact(x)) for x in _SAMPLE_XS}
    moment_rows = {}
    for fp in _FP_PROBES:
        m0, m1, m2 = moments_exact(fp)
        if (m0, m1, m2) != (Fraction(1), Fraction(0), Fraction(1, 4)):
            raise AssertionError(f"moment identity failed at fp={fp}: {(m0, m1, m2)}")
        moment_rows[f"fp={float(fp):+.6f}"] = {
            "sum_w": float(m0),
            "sum_w_r": float(m1),
            "sum_w_r2": float(m2),
        }
    dp_rows = {f"dx={float(dx)}": float(Fraction(1, 4) * dx * dx) for dx in _DX_PROBES}
    return {
        "samples": samples,
        "moments": moment_rows,
        "dp_diagonal": dp_rows,
        "dp_off_diagonal": 0.0,
    }


def build_table() -> dict[str, object]:
    expected = compute_canonical()
    return {
        "schema_version": "1.0.0",
        "algorithm": "apic-quadratic-bspline-transfer-weights-dp",
        "category": "particle-fluids",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/apic-transfers.md",
            "upstream": "Jiang-APIC-2015 + SIGGRAPH-2016-MPM-course-notes",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "https://doi.org/10.1145/2766996",
        },
        "tolerance": {"absolute": 1e-15, "relative": 0.0},
        # Three test points share the same inputs/expected block; each
        # carries a GENUINELY DISTINCT independent anchor (spec § 2.4 /
        # integrity cat3: distinct sources, not restatements — the
        # mls-mpm-shape-functions.json convention).
        "test_points": [
            {
                "inputs": _inputs_block("hand-derivation-anchor"),
                "expected": expected,
                "independent_reference": {
                    "source": (
                        "Hand derivation at tools/testkit/golden/derivations/"
                        "apic-transfers.md § 2: the three weight moments are "
                        "polynomial identities in fp of degree <= 4, proven in "
                        "exact rational arithmetic (fractions.Fraction) at 6 "
                        "distinct rational probes (5 suffice for degree 4); "
                        "Dp = (1/4) dx^2 I follows from the tensor-product "
                        "structure + the zeroth/first moments (off-diagonals "
                        "carry a first-moment factor = 0)."
                    ),
                    "doi": "n/a (in-repo hand-derivation, exact rational arithmetic)",
                    "derived_by": (
                        "fractions.Fraction identity proof; every expected "
                        "value is the float() image of an exact rational"
                    ),
                    "expected": {"sum_w": 1.0, "sum_w_r": 0.0, "sum_w_r2": 0.25},
                },
            },
            {
                "inputs": _inputs_block("published-closed-form-anchor"),
                "expected": expected,
                "independent_reference": {
                    "source": (
                        "Jiang, Schroeder, Selle, Teran & Stomakhin (2015), "
                        "'The Affine Particle-In-Cell Method', ACM TOG 34(4) "
                        "(Dp definition), and Jiang et al. (2016), 'The "
                        "Material Point Method for Simulating Continuum "
                        "Materials', SIGGRAPH 2016 Courses § 10.1 eq. (174): "
                        "the published closed form Dp = (1/4) dx^2 I for the "
                        "quadratic B-spline. Substituting the table's fp "
                        "probes into the published piecewise weights "
                        "reproduces every moment row."
                    ),
                    "doi": (
                        "10.1145/2766996 (Jiang et al. 2015 APIC); "
                        "10.1145/2897826.2927348 (SIGGRAPH 2016 MPM course "
                        "notes § 10.1 eq. 174)"
                    ),
                    "derived_by": (
                        "published closed-form statement; verified against "
                        "the local course-notes copy during the spec v0.2 "
                        "review (2026-07-04)"
                    ),
                    "expected": {"sum_w_r2": 0.25},
                },
            },
            {
                "inputs": _inputs_block("repo-mls-mpm-cross-anchor"),
                "expected": expected,
                "independent_reference": {
                    "source": (
                        "Committed repo golden tools/testkit/golden/tables/"
                        "hybrid-pg/mls-mpm-shape-functions.json (independent "
                        "artifact, landed with the mpm-multimaterial "
                        "sub-phase): the 10 shape-function sample values and "
                        "the partition-of-unity rows FP-match at absolute "
                        "1e-15 — the same stencil verified by an earlier, "
                        "independent derivation chain (Hu 2018 88-line "
                        "reference + Steffen-Kirby-Berzins 2008)."
                    ),
                    "doi": (
                        "10.1145/3197517.3201293 (Hu et al. 2018 MLS-MPM); "
                        "10.1002/nme.2360 (Steffen-Kirby-Berzins 2008)"
                    ),
                    "derived_by": (
                        "FP cross-comparison against the committed MLS-MPM "
                        "golden (enforced by this generator's --verify and by "
                        "the gate-5 test)"
                    ),
                    "expected": {"n_at_zero": 0.75, "n_at_one": 0.125},
                },
            },
        ],
    }


def _inputs_block(anchor_name: str) -> dict[str, object]:
    return {
        "name": f"apic-weights-moments-and-dp-closed-form-{anchor_name}",
        "shape_function": "quadratic B-spline (identical to MLS-MPM golden)",
        "formula": (
            "N(x) = 3/4 - x^2 for |x|<1/2; (1/2)(3/2 - |x|)^2 for 1/2 <= |x| < 3/2; 0 otherwise"
        ),
        "base_node_convention": (
            "base = floor(p + 0.5) - 1; particle interacts with "
            "base, base+1, base+2; fp = p - base in [0.5, 1.5)"
        ),
        "fp_probes": [str(fp) for fp in _FP_PROBES],
        "dx_probes": [str(dx) for dx in _DX_PROBES],
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
    # Cross-anchor: FP-match against the MLS-MPM shape-function golden.
    mls_path = (
        Path(__file__).resolve().parents[2]
        / "golden"
        / "tables"
        / "hybrid-pg"
        / "mls-mpm-shape-functions.json"
    )
    with mls_path.open() as fh:
        mls = json.load(fh)
    mls_samples = mls["test_points"][0]["expected"]["samples"]
    ours = table["test_points"][0]["expected"]["samples"]
    failures = [
        key for key, val in mls_samples.items() if key in ours and abs(ours[key] - val) > 1e-15
    ]
    if failures:
        print(f"FAIL: MLS-MPM cross-anchor mismatch at {failures}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} matches exact-rational re-derivation + MLS-MPM anchor.")
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
