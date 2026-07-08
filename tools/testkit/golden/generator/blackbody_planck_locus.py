"""Generator/verifier for the blackbody Planck-locus glow LUT golden (table F).

The § 5.5 moat visual (spec-ref.md v0.3 upgrade): the interactive blackbody
glow samples a COMMITTED EXACT Planck-locus LUT — Planck's law -> CIE XYZ
(colour-matching-function integration) -> linear sRGB at pinned temperature
stops — so even the glow color has a golden table. The Helland 2012
empirical fit is a cross-check anchor, NOT the shipped path (Helland: "not
accurate enough for serious scientific use").

Physics chain:

1. Planck spectral radiance  B(lambda, T) ∝ lambda^-5 / expm1(c2/(lambda*T))
   with c2 = h*c/k_B from the EXACT 2019 SI constants (the c1 prefactor
   cancels in the chromaticity normalization).
2. XYZ = sum B * (xbar, ybar, zbar) * dlambda over the committed CVRL CIE
   1931 2-degree 5nm table
   (tools/testkit/golden/reference_implementations/cie1931_2deg_5nm.csv).
3. Linear sRGB via the IEC 61966-2-1 matrix; negatives clipped (out-of-gamut
   near-infrared reds); normalized so max(channel) = 1 (chromaticity-
   preserving — brightness is the render layer's exposure, not the LUT's).

Cross-checks asserted at generation time:

- CMF integrity: ybar peak = 1.0 at 555 nm; integral(xbar) ~ integral(ybar)
  ~ integral(zbar) within 0.2% (CIE normalization property).
- Illuminant A: the Planckian radiator at T = 2855.542 K (the modern-c2
  restatement of the historic 2848 K/c2=1.435e-2 definition) must land at
  chromaticity (x, y) = (0.44758, 0.40745) within 2e-3 (5 nm quadrature).
- Planckian-locus monotonicity: x strictly decreases with T over the stops.
- Endpoint physics: the 800 K stop is pure red-dominant (r = 1, b ~ 0); the
  12000 K stop is blue-dominant (b = 1).
- Helland 2012 fit agreement recorded (informational envelope, gamma space).

Also writes the web LUT (packages/heat-equation/web/src/generated/
blackbody-lut.json) with IDENTICAL stops — the web build spine byte-compares
the two files' stop arrays (spec-ref.md § 7 F).

Derivation: tools/testkit/golden/derivations/blackbody-planck-locus.md
Usage: --verify / --print / --write.
"""

from __future__ import annotations

import argparse
import csv
import itertools
import json
import math
import sys
from pathlib import Path

_HERE = Path(__file__).resolve()
_REPO = _HERE.parents[4]
CMF_PATH = _HERE.parents[2] / "golden" / "reference_implementations" / "cie1931_2deg_5nm.csv"
TABLE_PATH = (
    _HERE.parents[2] / "golden" / "tables" / "volumetric-grid" / "blackbody-planck-locus.json"
)
WEB_LUT_PATH = _REPO / "packages/heat-equation/web/src/generated/blackbody-lut.json"

# Exact 2019 SI constants -> c2 = h*c/k_B (m*K).
H_PLANCK = 6.62607015e-34
C_LIGHT = 299792458.0
K_BOLTZMANN = 1.380649e-23
C2 = H_PLANCK * C_LIGHT / K_BOLTZMANN

T_MIN = 800
T_MAX = 12000
T_STEP = 100

# IEC 61966-2-1 XYZ (D65) -> linear sRGB.
XYZ_TO_SRGB = (
    (3.2406, -1.5372, -0.4986),
    (-0.9689, 1.8758, 0.0415),
    (0.0557, -0.2040, 1.0570),
)

ILLUMINANT_A_T = 2855.542
ILLUMINANT_A_XY = (0.44758, 0.40745)


def load_cmf() -> list[tuple[float, float, float, float]]:
    rows = []
    with CMF_PATH.open() as fh:
        for row in csv.reader(fh):
            if not row or not row[0].strip():
                continue
            rows.append((float(row[0]), float(row[1]), float(row[2]), float(row[3])))
    assert len(rows) == 95 and rows[0][0] == 360.0 and rows[-1][0] == 830.0
    ybar_peak = max(rows, key=lambda r: r[2])
    assert ybar_peak[0] == 555.0 and ybar_peak[2] == 1.0, ybar_peak
    sx = sum(r[1] for r in rows)
    sy = sum(r[2] for r in rows)
    sz = sum(r[3] for r in rows)
    assert abs(sx - sy) <= 2e-3 * sy and abs(sz - sy) <= 2e-3 * sy, (sx, sy, sz)
    return rows


