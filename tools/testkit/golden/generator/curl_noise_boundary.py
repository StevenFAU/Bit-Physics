"""Golden D — boundary tangency: machine-exact analytic, O(h) discretized.

Table: golden/tables/closed-form/curl-noise-boundary.json
Derivation: golden/derivations/curl-noise-boundary.md
Spec: docs/sim-specs/closed-form/curl-noise/spec-ref.md section 3 / 7.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.curl_noise_boundary --verify
"""

from __future__ import annotations

import argparse
import json

from .curl_noise_common import (
    TABLES_DIR,
    compute_boundary,
    verify_table,
    write_table,
)

TABLE_PATH = TABLES_DIR / "curl-noise-boundary.json"

_ANCHOR_SPHERE = {
    "source": (
        "Baerentzen, Martinez, Frisvad, Lefebvre (2025), 'Improving Curl "
        "Noise', SIGGRAPH Asia 2025: boundary handled by substituting one "
        "noise function with the surface SDF (the field is tangent to the "
        "SDF iso-contours by construction). Hand proof for the blended "
        "canonical f1 = sdf + A ramp(d/d0) n1 (derivation .md section 1): "
        "at d = 0 both gradient terms are parallel to the normal "
        "(ramp(0) = 0 kills the tangential grad-n1 term), so v.n is a "
        "triple product with a repeated direction — zero to FP rounding, "
        "NOT an O(h) claim."
    ),
    "doi": "10.1145/3757377.3763980",
    "derived_by": "triple-product hand proof + NumPy recompute",
}
_ANCHOR_CYL = {
    "source": (
        "Bridson, Hourihan, Nordenstam (2007), 'Curl-Noise for Procedural "
        "Fluid Flow', SIGGRAPH 2007 sketches, Eqs. 3-5: the solid surface "
        "as a psi-isocontour forces v tangent; quintic ramp Eq. 4. Hand "
        "proof (derivation .md section 1): at the surface grad psi' rides "
        "the normal, and the 90-degree rotation of a normal-parallel "
        "vector is tangent — v.n = (c n_y, -c n_x).(n_x, n_y) = 0 "
        "identically on the ANALYTIC circle SDF."
    ),
    "doi": "10.1145/1275808.1276435",
    "derived_by": "rotation hand proof + NumPy recompute",
}
_ANCHOR_DISC = {
    "source": (
        "Bridson 2007 (the discretized enforcement is approximate); Ding & "
        "Batty (2023), 'Differentiable Curl-Noise' (C^0 min{} distance / "
        "non-unique closest point kinks the potential at the medial axis — "
        "2D-only fix, spec-ref section 2). The O(h) row: bilinear grid SDF "
        "+ one-sided FD normal perturbs grad d by O(h) near the surface "
        "(derivation .md section 2)."
    ),
    "derived_by": "hand interpolation-error argument + NumPy recompute",
}


def build_table() -> dict:
    fresh = compute_boundary()
    return {
        "schema_version": "1.0.0",
        "algorithm": "curl-noise-boundary",
        "category": "closed-form",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/curl-noise-boundary.md",
            "upstream": "Bridson-2007 / Ding-Batty-2023 (math only)",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "n/a-no-vendored-code",
        },
        "tolerance": {"absolute": 1e-12, "relative": 1e-6},
        "test_points": [
            {
                "inputs": {
                    "quantity": "sphere_sdf_substitution_tangency",
                    "scene": "canonical sphere (SDF-substitution blend), "
                    "analytic SDF, 256 surface points seed 9",
                },
                "expected": {
                    "sphere_vn_over_vscale": fresh["sphere_vn_over_vscale"],
                },
                "independent_reference": {
                    **_ANCHOR_SPHERE,
                    "expected": "normalized v.n <= 1e-12 (measured ~1e-16)",
                },
            },
            {
                "inputs": {
                    "quantity": "cylinder_multiplicative_ramp_tangency",
                    "scene": "2D cylinder, Bridson multiplicative quintic "
                    "ramp, analytic circle SDF, 256 surface angles",
                },
                "expected": {
                    "cylinder_vn_over_vscale": fresh["cylinder_vn_over_vscale"],
                },
                "independent_reference": {
                    **_ANCHOR_CYL,
                    "expected": "normalized v.n <= 1e-12 (measured ~1e-15)",
                },
            },
            {
                "inputs": {
                    "quantity": "discretized_sdf_first_order",
                    "grid_steps": [2e-2, 2e-3],
                },
                "expected": {
                    "discretized_vn_h2e-2": fresh["discretized_vn_h2e-2"],
                    "discretized_vn_h2e-3": fresh["discretized_vn_h2e-3"],
                    "discretized_vn_order": fresh["discretized_vn_order"],
                },
                "independent_reference": {
                    **_ANCHOR_DISC,
                    "expected": "order ~1 (measured window 0.6-1.6) — the "
                    "honest degradation of grid-discretized enforcement; the "
                    "medial-axis kink itself is the NOT-a-gate row exercised "
                    "in packages/curl-noise/tests/test_boundary.py",
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
        print(json.dumps(compute_boundary(), indent=2, default=str))
        return 0
    if args.write:
        write_table(TABLE_PATH, build_table())
        return 0
    if args.verify:
        return verify_table(TABLE_PATH, compute_boundary())
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
