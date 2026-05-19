"""SymPy-symbolic regenerator for the cubic-spline kernel golden table.

Spec § 2.4. Recomputes every entry in
`../tables/cubic-spline-kernel.json` from the analytic 3D Monaghan
cubic spline (derivation: `../derivations/cubic-spline-kernel.md`).
Idempotent: running this script produces a byte-for-byte identical
file given the same derivation.

Independent-reference anchors are re-verified at generation time: the
hand-derived `expected` values committed in the table at q ∈ {0, 1, 2}
are cross-checked against the SymPy values to within `_ANCHOR_TOL`
absolute. Disagreement HALTs (one of the two is wrong; see derivation
§ 4 and spec § 2.4).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import sympy as sp

_TABLE_PATH = Path(__file__).resolve().parent.parent / "tables" / "cubic-spline-kernel.json"
_DERIVATION_DOC = "tools/testkit/golden/derivations/cubic-spline-kernel.md"
_UPSTREAM_PATH = "references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.h"
_UPSTREAM_NAME = "SPlisHSPlasH"
_UPSTREAM_SHA = "6bff55a6eaf14083d34650f22a268ce156b62b54"

# Numeric precision at which symbolic values are committed to JSON. 30
# significant digits is well below float64 precision (~17 digits) and
# survives JSON round-trip via standard `json.loads(json.dumps(...))`.
_PRECISION_DIGITS = 30

# Tolerance for cross-checking the committed independent-reference
# anchors against the SymPy symbolic values. Spec § 2.4 mandates 1e-10
# absolute or tighter.
_ANCHOR_TOL = sp.Rational(1, 10**10)

# Test grid (plan § 7.4 — locked).
_Q_VALUES = [
    sp.Rational(0, 1),
    sp.Rational(1, 4),
    sp.Rational(1, 2),
    sp.Rational(3, 4),
    sp.Rational(1, 1),
    sp.Rational(5, 4),
    sp.Rational(3, 2),
    sp.Rational(7, 4),
    sp.Rational(2, 1),
]
_H = sp.Rational(1, 1)


def _symbolic_W(q: sp.Expr, h: sp.Expr) -> sp.Expr:
    """3D Monaghan cubic-spline kernel value (symbolic, sigma_3 = 1/pi)."""
    f = sp.Piecewise(
        (1 - sp.Rational(3, 2) * q**2 + sp.Rational(3, 4) * q**3, q < 1),
        (sp.Rational(1, 4) * (2 - q) ** 3, q < 2),
        (sp.Integer(0), True),
    )
    return (1 / sp.pi) / h**3 * f


def _symbolic_grad_W_magnitude(q: sp.Expr, h: sp.Expr) -> sp.Expr:
    """Magnitude of the kernel gradient (symbolic, sigma_3 = 1/pi)."""
    fprime = sp.Piecewise(
        (-3 * q + sp.Rational(9, 4) * q**2, q < 1),
        (-sp.Rational(3, 4) * (2 - q) ** 2, q < 2),
        (sp.Integer(0), True),
    )
    return (1 / sp.pi) / h**4 * sp.Abs(fprime)


def _format(expr: sp.Expr) -> float:
    """Evaluate a symbolic expression to a JSON-friendly float.

    SymPy `evalf` to `_PRECISION_DIGITS` then cast to `float`. The cast is
    deterministic; the JSON encoder we use re-serializes with `repr(float)`
    semantics so two re-runs produce identical bytes.
    """
    return float(sp.N(expr, _PRECISION_DIGITS))


def _independent_anchors() -> dict[str, dict[str, Any]]:
    """Hand-derived reference values for spec § 2.4 anchor points.

    These values are derived *by hand* from the analytic definition
    (Monaghan 2005 Eq. 2.7) — they are not produced by SymPy. The
    generator cross-checks each one against the SymPy symbolic value
    before writing.
    """
    _MONAGHAN_2005 = (
        "Monaghan, J. J. (2005), Smoothed particle hydrodynamics, "
        "Rep. Prog. Phys. 68 (8), 1703-1759"
    )
    _MONAGHAN_1992 = (
        "Monaghan, J. J. (1992), Smoothed particle hydrodynamics, "
        "Annu. Rev. Astron. Astrophys. 30, 543-574"
    )
    _PI = 3.141592653589793238462643383279
    return {
        "0": {
            "source": (f"{_MONAGHAN_2005}, Eq. (2.7); peak value of the 3D cubic-spline kernel."),
            "doi": "10.1088/0034-4885/68/8/R01",
            "derived_by": "hand-derivation",
            "expected": {"W": 1.0 / _PI, "grad_W_magnitude": 0.0},
        },
        "1": {
            "source": f"{_MONAGHAN_2005}, Eq. (2.7) piecewise switch.",
            "doi": "10.1088/0034-4885/68/8/R01",
            "derived_by": "hand-derivation",
            "expected": {
                "W": 1.0 / (4.0 * _PI),
                "grad_W_magnitude": 3.0 / (4.0 * _PI),
            },
        },
        "2": {
            "source": (f"{_MONAGHAN_1992}, sec. 2; compact support of the cubic-spline kernel."),
            "doi": "10.1146/annurev.aa.30.090192.002551",
            "derived_by": "hand-derivation",
            "expected": {"W": 0.0, "grad_W_magnitude": 0.0},
        },
    }


def build_table() -> dict[str, Any]:
    """Construct the table dict from the symbolic definition + anchors."""
    q_sym = sp.Symbol("q", nonnegative=True)
    h_sym = sp.Symbol("h", positive=True)

    W_expr = _symbolic_W(q_sym, h_sym)
    gradW_expr = _symbolic_grad_W_magnitude(q_sym, h_sym)

    anchors = _independent_anchors()

    test_points: list[dict[str, Any]] = []
    for q in _Q_VALUES:
        W_val = _format(W_expr.subs({q_sym: q, h_sym: _H}))
        gradW_val = _format(gradW_expr.subs({q_sym: q, h_sym: _H}))
        point: dict[str, Any] = {
            "inputs": {"q": float(q), "h": float(_H)},
            "expected": {"W": W_val, "grad_W_magnitude": gradW_val},
        }

        # Attach independent-reference anchor if defined for this q.
        q_int_key = str(int(q)) if q == sp.Integer(int(q)) else None
        if q_int_key is not None and q_int_key in anchors:
            anchor = anchors[q_int_key]
            # Re-verify anchor agrees with SymPy values.
            for output_key, anchor_val in anchor["expected"].items():
                sym_val = sp.N(
                    {
                        "W": W_expr.subs({q_sym: q, h_sym: _H}),
                        "grad_W_magnitude": gradW_expr.subs({q_sym: q, h_sym: _H}),
                    }[output_key],
                    _PRECISION_DIGITS,
                )
                diff = sp.Abs(sym_val - sp.Float(anchor_val, _PRECISION_DIGITS))
                if diff > _ANCHOR_TOL:
                    raise RuntimeError(
                        "Independent-reference anchor disagrees with SymPy "
                        f"at q={float(q)!r}, key={output_key!r}: anchor="
                        f"{float(anchor_val)!r}, sympy={float(sym_val)!r}, "
                        f"diff={float(diff)!r}, tol={float(_ANCHOR_TOL)!r}. "
                        "Spec § 2.4 HALTs — one of the two is wrong; see "
                        f"{_DERIVATION_DOC} § 4."
                    )
            point["independent_reference"] = anchor
        test_points.append(point)

    return {
        "schema_version": "1.0.0",
        "algorithm": "cubic-spline-kernel-3d-monaghan",
        "category": "sph-kernel",
        "derivation": {
            "doc": _DERIVATION_DOC,
            "upstream": _UPSTREAM_NAME,
            "upstream_sha": _UPSTREAM_SHA,
            "upstream_path": _UPSTREAM_PATH,
        },
        "test_points": test_points,
        "tolerance": {"absolute": 1e-12, "relative": 1e-12},
    }


def write_table(table: dict[str, Any], path: Path = _TABLE_PATH) -> Path:
    """Write the table as canonicalized JSON.

    Canonical form: 2-space indent, sorted keys, ``ensure_ascii=False``,
    trailing newline. This is the byte-for-byte representation tested
    for idempotency.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(table, indent=2, sort_keys=True, ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8")
    return path


def main() -> int:
    table = build_table()
    written = write_table(table)
    print(f"wrote {written}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
