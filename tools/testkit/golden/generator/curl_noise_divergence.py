"""Golden A — curl-noise divergence (three honest routes).

Table: golden/tables/closed-form/curl-noise-divergence.json
Derivation: golden/derivations/curl-noise-divergence.md
Spec: docs/sim-specs/closed-form/curl-noise/spec-ref.md section 6.2 / 7.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.curl_noise_divergence --verify
"""

from __future__ import annotations

import argparse
import json

from .curl_noise_common import (
    TABLES_DIR,
    compute_divergence,
    verify_table,
    write_table,
)

TABLE_PATH = TABLES_DIR / "curl-noise-divergence.json"

_ANCHOR_MATCHED = {
    "source": (
        "Hyman, J. M. & Shashkov, M. (1999), 'Mimetic Discretizations for "
        "Maxwell's Equations and Orthogonal Decomposition Theorems', SIAM J. "
        "Numer. Anal. 36(3):788-818, Eqs. 1.7-1.10: DIV.CURL == 0 identically "
        "for the natural (compatible/support-operator) pair. Also the "
        "telescoping-sum hand proof in the derivation .md section 1 (each "
        "potential value enters the cell balance once with +1 and once with "
        "-1). Also discrete exterior calculus d^2 = 0 (arXiv:2006.16930). "
        "Also Chang et al., Curl-Flow (ACM TOG 41(6), 2022, "
        "arXiv:2104.00867): bilinear div (u_r-u_l+v_t-v_b)/h == 0 for the "
        "interpolated-potential analytic curl."
    ),
    "doi": "10.1137/S0036142996314044",
    "derived_by": (
        "hand telescoping proof (derivation .md) cross-checked against the "
        "mimetic operator identity; NumPy recompute at fixed seeds"
    ),
}
_ANCHOR_PROBE = {
    "source": (
        "Central-difference truncation: for v in C^3, "
        "(v_k(x+g e_k) - v_k(x-g e_k))/(2g) = dv_k/dx_k + O(g^2); on an "
        "exactly divergence-free field the probe residual IS the O(g^2) "
        "truncation term (derivation .md section 2, Taylor expansion). The "
        "measured order over g = 1e-2 -> 1e-3 is the committed slope; the "
        "coarse stencil is not fully asymptotic vs the finest octave "
        "wavelength 0.125, hence a slope slightly under 2."
    ),
    "derived_by": "Taylor-series hand derivation; NumPy recompute",
}
_ANCHOR_ROUTE_C = {
    "source": (
        "Same-stencil nested FD (route C, spec-ref section 6.2): the four "
        "corner psi evaluations are shared between the u- and w-stencils, so "
        "the mixed-partial terms cancel pairwise; nearby subtractions are "
        "Sterbenz-exact in IEEE-754, leaving ~f64-floor residuals "
        "(derivation .md section 3)."
    ),
    "derived_by": "hand FP-error analysis (Sterbenz lemma); NumPy recompute",
}


def build_table() -> dict:
    fresh = compute_divergence()
    return {
        "schema_version": "1.0.0",
        "algorithm": "curl-noise-divergence",
        "category": "closed-form",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/curl-noise-divergence.md",
            "upstream": "Hyman-Shashkov-1999 / Bridson-2007 / Curl-Flow-2022",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "n/a-no-vendored-code",
        },
        "tolerance": {"absolute": 1e-12, "relative": 1e-6},
        "test_points": [
            {
                "inputs": {
                    "quantity": "matched_staggered_machine_zero",
                    "grids": {"2d": [64, "seed 64"], "3d": [32, "seed 33"]},
                },
                "expected": {
                    "matched_2d_normalized_div_max": fresh["matched_2d_normalized_div_max"],
                    "matched_3d_normalized_div_max": fresh["matched_3d_normalized_div_max"],
                },
                "independent_reference": {
                    **_ANCHOR_MATCHED,
                    "expected": "normalized |div|/(:= flux scale) <= 1e-13 "
                    "(machine-zero by telescoping; measured ~2e-16)",
                },
            },
            {
                "inputs": {
                    "quantity": "independent_stencil_probe_o2",
                    "cfg": "crossprod octaves=3 ell0=0.5, 300 pts seed 7",
                    "stencils": [1e-2, 1e-3],
                },
                "expected": {
                    "probe_div_max_g1e-2": fresh["probe_div_max_g1e-2"],
                    "probe_div_max_g1e-3": fresh["probe_div_max_g1e-3"],
                    "probe_order": fresh["probe_order"],
                },
                "independent_reference": {
                    **_ANCHOR_PROBE,
                    "expected": "order ~2 (measured; declared window 1.6-2.4)",
                },
            },
            {
                "inputs": {
                    "quantity": "route_c_same_stencil_nested_fd",
                    "cfg": "curl2d octaves=3 ell0=0.5, h=1e-4",
                },
                "expected": {
                    "route_c_nested_fd_max_h1e-4": fresh["route_c_nested_fd_max_h1e-4"],
                },
                "independent_reference": {
                    **_ANCHOR_ROUTE_C,
                    "expected": "<= 1e-9 (measured ~0 at h = 1e-4)",
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
        print(json.dumps(compute_divergence(), indent=2, default=str))
        return 0
    if args.write:
        write_table(TABLE_PATH, build_table())
        return 0
    if args.verify:
        return verify_table(TABLE_PATH, compute_divergence())
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
