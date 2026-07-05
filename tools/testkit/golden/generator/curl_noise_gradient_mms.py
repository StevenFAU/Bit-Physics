"""Golden B — analytic noise gradient / Hessian vs central differences.

Table: golden/tables/closed-form/curl-noise-gradient-mms.json
Derivation: golden/derivations/curl-noise-gradient-mms.md
Spec: docs/sim-specs/closed-form/curl-noise/spec-ref.md section 6.1 / 7.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.curl_noise_gradient_mms --verify
"""

from __future__ import annotations

import argparse
import json

from .curl_noise_common import (
    TABLES_DIR,
    compute_gradient_mms,
    sympy_kernel_hessian_identity,
    verify_table,
    write_table,
)

TABLE_PATH = TABLES_DIR / "curl-noise-gradient-mms.json"

_ANCHOR_GRAD = {
    "source": (
        "McEwan, Sheets, Gustavson, Richardson (2012), 'Efficient "
        "Computational Noise in GLSL', JGT 16(2) / arXiv:1204.1461 (the "
        "webgl-noise noise3Dgrad analytic-derivative lineage, MIT — the "
        "gated basis, spec-ref section 2.5); central-difference Taylor "
        "truncation O(h^2) hand derivation (derivation .md section 2)."
    ),
    "derived_by": "Taylor-truncation hand derivation + NumPy recompute",
}
_ANCHOR_HESS = {
    "source": (
        "Gustavson & McEwan (2022), 'Tiling Simplex Noise and Flow Noise "
        "in Two and Three Dimensions', JCGT 11(1) — exact analytic FIRST "
        "derivatives in the paper body plus the optional analytic SECOND "
        "derivatives of the supplementary GLSL (+18% cost there) as the "
        "published precedent for closed-form simplex Hessians; the same "
        "O(h^2) central-difference truncation argument applies to the FD "
        "of the analytic gradient (derivation .md section 2)."
    ),
    "derived_by": "hand product-rule Hessian derivation + NumPy recompute",
}
_ANCHOR_SYMPY = {
    "source": (
        "SymPy symbolic differentiation of the simplex kernel "
        "m^4 (p.x), m = F - |x|^2 (derivation .md section 1) — an "
        "algebra-system derivation fully independent of the NumPy "
        "implementation; cross-checked against stegu's sdnoise1234 C "
        "reference implementation of analytic simplex derivatives "
        "(structure reference, no code ported)."
    ),
    "derived_by": (
        "SymPy simplify(grad - formula) == 0 and "
        "simplify(hess - formula) == 0, recomputed at every --verify"
    ),
}


def _fresh() -> dict:
    fresh = dict(compute_gradient_mms())
    fresh["kernel_hessian_sympy_identity"] = sympy_kernel_hessian_identity()
    return fresh


def build_table() -> dict:
    fresh = _fresh()
    return {
        "schema_version": "1.0.0",
        "algorithm": "curl-noise-gradient-mms",
        "category": "closed-form",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/curl-noise-gradient-mms.md",
            "upstream": "McEwan-et-al-2012 (webgl-noise, algorithm only)",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "n/a-no-vendored-code",
        },
        "tolerance": {"absolute": 1e-12, "relative": 1e-6},
        "test_points": [
            {
                "inputs": {
                    "quantity": "gradient_fd_convergence",
                    "points": "200 uniform in [-8,8]^3, seed 3",
                    "steps": [1e-3, 1e-4],
                },
                "expected": {
                    "grad_fd_err_h1e-3": fresh["grad_fd_err_h1e-3"],
                    "grad_fd_err_h1e-4": fresh["grad_fd_err_h1e-4"],
                    "grad_mms_order": fresh["grad_mms_order"],
                },
                "independent_reference": {
                    **_ANCHOR_GRAD,
                    "expected": "order 2.00 (measured 1.9-2.1 window)",
                },
            },
            {
                "inputs": {
                    "quantity": "hessian_fd_convergence",
                    "points": "same sweep, FD of the analytic gradient",
                    "steps": [1e-3, 1e-4],
                },
                "expected": {
                    "hess_fd_err_h1e-3": fresh["hess_fd_err_h1e-3"],
                    "hess_fd_err_h1e-4": fresh["hess_fd_err_h1e-4"],
                    "hess_mms_order": fresh["hess_mms_order"],
                },
                "independent_reference": {
                    **_ANCHOR_HESS,
                    "expected": "order 2.00 (measured 1.9-2.1 window)",
                },
            },
            {
                "inputs": {"quantity": "kernel_symbolic_identities"},
                "expected": {
                    "kernel_gradient_sympy_identity": fresh["kernel_gradient_sympy_identity"],
                    "kernel_hessian_sympy_identity": fresh["kernel_hessian_sympy_identity"],
                },
                "independent_reference": {
                    **_ANCHOR_SYMPY,
                    "expected": "both 'zero' — SymPy confirms the closed-form "
                    "gradient -8 m^3 (p.x) x + m^4 p and the Hessian "
                    "48 m^2 (p.x) xx^T - 8 m^3 (xp^T+px^T) - 8 m^3 (p.x) I",
                },
            },
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--print", action="store_true")
    args = parser.parse_args()
    if args.print:
        print(json.dumps(_fresh(), indent=2, default=str))
        return 0
    if args.write:
        write_table(TABLE_PATH, build_table())
        return 0
    if args.verify:
        return verify_table(TABLE_PATH, _fresh())
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
