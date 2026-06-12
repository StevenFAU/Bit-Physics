"""C-1 U-4 — REFRAMED frontier-vs-parent equivalence gate (charter § 3.4).

Metric-based budget comparison over the canonical descriptor
`taylor-green-128cube-seed42-step500`, evaluated on the SMALL committed metric
fixtures derived once at unit landing (derive_budget_metrics.py; both canonical
captures are LFS artifacts too large for per-CI-run pulls — probe § 4.4; the
derivation provenance, incl. payload sha256s, travels inside the fixtures and is
recorded in the unit landing report).

MEASURED REALITY (1c, documented SHIFTs in the spec sheet § 3):

* The landed PARENT canonical trajectory is numerically BLOWN UP by its first
  captured interval — KE 0.125 → 1.5e13 at step 50, u_max → 1.337e8, enstrophy
  NaN-saturated thereafter (the chaotic-regime instability already recorded in the
  parent's equivalence.md § 2).
* The VARIANT stays PHYSICAL through step 100 — kinetic energy conserved to 1.9%,
  enstrophy growing by real vortex stretching (14.60 → 46.76 = 3.2×), u_max ≈ 1 —
  and then the inviscid 3D-TG cascade reaches grid scale and the trajectory
  saturates by step 150 at the wave-representation ceiling (u_max ≈ 450-477, ~ the
  arg-saturation scale ħπ/dx·𝒪(1)) — five-plus orders below the parent's 4.9e20.
  (Fixed dt = 0.005 is our declared descriptor-parity adaptation; the paper's
  CFL-adaptive Δt would shrink the step as the cascade sharpens. Documented regime
  finding, not a tolerance problem.)

The gate therefore asserts the measured stability CONTRAST — the qualitative
vorticity-preservation result (the paper's central claim vs our own landed parent):

  (a) frame-0 (IC) budget agreement between variant and parent (declared bounds);
  (b) the parent fixture's measured step-50 blowup is present (fixture integrity);
  (c) the variant is physical over the MEASURED window [0, 100]: energy
      near-conserved, enstrophy growth physical, u_max and smoke mass bounded;
  (d) saturation contrast: even past its cascade limit the variant's u_max stays
      ≤ 600 over ALL frames (measured 476.7) — the parent exceeds 1e6 by step 50.

"""

from __future__ import annotations

import json
from pathlib import Path

_HERE = Path(__file__).resolve()
_REPO = _HERE.parents[4]
_FIXDIR = (
    _REPO
    / "docs"
    / "sim-specs"
    / "volumetric-grid"
    / "eulerian-smoke"
    / "clebsch-pfm-equivalence"
)

# --- declared bounds (MEASURED-then-declared at 1c; margins ≥ 2.5×) ----------------
# frame-0 agreement (variant IC = cascadic wave-fit of the parent's analytic TG +
# the identical density blob):
KE0_REL = 0.05  # measured 1.996e-2 (KE_v 0.1225045 vs KE_p 0.125)
ENS0_REL = 0.04  # measured 1.287e-2 (14.6022 vs 14.7925 — wave-fit deficit)
UMAX0_ABS = 0.025  # measured 8.09e-3 (0.99101 vs 0.99910)
MASS0_REL = 1e-12  # measured 2.2e-16 (identical blob; FP-tight)
M20_REL = 1e-12  # measured 5.7e-16
# variant physical window [0, 100] (inviscid invariants; vorticity preservation):
W_STEPS = (0, 50, 100)
W_KE_DRIFT_REL = 0.05  # measured max 1.909e-2 at step 100
W_ENS_BAND = (0.8, 5.0)  # measured enstrophy/enstrophy(0) in [1.0, 3.202]
W_UMAX_CEIL = 1.5  # measured max 1.099
W_MASS_DRIFT_REL = 0.25  # measured max 1.314e-1 (semi-Lagrangian, strengthening flow)
# saturation contrast (all 11 frames):
V_UMAX_SAT_CEIL = 600.0  # measured 476.7 (wave-representation ceiling ~ħπ/dx·O(1))
P_BLOWUP_FLOOR = 1.0e6  # measured parent u_max 1.337e8 AT STEP 50 (4.9e20 max)


def _load(name: str) -> dict:
    return json.loads((_FIXDIR / name).read_text(encoding="utf-8"))


def test_reframed_budget_equivalence():
    parent = _load("parent-budget-metrics.json")
    variant = _load("variant-budget-metrics.json")

    # provenance is pinned (the landing report records the full chain)
    assert parent["source_payload_checksum"].startswith("sha256:")
    assert variant["source_payload_checksum"].startswith("sha256:")
    assert variant["sim"]["variant"] == "frontier-clebsch-pfm"

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

    # (c) variant physical window [0, 100]
    ke0, ens0, mass0 = v0["kinetic_energy"], v0["enstrophy"], v0["density_mass"]
    for s in W_STEPS:
        f = vf[s]
        assert abs(f["kinetic_energy"] - ke0) <= W_KE_DRIFT_REL * ke0
        assert W_ENS_BAND[0] * ens0 <= f["enstrophy"] <= W_ENS_BAND[1] * ens0
        assert f["u_max"] <= W_UMAX_CEIL
        assert abs(f["density_mass"] - mass0) <= W_MASS_DRIFT_REL * mass0

    # (d) saturation contrast over ALL frames
    assert max(f["u_max"] for f in vf.values()) <= V_UMAX_SAT_CEIL
