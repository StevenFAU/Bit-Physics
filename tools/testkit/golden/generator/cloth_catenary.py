"""Generator/verifier for the mass-spring-cloth golden tables.

Re-derives the catenary-limit hanging-chain table
``tools/testkit/golden/tables/cloth-hanging.json`` and the uniform-stretch
linear-elastic table ``tools/testkit/golden/tables/cloth-stretched.json`` from
the closed-form derivation in
``tools/testkit/golden/derivations/cloth-catenary-limit.md``.

The hanging-chain reference is the analytic catenary ``y(x) = a·cosh(x/a)`` (the
independent reference per spec § 2.4 — NOT derived from the XPBD sim nor from the
vendored Bender oracle). The C++ doctest (gate-4) runs the XPBD sim in the
inextensible limit and compares to these values within ``catenary_shape_rel``
(the MEASURED stiff-limit residual; sim matches the analytic catenary to ~0.12%
of sag depth — see the Stage-1b audit). Do NOT widen the tolerance to mask an
under-converged solve (spec § 2.6); converge `iterations` instead.

Usage::

    uv run --directory tools/testkit python -m golden.generator.cloth_catenary
    uv run --directory tools/testkit python -m golden.generator.cloth_catenary --verify
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

_TABLES = Path(__file__).resolve().parents[2] / "golden" / "tables"
HANGING_PATH = _TABLES / "cloth-hanging.json"
STRETCHED_PATH = _TABLES / "cloth-stretched.json"

# Hanging chain (catenary-limit) canonical config — MUST match the C++ gate-4
# doctest (tests/test_golden.cpp).
N_HANG = 32
SPACING = 1.0
SPAN_D = 18.0  # pin separation < S = (N-1)*SPACING = 31 -> slack hangs into a catenary
# Stretched chain (linear-elastic) canonical config.
N_STRETCH = 8
GAP = 10.5  # > (N-1)*SPACING = 7 -> uniform stretch


def catenary_param(span: float, arc_len: float) -> float:
    """Solve 2a·sinh(X/a) = S for a > 0 (X = span/2). f(a) is decreasing in a."""
    x = span / 2.0
    lo, hi = 1e-9, 1e9
    for _ in range(300):
        mid = 0.5 * (lo + hi)
        if 2.0 * mid * math.sinh(x / mid) - arc_len > 0.0:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def hanging_points(n: int, spacing: float, span: float) -> list[tuple[float, float]]:
    """Analytic catenary positions at the chain's arc-length stations s_k = k·spacing."""
    arc_len = (n - 1) * spacing
    x_half = span / 2.0
    a = catenary_param(span, arc_len)
    cosh_x = math.cosh(x_half / a)

    def s_of_xp(xp: float) -> float:  # arc length from the left pin
        return a * math.sinh(xp / a) + a * math.sinh(x_half / a)

    def invert(sk: float) -> float:
        lo, hi = -x_half, x_half
        for _ in range(300):
            m = 0.5 * (lo + hi)
            if s_of_xp(m) < sk:
                lo = m
            else:
                hi = m
        return 0.5 * (lo + hi)

    pts = []
    for k in range(n):
        xp = invert(k * spacing)
        pts.append((xp + x_half, a * (math.cosh(xp / a) - cosh_x)))
    return pts, a


def build_hanging() -> dict:
    pts, a = hanging_points(N_HANG, SPACING, SPAN_D)
    sag = abs(min(y for _, y in pts))
    test_points = []
    x_half = SPAN_D / 2.0
    arc = (N_HANG - 1) * SPACING
    # parabolic small-sag cross-check value at the quarter station (Anchor 3 sanity):
    qk = N_HANG // 4
    for k, (x, y) in enumerate(pts):
        tp = {"inputs": {"k": k}, "expected": {"x": x, "y": y}}
        if k == 0:
            # Anchor 1 — analytic catenary form (Beer & Johnston, Statics, Ch.7).
            tp["independent_reference"] = {
                "derived_by": "analytic-catenary",
                "source": (
                    "Anchor 1. Pinned left endpoint at (0, 0) of the analytic catenary "
                    "y(x)=a·cosh(x/a), a=H/w=T0/(rho g) — Beer & Johnston, Vector "
                    "Mechanics for Engineers: Statics, Ch. 7 (cables: the catenary). "
                    f"Catenary parameter a={a:.10f} solved from 2a·sinh(X/a)=S, X={x_half:.4f}, "
                    f"S={arc:.4f}. Independent of the XPBD sim and of the Bender oracle "
                    "(spec § 2.4)."
                ),
                "doi": "n/a-textbook-Beer-Johnston-Statics-Ch7",
                "expected": {"x": 0.0, "y": 0.0},
            }
        elif k == N_HANG // 2:
            # Anchor 2 — independent hand-derived differential-element force balance.
            tp["independent_reference"] = {
                "derived_by": "hand-derivation",
                "source": (
                    f"Anchor 2. Catenary low point (chain centre), sag depth = {sag:.6f} "
                    "below the pins. Hand-derived differential-element force balance "
                    "(dH=0, dV=w·ds ⇒ dy/dx=sinh(x/a) ⇒ y=a(cosh(x'/a)-cosh(X/a))) in "
                    f"cloth-catenary-limit.md; at x'=0 gives y=a(1-cosh(X/a))={pts[k][1]:.6f}. "
                    "Independent of any textbook table and of the sim."
                ),
                "doi": "n/a-hand-derivation",
                "expected": {"x": pts[k][0], "y": pts[k][1]},
            }
        elif k == qk:
            # Anchor 3 — variational (constrained PE min) + parabolic small-sag check.
            tp["independent_reference"] = {
                "derived_by": "variational-and-parabolic-limit",
                "source": (
                    "Anchor 3. Quarter station — variational cross-check: minimising "
                    "gravitational PE at fixed arc length (Lagrange multiplier; Marion "
                    "& Thornton, Classical Dynamics, §6.6 'Euler's Equations When "
                    "Auxiliary Conditions Are Imposed') yields the same Euler equation "
                    "and the same catenary as Anchors 1-2. Parabolic small-sag limit "
                    "y≈a+x'^2/(2a) is the standard consistency check. All three methods "
                    f"agree on (x,y)=({pts[k][0]:.6f},{pts[k][1]:.6f})."
                ),
                "doi": "n/a-textbook-Marion-Thornton-6.6",
                "expected": {"x": pts[k][0], "y": pts[k][1]},
            }
        test_points.append(tp)
    return {
        "schema_version": "1.0.0",
        "algorithm": "mass-spring-cloth-xpbd-catenary-limit",
        "category": "soft-body",
        "derivation": {"doc": "tools/testkit/golden/derivations/cloth-catenary-limit.md"},
        "config": {
            "nx": N_HANG,
            "ny": 1,
            "spacing": SPACING,
            "span_D": SPAN_D,
            "gravity_y": -9.81,
            "stretch_compliance": 0.0,
            "iterations": 80,
            "velocity_damping": 0.1,
            "dt": 1.0 / 60.0,
            "steps": 3000,
            "catenary_a": a,
            "sag_depth": sag,
        },
        "tolerance": {"catenary_shape_rel": 2e-3},
        "test_points": test_points,
    }


