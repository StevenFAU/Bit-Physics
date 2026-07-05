"""Golden F — confinement / Clebsch identities (execution-corrected).

Table: golden/tables/closed-form/curl-noise-helicity.json
Derivation: golden/derivations/curl-noise-helicity.md
Spec: docs/sim-specs/closed-form/curl-noise/spec-ref.md section 3 / 7
(v0.3 status block: the v0.2 'v.(curl v) == 0' claim is REFUTED; this
table gates the identities that are actually true and commits the
refutation as a permanent control row).

Usage::

    uv run --directory tools/testkit \\
        python -m golden.generator.curl_noise_helicity --verify
"""

from __future__ import annotations

import argparse
import json

from .curl_noise_common import (
    TABLES_DIR,
    compute_helicity,
    verify_table,
    write_table,
)

TABLE_PATH = TABLES_DIR / "curl-noise-helicity.json"

_ANCHOR_CONF = {
    "source": (
        "Triple-product hand proofs (derivation .md sections 1-2): "
        "v.grad f1 = (grad f1 x grad f2).grad f1 = 0 and likewise f2 "
        "(repeated vector) — hence f1, f2 are exact streamline invariants "
        "(the chaos-immunity mechanism, spec-ref section 3); "
        "psi.v = f1 grad f2.(grad f1 x grad f2) = 0 for the Clebsch/Euler "
        "potential psi = f1 grad f2 with v = curl psi (the classical "
        "Euler-potentials gauge fact). SymPy generic-function recheck in "
        "this generator."
    ),
    "derived_by": "hand triple-product proofs + SymPy generic-function check",
}
_ANCHOR_REFUTE = {
    "source": (
        "EXECUTION REFUTATION (2026-07-05) of the spec-v0.2 claim "
        "'v.(curl v) == 0 for cross-product fields': counterexample "
        "f1 = x*y, f2 = z + x^2 gives v = (x, -y, -2x^2), "
        "curl v = (0, 4x, 0), v.(curl v) = -4xy != 0 (SymPy, this "
        "generator, committed as a string); the canonical noise field "
        "measures |v.(curl v)| ~ 1e4. Committed as a PERMANENT control "
        "row so the false claim cannot silently return."
    ),
    "derived_by": "hand counterexample + SymPy expansion + NumPy measurement",
}
_ANCHOR_ABC = {
    "source": (
        "Dombre et al. (1986) J. Fluid Mech. 167; Arnold (1965): ABC is "
        "Beltrami (curl v = v), so its helicity density is |v|^2 exactly — "
        "the opposite pole of the section-3 dichotomy."
    ),
    "doi": "10.1017/S0022112086002859",
    "derived_by": "term-by-term curl hand computation + NumPy recompute",
}


def build_table() -> dict:
    fresh = compute_helicity()
    return {
        "schema_version": "1.0.0",
        "algorithm": "curl-noise-helicity",
        "category": "closed-form",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/curl-noise-helicity.md",
            "upstream": "hand proofs / Dombre-1986 (no vendored code)",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "n/a-no-vendored-code",
        },
        "tolerance": {"absolute": 1e-12, "relative": 1e-6},
        "test_points": [
            {
                "inputs": {
                    "quantity": "confinement_identities_machine_zero",
                    "cfg": "crossprod octaves=3 ell0=0.5, 300 pts seed 7",
                },
                "expected": {
                    "grad_orthogonality_over_vscale": fresh["grad_orthogonality_over_vscale"],
                    "clebsch_integrand_over_vscale": fresh["clebsch_integrand_over_vscale"],
                    "confinement_sympy": fresh["confinement_sympy"],
                },
                "independent_reference": {
                    **_ANCHOR_CONF,
                    "expected": "normalized |v.grad f_i| and |psi.v| <= "
                    "1e-12 (measured ~1e-16); SymPy 'zero'",
                },
            },
            {
                "inputs": {
                    "quantity": "kinetic_helicity_nonzero_control",
                    "note": "the refuted v0.2 claim, kept as a control row",
                },
                "expected": {
                    "kinetic_helicity_max": fresh["kinetic_helicity_max"],
                    "helicity_counterexample_sympy": fresh["helicity_counterexample_sympy"],
                },
                "independent_reference": {
                    **_ANCHOR_REFUTE,
                    "expected": "counterexample string '-4*x*y'; measured "
                    "max FAR from zero (~1e4) — asserting NONZERO",
                },
            },
            {
                "inputs": {
                    "quantity": "abc_beltrami_pole",
                    "sample_points": [
                        [0.3, 1.1, -0.7],
                        [2.0, -1.0, 0.5],
                        [-0.4, 0.9, 2.2],
                    ],
                },
                "expected": {
                    "abc_beltrami_residual": fresh["abc_beltrami_residual"],
                    "abc_helicity_minus_speed2_max": fresh["abc_helicity_minus_speed2_max"],
                },
                "independent_reference": {
                    **_ANCHOR_ABC,
                    "expected": "both bit-zero (curl v == v term-by-term)",
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
        print(json.dumps(compute_helicity(), indent=2, default=str))
        return 0
    if args.write:
        write_table(TABLE_PATH, build_table())
        return 0
    if args.verify:
        return verify_table(TABLE_PATH, compute_helicity())
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
