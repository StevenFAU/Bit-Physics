"""Generator/verifier for the ISF quantized-circulation golden (table F).

Onsager-Feynman: circulation around a quantized vortex line is
Gamma = 2*pi*hbar*n (n = winding; hbar-normalized ISF units, arXiv:2003.03590
Eq. 44). The canonical translating-ring IC (paper § 3.1 slab imprint,
winding 1, settled by 8 projections) measures a closed lattice-loop
circulation ∮u·dl = hbar * sum of edge phases threading the ring once.

CONTINUUM-EXACT, DISCRETE-APPROXIMATE (spec-ref.md § 6.5): the paper's own
language is "approximately 2*pi*hbar_h". The table commits the MEASURED
values over an N-ladder with a declared rel-err ceiling — labeled
approximate, never machine-exact.

Derivation: tools/testkit/golden/derivations/isf-circulation-quantum.md
Usage: --verify / --print.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_REPO / "packages/schrodinger-smoke"))

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "volumetric-grid"
    / "isf-circulation-quantum.json"
)

HBAR = 0.05
N_LADDER = (32, 48, 64)


def compute_canonical() -> list[dict[str, float]]:
    from schrodinger_smoke.reference.isf import (
        IsfConfig,
        circulation_loop,
        discrete_laplacian_eigenvalues,
        make_scene,
        ring_probe_loop,
    )

    target = 2.0 * math.pi * HBAR
    points = []
    for n in N_LADDER:
        cfg = IsfConfig(n=n, hbar=HBAR)
        lam_disc = discrete_laplacian_eigenvalues((n, n, n), 1.0 / n)
        psi = make_scene(cfg, lam_disc)
        circ = abs(circulation_loop(psi, HBAR, ring_probe_loop(cfg)))
        points.append(
            {
                "n": float(n),
                "circulation_measured": circ,
                "circulation_target": target,
                "rel_err": abs(circ - target) / target,
            }
        )
    return points


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    rel_ceiling = float(table["tolerance"]["relative"])
    got = compute_canonical()
    failures: list[str] = []
    for tp, m in zip(table["test_points"], got, strict=False):
        if int(tp["inputs"]["n"]) != int(m["n"]):
            failures.append(f"N mismatch: {tp['inputs']['n']} != {m['n']}")
        if m["rel_err"] > rel_ceiling:
            failures.append(
                f"circulation rel err {m['rel_err']} > ceiling {rel_ceiling} at N={m['n']}"
            )
        want = float(tp["expected"]["circulation_measured"])
        if abs(m["circulation_measured"] - want) > 1e-9:
            failures.append(
                f"measured circulation drifted: {m['circulation_measured']} != table {want}"
            )
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} quantized circulation reproduces within the ceiling.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--print", action="store_true")
    args = parser.parse_args()
    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
