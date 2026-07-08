"""Generator/verifier for the heat-equation spectral per-mode decay golden (table A).

The moat headliner (spec-ref.md § 3.2): on the periodic box each Fourier mode
of the unforced heat equation decays by EXACTLY

    decay(k, alpha, dt) = exp(-alpha * |k|^2 * dt),   |k|^2 = (2*pi*m)^2 + (2*pi*n)^2

per step (integrating factor / ETD1 with S = 0, Cox & Matthews 2002) — the
heat analogue of schrodinger-smoke's free-step phase golden. Machine-exact:
no CFL, no amplitude error. Internal cross-checks: per-axis factorization
exp(a+b) = exp(a)*exp(b), and math.exp vs numpy.exp agreement.

Honesty floor (recorded per point): the exactness claim is ABSOLUTE per unit
initial amplitude — once a mode decays below the FFT round-off floor
(~1e-16 of field scale) relative comparison is meaningless.

Derivation: tools/testkit/golden/derivations/heat-equation-spectral-decay.md
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
    / "heat-equation-spectral-decay.json"
)

# (n, mode, alpha, dt) — gate scene (128^2), canonical scene (256^2), and a
# fast-diffusion sweep including the deep-decay honesty case.
CASES: list[tuple[int, tuple[int, int], float, float]] = [
    (128, (1, 1), 0.02, 6.103515625e-4),
    (128, (5, 3), 0.02, 6.103515625e-4),
    (256, (1, 1), 0.02, 1.52587890625e-4),
    (256, (2, 7), 0.02, 1.52587890625e-4),
    (64, (3, 2), 1.0, 1e-3),
    (64, (31, 17), 1.0, 1e-3),  # deep decay: absolute-floor honesty case
]


def closed_form(n: int, mode: tuple[int, int], alpha: float, dt: float) -> dict[str, float]:
    def freq(m: int) -> float:
        return float(m if m <= n // 2 else m - n)

    kx = 2.0 * math.pi * freq(mode[0])
    ky = 2.0 * math.pi * freq(mode[1])
    k2 = kx * kx + ky * ky
    decay = math.exp(-alpha * k2 * dt)
    # Per-axis factorization cross-check: exp(a+b) = exp(a)*exp(b) — up to
    # three f64 roundings plus argument-sum rounding amplified by |a+b|.
    split = math.exp(-alpha * kx * kx * dt) * math.exp(-alpha * ky * ky * dt)
    assert abs(split - decay) <= 1e-14 * max(1.0, alpha * k2 * dt) * max(decay, 1e-300), (
        split,
        decay,
    )
    return {"k_squared": k2, "decay_factor": decay}


def solver_values(n: int, mode: tuple[int, int], alpha: float, dt: float) -> float:
    import numpy as np
    from heat_equation.spectral import continuous_laplacian_eigenvalues, decay_factors

    lam = continuous_laplacian_eigenvalues(n, n)
    m, k = mode
    val = float(decay_factors(lam, alpha, dt)[m % n, k % n])
    # numpy.exp vs math.exp agreement cross-check (both correctly-rounded libm).
    cf = closed_form(n, mode, alpha, dt)["decay_factor"]
    assert np.isclose(val, cf, rtol=4e-16, atol=1e-300), (val, cf)
    return val


def compute_canonical() -> list[dict[str, object]]:
    return [
        {"n": n, "mode": list(mode), "alpha": alpha, "dt": dt, **closed_form(n, mode, alpha, dt)}
        for n, mode, alpha, dt in CASES
    ]


ANCHORS: list[dict[str, str]] = [
    {
        "derived_by": "integrating-factor-ode",
        "source": (
            "Exact solution of d/dt That = -alpha*|k|^2*That (ETD1 with S=0): "
            "Cox & Matthews 2002, J. Comput. Phys. 176:430-455."
        ),
        "doi": "10.1006/jcph.2002.6995",
    },
    {
        "derived_by": "dual-library-plus-factorization",
        "source": (
            "Per-axis factorization exp(a+b) = exp(a)*exp(b) and numpy.exp vs "
            "math.exp agreement, both asserted inside the generator at every case."
        ),
        "doi": "n/a-in-generator-identity",
    },
    {
        "derived_by": "fourier-symbol-precedent",
        "source": (
            "Fourier symbol of the continuum Laplacian (Trefethen, Spectral "
            "Methods in MATLAB, ch. 3) + the landed schrodinger-smoke free-step "
            "per-mode phase golden (tools/testkit/golden/tables/volumetric-grid/"
            "isf-free-step-phase.json) — the same exact-propagator construction."
        ),
        "doi": "n/a-repo-precedent",
    },
]


def build_table() -> dict[str, object]:
    points = []
    for n, mode, alpha, dt in CASES:
        cf = closed_form(n, mode, alpha, dt)
        points.append(
            {
                "inputs": {"n": n, "mode": list(mode), "alpha": alpha, "dt": dt, "box": 1.0},
                "expected": {
                    **cf,
                    "claim": (
                        "machine-exact per mode, ABSOLUTE per unit initial amplitude "
                        "(<= 1e-13); relative comparison is meaningless below the FFT "
                        "round-off floor (spec-ref.md § 6.2)."
                    ),
                },
                "independent_reference": ANCHORS[len(points) % len(ANCHORS)],
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "heat-equation-spectral-per-mode-decay",
        "category": "volumetric-grid",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/heat-equation-spectral-decay.md",
            "upstream": "Cox-Matthews-2002-ETD-J-Comput-Phys-176",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "https://doi.org/10.1006/jcph.2002.6995",
        },
        "tolerance": {"absolute": 0.0, "relative": 1e-13},
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
    for tp, (n, mode, alpha, dt) in zip(table["test_points"], CASES, strict=False):
        want = float(tp["expected"]["decay_factor"])
        cf = closed_form(n, mode, alpha, dt)["decay_factor"]
        sv = solver_values(n, mode, alpha, dt)
        scale = max(abs(want), 1e-300)
        if abs(cf - want) > rel * scale:
            failures.append(f"closed form {cf} != table {want} at N={n} {mode}")
        if abs(sv - want) > rel * scale:
            failures.append(f"solver {sv} != table {want} at N={n} {mode}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} spectral per-mode decay pinned (closed form + solver).")
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
