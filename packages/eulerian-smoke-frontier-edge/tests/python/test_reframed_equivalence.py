"""C-1 U-6 — REFRAMED frontier-vs-parent equivalence gate (charter § 3.6).

Metric-based budget comparison over the canonical descriptor
`taylor-green-128cube-seed42-step500`, evaluated on the SMALL committed metric
fixtures derived once at unit landing (derive_budget_metrics.py; the canonical
captures are LFS artifacts too large for per-CI-run pulls — probe § 4.4; the
derivation provenance, incl. the payload sha256, travels inside the fixtures and is
recorded in the unit landing report).

SINGLE-SOURCE PARENT (probe § 4.5, carried from U-5): the parent side cross-references
the U-4 committed fixture `clebsch-pfm-equivalence/parent-budget-metrics.json` DIRECTLY —
derive_budget_metrics.py computes byte-identical metric definitions for every flow-map
unit, so the same frozen parent fixture is the comparison baseline (no second parent
capture is run).

MEASURED REALITY (1c, documented in the spec sheet § 3.5):

* The landed PARENT canonical trajectory (clebsch-pfm) is numerically BLOWN UP by its
  first captured interval — KE 0.125 → 1.5e13 at step 50, u_max → 1.337e8, diverging
  to 4.87e20 thereafter (the chaotic-regime instability recorded in the parent's
  equivalence.md § 2 and the U-4 1c finding).
* The VARIANT (EDGE) stays PHYSICAL over the captured 500-step window — the grid
  backward flow map + per-L reinit + Cauchy transport hold the trajectory in the
  well-conditioned regime (the measured numbers are pinned in the spec sheet § 3.5 and
  filled into the declared bounds below from the canonical capture).

DECLARED SHIFT (spec § 1 / § 5): fixed dt = 0.00125 — the MEASURED CFL-safe fixed step
at 128³ (CFL ceiling 1/(n·dt) = 6.25, Courant C ≈ 0.15 over the run). The descriptor's
nominal dt = 0.005 is NOT inherited (MEASURED at build to cross EDGE's CFL ceiling
1/(n·dt) = 1.56 — the inviscid-TG cascade pushes u_max 0.93 → 2.07 (step 150) → 2541
(step 250) and the run blows up; the U-5 lesson, re-measured for EDGE). 500 steps at
dt = 0.00125 = physical t = 0.625, the pre-cascade window (u_max bounded ≤ 0.9989).
Step count (500) and grid (128³) match the locked descriptor verbatim; the fixed-dt
VALUE is the documented descriptor-parity adaptation (§ 1).

The gate asserts the measured stability CONTRAST — the qualitative vorticity-preservation
result (the paper's central claim vs our own landed parent):

  (a) frame-0 (IC) budget agreement between variant and parent (declared bounds — the
      EDGE closed-form vorticity lift is the SAME direct lift as the U-5 sibling);
  (b) the parent fixture's measured step-50 blowup is present (fixture integrity);
  (c) the variant is physical over the FULL window [0, 500]: energy near-conserved,
      enstrophy in a physical band, u_max and smoke mass bounded;
  (d) stability contrast: the variant's u_max stays bounded over ALL frames — the parent
      exceeds 1e6 by step 50 (measured 1.337e8), a multi-order contrast.
"""

from __future__ import annotations

import json
from pathlib import Path

_HERE = Path(__file__).resolve()
_REPO = _HERE.parents[4]
_EQDIR = _REPO / "docs" / "sim-specs" / "volumetric-grid" / "eulerian-smoke"
_VARIANT_FIX = _EQDIR / "edge-equivalence" / "variant-budget-metrics.json"
# single-source parent (probe § 4.5): the U-4 frozen fixture
_PARENT_FIX = _EQDIR / "clebsch-pfm-equivalence" / "parent-budget-metrics.json"

