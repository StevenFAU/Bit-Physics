"""Generator/verifier for the PIC/FLIP transfer-error golden (Zhu eq. 3.8, 1/9).

Evaluates the classic PIC grid->particle->grid round trip — linear
interpolation to particles (tent, radius dx) + tent-weighted gather
back to the node, particles uniform over the half-cell |y - x0| <=
dx/2 — **in exact rational arithmetic** (piecewise polynomial
integration with ``fractions.Fraction``), proving

    f_tilde(x0) - f(x0) == (1/9) f''(x0) dx^2       (exactly, for quadratic f)

per Zhu (2005) MSc thesis eq. (3.8). Derivation at
``tools/testkit/golden/derivations/pic-flip-transfer-error.md``. The
coefficient is scoped to exactly this kernel/support pair (sim spec
v0.2 § 7 — the unsourced "1/6 other-kernel" variant is dropped).

Also pins a discrete midpoint-rule particle ladder (n in {4, 16, 64}
uniform particles) whose exact rational values converge monotonically
to the continuum limit — the finite-particle confirmation consumed by
the reference order-of-accuracy test.

Usage: ``--verify`` / ``--write`` / ``--print``.
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
    / "pic-flip-transfer-error.json"
)

Frac = Fraction

# Two quadratic samples f(x) = a + b x + c x^2 with the same c — the
# linear coefficient must not contribute (b-independence check).
_SAMPLES = [
    {"a": Frac(1), "b": Frac(0), "c": Frac(3)},
    {"a": Frac(1, 4), "b": Frac(-3, 2), "c": Frac(3)},
]

_LADDER_NS = [4, 16, 64]


def _poly_mul(p: list[Fraction], q: list[Fraction]) -> list[Fraction]:
    out = [Frac(0)] * (len(p) + len(q) - 1)
    for i, pi in enumerate(p):
        for j, qj in enumerate(q):
            out[i + j] += pi * qj
    return out


def _poly_int(p: list[Fraction], lo: Fraction, hi: Fraction) -> Fraction:
    total = Frac(0)
    for i, coef in enumerate(p):
        total += coef * (hi ** (i + 1) - lo ** (i + 1)) / (i + 1)
    return total


def _f(sample, x: Fraction) -> Fraction:
    return sample["a"] + sample["b"] * x + sample["c"] * x * x


def _interp(sample, y: Fraction) -> Fraction:
    """Linear interpolation of f between the integer nodes bracketing y."""
    if y >= 0:
        return (1 - y) * _f(sample, Frac(0)) + y * _f(sample, Frac(1))
    return (1 + y) * _f(sample, Frac(0)) + (-y) * _f(sample, Frac(-1))


def continuum_roundtrip(sample) -> Fraction:
    """Exact continuum-limit gathered value f_tilde(0).

    Right half (y in [0, 1/2]): weight (1 - y), interp
    (1-y) f0 + y f1. Left half via u = -y: weight (1 - u), interp
    (1-u) f0 + u f(-1). Both are exact polynomial integrals.
    """
    f0 = _f(sample, Frac(0))
    f1 = _f(sample, Frac(1))
    fm1 = _f(sample, Frac(-1))
    half = Frac(1, 2)
    w = [Frac(1), Frac(-1)]  # 1 - t on [0, 1/2]
    right = _poly_int(_poly_mul(w, [f0, f1 - f0]), Frac(0), half)
    left = _poly_int(_poly_mul(w, [f0, fm1 - f0]), Frac(0), half)
    denom = 2 * _poly_int(w, Frac(0), half)
    return (right + left) / denom


def discrete_roundtrip(sample, n: int) -> Fraction:
    """Midpoint-uniform n-particle gathered value (exact rational)."""
    num = Frac(0)
    den = Frac(0)
    for k in range(n):
        y = Frac(-1, 2) + Frac(2 * k + 1, 2 * n)
        w = 1 - abs(y)
        num += w * _interp(sample, y)
        den += w
    return num / den


def compute_canonical() -> list[dict[str, object]]:
    rows = []
    for sample in _SAMPLES:
        f0 = _f(sample, Frac(0))
        fpp = 2 * sample["c"]
        cont = continuum_roundtrip(sample)
        err = cont - f0
        coeff = err / fpp
        if coeff != Frac(1, 9):
            raise AssertionError(f"coefficient {coeff} != 1/9 for sample {sample}")
        ladder = {}
        prev_abs = None
        for n in _LADDER_NS:
            disc = discrete_roundtrip(sample, n)
            resid = abs(disc - cont)
            if prev_abs is not None and not resid < prev_abs:
                raise AssertionError(f"ladder not monotone at n={n}")
            prev_abs = resid
            ladder[f"n={n}"] = {
                "f_tilde": float(disc),
                "f_tilde_exact_rational": str(disc),
                "abs_residual_vs_continuum": float(resid),
            }
        rows.append(
            {
                "f_at_x0": float(f0),
                "f_second_derivative": float(fpp),
                "f_tilde_continuum": float(cont),
                "f_tilde_continuum_exact_rational": str(cont),
                "error_exact_rational": str(err),
                "coefficient_exact_rational": str(coeff),
                "coefficient": float(coeff),
                "particle_ladder": ladder,
            }
        )
    if rows[0]["coefficient_exact_rational"] != rows[1]["coefficient_exact_rational"]:
        raise AssertionError("b-independence check failed")
    return rows


def build_table() -> dict[str, object]:
    expecteds = compute_canonical()
    test_points = []
    for sample, expected in zip(_SAMPLES, expecteds, strict=True):
        test_points.append(
            {
                "inputs": {
                    "name": (f"quadratic-f-tent-halfcell-roundtrip-b={float(sample['b'])}"),
                    "f": "f(x) = a + b x + c x^2",
                    "a": float(sample["a"]),
                    "b": float(sample["b"]),
                    "c": float(sample["c"]),
                    "exact": {
                        "a": str(sample["a"]),
                        "b": str(sample["b"]),
                        "c": str(sample["c"]),
                    },
                    "dx": 1.0,
                    "kernel": (
                        "linear interpolation to particles (tent radius dx) + "
                        "tent-weighted gather at the node; particles uniform "
                        "over the half-cell |y - x0| <= dx/2"
                    ),
                    "scaling_note": (
                        "error scales as f''(x0) dx^2; the table is stated at "
                        "unit spacing (coefficient is dimensionless)"
                    ),
                },
                "expected": expected,
                "independent_reference": {
                    "source": (
                        "Hand derivation at tools/testkit/golden/derivations/"
                        "pic-flip-transfer-error.md § 2: smoothing "
                        "contribution 5/144 f'' + interpolation contribution "
                        "11/144 f'' = (1/9) f'' dx^2 — both integrals "
                        "evaluated in exact rational arithmetic; the discrete "
                        "midpoint ladder converges to the same limit "
                        "(independent numerical confirmation)."
                    ),
                    "doi": (
                        "10.1145/1073204.1073298 (Zhu & Bridson 2005); the "
                        "coefficient statement is thesis eq. 3.8 (Zhu 2005, "
                        "UBC MSc thesis)"
                    ),
                    "derived_by": (
                        "exact rational arithmetic (piecewise polynomial "
                        "integration; no floating point enters the identity)"
                    ),
                    "expected": {"coefficient": "1/9 (exact rational)"},
                },
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "pic-flip-tent-halfcell-transfer-error-coefficient",
        "category": "particle-fluids",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/pic-flip-transfer-error.md",
            "upstream": "Zhu-2005-UBC-MSc-thesis-eq-3.8",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "https://www.cs.ubc.ca/~rbridson/docs/yzhu_msc.pdf",
        },
        "tolerance": {"absolute": 1e-15, "relative": 0.0},
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
    print(f"OK — {table_path} matches exact-rational re-derivation (1/9 re-proven).")
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