def planck_xyz(
    temp_k: float, cmf: list[tuple[float, float, float, float]]
) -> tuple[float, float, float]:
    """Relative XYZ of the Planckian radiator at temp_k (c1 and dlambda cancel
    in the normalization; kept relative)."""
    x = y = z = 0.0
    for lam_nm, xbar, ybar, zbar in cmf:
        lam_m = lam_nm * 1e-9
        b = lam_m**-5 / math.expm1(C2 / (lam_m * temp_k))
        x += b * xbar
        y += b * ybar
        z += b * zbar
    return x, y, z


def chromaticity(xyz: tuple[float, float, float]) -> tuple[float, float]:
    s = sum(xyz)
    return xyz[0] / s, xyz[1] / s


def linear_srgb_normalized(xyz: tuple[float, float, float]) -> tuple[float, float, float]:
    x, y, z = (c / xyz[1] for c in xyz)  # Y = 1 relative luminance
    rgb = [max(0.0, m[0] * x + m[1] * y + m[2] * z) for m in XYZ_TO_SRGB]
    peak = max(rgb)
    return tuple(c / peak for c in rgb)  # type: ignore[return-value]


def helland_fit_rgb(temp_k: float) -> tuple[float, float, float]:
    """Tanner Helland 2012 empirical fit (gamma-encoded 0..255, /255 here) —
    the demoted cross-check anchor (spec-ref.md § 2 anchor 15)."""
    t = temp_k / 100.0
    r = 255.0 if t <= 66.0 else 329.698727446 * (t - 60.0) ** (-0.1332047592)
    if t <= 66.0:
        g = 99.4708025861 * math.log(t) - 161.1195681661
    else:
        g = 288.1221695283 * (t - 60.0) ** -0.0755148492
    if t >= 66.0:
        b = 255.0
    elif t <= 19.0:
        b = 0.0
    else:
        b = 138.5177312231 * math.log(t - 10.0) - 305.0447927307
    clamp = lambda v: min(255.0, max(0.0, v)) / 255.0  # noqa: E731
    return clamp(r), clamp(g), clamp(b)


def gamma_encode(c: float) -> float:
    """IEC 61966-2-1 forward transfer function."""
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1.0 / 2.4) - 0.055


def stops() -> list[int]:
    return list(range(T_MIN, T_MAX + 1, T_STEP))


def compute_canonical() -> list[dict[str, object]]:
    cmf = load_cmf()
    rows = []
    for t in stops():
        xyz = planck_xyz(float(t), cmf)
        cx, cy = chromaticity(xyz)
        rgb = linear_srgb_normalized(xyz)
        rows.append({"temperature_K": t, "x": cx, "y": cy, "rgb_linear": [rgb[0], rgb[1], rgb[2]]})
    return rows


def cross_checks(rows: list[dict[str, object]]) -> dict[str, float]:
    cmf = load_cmf()
    # Illuminant A chromaticity.
    ax, ay = chromaticity(planck_xyz(ILLUMINANT_A_T, cmf))
    da = max(abs(ax - ILLUMINANT_A_XY[0]), abs(ay - ILLUMINANT_A_XY[1]))
    assert da <= 2e-3, f"Illuminant A chromaticity off by {da:.2e}: ({ax}, {ay})"
    # Locus monotonicity: x strictly decreasing with T.
    xs = [float(r["x"]) for r in rows]
    assert all(a > b for a, b in itertools.pairwise(xs)), "x not monotonic in T"
    # Endpoint physics.
    first = rows[0]["rgb_linear"]
    last = rows[-1]["rgb_linear"]
    assert first[0] == 1.0 and first[2] <= 1e-3, f"800 K not red-dominant: {first}"
    assert last[2] == 1.0 and last[0] < 1.0, f"12000 K not blue-dominant: {last}"
    # Helland envelope (informational; gamma space, warm-to-white range where
    # the fit is designed).
    worst_helland = 0.0
    for r in rows:
        t = float(r["temperature_K"])
        if not 1500.0 <= t <= 12000.0:
            continue
        ours = [gamma_encode(c) for c in r["rgb_linear"]]
        peak = max(ours)
        ours = [c / peak for c in ours]
        fit = helland_fit_rgb(t)
        peak_fit = max(fit)
        fit = [c / peak_fit for c in fit]
        worst_helland = max(worst_helland, max(abs(a - b) for a, b in zip(ours, fit, strict=True)))
    assert worst_helland <= 0.2, f"Helland cross-check envelope blown: {worst_helland:.3f}"
    return {"illuminant_a_max_abs_xy_err": da, "helland_worst_gamma_dev": worst_helland}


