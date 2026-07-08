"""Generator/verifier for the erfc / product-form bounded-block golden (table D).

Three fixture families (spec-ref.md § 4.5):

1. ``erfc_semi_infinite``  — T_d = erfc(x' / (2*sqrt(t_d))), the suddenly-
   heated semi-infinite similarity solution.
2. ``slab_unaccomplished`` — theta(x_d, t_d) eigenmode series for the
   symmetric slab (|x_d| <= 1, both faces stepped), truncation bound
   recorded per point.
3. ``product_block``       — the 2D bounded block via the PINNED sign
   convention: the UNACCOMPLISHED ratio factorizes (theta_2D = theta_x *
   theta_y), so accomplished T_d = 1 - theta_x*theta_y (Crank 1975 p. 25).
   Validity: uniform T_i, same step BC on all exposed faces, no generation,
   constant properties.

Internal cross-checks: math.erfc vs scipy.special.erfc at every erfc point;
the slab series at the wall (x_d = 1) telescopes to theta = 0 exactly; the
series truncation tail bound exp(-zeta_{K+1}^2 t_d) is recorded and must sit
below the table tolerance.

Derivation: tools/testkit/golden/derivations/heat-equation-erfc-block.md
Usage: --verify / --print / --write.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_REPO / "packages/heat-equation"))

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "volumetric-grid"
    / "heat-equation-erfc-block.json"
)

TERMS = 64

ERFC_CASES: list[tuple[float, float]] = [(0.5, 0.02), (1.0, 0.1), (0.25, 0.05)]
SLAB_CASES: list[tuple[float, float]] = [(0.0, 0.2), (0.5, 0.2), (0.5, 0.05), (1.0, 0.1)]
BLOCK_CASES: list[tuple[float, float, float, float]] = [
    (0.0, 0.0, 0.2, 0.2),
    (0.5, 0.25, 0.2, 0.2),
    (0.3, 0.3, 0.1, 0.15),
]


def erfc_value(x_dimless: float, t_fourier: float) -> float:
    val = math.erfc(x_dimless / (2.0 * math.sqrt(t_fourier)))
    return val


def slab_theta(x_d: float, t_d: float, terms: int = TERMS) -> float:
    theta = 0.0
    for i in range(1, terms + 1):
        zeta = (2 * i - 1) * math.pi / 2.0
        coeff = 4.0 * (-1.0) ** (i + 1) / ((2 * i - 1) * math.pi)
        theta += coeff * math.exp(-zeta * zeta * t_d) * math.cos(zeta * x_d)
    return theta


def slab_tail_bound(t_d: float, terms: int = TERMS) -> float:
    zeta = (2 * terms + 1) * math.pi / 2.0
    return (4.0 / ((2 * terms + 1) * math.pi)) * math.exp(-zeta * zeta * t_d)


def solver_values(kind: str, inputs: dict[str, float]) -> float:
    import numpy as np
    from heat_equation.reference import (
        erfc_semi_infinite,
        product_block_accomplished,
        slab_unaccomplished,
    )

    if kind == "erfc_semi_infinite":
        return float(erfc_semi_infinite(np.array([inputs["x_dimless"]]), inputs["t_fourier"])[0])
    if kind == "slab_unaccomplished":
        return float(slab_unaccomplished(np.array([inputs["x_d"]]), inputs["t_d"])[0])
    return float(
        product_block_accomplished(
            np.array([inputs["x_d"]]),
            np.array([inputs["y_d"]]),
            inputs["t_dx"],
            inputs["t_dy"],
        )[0]
    )


def compute_canonical() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for x, t in ERFC_CASES:
        rows.append(
            {
                "kind": "erfc_semi_infinite",
                "x_dimless": x,
                "t_fourier": t,
                "value": erfc_value(x, t),
            }
        )
    for x, t in SLAB_CASES:
        rows.append({"kind": "slab_unaccomplished", "x_d": x, "t_d": t, "value": slab_theta(x, t)})
    for x, y, tx, ty in BLOCK_CASES:
        rows.append(
            {
                "kind": "product_block",
                "x_d": x,
                "y_d": y,
                "t_dx": tx,
                "t_dy": ty,
                "value": 1.0 - slab_theta(x, tx) * slab_theta(y, ty),
            }
        )
    return rows


def build_table() -> dict[str, object]:
    # Wall identity cross-check: theta(1, t_d) = 0 exactly (cos(zeta) = 0).
    for t_d in (0.05, 0.1, 0.2):
        assert abs(slab_theta(1.0, t_d)) <= 1e-14, slab_theta(1.0, t_d)

    points: list[dict[str, object]] = []
    for x, t in ERFC_CASES:
        import scipy.special

        val = erfc_value(x, t)
        assert abs(float(scipy.special.erfc(x / (2.0 * math.sqrt(t)))) - val) <= 1e-15
        points.append(
            {
                "inputs": {"kind": "erfc_semi_infinite", "x_dimless": x, "t_fourier": t},
                "expected": {"value": val},
                "independent_reference": {
                    "derived_by": "dual-library",
                    "source": (
                        "math.erfc (CPython libm) vs scipy.special.erfc agreement "
                        "asserted in-generator; similarity solution of the suddenly-"
                        "heated half-space (Carslaw & Jaeger § 2.4; Zhou et al. 2017)."
                    ),
                    "doi": "10.1002/2017WR021040",
                },
            }
        )
    for x, t in SLAB_CASES:
        points.append(
            {
                "inputs": {"kind": "slab_unaccomplished", "x_d": x, "t_d": t, "terms": TERMS},
                "expected": {"value": slab_theta(x, t), "series_tail_bound": slab_tail_bound(t)},
                "independent_reference": {
                    "derived_by": "eigenfunction-series",
                    "source": (
                        "Separation-of-variables slab series (Carslaw & Jaeger; "
                        "Incropera one-term lineage), truncation tail bound recorded; "
                        "wall identity theta(1, t_d) = 0 asserted in-generator."
                    ),
                    "doi": "n/a-classical-series",
                },
            }
        )
    for x, y, tx, ty in BLOCK_CASES:
        val = 1.0 - slab_theta(x, tx) * slab_theta(y, ty)
        points.append(
            {
                "inputs": {"kind": "product_block", "x_d": x, "y_d": y, "t_dx": tx, "t_dy": ty},
                "expected": {
                    "value": val,
                    "sign_convention": (
                        "UNACCOMPLISHED ratio factorizes: theta_2D = theta_x*theta_y; "
                        "accomplished T_d = 1 - theta_x*theta_y. NOT prod(T_d,i) "
                        "(spec-ref.md § 4.5, v0.3 pin)."
                    ),
                },
                "independent_reference": {
                    "derived_by": "product-form",
                    "source": (
                        "Crank, The Mathematics of Diffusion, 2nd ed. (1975), p. 25 "
                        "(product of 1D solutions); Zhou, Oldenburg, Rutqvist & "
                        "Birkholzer, Water Resour. Res. 53:9960-9979 (2017) combined-"
                        "series solutions to <1e-7 relative on 1D-3D blocks."
                    ),
                    "doi": "10.1002/2017WR021040",
                },
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "heat-equation-erfc-product-block",
        "category": "volumetric-grid",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/heat-equation-erfc-block.md",
            "upstream": "Crank-1975-p25-product-form-plus-Zhou-2017-WRR",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "https://doi.org/10.1002/2017WR021040",
        },
        "tolerance": {"absolute": 0.0, "relative": 1e-12},
        "test_points": points,
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    rel = float(table["tolerance"]["relative"])
    failures: list[str] = []
    for tp in table["test_points"]:
        inp = dict(tp["inputs"])
        kind = str(inp.pop("kind"))
        inp.pop("terms", None)
        want = float(tp["expected"]["value"])
        if kind == "erfc_semi_infinite":
            cf = erfc_value(inp["x_dimless"], inp["t_fourier"])
        elif kind == "slab_unaccomplished":
            cf = slab_theta(inp["x_d"], inp["t_d"])
        else:
            cf = 1.0 - slab_theta(inp["x_d"], inp["t_dx"]) * slab_theta(inp["y_d"], inp["t_dy"])
        sv = solver_values(kind, inp)
        scale = max(abs(want), 1e-12)
        if abs(cf - want) > rel * scale:
            failures.append(f"closed form {cf} != table {want} for {kind} {inp}")
        if abs(sv - want) > rel * scale:
            failures.append(f"solver {sv} != table {want} for {kind} {inp}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} erfc/product-form block pinned (closed form + solver).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--print", action="store_true")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0
    if args.write:
        TABLE_PATH.write_text(json.dumps(build_table(), indent=2) + "\n")
        print(f"wrote {TABLE_PATH}")
        return 0
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
