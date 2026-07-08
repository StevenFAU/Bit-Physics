"""Generator/verifier for the heat-equation Fourier decay golden (table B).

Pins BOTH amplitudes for a sin(2*pi*m*x)*sin(2*pi*n*y) eigenmode after N
steps (spec-ref.md § 4.2):

    continuous_amplitude = exp(-alpha*|k|^2 * N*dt)     (spectral golden)
    discrete_amplitude   = g_h^N,  g_h = 1 + alpha*dt*lambda_h  (FTCS golden)

with lambda_h the 5-point-stencil symbol (table C). The separation between
the two amplitudes is the FTCS truncation error made a committed number —
the two-spectra negative control asserts an FTCS run sits ~1000x closer to
g_h^N than to the continuous curve.

Internal cross-check: g_h^N computed via pow vs exp(N*log(g_h)) agreement,
and 0 < g_h < 1 for every committed stable case.

Derivation: tools/testkit/golden/derivations/heat-equation-fourier-decay.md
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
    / "heat-equation-fourier-decay.json"
)

# (n, mode, alpha, dt, steps) — the gate window (128^2 x 512), the canonical
# window (256^2 x 1024), and the negative-control sweep case (64^2 x 256).
CASES: list[tuple[int, tuple[int, int], float, float, int]] = [
    (128, (1, 1), 0.02, 6.103515625e-4, 512),
    (128, (5, 3), 0.02, 6.103515625e-4, 512),
    (256, (1, 1), 0.02, 1.52587890625e-4, 1024),
    (256, (5, 3), 0.02, 1.52587890625e-4, 1024),
    (64, (3, 2), 0.02, 2.44140625e-3, 256),
]


def closed_form(
    n: int, mode: tuple[int, int], alpha: float, dt: float, steps: int
) -> dict[str, float]:
    k2 = (2.0 * math.pi * mode[0]) ** 2 + (2.0 * math.pi * mode[1]) ** 2
    cont = math.exp(-alpha * k2 * steps * dt)
    dx = 1.0 / n
    lam_h = -(4.0 / dx**2) * (
        math.sin(math.pi * mode[0] / n) ** 2 + math.sin(math.pi * mode[1] / n) ** 2
    )
    g = 1.0 + alpha * dt * lam_h
    assert 0.0 < g < 1.0, f"committed case must be stable and decaying: g={g}"
    disc = g**steps
    # pow vs exp/log cross-check
    alt = math.exp(steps * math.log(g))
    assert abs(alt - disc) <= 1e-12 * max(disc, 1e-300), (alt, disc)
    return {
        "amplification_g": g,
        "continuous_amplitude": cont,
        "discrete_amplitude": disc,
        "truncation_separation_rel": abs(cont - disc) / max(cont, 1e-300),
    }


def solver_values(
    n: int, mode: tuple[int, int], alpha: float, dt: float, steps: int
) -> dict[str, float]:
    from heat_equation.reference import continuous_decay, discrete_amplification

    g = discrete_amplification(alpha, dt, 1.0 / n, 1.0 / n, mode[0], mode[1], n, n)
    return {
        "continuous_amplitude": continuous_decay(alpha, mode[0], mode[1], steps * dt),
        "discrete_amplitude": g**steps,
    }


def compute_canonical() -> list[dict[str, object]]:
    return [
        {
            "n": n,
            "mode": list(mode),
            "alpha": alpha,
            "dt": dt,
            "steps": steps,
            **closed_form(n, mode, alpha, dt, steps),
        }
        for n, mode, alpha, dt, steps in CASES
    ]


ANCHORS: list[dict[str, str]] = [
    {
        "derived_by": "von-neumann-analysis",
        "source": (
            "g_h = 1 + alpha*dt*lambda_h with the 5-point stencil symbol; the "
            "sin*sin eigenmode is an eigenvector of the separable stencil, so "
            "g_h^N is exact-to-FP for the discrete method (LeVeque, Finite "
            "Difference Methods for Ordinary and Partial Differential "
            "Equations, SIAM 2007, ch. 9)."
        ),
        "doi": "10.1137/1.9780898717839",
    },
    {
        "derived_by": "dual-computation",
        "source": (
            "pow vs exp(N*log g) agreement and the 0 < g_h < 1 stability "
            "assertion, both checked inside the generator at every case."
        ),
        "doi": "n/a-in-generator-identity",
    },
    {
        "derived_by": "fourier-symbol",
        "source": (
            "Continuous amplitude from the Fourier symbol of the continuum "
            "Laplacian (Trefethen, Spectral Methods in MATLAB, ch. 3); paired "
            "eigenvalues pinned independently by table C (heat-equation-"
            "laplacian-eigenvalues.json, FD trig identity)."
        ),
        "doi": "n/a-table-c-cross-reference",
    },
]


def build_table() -> dict[str, object]:
    points = []
    for n, mode, alpha, dt, steps in CASES:
        cf = closed_form(n, mode, alpha, dt, steps)
        points.append(
            {
                "inputs": {
                    "n": n,
                    "mode": list(mode),
                    "alpha": alpha,
                    "dt": dt,
                    "steps": steps,
                    "box": 1.0,
                },
                "expected": {
                    **cf,
                    "assignment": (
                        "FTCS run -> discrete_amplitude (its own exact method); "
                        "spectral run -> continuous_amplitude (machine-exact). "
                        "Comparing FTCS to the continuous curve leaks the truncation "
                        "error recorded in truncation_separation_rel (spec-ref.md § 3.2)."
                    ),
                },
                "independent_reference": ANCHORS[len(points) % len(ANCHORS)],
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "heat-equation-fourier-decay-two-amplitudes",
        "category": "volumetric-grid",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/heat-equation-fourier-decay.md",
            "upstream": "von-Neumann-analysis-plus-Fourier-symbol",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md",
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
    for tp, (n, mode, alpha, dt, steps) in zip(table["test_points"], CASES, strict=False):
        cf = closed_form(n, mode, alpha, dt, steps)
        sv = solver_values(n, mode, alpha, dt, steps)
        for key in ("continuous_amplitude", "discrete_amplitude"):
            want = float(tp["expected"][key])
            scale = max(abs(want), 1e-300)
            if abs(cf[key] - want) > rel * scale:
                failures.append(f"closed form {key}={cf[key]} != table {want} at N={n} {mode}")
            if abs(sv[key] - want) > rel * scale:
                failures.append(f"solver {key}={sv[key]} != table {want} at N={n} {mode}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} two-amplitude Fourier decay pinned (closed form + solver).")
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