def build_table() -> dict[str, object]:
    rows = compute_canonical()
    checks = cross_checks(rows)
    return {
        "schema_version": "1.0.0",
        "algorithm": "blackbody-planck-locus-lut",
        "category": "volumetric-grid",
        "derivation": {
            "doc": "tools/testkit/golden/derivations/blackbody-planck-locus.md",
            "upstream": "CVRL-CIE-1931-2deg-5nm-ciexyz31-csv",
            # sha256 of the committed LF-normalized csv (upstream CVRL file is
            # CRLF; bytes otherwise identical — fetched 2026-07-08).
            "upstream_sha": "853b6adbd58635db79e94887a3576b8637942718891f68a7bd8296dd8ad1c641",
            "upstream_path": "http://cvrl.ioo.ucl.ac.uk/database/data/cmfs/ciexyz31.csv",
        },
        "constants": {
            "c2_m_K": C2,
            "si_2019_exact": {"h": H_PLANCK, "c": C_LIGHT, "k_B": K_BOLTZMANN},
        },
        "cross_checks": checks,
        "tolerance": {"absolute": 1e-12, "relative": 1e-12},
        "stops": {"t_min_K": T_MIN, "t_max_K": T_MAX, "t_step_K": T_STEP},
        "test_points": [
            {
                "inputs": {"temperature_K": r["temperature_K"]},
                "expected": {
                    "x": r["x"],
                    "y": r["y"],
                    "rgb_linear": r["rgb_linear"],
                },
                "independent_reference": {
                    "derived_by": "primary-standards",
                    "source": (
                        "Planck's law with exact 2019 SI c2; CIE 1931 2-degree CMFs "
                        "(CVRL committed csv, sha pinned above); IEC 61966-2-1 sRGB "
                        "matrix. Cross-checks: Illuminant A chromaticity (0.44758, "
                        "0.40745) within 2e-3; Helland 2012 fit envelope recorded."
                    ),
                    "doi": "n/a-standards-chain",
                },
            }
            for r in rows
        ],
    }


def write_web_lut(rows: list[dict[str, object]]) -> None:
    WEB_LUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lut = {
        "source_golden": "tools/testkit/golden/tables/volumetric-grid/blackbody-planck-locus.json",
        "t_min_K": T_MIN,
        "t_max_K": T_MAX,
        "t_step_K": T_STEP,
        "rgb_linear": [r["rgb_linear"] for r in rows],
    }
    WEB_LUT_PATH.write_text(json.dumps(lut, indent=2) + "\n")


def verify(table_path: Path = TABLE_PATH) -> int:
    if not table_path.exists():
        print(f"FAIL: table not found at {table_path}", file=sys.stderr)
        return 1
    with table_path.open() as fh:
        table = json.load(fh)
    rows = compute_canonical()
    checks_failed: list[str] = []
    cross_checks(rows)
    rel = float(table["tolerance"]["relative"])
    absol = float(table["tolerance"]["absolute"])
    for tp, r in zip(table["test_points"], rows, strict=True):
        for key in ("x", "y"):
            want = float(tp["expected"][key])
            if abs(float(r[key]) - want) > absol + rel * abs(want):
                checks_failed.append(f"{key} drift at {r['temperature_K']} K")
        for i in range(3):
            want = float(tp["expected"]["rgb_linear"][i])
            if abs(float(r["rgb_linear"][i]) - want) > absol + rel * abs(want):
                checks_failed.append(f"rgb[{i}] drift at {r['temperature_K']} K")
    # Web LUT byte-level stop agreement.
    if WEB_LUT_PATH.exists():
        lut = json.loads(WEB_LUT_PATH.read_text())
        if lut["rgb_linear"] != [tp["expected"]["rgb_linear"] for tp in table["test_points"]]:
            checks_failed.append("web LUT rgb stops do not match the golden table")
    else:
        checks_failed.append(f"web LUT missing at {WEB_LUT_PATH}")
    if checks_failed:
        for f in checks_failed:
            print(f"FAIL: {f}", file=sys.stderr)
        return 1
    print(f"OK — {table_path} Planck-locus LUT pinned (standards chain + web LUT match).")
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
        table = build_table()
        TABLE_PATH.write_text(json.dumps(table, indent=2) + "\n")
        write_web_lut(compute_canonical())
        print(f"wrote {TABLE_PATH}")
        print(f"wrote {WEB_LUT_PATH}")
        return 0
    return verify()


if __name__ == "__main__":
    raise SystemExit(main())
