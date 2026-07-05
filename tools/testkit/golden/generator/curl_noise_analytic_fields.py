"""Golden E — closed-form div-free reference fields (ABC / TG / FBM).

Table: golden/tables/closed-form/curl-noise-analytic-fields.json
Derivation: golden/derivations/curl-noise-analytic-fields.md
Spec: docs/sim-specs/closed-form/curl-noise/spec-ref.md section 4 / 7.

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.curl_noise_analytic_fields --verify
"""

from __future__ import annotations

import argparse
import json

from .curl_noise_common import (
    TABLES_DIR,
    compute_analytic_fields,
    verify_table,
    write_table,
)

TABLE_PATH = TABLES_DIR / "curl-noise-analytic-fields.json"

_ANCHOR_ABC = {
    "source": (
        "Dombre, Frisch, Greene, Henon, Mehr, Soward (1986), 'Chaotic "
        "streamlines in the ABC flows', J. Fluid Mech. 167:353-391; Arnold "
        "(1965) C. R. Acad. Sci. Paris 261 (Beltrami property). div v == 0 "
        "term-by-term (each component's own-axis partial vanishes — hand "
        "proof, derivation .md section 1; SymPy recheck in this generator); "
        "the FD probe is bit-zero at ANY stencil for the same structural "
        "reason."
    ),
    "doi": "10.1017/S0022112086002859",
    "derived_by": "hand term-by-term proof + SymPy + NumPy recompute",
}
_ANCHOR_TG = {
    "source": (
        "Taylor, G. I. (1923), 'On the decay of vortices in a viscous "
        "fluid' lineage (the classical Taylor-Green cellular stream "
        "function); psi = sin x sin y => v = (sin x cos y, -cos x sin y), "
        "div = psi_yx - psi_xy = 0 by Schwarz mixed-partial symmetry "
        "(hand proof, derivation .md section 2)."
    ),
    "derived_by": "Schwarz hand proof + NumPy FD-probe recompute",
}
_ANCHOR_FBM = {
    "source": (
        "Linearity of the discrete curl operator (hand proof, derivation "
        ".md section 3): the octave-summed potential's matched-grid "
        "divergence telescopes to machine zero exactly as any single "
        "octave's — the same per-node +1/-1 cancellation of Hyman & "
        "Shashkov (1999), Eqs. 1.7-1.10 (DIV.CURL == 0 for the natural "
        "compatible pair)."
    ),
    "doi": "10.1137/S0036142996314044",
    "derived_by": "telescoping + linearity hand proofs + NumPy recompute",
}


def build_table() -> dict:
    fresh = compute_analytic_fields()
    return {
        "schema_version": "1.0.0",
        "algorithm": "curl-noise-analytic-fields",
        "category": "closed-form",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/curl-noise-analytic-fields.md",
            "upstream": "Dombre-1986 / Taylor-Green (closed forms)",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "n/a-no-vendored-code",
        },
        "tolerance": {"absolute": 1e-12, "relative": 1e-6},
        "test_points": [
            {
                "inputs": {
                    "quantity": "abc_flow_ground_truth",
                    "params": {"A": 1.0, "B": 1.0, "C": 1.0},
                    "sample_points": [
                        [0.3, 1.1, -0.7],
                        [2.0, -1.0, 0.5],
                        [-0.4, 0.9, 2.2],
                    ],
                },
                "expected": {
                    "abc_velocity_samples": fresh["abc_velocity_samples"],
                    "abc_beltrami_residual": fresh["abc_beltrami_residual"],
                    "abc_fd_probe_div_max": fresh["abc_fd_probe_div_max"],
                    "abc_div_sympy": fresh["abc_div_sympy"],
                },
                "independent_reference": {
                    **_ANCHOR_ABC,
                    "expected": "velocity samples match the closed form; "
                    "Beltrami residual bit-zero; FD probe bit-zero; SymPy "
                    "'zero'",
                },
            },
            {
                "inputs": {"quantity": "taylor_green_stream_function"},
                "expected": {
                    "taylor_green_fd_probe_div_max_h1e-3": fresh[
                        "taylor_green_fd_probe_div_max_h1e-3"
                    ],
                },
                "independent_reference": {
                    **_ANCHOR_TG,
                    "expected": "probe ~1e-13 (O(g^2) truncation at g=1e-3)",
                },
            },
            {
                "inputs": {"quantity": "fbm_linearity_matched_grid"},
                "expected": {
                    "fbm_matched_normalized_div_max": fresh["fbm_matched_normalized_div_max"],
                },
                "independent_reference": {
                    **_ANCHOR_FBM,
                    "expected": "normalized div <= 1e-13 (machine-zero "
                    "telescoping, octave-summed potential)",
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
        print(json.dumps(compute_analytic_fields(), indent=2, default=str))
        return 0
    if args.write:
        write_table(TABLE_PATH, build_table())
        return 0
    if args.verify:
        return verify_table(TABLE_PATH, compute_analytic_fields())
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