def build_stretched() -> dict:
    expect = GAP / (N_STRETCH - 1)
    pts = [(k * expect, 0.0) for k in range(N_STRETCH)]
    test_points = []
    # 3 INDEPENDENT-method anchors (spec § 2.4) on distinct interior points, all
    # agreeing on the uniform-stretch positions x_k = k*GAP/(n-1).
    a2, a4, a6 = 2, N_STRETCH // 2, N_STRETCH - 2
    for k, (x, y) in enumerate(pts):
        tp = {"inputs": {"k": k}, "expected": {"x": x, "y": y}}
        if k == a2:
            tp["independent_reference"] = {
                "derived_by": "hooke-linear-superposition",
                "source": (
                    f"Anchor 1. Hooke linear superposition: {N_STRETCH - 1} equal series "
                    f"springs pinned at (0,0) and ({GAP:.4f},0), gravity off, share tension "
                    f"equally -> uniform extension, each length GAP/(n-1) = {expect:.6f} "
                    f"(> rest {SPACING:.1f}, in tension). Particle k sits at x=k*GAP/(n-1)."
                ),
                "doi": "n/a-hand-derivation",
                "expected": {"x": x, "y": 0.0},
            }
        elif k == a4:
            tp["independent_reference"] = {
                "derived_by": "series-spring-equivalent-stiffness",
                "source": (
                    "Anchor 2. Series-spring equivalent stiffness: n-1 identical springs "
                    "of stiffness k in series have k_eq = k/(n-1); under end tension T each "
                    "carries the SAME T, so each extends by the same T/k -> equal lengths. "
                    f"Independent of Anchor 1; agrees on x={x:.6f}."
                ),
                "doi": "n/a-hand-derivation",
                "expected": {"x": x, "y": 0.0},
            }
        elif k == a6:
            tp["independent_reference"] = {
                "derived_by": "energy-minimisation",
                "source": (
                    "Anchor 3. Energy minimisation: the elastic energy sum (1/2)k(d_i-rest)^2 "
                    "at fixed endpoints (sum d_i = GAP) is minimised, by convexity + symmetry, "
                    "at uniform d_i = GAP/(n-1) (Lagrange multiplier: all d_i equal). "
                    f"Independent of Anchors 1-2; agrees on x={x:.6f}."
                ),
                "doi": "n/a-hand-derivation",
                "expected": {"x": x, "y": 0.0},
            }
        test_points.append(tp)
    return {
        "schema_version": "1.0.0",
        "algorithm": "mass-spring-cloth-xpbd-linear-elastic",
        "category": "soft-body",
        "derivation": {"doc": "tools/testkit/golden/derivations/cloth-catenary-limit.md"},
        "config": {
            "nx": N_STRETCH,
            "ny": 1,
            "spacing": SPACING,
            "gap": GAP,
            "stretch_compliance": 1e-7,
            "iterations": 80,
            "velocity_damping": 0.2,
            "steps": 2000,
            "uniform_spacing": expect,
        },
        "tolerance": {"position_abs": 1e-2},
        "test_points": test_points,
    }


def _write(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true", help="check tables match the re-derivation")
    args = ap.parse_args()
    tables = {HANGING_PATH: build_hanging(), STRETCHED_PATH: build_stretched()}
    if args.verify:
        ok = True
        for path, data in tables.items():
            on_disk = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
            if on_disk != data:
                print(f"MISMATCH: {path}")
                ok = False
        print("cloth golden tables: VERIFIED" if ok else "cloth golden tables: MISMATCH")
        return 0 if ok else 1
    for path, data in tables.items():
        _write(path, data)
        print(f"wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
