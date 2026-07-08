"""Generator/verifier for the Rosenthal THIN-PLATE moving-source golden (table E).

Dimensional honesty (spec-ref.md § 4.6, the v0.3 catch): the sim solves the
2D heat equation, so the steady moving-source golden is Rosenthal's
thin-plate solution — a line source of absorbed power q through thickness g
moving at speed U; in the moving frame (w = x - U*t, r = sqrt(w^2 + y^2)):

    T = T0 + q/(2*pi*lambda*g) * exp(-U*w/(2*kappa)) * K0(U*r/(2*kappa))

K0 = modified Bessel function of the second kind (log-singular at the
source; long tail behind, sharp decay ahead). The better-known thick-plate /
semi-infinite 3D form T0 + P/(2*pi*lambda*R)*exp(-U(R+w)/2kappa) solves the
*3D* equation — the WRONG-DIMENSION COUNTEREXAMPLE, recorded below by its
nonzero 2D-PDE residual.

Internal cross-checks (all asserted at generation time):

1. scipy.special.k0 vs the Abramowitz & Stegun 9.8.5/9.8.6 rational
   approximations (independent recomputation, |err| < 2e-7).
2. The thin-plate formula satisfies the 2D moving-frame steady PDE
   kappa*(T_ww + T_yy) + U*T_w = 0 to FD-truncation accuracy at every probe;
   the 3D form's residual is >= 100x larger (wrong equation).
3. Far-field asymptotic K0(z) ~ sqrt(pi/(2z)) e^-z agreement at z = 8.

Probe points EXCLUDE the source core (K0 log-singularity; finite-spot
mismatch region). LABELED NON-VALIDATION: golden of the idealized equation,
not a melt-pool model.

Derivation: tools/testkit/golden/derivations/heat-equation-rosenthal-thin-plate.md
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
    / "heat-equation-rosenthal-thin-plate.json"
)

# Nondimensional scene shared with the package test (rho*cp = 1 so
# conductivity == diffusivity; unit thickness; unit absorbed power).
PARAMS = {
    "q": 1.0,
    "conductivity": 0.005,
    "thickness": 1.0,
    "speed": 1.0,
    "kappa": 0.005,
    "t0": 0.0,
}

# (w, y) probes in the moving frame — behind (w<0), ahead (w>0), and lateral;
# all outside the source core r >= 0.01 (the package test's annulus family).
PROBES: list[tuple[float, float]] = [
    (-0.03, 0.01),
    (0.005, 0.02),
    (-0.06, 0.03),
    (0.0, 0.025),
    (-0.1, 0.05),
    (0.015, 0.0),
]


def _i0_as(x: float) -> float:
    """A&S 9.8.1 polynomial for I0 (|x| <= 3.75), |err| < 1.6e-7."""
    t = x / 3.75
    t2 = t * t
    return (
        1.0
        + 3.5156229 * t2
        + 3.0899424 * t2**2
        + 1.2067492 * t2**3
        + 0.2659732 * t2**4
        + 0.0360768 * t2**5
        + 0.0045813 * t2**6
    )


def k0_as(x: float) -> float:
    """Abramowitz & Stegun 9.8.5 (0 < x <= 2) / 9.8.6 (x >= 2) rational
    approximations for K0 — the INDEPENDENT recomputation of scipy k0."""
    if x <= 2.0:
        t2 = (x / 2.0) ** 2
        return (
            -math.log(x / 2.0) * _i0_as(x)
            - 0.57721566
            + 0.42278420 * t2
            + 0.23069756 * t2**2
            + 0.03488590 * t2**3
            + 0.00262698 * t2**4
            + 0.00010750 * t2**5
            + 0.00000740 * t2**6
        )
    u = 2.0 / x
    poly = (
        1.25331414
        - 0.07832358 * u
        + 0.02189568 * u**2
        - 0.01062446 * u**3
        + 0.00587872 * u**4
        - 0.00251540 * u**5
        + 0.00053208 * u**6
    )
    return poly * math.exp(-x) / math.sqrt(x)


def thin_plate(w: float, y: float) -> float:
    from scipy.special import k0

    p = PARAMS
    r = math.hypot(w, y)
    z = p["speed"] * r / (2.0 * p["kappa"])
    pref = p["q"] / (2.0 * math.pi * p["conductivity"] * p["thickness"])
    return p["t0"] + pref * math.exp(-p["speed"] * w / (2.0 * p["kappa"])) * float(k0(z))


def thin_plate_as(w: float, y: float) -> float:
    """Same formula with the A&S K0 — fully independent of scipy."""
    p = PARAMS
    r = math.hypot(w, y)
    z = p["speed"] * r / (2.0 * p["kappa"])
    pref = p["q"] / (2.0 * math.pi * p["conductivity"] * p["thickness"])
    return p["t0"] + pref * math.exp(-p["speed"] * w / (2.0 * p["kappa"])) * k0_as(z)


def thick_plate_3d(w: float, y: float) -> float:
    """The WRONG-DIMENSION counterexample (3D semi-infinite form)."""
    p = PARAMS
    r = math.hypot(w, y)
    return (
        p["q"]
        / (2.0 * math.pi * p["conductivity"] * r)
        * math.exp(-p["speed"] * (r + w) / (2.0 * p["kappa"]))
    )


def pde_residual(f, w0: float, y0: float, h: float = 5e-5) -> float:
    """kappa*(T_ww + T_yy) + U*T_w, centered differences, normalized by the
    local diffusion-operator scale kappa*|T|/l^2 with l = 2*kappa/U."""
    p = PARAMS
    t_c = f(w0, y0)
    t_ww = (f(w0 + h, y0) - 2.0 * t_c + f(w0 - h, y0)) / (h * h)
    t_yy = (f(w0, y0 + h) - 2.0 * t_c + f(w0, y0 - h)) / (h * h)
    t_w = (f(w0 + h, y0) - f(w0 - h, y0)) / (2.0 * h)
    res = p["kappa"] * (t_ww + t_yy) + p["speed"] * t_w
    ell = 2.0 * p["kappa"] / p["speed"]
    scale = p["kappa"] * abs(t_c) / (ell * ell) + 1e-300
    return abs(res) / scale


def cross_checks() -> None:
    # 1. scipy vs A&S K0 across the probe range and the branch point.
    for z in (0.5, 1.0, 1.9, 2.0, 2.1, 5.0, 11.2):
        from scipy.special import k0

        assert abs(float(k0(z)) - k0_as(z)) <= 2e-7, (z, float(k0(z)), k0_as(z))
    # 2. Far-field asymptotic at z = 8.
    from scipy.special import k0

    z = 8.0
    asym = math.sqrt(math.pi / (2.0 * z)) * math.exp(-z)
    assert abs(float(k0(z)) - asym) / asym <= 0.05
    # 3. PDE residual: thin plate ~ 0; 3D form >> 0 (wrong equation).
    for w0, y0 in PROBES:
        res_thin = pde_residual(thin_plate, w0, y0)
        res_thick = pde_residual(thick_plate_3d, w0, y0)
        assert res_thin <= 1e-4, (w0, y0, res_thin)
        assert res_thick >= 100.0 * max(res_thin, 1e-9), (w0, y0, res_thick, res_thin)


def solver_value(w: float, y: float) -> float:
    import numpy as np
    from heat_equation.reference import rosenthal_thin_plate

    p = PARAMS
    return float(
        rosenthal_thin_plate(
            np.array([w]),
            np.array([y]),
            q=p["q"],
            conductivity=p["conductivity"],
            thickness=p["thickness"],
            speed=p["speed"],
            kappa=p["kappa"],
            t0=p["t0"],
        )[0]
    )


def compute_canonical() -> list[dict[str, object]]:
    return [{"w": w, "y": y, **PARAMS, "temperature": thin_plate(w, y)} for w, y in PROBES]


def build_table() -> dict[str, object]:
    cross_checks()
    points = []
    for w, y in PROBES:
        val = thin_plate(w, y)
        val_as = thin_plate_as(w, y)
        assert abs(val - val_as) <= 3e-6 * max(abs(val), 1.0), (val, val_as)
        points.append(
            {
                "inputs": {"w": w, "y": y, **PARAMS},
                "expected": {
                    "temperature": val,
                    "pde_residual_normalized": pde_residual(thin_plate, w, y),
                    "wrong_dimension_3d_value": thick_plate_3d(w, y),
                },
                "independent_reference": {
                    "derived_by": "abramowitz-stegun-k0",
                    "source": (
                        "A&S 9.8.5/9.8.6 rational K0 recomputation (independent of "
                        "scipy) agrees to <= 3e-6 relative; 2D moving-frame PDE "
                        "residual asserted ~0 for the thin-plate form and >= 100x for "
                        "the 3D thick-plate form (the wrong-dimension counterexample, "
                        "spec-ref.md § 4.6 v0.3). Rosenthal 1946, Trans. ASME 68:849-866."
                    ),
                    "doi": "n/a-rosenthal-1946-pre-doi",
                },
            }
        )
    return {
        "schema_version": "1.0.0",
        "algorithm": "heat-equation-rosenthal-thin-plate-k0",
        "category": "volumetric-grid",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/heat-equation-rosenthal-thin-plate.md",
            "upstream": "Rosenthal-1946-Trans-ASME-68-thin-plate-case",
            "upstream_sha": "n/a-no-vendored-code",
            "upstream_path": "docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md",
        },
        "labeled": "non-validation-golden-of-the-idealized-equation",
        "tolerance": {"absolute": 0.0, "relative": 1e-12},
        "test_points": points,
    }


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    cross_checks()
    with table_path.open() as fh:
        table = json.load(fh)
    rel = float(table["tolerance"]["relative"])
    failures: list[str] = []
    for tp, (w, y) in zip(table["test_points"], PROBES, strict=False):
        want = float(tp["expected"]["temperature"])
        cf = thin_plate(w, y)
        sv = solver_value(w, y)
        scale = max(abs(want), 1e-12)
        if abs(cf - want) > rel * scale:
            failures.append(f"closed form {cf} != table {want} at {(w, y)}")
        if abs(sv - want) > rel * scale:
            failures.append(f"solver {sv} != table {want} at {(w, y)}")
    if failures:
        for f in failures:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} thin-plate K0 golden pinned (closed form + solver + A&S).")
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
