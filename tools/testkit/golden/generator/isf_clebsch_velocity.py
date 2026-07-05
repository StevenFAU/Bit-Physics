"""Generator/verifier for the ISF spherical-Clebsch velocity golden (table C).

Reuses the LANDED clebsch-pfm fixture as an independent cross-check
(`packages/eulerian-smoke-frontier-clebsch-pfm/src/clebsch_pfm_math.cpp`
`taylor_green_wave_2d`, validated at that package's A1 surface): the
z-invariant 2D Taylor-Green spherical-Clebsch lift

    cos(alpha) = -cos(2*pi*x),  theta = 4*(-cos(2*pi*y)/(2*pi))/hbar,
    Psi = (cos(alpha/2)*e^{i*theta/2}, sin(alpha/2)*e^{-i*theta/2})

is unit-norm exact-to-FP, and the discrete edge velocity is
u_e = (hbar/dx)*arg<Psi_a, Psi_b> (thesis App. 1.C; the sign pin
u = +hbar*Im(conj(psi)*grad psi)). The table commits spinor components and
face velocities at pinned sample points; --verify recomputes both from the
closed form via the reference implementation.

Derivation: tools/testkit/golden/derivations/isf-clebsch-velocity.md
Usage: --verify / --print.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

_REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_REPO / "packages/schrodinger-smoke"))

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "volumetric-grid"
    / "isf-clebsch-velocity.json"
)

N = 32
HBAR = 0.1
SAMPLES: list[tuple[int, int, int]] = [(0, 0, 0), (5, 9, 0), (12, 3, 7), (20, 20, 20)]


def compute_canonical() -> dict[str, object]:
    from schrodinger_smoke.reference.isf import (
        grid_coords,
        taylor_green_wave_2d,
        velocity_faces,
    )

    x, y, _z = grid_coords(N)
    psi = taylor_green_wave_2d(x, y, HBAR)
    norm_max_err = float(np.max(np.abs(np.sqrt(np.abs(psi[0]) ** 2 + np.abs(psi[1]) ** 2) - 1.0)))
    ux, uy, uz = velocity_faces(psi, HBAR, 1.0 / N)
    out: dict[str, object] = {"unit_norm_max_err": norm_max_err, "samples": []}
    for s in SAMPLES:
        out["samples"].append(  # type: ignore[union-attr]
            {
                "index": list(s),
                "psi1_re": float(np.real(psi[0][s])),
                "psi1_im": float(np.imag(psi[0][s])),
                "psi2_re": float(np.real(psi[1][s])),
                "psi2_im": float(np.imag(psi[1][s])),
                "u_face_x": float(ux[s]),
                "u_face_y": float(uy[s]),
                "u_face_z": float(uz[s]),
            }
        )
    return out


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    tol = float(table["tolerance"]["absolute"])
    got = compute_canonical()
    failures: list[str] = []
    if float(got["unit_norm_max_err"]) > 1e-15:  # type: ignore[arg-type]
        failures.append(f"unit-norm err {got['unit_norm_max_err']} > 1e-15")
    for tp, sample in zip(table["test_points"], got["samples"], strict=False):  # type: ignore[arg-type]
        for key, want in tp["expected"].items():
            if abs(float(sample[key]) - float(want)) > tol:
                failures.append(
                    f"{key}: recomputed {sample[key]} != table {want} at {tp['inputs']}"
                )
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} Clebsch-lift spinor + velocity values reproduce.")
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
