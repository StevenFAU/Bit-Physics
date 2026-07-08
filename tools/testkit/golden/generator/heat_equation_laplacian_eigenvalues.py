"""Generator/verifier for the heat-equation two-spectra eigenvalue golden (table C).

THE porting trap (spec-ref.md § 3.2, the schrodinger Eq-17/Eq-18 lesson): the
SPECTRAL solver uses the CONTINUOUS Laplacian eigenvalues

    lambda_c(k) = -(2*pi)^2 * (m^2 + n^2)            (unit box, mode (m, n))

while the FTCS amplification g_h = 1 + alpha*dt*lambda_h is built from the
DISCRETE 5-point-stencil eigenvalues

    lambda_h(k) = -(4/dx^2) * [sin^2(pi*m/N) + sin^2(pi*n/N)].

Comparing an FTCS run against the continuous decay leaks the O(dt)+O(dx^2)
truncation error into what should be an exact check. The table commits
paired values over (N, mode) so all stacks (f64 reference, WGSL port,
pure-JS build spine) recompute and pin the convention. The FD symbol
identity -(2 - 2*cos(k*dx))/dx^2 = -(4/dx^2)*sin^2(k*dx/2) is asserted as an
internal cross-check.

Derivation: tools/testkit/golden/derivations/heat-equation-laplacian-eigenvalues.md
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
    / "heat-equation-laplacian-eigenvalues.json"
)

CASES: list[tuple[int, tuple[int, int]]] = [
    (128, (1, 1)),  # gate-scene fundamental
    (128, (5, 3)),
    (128, (64, 0)),  # Nyquist axis mode — largest spectra separation
    (256, (2, 7)),  # canonical-scene third mode
    (256, (128, 128)),  # Nyquist diagonal
    (64, (3, 2)),
]


def closed_form(n: int, mode: tuple[int, int]) -> dict[str, float]:
    # fftfreq maps m -> m for m < N/2 and m -> m - N for m >= N/2; both square
    # to the same continuous eigenvalue for the Nyquist mode m = N/2.
    def freq(m: int) -> float:
        return float(m if m <= n // 2 else m - n)

    lam_cont = -((2.0 * math.pi) ** 2) * (freq(mode[0]) ** 2 + freq(mode[1]) ** 2)
    dx = 1.0 / n
    lam_disc = -(4.0 / dx**2) * (
        math.sin(math.pi * mode[0] / n) ** 2 + math.sin(math.pi * mode[1] / n) ** 2
    )
    # FD symbol trig identity cross-check
    lam_fd = sum(-(2.0 - 2.0 * math.cos(2.0 * math.pi * m / n)) / dx**2 for m in mode)
    assert abs(lam_fd - lam_disc) <= 1e-6 * max(1.0, abs(lam_disc)), (lam_fd, lam_disc)
    return {"lambda_continuous": lam_cont, "lambda_discrete": lam_disc}


def solver_values(n: int, mode: tuple[int, int]) -> dict[str, float]:
    from heat_equation.spectral import (
        continuous_laplacian_eigenvalues,
        discrete_laplacian_eigenvalues,
    )

    m, k = mode
    return {
        "lambda_continuous": float(continuous_laplacian_eigenvalues(n, n)[m % n, k % n]),
        "lambda_discrete": float(discrete_laplacian_eigenvalues(n, n)[m % n, k % n]),
    }


def compute_canonical() -> list[dict[str, object]]:
    return [{"n": n, "mode": list(mode), **closed_form(n, mode)} for n, mode in CASES]


ANCHORS: list[dict[str, str]] = [
    {
        "derived_by": "trig-identity",
        "source": (
            "FD symbol trig identity -(2-2cos(k dx))/dx^2 = -(4/dx^2) "
            "sin^2(k dx/2), asserted inside the generator at every case "
            "(closed_form)."
        ),
        "doi": "n/a-in-generator-identity",
    },
    {
        "derived_by": "fourier-symbol",
        "source": (
            "Fourier symbol of the continuum Laplacian, -(2*pi)^2*(m^2+n^2) on "
            "the unit box (Trefethen, Spectral Methods in MATLAB, ch. 3)."
        ),
        "doi": "n/a-spectral-methods-standard",
    },
    {
        "derived_by": "repo-precedent",
        "source": (
            "The landed schrodinger-smoke two-spectra convention (tools/testkit/"
            "golden/tables/volumetric-grid/isf-laplacian-eigenvalues.json, Chern "
            "et al. 2016 Eqs. 17-18) — the same continuous-vs-discrete assignment "
            "in 3D, independently derived and CI-gated."
        ),
        "doi": "10.1145/2897824.2925868",
    },
]


def build_table() -> dict[str, object]:
    points = []
    for n, mode in CASES:
        cf = closed_form(n, mode)
        points.append(
            {
                "inputs": {"n": n, "mode": list(mode), "dx": 1.0 / n, "box": 1.0},
                "expected": {
                    **cf,
                    "assignment": (
                        "continuous -> spectral decay exp(alpha*lambda_c*t); discrete -> "
                        "FTCS amplification g_h = 1 + alpha*dt*lambda_h. NEVER MIX "
                        "(spec-ref.md § 3.2 two-spectra rule)."
                    ),
                },
                "independent_reference": ANCHORS[len(points) % len(ANCHORS)],
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "heat-equation-laplacian-eigenvalues-two-spectra",
        "category": "volumetric-grid",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/heat-equation-laplacian-eigenvalues.md",
            "upstream": "von-Neumann-analysis-5-point-stencil-plus-Fourier-symbol",
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
    for tp, (n, mode) in zip(table["test_points"], CASES, strict=False):
        cf = closed_form(n, mode)
        sv = solver_values(n, mode)
        for key in ("lambda_continuous", "lambda_discrete"):
            want = float(tp["expected"][key])
            scale = max(1.0, abs(want))
            if abs(cf[key] - want) > rel * scale:
                failures.append(f"closed form {key}={cf[key]} != table {want} at N={n} {mode}")
            if abs(sv[key] - want) > rel * scale:
                failures.append(f"solver {key}={sv[key]} != table {want} at N={n} {mode}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} two-spectra convention pinned (closed form + solver).")
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