# --- declared bounds (MEASURED-then-declared at 1c; margins >= 2.5x) -----------------
# frame-0 agreement (variant IC = closed-form vorticity lift of the parent's analytic
# 3-D TG + the identical density blob — the SAME direct lift as the U-5 sibling, so the
# frame-0 numbers match U-5 to the last digit):
KE0_REL = 1.2e-3  # measured 4.0157e-4 (KE_v 0.124950 vs KE_p 0.125000) — 2.99x
ENS0_REL = 1.2e-3  # measured 4.0157e-4 (14.78658 vs 14.79252) — 2.99x
UMAX0_ABS = 6.0e-4  # measured 2.0062e-4 (0.998896 vs 0.999097) — 2.99x
MASS0_REL = 1e-12  # measured 2.2029e-16 (identical blob; FP-tight)
M20_REL = 1e-12  # measured 5.7368e-16
# variant physical over the FULL window [0, 500] (inviscid invariants; vorticity
# preservation) — every captured frame:
W_KE_DRIFT_REL = 9.0e-2  # measured max 3.5451e-2 (KE 0.124950 -> 0.129379, the
#                          enstrophy-x4.42 vortex stretching feeds KE on the grid) — 2.54x
W_ENS_BAND = (0.8, 12.0)  # measured enstrophy/enstrophy(0) in [1.000, 4.415] (growth by
#                           real vortex stretching; upper 2.72x the measured max)
W_UMAX_CEIL = 2.5  # measured max 0.998896 — 2.50x
W_MASS_DRIFT_REL = 0.45  # measured max 1.7401e-1 (semi-Lagrangian, strengthening flow)
#                          — 2.59x
# stability contrast (ALL 11 frames): no saturation regime — variant u_max bounded ~1
# throughout, the whole captured window is pre-cascade at dt=0.00125.
V_UMAX_SAT_CEIL = 2.5  # measured max 0.998896
P_BLOWUP_FLOOR = 1.0e6  # measured parent u_max 1.3366e8 AT STEP 50 (4.87e20 max)


def _load(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def test_reframed_budget_equivalence():
    parent = _load(_PARENT_FIX)
    variant = _load(_VARIANT_FIX)

    # provenance is pinned (the landing report records the full chain)
    assert parent["source_payload_checksum"].startswith("sha256:")
    assert variant["source_payload_checksum"].startswith("sha256:")
    assert variant["sim"]["variant"] == "frontier-edge"

    pf = {f["step"]: f for f in parent["frames"]}
    vf = {f["step"]: f for f in variant["frames"]}
    assert sorted(pf) == sorted(vf) == list(range(0, 501, 50))

    # (a) frame-0 budget agreement
    p0, v0 = pf[0], vf[0]
    assert (
        abs(v0["kinetic_energy"] - p0["kinetic_energy"])
        <= KE0_REL * p0["kinetic_energy"]
    )
    assert abs(v0["enstrophy"] - p0["enstrophy"]) <= ENS0_REL * p0["enstrophy"]
    assert abs(v0["u_max"] - p0["u_max"]) <= UMAX0_ABS
    assert (
        abs(v0["density_mass"] - p0["density_mass"]) <= MASS0_REL * p0["density_mass"]
    )
    assert (
        abs(v0["density_second_moment"] - p0["density_second_moment"])
        <= M20_REL * p0["density_second_moment"]
    )

    # (b) parent fixture integrity: the measured step-50 blowup is present
    assert pf[50]["u_max"] >= P_BLOWUP_FLOOR

    # (c) variant physical over the FULL window [0, 500] — every captured frame
    ke0, ens0, mass0 = v0["kinetic_energy"], v0["enstrophy"], v0["density_mass"]
    for s in sorted(vf):
        f = vf[s]
        assert abs(f["kinetic_energy"] - ke0) <= W_KE_DRIFT_REL * ke0
        assert W_ENS_BAND[0] * ens0 <= f["enstrophy"] <= W_ENS_BAND[1] * ens0
        assert f["u_max"] <= W_UMAX_CEIL
        assert abs(f["density_mass"] - mass0) <= W_MASS_DRIFT_REL * mass0

    # (d) stability contrast over ALL frames
    assert max(f["u_max"] for f in vf.values()) <= V_UMAX_SAT_CEIL
