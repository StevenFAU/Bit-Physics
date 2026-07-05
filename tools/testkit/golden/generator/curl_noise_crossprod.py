"""Golden C — cross-product divergence identity + iso-value residual.

Table: golden/tables/closed-form/curl-noise-crossprod.json
Derivation: golden/derivations/curl-noise-crossprod.md
Spec: docs/sim-specs/closed-form/curl-noise/spec-ref.md section 6.1 / 7.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.curl_noise_crossprod --verify
"""

from __future__ import annotations

import argparse
import json

from .curl_noise_common import (
    TABLES_DIR,
    compute_crossprod,
    verify_table,
    write_table,
)

TABLE_PATH = TABLES_DIR / "curl-noise-crossprod.json"

_ANCHOR_DIV = {
    "source": (
        "Baerentzen, Martinez, Frisvad, Lefebvre (2025), 'Improving Curl "
        "Noise', SIGGRAPH Asia 2025 (Schwarz mixed-partial cancellation "
        "proof, any dimension); DeWolf (2005), 'Divergence-free noise' "
        "(construction priority); vector identity div(grad f x grad g) == 0 "
        "hand proof (derivation .md section 1); SymPy symbolic check "
        "(this generator, generic smooth f1/f2)."
    ),
    "doi": "10.1145/3757377.3763980",
    "derived_by": "hand vector-identity proof + SymPy generic-function check",
}
_ANCHOR_RK = {
    "source": (
        "Classical Runge-Kutta order theory: the 4-stage RK4 has local "
        "truncation error O(dt^5), global O(dt^4) (Hairer, Norsett & "
        "Wanner, 'Solving Ordinary Differential Equations I', 2nd ed., "
        "Springer 1993, chapter II.1) — halving dt at fixed physical time "
        "drops the invariant drift ~16x; applied to the iso-value drift "
        "df_i/dt = grad f_i . v = 0 along exact streamlines (derivation "
        ".md section 2)."
    ),
    "derived_by": "RK4 global-order argument + NumPy dt-halving recompute",
}
_ANCHOR_ISO = {
    "source": (
        "Baerentzen et al. (2025), Eqs. 10/12: min-norm-Jacobian Newton "
        "reprojection onto {f1 = f1(x0)} n {f2 = f2(x0)}; their measured "
        "1-iteration saturation (image-warp RMSE 3.861 for 1 vs 3.882 for "
        "10). RK4 local truncation O(dt^5)/global O(dt^4) (derivation .md "
        "section 2) — halving dt at fixed physical time drops the iso "
        "residual ~16x."
    ),
    "doi": "10.1145/3757377.3763980",
    "derived_by": "Newton-step hand derivation for the 2x3 system + NumPy recompute",
}


def build_table() -> dict:
    fresh = compute_crossprod()
    return {
        "schema_version": "1.0.0",
        "algorithm": "curl-noise-crossprod",
        "category": "closed-form",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/curl-noise-crossprod.md",
            "upstream": "Baerentzen-2025 / DeWolf-2005 (math only, no code)",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "n/a-no-vendored-code",
        },
        "tolerance": {"absolute": 1e-12, "relative": 1e-6},
        "test_points": [
            {
                "inputs": {
                    "quantity": "hessian_trace_divergence_identity",
                    "cfg": "crossprod octaves=3 ell0=0.5, 300 pts seed 7",
                },
                "expected": {
                    "hessian_trace_div_max": fresh["hessian_trace_div_max"],
                    "velocity_scale": fresh["velocity_scale"],
                    "crossprod_div_sympy_identity": fresh["crossprod_div_sympy_identity"],
                },
                "independent_reference": {
                    **_ANCHOR_DIV,
                    "expected": "machine-zero (measured ~1e-13 abs at "
                    "velocity scale ~28; SymPy 'zero')",
                },
            },
            {
                "inputs": {
                    "quantity": "newton_reprojection",
                    "kick": "1e-3 normal, 128 pts seed 11, 3 iterations",
                },
                "expected": {
                    "reproject3_residual_median": fresh["reproject3_residual_median"],
                },
                "independent_reference": {
                    **_ANCHOR_ISO,
                    "expected": "median residual -> f64 machine range (measured ~1e-15)",
                },
            },
            {
                "inputs": {
                    "quantity": "rk4_iso_residual_order_and_reprojection",
                    "scene": "canonical sphere scene, 256 tracers, fixed "
                    "physical time (16 x 2dt vs 32 x dt)",
                },
                "expected": {
                    "rk4_residual_dt2x": fresh["rk4_residual_dt2x"],
                    "rk4_residual_dt1x": fresh["rk4_residual_dt1x"],
                    "rk4_residual_reprojected": fresh["rk4_residual_reprojected"],
                },
                "independent_reference": {
                    **_ANCHOR_RK,
                    "expected": "dt-halving ratio >> 1 (RK4, measured >6x); "
                    "reprojection drives the residual to ~1e-10",
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
        print(json.dumps(compute_crossprod(), indent=2, default=str))
        return 0
    if args.write:
        write_table(TABLE_PATH, build_table())
        return 0
    if args.verify:
        return verify_table(TABLE_PATH, compute_crossprod())
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
