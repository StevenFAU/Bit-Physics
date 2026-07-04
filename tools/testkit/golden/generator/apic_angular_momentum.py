"""Generator/verifier for the APIC angular-momentum transfer golden (Props 5.4/5.5).

Runs full P2G and G2P transfers **in exact rational arithmetic**
(``fractions.Fraction``) on small fixed particle configurations (2D and
3D) and proves, as rational identities,

    L_particles == L_grid (after P2G)  == L_particles' (after APIC G2P)

with the particle total including the affine spin term
``sum_p m_p * axial(B_p)`` (derivation at
``tools/testkit/golden/derivations/apic-transfers.md`` § 3). The PIC
G2P (B discarded) yields a *different* pinned value — the paired
negative control.

FP-honesty rule (sim spec § 7): test point 1 (2D) and test point 3
(3D) use **dyadic-rational** configurations (cell-centered positions ->
weights 1/8, 3/4, 1/8; dyadic masses/velocities/B; stencil-disjoint
particles so every grid division cancels exactly) — every binary64
intermediate is exactly representable, so the f64 mirror run asserts
bit-for-bit equality with the rational values. Test point 2 (2D,
non-dyadic, overlapping stencils) pins the measured f64 residual
against a 1e-14 relative bound.

Usage: ``--verify`` / ``--write`` / ``--print``.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

TABLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "golden"
    / "tables"
    / "particle-fluids"
    / "apic-angular-momentum.json"
)

Frac = Fraction
Vec = tuple[Fraction, ...]
Mat = tuple[tuple[Fraction, ...], ...]


def _weights_1d(fp: Fraction) -> tuple[Fraction, Fraction, Fraction]:
    return (
        Frac(1, 2) * (Frac(3, 2) - fp) ** 2,
        Frac(3, 4) - (fp - 1) ** 2,
        Frac(1, 2) * (fp - Frac(1, 2)) ** 2,
    )


def _base_and_weights(x: Vec, dx: Fraction) -> tuple[tuple[int, ...], list[tuple[Fraction, ...]]]:
    bases: list[int] = []
    axis_w: list[tuple[Fraction, ...]] = []
    for xa in x:
        fx = xa / dx
        base = math.floor(fx + Frac(1, 2)) - 1
        bases.append(base)
        axis_w.append(_weights_1d(fx - base))
    return tuple(bases), axis_w


def _stencil(x: Vec, dx: Fraction):
    """Yield (node_index_tuple, weight, offset_vector r = x_i - x_p)."""
    d = len(x)
    bases, axis_w = _base_and_weights(x, dx)
    for offs in itertools.product(range(3), repeat=d):
        w = Frac(1)
        node = []
        r = []
        for a in range(d):
            w *= axis_w[a][offs[a]]
            idx = bases[a] + offs[a]
            node.append(idx)
            r.append(idx * dx - x[a])
        if w != 0:
            yield tuple(node), w, tuple(r)


def _cross(a: Vec, b: Vec) -> tuple[Fraction, ...]:
    if len(a) == 2:
        return (a[0] * b[1] - a[1] * b[0],)
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def _axial(bmat: Mat) -> tuple[Fraction, ...]:
    if len(bmat) == 2:
        return (bmat[1][0] - bmat[0][1],)
    return (
        bmat[2][1] - bmat[1][2],
        bmat[0][2] - bmat[2][0],
        bmat[1][0] - bmat[0][1],
    )


def _vadd(a, b):
    return tuple(x + y for x, y in zip(a, b, strict=True))


def _matvec(m: Mat, v: Vec) -> Vec:
    return tuple(sum(row[j] * v[j] for j in range(len(v))) for row in m)


def particle_total_l(particles) -> tuple[Fraction, ...]:
    d = len(particles[0]["x"])
    total = (Frac(0),) * (1 if d == 2 else 3)
    for p in particles:
        orbital = tuple(p["m"] * c for c in _cross(p["x"], p["v"]))
        spin = tuple(p["m"] * c for c in _axial(p["B"]))
        total = _vadd(total, _vadd(orbital, spin))
    return total


def p2g(particles, dx: Fraction):
    """Affine P2G (lumped mass). Returns {node: [mass, momentum-vector]}."""
    d = len(particles[0]["x"])
    inv_dp = Frac(4) / (dx * dx)
    grid: dict[tuple[int, ...], list] = {}
    for p in particles:
        c_mat = tuple(tuple(inv_dp * e for e in row) for row in p["B"])
        for node, w, r in _stencil(p["x"], dx):
            va = _vadd(p["v"], _matvec(c_mat, r))
            cell = grid.setdefault(node, [Frac(0), (Frac(0),) * d])
            cell[0] += w * p["m"]
            cell[1] = _vadd(cell[1], tuple(w * p["m"] * comp for comp in va))
    return grid


def grid_total_l(grid, dx: Fraction) -> tuple[Fraction, ...]:
    d = len(next(iter(grid.values()))[1])
    total = (Frac(0),) * (1 if d == 2 else 3)
    for node in sorted(grid):
        _mass, mom = grid[node]
        x_i = tuple(idx * dx for idx in node)
        total = _vadd(total, _cross(x_i, mom))
    return total


def g2p(particles, grid, dx: Fraction, mode: str):
    """G2P reconstruction. Returns new particle list (same x, m)."""
    out = []
    d = len(particles[0]["x"])
    for p in particles:
        v_new = (Frac(0),) * d
        b_new = [[Frac(0)] * d for _ in range(d)]
        for node, w, r in _stencil(p["x"], dx):
            cell = grid.get(node)
            if cell is None or cell[0] == 0:
                continue
            v_i = tuple(comp / cell[0] for comp in cell[1])
            v_new = _vadd(v_new, tuple(w * comp for comp in v_i))
            if mode == "apic":
                for a in range(d):
                    for b in range(d):
                        b_new[a][b] += w * v_i[a] * r[b]
        out.append(
            {
                "x": p["x"],
                "m": p["m"],
                "v": v_new,
                "B": tuple(tuple(row) for row in b_new),
            }
        )
    return out


def _to_float_particles(particles):
    return [
        {
            "x": tuple(float(c) for c in p["x"]),
            "m": float(p["m"]),
            "v": tuple(float(c) for c in p["v"]),
            "B": tuple(tuple(float(e) for e in row) for row in p["B"]),
        }
        for p in particles
    ]


def _f64_pipeline(particles, dx: Fraction, mode: str):
    """Same computation in binary64 (floats reuse the Fraction code paths:
    Python arithmetic on floats), deterministic lex iteration order."""
    fp = _to_float_particles(particles)
    fdx = float(dx)
    grid = p2g(fp, fdx)  # type: ignore[arg-type]
    l_grid = grid_total_l(grid, fdx)  # type: ignore[arg-type]
    after = g2p(fp, grid, fdx, mode)  # type: ignore[arg-type]
    return (
        particle_total_l(fp),
        l_grid,
        particle_total_l(after),
    )


# -- Fixed configurations ------------------------------------------------

_POINT_2D_DYADIC = {
    "name": "2d-dyadic-two-particles-disjoint-stencils",
    "dx": Frac(1),
    "particles": [
        {
            "x": (Frac(2), Frac(2)),
            "m": Frac(1),
            "v": (Frac(1, 2), Frac(-1, 4)),
            "B": ((Frac(1, 4), Frac(-1, 2)), (Frac(1, 8), Frac(3, 8))),
        },
        {
            "x": (Frac(6), Frac(3)),
            "m": Frac(2),
            "v": (Frac(3, 2), Frac(3, 4)),
            "B": ((Frac(-1, 8), Frac(1, 4)), (Frac(1, 2), Frac(-3, 4))),
        },
    ],
    "dyadic": True,
}

_POINT_2D_GENERIC = {
    "name": "2d-generic-two-particles-overlapping-stencils",
    "dx": Frac(1),
    "particles": [
        {
            "x": (Frac(23, 10), Frac(27, 10)),
            "m": Frac(3, 7),
            "v": (Frac(1, 3), Frac(-2, 7)),
            "B": ((Frac(1, 9), Frac(-2, 11)), (Frac(5, 13), Frac(1, 7))),
        },
        {
            "x": (Frac(37, 10), Frac(33, 10)),
            "m": Frac(7, 5),
            "v": (Frac(-5, 9), Frac(4, 11)),
            "B": ((Frac(2, 7), Frac(3, 8)), (Frac(-1, 6), Frac(2, 9))),
        },
    ],
    "dyadic": False,
}

_POINT_3D_DYADIC = {
    "name": "3d-dyadic-two-particles-disjoint-stencils",
    "dx": Frac(1),
    "particles": [
        {
            "x": (Frac(2), Frac(2), Frac(2)),
            "m": Frac(1),
            "v": (Frac(1, 2), Frac(-1, 4), Frac(3, 8)),
            "B": (
                (Frac(1, 4), Frac(-1, 2), Frac(1, 8)),
                (Frac(1, 8), Frac(3, 8), Frac(-1, 4)),
                (Frac(-3, 8), Frac(1, 16), Frac(1, 2)),
            ),
        },
        {
            "x": (Frac(6), Frac(3), Frac(2)),
            "m": Frac(2),
            "v": (Frac(3, 2), Frac(3, 4), Frac(-1, 2)),
            "B": (
                (Frac(-1, 8), Frac(1, 4), Frac(3, 16)),
                (Frac(1, 2), Frac(-3, 4), Frac(1, 16)),
                (Frac(1, 4), Frac(-1, 8), Frac(3, 8)),
            ),
        },
    ],
    "dyadic": True,
}

_CONFIGS = [_POINT_2D_DYADIC, _POINT_2D_GENERIC, _POINT_3D_DYADIC]


def _evaluate_config(cfg) -> dict[str, object]:
    dx = cfg["dx"]
    particles = cfg["particles"]
    l_before = particle_total_l(particles)
    grid = p2g(particles, dx)
    l_grid = grid_total_l(grid, dx)
    after_apic = g2p(particles, grid, dx, "apic")
    l_after = particle_total_l(after_apic)
    after_pic = g2p(particles, grid, dx, "pic")
    l_after_pic = particle_total_l(after_pic)
    # The rational identities (Props 5.4 + 5.5) — hard assertions.
    if l_before != l_grid or l_before != l_after:
        raise AssertionError(f"{cfg['name']}: conservation identity failed")
    if l_after_pic == l_before:
        raise AssertionError(f"{cfg['name']}: PIC negative control unexpectedly conserved")
    f64_before, f64_grid, f64_after = _f64_pipeline(particles, dx, "apic")
    exact_f = [float(c) for c in l_before]
    if cfg["dyadic"]:
        if list(f64_before) != exact_f or list(f64_grid) != exact_f or list(f64_after) != exact_f:
            raise AssertionError(f"{cfg['name']}: dyadic f64 run not bit-exact")
        f64_max_rel = 0.0
    else:
        worst = 0.0
        for vec in (f64_before, f64_grid, f64_after):
            for got, want in zip(vec, exact_f, strict=True):
                denom = max(abs(want), 1e-30)
                worst = max(worst, abs(got - want) / denom)
        f64_max_rel = worst
        if f64_max_rel > 1e-14:
            raise AssertionError(f"{cfg['name']}: f64 residual {f64_max_rel} > 1e-14")
    return {
        "l_total_particles_before": [float(c) for c in l_before],
        "l_total_grid_after_p2g": [float(c) for c in l_grid],
        "l_total_particles_after_apic_g2p": [float(c) for c in l_after],
        "l_total_particles_after_pic_g2p": [float(c) for c in l_after_pic],
        "l_exact_rational": [str(c) for c in l_before],
        "l_after_pic_exact_rational": [str(c) for c in l_after_pic],
        "f64_bit_exact": bool(cfg["dyadic"]),
        "f64_max_rel_err_measured": f64_max_rel,
    }


def compute_canonical() -> list[dict[str, object]]:
    return [_evaluate_config(cfg) for cfg in _CONFIGS]


def _inputs_block(cfg) -> dict[str, object]:
    return {
        "name": cfg["name"],
        "dx": float(cfg["dx"]),
        "particles": [
            {
                "x": [float(c) for c in p["x"]],
                "m": float(p["m"]),
                "v": [float(c) for c in p["v"]],
                "B": [[float(e) for e in row] for row in p["B"]],
                "C_equals_4B_over_dx2": [
                    [float(e * 4 / (cfg["dx"] * cfg["dx"])) for e in row] for row in p["B"]
                ],
                "exact": {
                    "x": [str(c) for c in p["x"]],
                    "m": str(p["m"]),
                    "v": [str(c) for c in p["v"]],
                    "B": [[str(e) for e in row] for row in p["B"]],
                },
            }
            for p in cfg["particles"]
        ],
        "angular_momentum_definition": (
            "L = sum_p m_p (x_p cross v_p) + sum_p m_p axial(B_p); "
            "2D axial(B) = B21 - B12 (scalar); 3D axial(B) = "
            "(B32-B23, B13-B31, B21-B12); B = C * Dp with Dp = (1/4) dx^2 I"
        ),
        "dyadic_exact_configuration": bool(cfg["dyadic"]),
    }


def build_table() -> dict[str, object]:
    expecteds = compute_canonical()
    test_points = []
    for cfg, expected in zip(_CONFIGS, expecteds, strict=True):
        test_points.append(
            {
                "inputs": _inputs_block(cfg),
                "expected": expected,
                "independent_reference": {
                    "source": (
                        "Hand derivation at tools/testkit/golden/derivations/"
                        "apic-transfers.md § 3 (Props 5.4/5.5 re-derived from "
                        "the weight moments); generator re-proves the "
                        "conservation identities in exact rational arithmetic "
                        "(fractions.Fraction) at verify time — the equalities "
                        "hold as rationals, not merely within tolerance. The "
                        "PIC row is the paired negative control (L changes "
                        "across the velocity-only G2P)."
                    ),
                    "doi": (
                        "10.1145/2766996 (Jiang et al. 2015, tech-report "
                        "Props 5.4/5.5); 10.1016/j.jcp.2017.02.050 (Jiang et "
                        "al. 2017 JCP, lumped-mass angular-momentum analysis)"
                    ),
                    "derived_by": (
                        "exact rational arithmetic; dyadic rows additionally "
                        "bit-exact in binary64 by construction (FP-honesty "
                        "rule, sim spec docs/sim-specs/particle-fluids/"
                        "pic-flip/spec-ref.md § 7)"
                    ),
                    "expected": {
                        "conservation_identity": "L_before == L_grid == L_after (exact)",
                        "pic_negative_control": "L_after_pic != L_before",
                    },
                },
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "apic-angular-momentum-transfer-conservation",
        "category": "particle-fluids",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/apic-transfers.md",
            "upstream": "Jiang-APIC-2015-tech-report-props-5.4-5.5",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "https://cs.ucr.edu/~craigs/papers/2015-apic/tech-doc.pdf",
        },
        "tolerance": {
            "absolute": 0.0,
            "relative": 1e-14,
            "note": (
                "dyadic test points assert bit-for-bit f64 equality "
                "(tolerance 0); the generic point pins its measured f64 "
                "residual under the 1e-14 relative bound"
            ),
        },
        "test_points": test_points,
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    fresh = build_table()
    for idx, (got, want) in enumerate(zip(table["test_points"], fresh["test_points"], strict=True)):
        if got["expected"] != want["expected"]:
            print(f"FAIL: test point {idx} expected-block drift", file=sys.stderr)
            return 1
    if len(table["test_points"]) != len(fresh["test_points"]):
        print("FAIL: test point count drift", file=sys.stderr)
        return 1
    print(f"OK — {table_path} matches exact-rational re-derivation (identities re-proven).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--print", action="store_true")
    args = parser.parse_args()
    if args.write:
        TABLE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with TABLE_PATH.open("w") as fh:
            json.dump(build_table(), fh, indent=2)
            fh.write("\n")
        print(f"wrote {TABLE_PATH}")
        return 0
    if args.print:
        print(json.dumps(compute_canonical(), indent=2))
        return 0
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
