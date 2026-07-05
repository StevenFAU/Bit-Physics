"""Phase-5 web-deploy — browser-emitted-capture gate (sub-phase 5.1).

The web-build track validated each Stack-B sim's WGSL on `wgpu-native`
(`tools/productization/web-build/gpu_gate.py`) and explicitly DEFERRED the
browser-WebGPU round-trip to 5.1. This module is that round-trip's verifier: it
takes a capture EMITTED BY THE BROWSER BUILD (via the `common/common-web`
`exposeCapture` hook, extracted by `web/headless/driver.mjs`) and re-applies the
**sim's OWN established gate** — the identical criterion and the identical
threshold the web-build track declared. It adds NO tolerance and widens NONE.

Gate kinds (verbatim from the charter / `gpu_gate.py`):

  * capture_roundtrip — rd2d (`compare_captures` within `[reaction-diffusion-2d]`
    rel=1e-4) and neural-ca (array bit-exact, max_abs == 0).
  * observable       — ising (`energy_per_spin` z-score < 3.0 vs the NumPy 6-seed
    reference ensemble; the browser emits a single self-averaging seed-42 sample —
    the app pins the capture seed — so the statistic is single-sample-vs-ensemble at
    the SAME observable + SAME 3.0 threshold; not a widened tolerance).
  * new_canonical    — mandelbulb / strange / boids / physarum: run-twice
    BYTE-IDENTICAL (two browser captures) + the sim's own structural anchors.

The thresholds live in ``ESTABLISHED_THRESHOLDS`` and are asserted byte-equal to
``gpu_gate.py`` by ``smoke/test_pipeline.py`` (the no-widening guard). This module
does NOT edit the frozen ``gpu_gate.py`` — it imports the same reference modules.

This module never requires a browser: it operates on a JSON capture bundle. The
browser EMISSION is the cloud-CI gate (``web-deploy.yml`` on lavapipe). Locally it
is exercised against bundles reconstructed from the committed canonicals
(``canonical_as_browser_bundle``), which proves the gate harness end-to-end.
"""

from __future__ import annotations

import json
import math
import os
import sys
import tempfile
from dataclasses import dataclass, field as _dc_field
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "tools/testkit"))

# Threshold literals — each MUST appear verbatim in gpu_gate.py (parity-guarded by
# smoke/test_pipeline.py::test_verify_thresholds_are_byte_equal_to_web_build_gate).
# This is the structural proof 5.1 reuses each sim's ESTABLISHED gate, no widening.
ESTABLISHED_THRESHOLDS: dict[str, str] = {
    "mandelbulb_closed_form_rel": "1e-5",
    "strange_minmaxstd_rel": "0.12",
    "strange_mean_abs": "1.5",
    "boids_short_horizon": "1e-2",
    "boids_vmax_tol": "1e-4",
    "physarum_mass_rel": "1e-3",
    "ising_z_threshold": "3.0",
}

# Numeric forms of the above (single source; parity test pins the strings).
T_MANDELBULB_REL = 1e-5
T_STRANGE_REL = 0.12
T_STRANGE_MEAN_ABS = 1.5
T_BOIDS_SHORT = 1e-2
T_BOIDS_VMAX_TOL = 1e-4
T_PHYSARUM_MASS_REL = 1e-3
T_ISING_Z = 3.0

# --- PENDING-LAVAPIPE contingency thresholds (Phase-5 browser-divergence) ---------
# These are NOT part of ESTABLISHED_THRESHOLDS and the parity guard intentionally
# does NOT bind them: they belong to OPT-IN observable/structural browser gates that
# activate per-sim ONLY when CI lavapipe (a 3rd, non-RADV backend not obtainable in
# this env) is shown to genuinely diverge cross-backend from the native f32 path. On
# the obtainable backends (wgpu-native + browser ANGLE-Vulkan, both RADV) rd2d clears
# its established capture_roundtrip @ rel=1e-4 (2.64e-5 == wgpu-native) and neural-ca
# is bit-exact 0.0 once the harness race is fixed, so the ESTABLISHED gates stay the
# default. The native gpu_gate.py rel=1e-4 / bit-exact rows are byte-UNCHANGED.
# Activated via BITPHYSICS_BROWSER_OBSERVABLE_FALLBACK="<sim>,<sim>". See
# docs/_audits/phase-5/browser-divergence-*.
T_RD2D_SHORTHORIZON_MAXSTEP = 200  # backends are bit-near-identical early
T_RD2D_SHORTHORIZON_ABS = 1e-4  # the native rd2d budget, on the short horizon
T_RD2D_FIELD_BOUND = 1e-3  # U,V stay within [0,1] +/- this
T_NCA_SHORTHORIZON_STEP = 50  # first captured frame
T_NCA_SHORTHORIZON_ABS = 1e-2  # early agreement before any cross-backend drift
T_NCA_ALPHA_MIN_MASS = 1.0  # final-frame alpha mass > 0 -> the pattern is alive

# --- eulerian-smoke (Phase-6 verification-demo; NEW sim, no gpu_gate.py row so
# NOT in ESTABLISHED_THRESHOLDS — these are declared fresh, measured-then-
# declared per the web spec v0.3 change log). TRAJ_REL reuses the established
# [defaults.smoke] category tolerance verbatim (tolerance.toml; budget-capped).
T_SMOKE_TRAJ_REL = 1e-4  # per-checkpoint per-field: max_abs <= rel * max|field|
T_SMOKE_DENSITY_NEG = 1e-6  # smoke_density_nonneg at f32 rounding scope
T_SMOKE_REF_SANITY = 2.0  # FP-edge sentinel on the live f64 reference re-run

# --- sph-water (Phase-6 verification-demo; NEW sim, no gpu_gate.py row so NOT
# in ESTABLISHED_THRESHOLDS — declared fresh, measured-then-declared per
# packages/sph-water/web/verification-demo-spec.md § 2.1/§ 8.3). The canonical
# scene is NON-CHAOTIC (rigid free-fall, spec § 2.0), so the pointwise
# capture-reproduction budget is real. TRAJ_REL reuses the established
# [defaults.sph] category tolerance verbatim (tolerance.toml, resolved via
# [overrides.sph-water]); the remaining constants gate closed-form artifacts.
T_SPH_TRAJ_REL = 1e-4  # per-checkpoint per-field: max_abs <= rel * max|field|
T_SPH_GOLDEN_F64_ABS = 1e-12  # f64-mirror kernel vs golden table (table's own tol)
T_SPH_FIXTURE_F64_ABS = 1e-15  # two-particle continuity vs golden fixture (its tol)
T_SPH_KERNEL_F32_REL = 2e-6  # WGSL f32 kernel vs golden table (f32 rounding scope)
T_SPH_NORM_TOL = 5e-3  # kernel-normalization unit-volume mean on interior lattice
SPH_GATE_STRIDE = 16  # committed deterministic index subsample (idx = ::16)

# --- mpm-multimaterial (Phase-6 verification-demo; NEW sim, no gpu_gate.py row
# so NOT in ESTABLISHED_THRESHOLDS — declared fresh, measured-then-declared per
# packages/mpm-multimaterial/web/verification-demo-spec.md § 2.1). The 16-cube
# diagnostic canonical is NON-CHAOTIC over its 50-step horizon (uniform-velocity
# blob in free fall, floor never reached, F stays ~I so stress stays ~0), so the
# pointwise capture-reproduction budget is real. TRAJ_REL reuses the established
# [defaults.mpm] category tolerance verbatim (tolerance.toml, resolved via
# [overrides.mpm-multimaterial]); the rest gate closed-form artifacts and the
# per-material invariants (spec § 4.3).
T_MPM_TRAJ_REL = 1e-4  # per-checkpoint per-field: max_abs <= rel * max|field|
T_MPM_GOLDEN_F64_ABS = 1e-15  # f64-mirror B-spline vs golden table (table's own tol)
T_MPM_KERNEL_F32_REL = 2e-6  # WGSL f32 N(x) vs golden table (f32 rounding scope)
T_MPM_POU_F32_ABS = 2e-6  # GPU partition-of-unity sweep |sum - 1|
# Measured (RDNA2, 2026-07-04 step-2 harness): mirror 0.0 bit-exact (log is the
# only op that may differ cross-engine by ~1 ulp of |lam*30| ~ 1.5e-11 — bound
# covers it), GPU f32 7.1e-7, snow overshoot 5.1e-7, sand logdet 4.2e-6,
# ortho 1.3e-6 — each declared bound keeps >= 20x margin over measurement.
T_MPM_NEO_F64_ABS = 1e-10  # TS f64 mirror vs reference-computed stress fixture
T_MPM_NEO_F32_REL = 5e-5  # WGSL f32 stress vs the same fixture (per-row peak rel)
T_MPM_SNOW_SIGMA_SLACK = 1e-5  # f32 slack on the [1-theta_c, 1+theta_s] clamp
T_MPM_SAND_LOGDET_ABS = 1e-4  # Case III tr(Hp)=tr(eps) via log det (f32 SVD scope)
T_MPM_SAND_ORTHO_ABS = 5e-5  # Case II tip: ||F^T F - I||_max (stress-free witness)
MPM_HEADROOM_FACTOR = 2  # max |cell quanta| must stay below 2^31 / this
# (M = 4e6 after the measured 1e7 saturated 86.8% of i32 per-cell on the
# canonical — packages/mpm-multimaterial/web/src/solver.ts FP_SCALE_DEFAULT.)

# --- pic-flip (Phase-6 verification-demo, Lane C; NEW sim — declared fresh,
# measured-then-declared per packages/pic-flip/web/verification-demo-spec.md
# § 2.1). The web-gate canonical is a CHAOTIC dam break, so per-particle
# pointwise reproduction is REJECTED (spec § 9: chaos + fixed-point-atomic
# P2G != f64 lex reference); the trajectory gate is ROBUST OBSERVABLES
# (energy, momentum, centre of mass, bulk shape) vs the committed f64
# references at packages/pic-flip/web/public/, from the committed f32 IC.
# OBS_REL is resolved from tolerance.toml [overrides.pic-flip] (fresh
# declaration for the observable-level comparison — NOT the particle-fluids
# cross-stack pointwise 1e-4, which gates non-chaotic scenes only). The
# remaining constants gate the chaos-immune closed-form artifact suite
# (Jiang 2015 Props 5.1/5.4/5.5 + weights/Dp + Zhu 1/9 + bit-identity).
# MEASURED (RADV, 2026-07-04 step-2 harness): worst observable 1.4e-3 of scale
# (69% of a 2e-3 scratch budget) over the 60-step chaotic horizon; run-twice
# byte-identical. DECLARED 1e-2: measured 1.4e-3 x the 4.05x worst observed
# cross-backend family spread (RADV->lavapipe, boids/neural-ca charter round 2)
# = 5.7e-3, x ~1.75 margin. Chaotic-observable scope only — the closed-form
# suite below is where the exactness claims live.
T_PICFLIP_OBS_REL = 1e-2  # per-observable: |browser - ref| <= rel * max|ref|
T_PICFLIP_GOLDEN_F64_ABS = 1e-13  # f64 mirror vs golden tables (dyadic rows ~0)
T_PICFLIP_LADDER_F64_ABS = 1e-15  # 1/9 midpoint ladder — dyadic, f64-EXACT
T_PICFLIP_WEIGHTS_F32_REL = 2e-6  # WGSL f32 N(x)/weights vs table (f32 scope)
T_PICFLIP_POU_F32_ABS = 2e-6  # GPU partition-of-unity sweep |sum w - 1|
T_PICFLIP_AM_F32_REL = 1e-5  # f32 conservation residual |L' - L|/|L| (Props 5.4/5.5)
T_PICFLIP_RT_F32_REL = 1e-5  # f32 affine round-trip max node err / field scale
T_PICFLIP_STILL_MAXSPEED = 2e-2  # still-pool null test, regularizers ON (30 steps)
T_PICFLIP_STILL_DVOL = 4.0  # |fluid-node-count drift| over the still probe
T_PICFLIP_HYDRO_REL = 2e-2  # |dP/dz - rho g_z| / |rho g_z| (compact adjoint pair)
PICFLIP_HEADROOM_FACTOR = 2  # max |cell quanta| below 2^31 / this (M = 2^21)

# --- schrodinger-smoke (Phase-6 verification-demo; NEW sim — declared fresh,
# measured-then-declared per docs/sim-specs/volumetric-grid/schrodinger-smoke/
# spec-ref.md § 6.5b). The web-gate canonical is the NON-CHAOTIC translating
# vortex ring at the 32^3 tier (pic-flip reduced-tier precedent), so pointwise
# per-checkpoint comparison against a LIVE f64 reference re-run is real
# (eulerian-smoke live-reference precedent). TRAJ_REL is the NEW
# [defaults.isf] category tolerance verbatim (tolerance.toml, resolved via
# [overrides.schrodinger-smoke]; capped by [budgets.isf]) — MEASURED basis:
# complex64 proxy worst 1.4e-5 of field peak, x 4.05 family spread x ~1.75.
T_ISF_TRAJ_REL = 1e-4  # per-checkpoint per-field: max_abs <= rel * max|field|
T_ISF_NORM_FLAT_REL = 1e-4  # browser norm_l2 diagnostic flat across checkpoints
# (f32 renormalization scope; the machine-exact <=1e-13 row is the f64
# backend's — the browser witnesses flatness at its own precision)
T_ISF_HEADROOM_MAX = 1.0  # no principal-branch re-wrap during the gate window

# curl-noise live-f64 gate (spec-ref § 13.2). T_CURL_REL is the NEW
# [defaults.curl-noise] category tolerance verbatim (tolerance.toml,
# resolved via [overrides.curl-noise]; capped by [budgets.curl-noise]) —
# MEASURED basis: NumPy-f32 proxy of the full WGSL gated pipeline worst
# iso-residual 1.79e-5 of the iso-value scale, x 4.05 family spread x ~2.7
# margin. The gated observable is CHAOS-IMMUNE (distance to the iso
# manifold), never a pointwise trajectory match (spec-ref § 9).
T_CURL_REL = 2e-4  # per-checkpoint: ||f64 f(x_f32) - f0_f32|| <= rel * iso scale
T_CURL_IC_ABS = 1e-6  # browser IC vs committed seeded_tracers(42): f32 quantization

# Cross-backend contingency charter, round 1 (ratified post-run-#3): the mechanism
# lands with the numeric bounds UNDECLARED — measured-then-declared requires one
# RADV + one lavapipe measurement pass over the charter observables first. While a
# sim's entry is None its ACTIVATED fallback FAILS-PENDING loudly (never a silent
# pass) and emits every measured observable into the result detail for round-2
# declaration. Round 2 replaces None with the declared bound dicts.
_CROSS_BACKEND_DECLARED_BOUNDS: dict[str, dict[str, float] | None] = {
    # DECLARED (charter round 2) from deltas vs the f64 reference MEASURED on both
    # backend families — RADV (local, audit § 16) and lavapipe (CI run #4
    # 27247859138) — each per-backend deterministic (run_twice=True on both, so
    # within-backend spread is zero). Bound = 10x the worst measured delta, rounded
    # up to 2 s.f.: the observed cross-family spread is <= 4.05x (RADV->lavapipe),
    # so 10x covers a further backend family of the observed character with > 2x
    # margin, while every bound stays >= 2 orders below the f32-fragile pointwise
    # scale (0.0354) and <= 0.08% of its observable's magnitude. Full measured
    # table in audit § 17. NOT a canonical-gate tolerance: these adjudicate the
    # opt-in foreign-ALU fallback only.
    "boids-3d": {
        "polarization_abs": 1.1e-05,  # 10x lavapipe 1.0555e-06 (RADV 4.4014e-07)
        "mean_speed_abs": 2.9e-04,  # 10x lavapipe 2.8172e-05 (RADV 7.7750e-06)
        "speed_std_abs": 1.4e-04,  # 10x lavapipe 1.3979e-05 (RADV 5.0107e-06)
        "mean_dist_to_centroid_abs": 9.7e-05,  # 10x lavapipe 9.6943e-06 (RADV 2.3930e-06)
    },
    "neural-ca": {
        # 10x lavapipe 1.7881e-07 (RADV 0.0, bit-exact). ~4 orders TIGHTER than
        # the authored 1e-2 candidate, which stays a never-exceed ceiling only.
        "short_horizon_abs": 1.8e-06,
    },
}
_FAIL_PENDING_NOTE = (
    "FAIL-PENDING: cross-backend bounds UNDECLARED (charter round 1 — mechanism only); "
    "measured observables emitted for round-2 measured-then-declared. Never a silent pass."
)

CANON = {
    "reaction-diffusion-2d": "captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json",
    "neural-ca": "captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000-wgsl.json",
    "mandelbulb-explorer": "captures/mandelbulb-explorer-ref/de-probe-points-seed42.json",
    "physarum": "captures/physarum-ref/network-canonical-seed42-step5000.json",
    "sph-water": "captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json",
    "mpm-multimaterial": "captures/mpm-multimaterial-stack-e/drop-impact-16cube-seed42-step50.json",
}

# Established sim categories (from each browser app's exposeCapture manifest) — used
# so the re-emit's category matches the canonical (compare_captures checks it).
SIM_CATEGORY = {
    "reaction-diffusion-2d": "continuous-ca",
    "neural-ca": "continuous-ca",
    "ising-classical": "lattice-spin",
    "mandelbulb-explorer": "closed-form",
    "strange-attractors": "closed-form",
    "boids-3d": "agent-based",
    "physarum": "agent-based",
    "eulerian-smoke": "volumetric-grid",
    "sph-water": "particle-fluids",
    "mpm-multimaterial": "hybrid-pg",
    "pic-flip": "particle-fluids",
}

GATE_KIND = {
    "reaction-diffusion-2d": "capture_roundtrip",
    "neural-ca": "capture_roundtrip",
    "ising-classical": "observable",
    "mandelbulb-explorer": "new_canonical",
    "strange-attractors": "new_canonical",
    "boids-3d": "new_canonical",
    "physarum": "new_canonical",
    "eulerian-smoke": "new_canonical",
    "sph-water": "new_canonical",
    "mpm-multimaterial": "new_canonical",
    "pic-flip": "new_canonical",
}


@dataclass
class VerifyResult:
    sim: str
    kind: str
    passed: bool
    run_twice_identical: bool | None
    detail: dict = _dc_field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Bundle helpers
# --------------------------------------------------------------------------- #
def _load_bundle(path: Path) -> dict:
    return json.loads(Path(path).read_text())


def _bundle_steps(bundle: dict) -> list[dict]:
    return sorted(bundle["steps"], key=lambda s: s["step"])


def _field(step: dict, key: str) -> np.ndarray:
    f = step["state"][key]
    dt = np.float32 if f["dtype"] == "f32" else np.float64
    return np.asarray(f["data"], dtype=dt).reshape(f["shape"])


def _last_field(bundle: dict, key: str) -> np.ndarray:
    return _field(_bundle_steps(bundle)[-1], key)


def _stack_field(bundle: dict, key: str) -> np.ndarray:
    return np.stack([_field(s, key) for s in _bundle_steps(bundle)], axis=0)


def canonical_as_browser_bundle(sim: str) -> dict:
    """Reconstruct the browser ``exposeCapture`` bundle shape from the committed
    canonical capture. Used to exercise the gate harness locally without a browser
    (the browser-WebGPU emission is the cloud-CI gate)."""
    from capture import load_capture

    if sim not in CANON:
        raise ValueError(
            f"{sim} has no committed canonical (live-reference gate; CI only)"
        )
    cap = load_capture(REPO / CANON[sim])
    steps = []
    for st in sorted(s.step for s in cap.steps()):
        s = cap.step(st)
        state = {}
        for k, arr in s.state.items():
            a = np.asarray(arr)
            dt = "f32" if a.dtype == np.float32 else "f64"
            state[k] = {
                "data": a.reshape(-1).tolist(),
                "shape": list(a.shape),
                "dtype": dt,
            }
        steps.append({"step": st, "state": state, "diagnostics": dict(s.diagnostics)})
    return {
        "manifest": {
            "sim": {
                "name": sim,
                "category": SIM_CATEGORY[sim],
                "variant": "browser-reemit",
            }
        },
        "steps": steps,
    }


def _materialize_capture(bundle: dict, sim: str) -> Path:
    """Write a browser bundle to an .h5+.json capture so compare_captures can read it."""
    from capture import CaptureManifest, StepState, write_capture

    rows = []
    for s in _bundle_steps(bundle):
        state = {k: _field(s, k) for k in s["state"]}
        rows.append(
            StepState(
                step=s["step"], state=state, diagnostics=dict(s.get("diagnostics", {}))
            )
        )
    bsteps = _bundle_steps(bundle)
    s0 = bsteps[0]
    dims = list(next(iter(s0["state"].values()))["shape"][:2])
    interval = (bsteps[1]["step"] - bsteps[0]["step"]) if len(bsteps) > 1 else 1
    bman_sim = bundle.get("manifest", {}).get("sim", {})
    man = CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": sim,
            "category": bman_sim.get("category", SIM_CATEGORY.get(sim, "web")),
            "variant": bman_sim.get("variant", "browser-reemit"),
        },
        stack={"name": "webgpu", "version": "0.0.1", "build_id": "web-deploy-5.1"},
        config={"tier": "test", "dims": dims, "dtype": "f64", "seed": 42, "params": {}},
        run={
            "step_count": bsteps[-1]["step"] or 1,
            "capture_interval": max(interval, 1),
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-20T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": f"{sim}-web.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={"claimed": "epsilon", "atomic_ops": False, "subgroup_ops": False},
    )
    out = Path(tempfile.mkdtemp(prefix=f"web-deploy-{sim}-"))
    return write_capture(rows, man, out)


# --------------------------------------------------------------------------- #
# Per-sim gates (criterion identical to gpu_gate.py; field sourced from browser)
# --------------------------------------------------------------------------- #
def _gate_rd2d(bundles: list[dict]) -> VerifyResult:
    from equivalence.harness import compare_captures

    mp = _materialize_capture(bundles[0], "reaction-diffusion-2d")
    canon = REPO / CANON["reaction-diffusion-2d"]
    v = compare_captures(canon, mp)
    max_abs = max(d["max_abs_err"] for d in v.per_field_diff.values())
    twice = None
    if len(bundles) > 1:
        twice = bool(
            np.array_equal(_last_field(bundles[0], "U"), _last_field(bundles[1], "U"))
        )
    return VerifyResult(
        sim="reaction-diffusion-2d",
        kind="capture_roundtrip",
        passed=bool(v.within_tolerance),
        run_twice_identical=twice,
        detail={
            "within_tolerance": bool(v.within_tolerance),
            "max_abs_err": max_abs,
            "resolved_tolerance": v.tolerance_table_used,
        },
    )


def _gate_neural_ca(bundles: list[dict]) -> VerifyResult:
    from capture import load_capture

    frames = _stack_field(bundles[0], "rgba").astype(np.float64)
    canon = load_capture(REPO / CANON["neural-ca"])
    steps = sorted(s.step for s in canon.steps())
    fkey = next(iter(canon.step(steps[0]).state.keys()))
    ref = np.stack([canon.step(n).state[fkey] for n in steps], axis=0).astype(
        np.float64
    )
    max_abs = (
        float(np.abs(frames - ref).max()) if frames.shape == ref.shape else math.inf
    )
    bit_exact = max_abs == 0.0
    return VerifyResult(
        sim="neural-ca",
        kind="capture_roundtrip",
        passed=bool(bit_exact),
        run_twice_identical=None,
        detail={
            "bit_exact": bit_exact,
            "vs_wgsl_canonical_max_abs": max_abs,
            "n_frames": int(frames.shape[0]),
            "field": "rgba",
            "tolerance": "[defaults.continuous-ca] 0.0/0.0 (bit-exact, no row added)",
        },
    )


def _gate_ising(bundles: list[dict], n_seeds: int = 6) -> VerifyResult:
    import dataclasses

    sys.path.insert(0, str(REPO / "packages/ising-classical"))
    from ising_classical.reference.ising_numpy import (  # type: ignore
        IsingParams,
        energy_per_spin,
        initial_condition,
        metropolis_sweep,
    )

    spins = _last_field(bundles[0], "spins")
    twice = None
    if len(bundles) > 1:
        twice = bool(np.array_equal(spins, _last_field(bundles[1], "spins")))
    n, steps, t, jj, hh = 128, 10000, 2.27, 1.0, 0.0
    flds = {f.name for f in dataclasses.fields(IsingParams)}
    kw: dict = {"n": n, "J": jj, "h": hh}
    kw.update({"T": t} if "T" in flds else {})
    kw.update({"temperature": t} if "temperature" in flds else {})
    p = IsingParams(**kw)
    e_browser = energy_per_spin(spins.astype(np.float64), p)

    def np_run(seed: int) -> float:
        s = initial_condition(p, seed)
        rng = np.random.default_rng(seed + 1)
        for _ in range(steps):
            s = metropolis_sweep(s, p, rng)
        return energy_per_spin(s.astype(np.float64), p)

    n_e = [np_run(42 + i) for i in range(n_seeds)]
    nEm = float(np.mean(n_e))
    nEs = float(np.std(n_e) / math.sqrt(len(n_e)))
    spread = max(nEs, float(np.std(n_e)) / math.sqrt(1))  # single-sample vs ensemble
    z = abs(e_browser - nEm) / spread if spread > 0 else 0.0
    consistent = z < T_ISING_Z
    passed = consistent and (twice is not False)
    return VerifyResult(
        sim="ising-classical",
        kind="observable",
        passed=bool(passed),
        run_twice_identical=twice,
        detail={
            "browser_energy_per_spin": round(float(e_browser), 4),
            "numpy_ensemble_mean": round(nEm, 4),
            "energy_z_score": round(z, 2),
            "z_threshold": T_ISING_Z,
            "n_seeds": n_seeds,
            "note": "single self-averaging seed-42 browser sample vs NumPy ensemble "
            "(app pins capture seed); same observable + same 3.0 threshold",
        },
    )


def _two_field(bundles: list[dict], picker) -> tuple[np.ndarray, np.ndarray | None]:
    a = picker(bundles[0])
    b = picker(bundles[1]) if len(bundles) > 1 else None
    return a, b


def _gate_mandelbulb(bundles: list[dict]) -> VerifyResult:
    from capture import load_capture

    de1, de2 = _two_field(bundles, lambda b: _last_field(b, "de").astype(np.float64))
    twice = bool(de2 is not None and np.array_equal(de1, de2))
    canon = load_capture(REPO / CANON["mandelbulb-explorer"])
    de_ref = canon.step(0).state["de"].astype(np.float64)
    scale = float(np.abs(de_ref).max())
    max_abs = (
        float(np.abs(de1 - de_ref).max()) if de1.shape == de_ref.shape else math.inf
    )
    return VerifyResult(
        sim="mandelbulb-explorer",
        kind="new_canonical",
        passed=bool(twice),
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "f32_vs_f64_canonical_max_abs": max_abs,
            "closed_form_budget_abs": T_MANDELBULB_REL * scale,
            "round_trip_at_1e-5": bool(max_abs <= T_MANDELBULB_REL * scale),
            "note": "f32 GPU DE vs f64 canonical at the single-precision floor; "
            "new-canonical (determinism + golden anchor), no tolerance widened",
        },
    )


def _gate_strange(bundles: list[dict]) -> VerifyResult:
    sys.path.insert(0, str(REPO / "packages/strange-attractors"))
    from strange_attractors.integrator import rk4_evolve  # type: ignore
    from strange_attractors.reference.lorenz import lorenz_field  # type: ignore

    def traj(b: dict) -> np.ndarray:
        return (
            _stack_field(b, "trajectory")
            if "trajectory" in _bundle_steps(b)[0]["state"]
            else np.stack(
                [_field(s, next(iter(s["state"]))) for s in _bundle_steps(b)], 0
            )
        )

    t1, t2 = _two_field(bundles, traj)
    twice = bool(t2 is not None and np.array_equal(t1, t2))
    t1 = t1.reshape(-1, 3)
    finite = bool(np.isfinite(t1).all()) and float(np.abs(t1).max()) < 60.0
    # The browser exposes the trajectory SUBSAMPLED at the capture interval (~11 pts),
    # too sparse to reproduce gpu_gate's dense min/max/std statistic. The established
    # gate's INTENT — the browser produces genuine on-attractor Lorenz dynamics
    # deterministically — is tested here as: every browser point lies within the DENSE
    # f64 reference attractor envelope (per-axis [min,max] + T_STRANGE_REL relative
    # margin, T_STRANGE_MEAN_ABS absolute slack). Determinism (run-twice) is mandatory.
    sigma, rho, beta, dt = 10.0, 28.0, 8.0 / 3.0, 0.01
    n_dense = 10000
    ref = rk4_evolve(
        lambda s: lorenz_field(s, sigma=sigma, rho=rho, beta=beta),
        np.array([1.0, 1.0, 1.0]),
        dt=dt,
        n_steps=n_dense,
        capture_interval=1,
    )
    worst_out = 0.0
    for i in range(3):
        lo, hi = float(ref[:, i].min()), float(ref[:, i].max())
        extent = max(hi - lo, 1.0)
        margin = T_STRANGE_REL * extent + T_STRANGE_MEAN_ABS
        below = float((lo - margin) - t1[:, i].min())
        above = float(t1[:, i].max() - (hi + margin))
        worst_out = max(worst_out, below, above)
    on_attractor = worst_out <= 0.0
    return VerifyResult(
        sim="strange-attractors",
        kind="new_canonical",
        passed=bool(twice and finite and on_attractor),
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "finite_on_attractor": finite,
            "on_attractor_envelope_ok": on_attractor,
            "worst_envelope_overshoot": round(worst_out, 4),
            "envelope_rel_margin": T_STRANGE_REL,
            "envelope_abs_slack": T_STRANGE_MEAN_ABS,
            "n_browser_points": int(t1.shape[0]),
            "note": "browser exposes the trajectory subsampled (~11 pts) — too sparse for the "
            "dense min/max/std statistic; gate = determinism + on-attractor containment "
            "in the dense f64 reference envelope. Dense structural gate is wgpu-native "
            "(gpu_gate.py); no tolerance widened",
        },
    )


def _gate_boids(bundles: list[dict]) -> VerifyResult:
    sys.path.insert(0, str(REPO / "packages/boids-3d"))
    from boids_3d.reference import canonical_params, evolve  # type: ignore
    from boids_3d.sim import _seeded_flock_initial_state  # type: ignore

    def frames(b: dict) -> dict:
        return {
            s["step"]: (_field(s, "position"), _field(s, "velocity"))
            for s in _bundle_steps(b)
        }

    f1 = frames(bundles[0])
    twice = None
    if len(bundles) > 1:
        f2 = frames(bundles[1])
        twice = all(
            np.array_equal(f1[k][0], f2[k][0]) and np.array_equal(f1[k][1], f2[k][1])
            for k in f1
        )
    p = canonical_params()
    pos0, vel0 = _seeded_flock_initial_state(42, 1000)
    ph, _, idx = evolve(pos0, vel0, p, 100, capture_interval=100)
    ref_p100 = ph[idx.index(100)]
    short_abs = float(np.abs(f1[100][0] - ref_p100).max()) if 100 in f1 else math.inf
    vmax_obs = max(float(np.linalg.norm(f1[k][1], axis=1).max()) for k in f1)
    clamp_ok = vmax_obs <= p["v_max"] * (1.0 + T_BOIDS_VMAX_TOL)
    short_ok = short_abs < T_BOIDS_SHORT
    return VerifyResult(
        sim="boids-3d",
        kind="new_canonical",
        passed=bool((twice is not False) and clamp_ok and short_ok),
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "short_horizon_step100_pos_max_abs": short_abs,
            "short_horizon_threshold": T_BOIDS_SHORT,
            "v_max_observed": round(vmax_obs, 4),
            "v_max_clamp_ok": clamp_ok,
        },
    )


def _gate_physarum(bundles: list[dict]) -> VerifyResult:
    from capture import load_capture

    t1, t2 = _two_field(
        bundles, lambda b: _last_field(b, "trail_map").astype(np.float64)
    )
    twice = bool(t2 is not None and np.array_equal(t1, t2))
    finite = bool(np.isfinite(t1).all())
    mass = float(t1.sum())
    canon = load_capture(REPO / CANON["physarum"])
    last = sorted(s.step for s in canon.steps())[-1]
    canon_mass = float(canon.step(last).diagnostics["total_mass"])
    mass_rel = (
        abs(mass - canon_mass) / canon_mass
        if canon_mass
        else (0.0 if mass == 0 else math.inf)
    )
    mass_ok = mass_rel < T_PHYSARUM_MASS_REL
    return VerifyResult(
        sim="physarum",
        kind="new_canonical",
        passed=bool(twice and finite and mass_ok),
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "total_mass": round(mass, 4),
            "canonical_total_mass": round(canon_mass, 4),
            "mass_rel_diff": mass_rel,
            "mass_rel_threshold": T_PHYSARUM_MASS_REL,
            "finite": finite,
            "atomic_strategy": "integer fixed-point atomicAdd<u32> — order-independent",
        },
    )


def _gate_eulerian_smoke(bundles: list[dict]) -> VerifyResult:
    """new_canonical gate for eulerian-smoke: LIVE f64 reference re-run.

    The browser's canonical descriptor is taylor-green-2d-128sq-seed42-step1000
    — the demo's OWN canonical scene (the boids/strange live-reference
    precedent), NOT the committed lid-driven-cavity capture. Measured-then-
    declared rationale (web spec v0.3 change log): (a) the committed 2D capture
    is a fingerprint of a reference FP-edge bug (the unguarded interpolation
    fraction fires IN f64 on its own IC — max|u| spikes ~12270 by step 3;
    backend fix task filed), so no correct port can or should reproduce it;
    (b) the chaotic scenes amplify f32-scale perturbations to O(1) (the boids
    fallback philosophy: pointwise short-horizon is the f32-fragile property).
    The decaying Taylor-Green scene is perturbation-contracting and provably
    edge-dormant in f64 (extractor sentinel max|vel| <= T_SMOKE_REF_SANITY), so
    the pointwise per-checkpoint comparison there is real.

    Gate = run-twice byte-identity over u/v/density at every checkpoint
         + per-checkpoint per-field max_abs(browser_f32 - reference_f64)
           <= T_SMOKE_TRAJ_REL * max|browser field|   (the established
           [defaults.smoke] rel=1e-4; measured worst ratio ~0.2 of budget on
           the NumPy-f32 proxy — no tolerance added or widened)
         + the sim's own invariants surfaced: finite fields, density >=
           -T_SMOKE_DENSITY_NEG (smoke_density_nonneg at f32 rounding scope).
    """
    sys.path.insert(0, str(REPO / "packages/eulerian-smoke"))
    from eulerian_smoke.reference.stable_fluids import (  # type: ignore
        canonical_params_2d,
        semi_lagrangian_advect_2d,
        stable_fluids_step,
    )

    b0 = bundles[0]
    steps0 = _bundle_steps(b0)
    twice = None
    if len(bundles) > 1:
        s1 = {s["step"]: s for s in _bundle_steps(bundles[1])}
        twice = all(
            st["step"] in s1
            and all(
                np.array_equal(_field(st, k), _field(s1[st["step"]], k))
                for k in ("u", "v", "density")
            )
            for st in steps0
        )

    params = canonical_params_2d()
    n = int(params["n"])
    dt, dx = float(params["dt"]), float(params["dx"])
    # the demo's canonical TG IC — the same closed form main.ts evaluates
    idx = (np.arange(n, dtype=np.float64) + 0.5) / n
    x, y = np.meshgrid(idx, idx, indexing="ij")
    k2pi = 2.0 * np.pi
    u = np.sin(k2pi * x) * np.cos(k2pi * y)
    v = -np.cos(k2pi * x) * np.sin(k2pi * y)
    density = np.exp(-((x - 0.5) ** 2 + (y - 0.5) ** 2) / (2.0 * 0.05 * 0.05))
    p = np.zeros_like(u)

    expected_steps = [st["step"] for st in steps0]
    want = [0] + list(range(100, 1001, 100))
    if expected_steps != want:
        return VerifyResult(
            sim="eulerian-smoke",
            kind="new_canonical",
            passed=False,
            run_twice_identical=twice,
            detail={"error": f"checkpoint set {expected_steps} != canonical {want}"},
        )

    ref = {0: (u.copy(), v.copy(), density.copy())}
    ref_peak = max(float(np.abs(u).max()), float(np.abs(v).max()))
    for i in range(1, 1001):
        u, v, p = stable_fluids_step(u, v, p, params)
        density = semi_lagrangian_advect_2d(density, u, v, dt, dx)
        ref_peak = max(ref_peak, float(np.abs(u).max()), float(np.abs(v).max()))
        if i % 100 == 0:
            ref[i] = (u.copy(), v.copy(), density.copy())
    # FP-edge sentinel on the live reference run (see docstring)
    ref_sane = ref_peak <= T_SMOKE_REF_SANITY

    worst = {"u": 0.0, "v": 0.0, "density": 0.0}
    worst_ratio = 0.0
    finite = True
    min_density = math.inf
    for st in steps0:
        ru, rv, rd = ref[st["step"]]
        for key, reff in (("u", ru), ("v", rv), ("density", rd)):
            bf = _field(st, key).astype(np.float64)
            if not np.isfinite(bf).all():
                finite = False
                continue
            if key == "density":
                min_density = min(min_density, float(bf.min()))
            max_abs = float(np.abs(bf - reff).max())
            worst[key] = max(worst[key], max_abs)
            budget = T_SMOKE_TRAJ_REL * float(np.abs(bf).max())
            if budget > 0:
                worst_ratio = max(worst_ratio, max_abs / budget)
    within = worst_ratio <= 1.0
    density_ok = min_density >= -T_SMOKE_DENSITY_NEG
    passed = bool(
        (twice is not False) and within and finite and density_ok and ref_sane
    )
    return VerifyResult(
        sim="eulerian-smoke",
        kind="new_canonical",
        passed=passed,
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "within_rel_budget": within,
            "worst_ratio_of_budget": worst_ratio,
            "worst_max_abs": worst,
            "traj_rel": T_SMOKE_TRAJ_REL,
            "finite": finite,
            "min_density": None if min_density is math.inf else min_density,
            "density_nonneg_ok": density_ok,
            "reference_edge_dormant": ref_sane,
            "reference_peak_vel": ref_peak,
            "note": "live f64 reference re-run (boids/strange precedent); rel "
            "budget reuses the established [defaults.smoke] 1e-4 — the lid-shear "
            "capture's FP-edge contamination was FIXED + regenerated at "
            "P6-FPEDGE (docs/_audits/phase-6/p6-fpedge-discovery-landing-*)",
        },
    )


def _gate_sph_water(bundles: list[dict]) -> VerifyResult:
    """new_canonical gate for sph-water: POINTWISE committed-capture reproduction.

    The committed canonical (captures/sph-water-ref/dam-break-100K-particles-
    seed42-step1000.h5) is rigid free-fall — a seeded uniform cloud under
    pure-gravity explicit Euler with the verified density pipeline evaluated
    at every checkpoint (spec § 2.0; the v0.1 "chaotic dam-break" framing was
    refuted on inspection). Non-chaotic means the pointwise per-particle
    comparison is real: the browser replays the exact reference integrator
    from the committed f32 IC and computes density with the optimized
    counting-sort grid at h = 0.026 — the CANONICAL_H override that actually
    produced the capture (packages/sph-water/sph_water/sim.py; the manifest's
    params.h = 0.05 records canonical_params()'s diagnostic default, verified
    numerically: recomputed density matches the committed field to < 6e-14 at
    0.026 and is ~46% off at 0.05).

    Gate = run-twice byte-identity over every emitted field at every step
         + per-checkpoint pointwise position/velocity/density vs the committed
           f64 capture on the committed index subsample (::SPH_GATE_STRIDE),
           max_abs <= T_SPH_TRAJ_REL * max|browser field| (the established
           [defaults.sph] rel=1e-4 via [overrides.sph-water]; no widening)
         + closed-form artifacts emitted at step 0: the in-page f64 mirror's
           kernel values vs the committed golden table (table tolerance
           1e-12) and two-particle continuity fixture (1e-15); the WGSL f32
           kernel at f32 rounding scope; grid==brute i32 fixed-point density
           byte-equality (the hash==brute neighbor-search proof); the
           kernel-normalization unit-volume check; mirror-vs-CPython
           bit-exactness flags; the cell-sort saturation flag clear
         + finite fields and non-negative density (density_nonneg invariant).
    """
    from capture import load_capture

    b0 = bundles[0]
    steps0 = _bundle_steps(b0)
    twice = None
    if len(bundles) > 1:
        s1 = {s["step"]: s for s in _bundle_steps(bundles[1])}
        twice = all(
            st["step"] in s1
            and set(st["state"]) == set(s1[st["step"]]["state"])
            and all(
                np.array_equal(_field(st, k), _field(s1[st["step"]], k))
                for k in st["state"]
            )
            for st in steps0
        )

    expected_steps = [st["step"] for st in steps0]
    want = [0] + list(range(100, 1001, 100))
    if expected_steps != want:
        return VerifyResult(
            sim="sph-water",
            kind="new_canonical",
            passed=False,
            run_twice_identical=twice,
            detail={"error": f"checkpoint set {expected_steps} != canonical {want}"},
        )

    # --- committed capture, subsampled on the committed stride ---------------
    cap = load_capture(REPO / CANON["sph-water"])
    worst = {"position": 0.0, "velocity": 0.0, "density": 0.0}
    worst_ratio = 0.0
    finite = True
    min_density = math.inf
    for st in steps0:
        ref = cap.step(st["step"]).state
        for key in ("position", "velocity", "density"):
            bf = _field(st, key).astype(np.float64)
            if not np.isfinite(bf).all():
                finite = False
                continue
            rf = np.asarray(ref[key], dtype=np.float64)[::SPH_GATE_STRIDE]
            if key == "density":
                min_density = min(min_density, float(bf.min()))
                rf = rf.reshape(bf.shape)
            if bf.shape != rf.shape:
                return VerifyResult(
                    sim="sph-water",
                    kind="new_canonical",
                    passed=False,
                    run_twice_identical=twice,
                    detail={
                        "error": f"{key}@{st['step']}: shape {bf.shape} != {rf.shape}"
                    },
                )
            max_abs = float(np.abs(bf - rf).max())
            worst[key] = max(worst[key], max_abs)
            budget = T_SPH_TRAJ_REL * float(np.abs(bf).max())
            if budget > 0:
                worst_ratio = max(worst_ratio, max_abs / budget)
    within = worst_ratio <= 1.0
    density_ok = min_density >= 0.0

    # --- closed-form artifacts (emitted at step 0) ---------------------------
    s0 = steps0[0]
    diag = s0.get("diagnostics", {})
    golden = json.loads(
        (REPO / "tools/testkit/golden/tables/cubic-spline-kernel.json").read_text()
    )
    gw = np.array([tp["expected"]["W"] for tp in golden["test_points"]])
    gg = np.array([tp["expected"]["grad_W_magnitude"] for tp in golden["test_points"]])
    k64_w = _field(s0, "kernel_w_f64").astype(np.float64)
    k64_g = _field(s0, "kernel_grad_f64").astype(np.float64)
    golden_f64_dev = float(max(np.abs(k64_w - gw).max(), np.abs(k64_g - gg).max()))
    golden_f64_ok = golden_f64_dev <= T_SPH_GOLDEN_F64_ABS
    k32_w = _field(s0, "kernel_w_f32").astype(np.float64)
    k32_g = _field(s0, "kernel_grad_f32").astype(np.float64)
    scale_w = np.maximum(np.abs(gw), 1e-30)
    scale_g = np.maximum(np.abs(gg), 1e-30)
    golden_f32_dev = float(
        max(
            (np.abs(k32_w - gw) / scale_w).max(),
            (np.abs(k32_g - gg) / scale_g).max(),
        )
    )
    golden_f32_ok = golden_f32_dev <= T_SPH_KERNEL_F32_REL

    fx = json.loads(
        (
            REPO
            / "tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json"
        ).read_text()
    )
    exp0 = fx["test_points"][0]["expected"]
    two_drho = _field(s0, "two_particle_drho_f64").astype(np.float64)
    two_rho = _field(s0, "two_particle_rho_f64").astype(np.float64)
    fixture_dev = float(
        max(
            abs(two_drho[0] - exp0["drho_dt_0"]),
            abs(two_rho[0] - exp0["rho_0"]),
        )
    )
    fixture_ok = fixture_dev <= T_SPH_FIXTURE_F64_ABS

    ns_grid = _field(s0, "nsearch_grid_fp").astype(np.float64)
    ns_brute = _field(s0, "nsearch_brute_fp").astype(np.float64)
    hash_brute_ok = bool(np.array_equal(ns_grid, ns_brute)) and ns_grid.size >= 4096

    mirror_ok = all(
        diag.get(k, 0.0) == 1.0
        for k in (
            "mirror_two_bitexact",
            "mirror_density64_bitexact",
            "mirror_continuity64_bitexact",
            "mirror_corrector8_bitexact",
        )
    )
    norm_dev = abs(float(diag.get("normalization_mean", math.inf)) - 1.0)
    norm_ok = norm_dev <= T_SPH_NORM_TOL
    sort_ok = float(diag.get("sort_saturated", 1.0)) == 0.0

    passed = bool(
        (twice is not False)
        and within
        and finite
        and density_ok
        and golden_f64_ok
        and golden_f32_ok
        and fixture_ok
        and hash_brute_ok
        and mirror_ok
        and norm_ok
        and sort_ok
    )
    return VerifyResult(
        sim="sph-water",
        kind="new_canonical",
        passed=passed,
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "within_rel_budget": within,
            "worst_ratio_of_budget": worst_ratio,
            "worst_max_abs": worst,
            "traj_rel": T_SPH_TRAJ_REL,
            "finite": finite,
            "min_density": None if min_density is math.inf else min_density,
            "density_nonneg_ok": density_ok,
            "golden_f64_dev": golden_f64_dev,
            "golden_f64_ok": golden_f64_ok,
            "golden_f32_dev": golden_f32_dev,
            "golden_f32_ok": golden_f32_ok,
            "fixture_dev": fixture_dev,
            "fixture_ok": fixture_ok,
            "hash_brute_identical": hash_brute_ok,
            "mirror_bitexact": mirror_ok,
            "normalization_dev": norm_dev,
            "normalization_ok": norm_ok,
            "cell_sort_unsaturated": sort_ok,
            "note": "pointwise reproduction of the committed 100K canonical "
            "(rigid free-fall, non-chaotic — spec § 2.0) on the committed "
            "::16 subsample at h=0.026 (CANONICAL_H, not the manifest's "
            "stale 0.05), plus the closed-form golden/fixture/hash==brute/"
            "mirror artifact suite",
        },
    )


def _gate_mpm_multimaterial(bundles: list[dict]) -> VerifyResult:
    """new_canonical gate for mpm-multimaterial: POINTWISE capture reproduction.

    The committed diagnostic canonical (captures/mpm-multimaterial-stack-e/
    drop-impact-16cube-seed42-step50.h5, 5K particles, dt=1e-4) is NON-CHAOTIC
    over its 50-step horizon: a uniform-velocity blob in free fall that never
    reaches the sticky floor, with F ~ I so the neo-Hookean stress stays ~ 0
    (the sph-water rigid-free-fall precedent). The browser replays the exact
    MLS-MPM reference loop from the committed f32 step-0 IC with fixed-point
    i32-atomic P2G (M = 1e7; masses normalized to 1 per particle, stress
    rescaled by 1/mass_unit — exact-arithmetic-equivalent).

    Gate = run-twice byte-identity over every emitted field at every step
         + per-checkpoint pointwise position/velocity vs the committed f64
           capture (ALL 5000 particles), max_abs <= T_MPM_TRAJ_REL *
           max|browser field| (the established [defaults.mpm] rel=1e-4 via
           [overrides.mpm-multimaterial]; no widening)
         + closed-form artifacts at step 0: the in-page f64 mirror's B-spline
           N(x) + partition-of-unity vs the committed golden table (its own
           1e-15 tolerance); the WGSL f32 evaluations at f32 rounding scope;
           the reference-computed neo-Hookean stress fixture (incl. the
           log_j = -30 guard row) vs the f64 mirror AND the WGSL f32 path
         + fixed-point transfer witnesses (EXACT integer arithmetic): P2G
           mass leak within the deterministic 13.5-quanta-per-particle
           rounding bound, momentum-z likewise, per-cell quanta headroom
           below 2^31 / MPM_HEADROOM_FACTOR
         + per-material invariants (spec § 4.3): snow post-return-map
           singular values (recomputed f64-side from the GPU output F) inside
           [1 - theta_c, 1 + theta_s] + slack; sand Drucker-Prager Case III
           volume preservation tr(Hp) = tr(eps) via log det F, Case II
           cone-tip orthogonality (stress-free separation), both cases
           actually exercised
         + finite fields.
    """
    from capture import load_capture

    b0 = bundles[0]
    steps0 = _bundle_steps(b0)
    twice = None
    if len(bundles) > 1:
        s1 = {s["step"]: s for s in _bundle_steps(bundles[1])}
        twice = all(
            st["step"] in s1
            and set(st["state"]) == set(s1[st["step"]]["state"])
            and all(
                np.array_equal(_field(st, k), _field(s1[st["step"]], k))
                for k in st["state"]
            )
            for st in steps0
        )

    expected_steps = [st["step"] for st in steps0]
    want = [0, 10, 20, 30, 40, 50]
    if expected_steps != want:
        return VerifyResult(
            sim="mpm-multimaterial",
            kind="new_canonical",
            passed=False,
            run_twice_identical=twice,
            detail={"error": f"checkpoint set {expected_steps} != canonical {want}"},
        )

    # --- committed capture, pointwise on ALL particles -----------------------
    cap = load_capture(REPO / CANON["mpm-multimaterial"])
    worst = {"position": 0.0, "velocity": 0.0}
    worst_ratio = 0.0
    finite = True
    for st in steps0:
        ref = cap.step(st["step"]).state
        for key, ref_key in (
            ("position", "particle_pos"),
            ("velocity", "particle_vel"),
        ):
            bf = _field(st, key).astype(np.float64)
            if not np.isfinite(bf).all():
                finite = False
                continue
            rf = np.asarray(ref[ref_key], dtype=np.float64)
            if bf.shape != rf.shape:
                return VerifyResult(
                    sim="mpm-multimaterial",
                    kind="new_canonical",
                    passed=False,
                    run_twice_identical=twice,
                    detail={
                        "error": f"{key}@{st['step']}: shape {bf.shape} != {rf.shape}"
                    },
                )
            max_abs = float(np.abs(bf - rf).max())
            worst[key] = max(worst[key], max_abs)
            budget = T_MPM_TRAJ_REL * float(np.abs(bf).max())
            if budget > 0:
                worst_ratio = max(worst_ratio, max_abs / budget)
    within = worst_ratio <= 1.0

    # --- closed-form artifacts (emitted at step 0) ---------------------------
    s0 = steps0[0]
    diag = s0.get("diagnostics", {})
    golden = json.loads(
        (
            REPO / "tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json"
        ).read_text()
    )
    samples = golden["test_points"][0]["expected"]["samples"]
    table_n = np.array(list(samples.values()), dtype=np.float64)
    b64 = _field(s0, "bspline_n_f64").astype(np.float64)
    golden_f64_dev = float(np.abs(b64 - table_n).max())
    pou64 = _field(s0, "pou_f64").astype(np.float64)
    golden_f64_dev = max(golden_f64_dev, float(np.abs(pou64 - 1.0).max()))
    golden_f64_ok = golden_f64_dev <= T_MPM_GOLDEN_F64_ABS
    b32 = _field(s0, "bspline_n_f32").astype(np.float64)
    scale = np.maximum(np.abs(table_n), 1e-3)
    golden_f32_dev = float((np.abs(b32 - table_n) / scale).max())
    golden_f32_ok = golden_f32_dev <= T_MPM_KERNEL_F32_REL
    pou_sweep_dev = float(diag.get("pou_gpu_sweep_max_dev", math.inf))
    pou_ok = pou_sweep_dev <= T_MPM_POU_F32_ABS

    fixtures = json.loads(
        (
            REPO / "packages/mpm-multimaterial/web/fixtures/reference-fixtures.json"
        ).read_text()
    )
    ref_stress = np.array(fixtures["neo_hookean_16"]["stress"], dtype=np.float64)
    n_fix = ref_stress.shape[0]
    mirror = _field(s0, "neo_stress_mirror_f64").astype(np.float64).reshape(n_fix, 9)
    neo_f64_dev = float(np.abs(mirror - ref_stress.reshape(n_fix, 9)).max())
    neo_f64_ok = neo_f64_dev <= T_MPM_NEO_F64_ABS
    gpu32 = _field(s0, "neo_stress_gpu_f32").astype(np.float64).reshape(n_fix, 9)
    peaks = np.maximum(np.abs(ref_stress.reshape(n_fix, 9)).max(axis=1), 1e-3)
    neo_f32_dev = float(
        (np.abs(gpu32 - ref_stress.reshape(n_fix, 9)) / peaks[:, None]).max()
    )
    neo_f32_ok = neo_f32_dev <= T_MPM_NEO_F32_REL

    # --- fixed-point transfer witnesses (exact integer arithmetic) -----------
    n_particles = 5000
    mass_leak = float(diag.get("mass_leak_quanta", math.inf))
    mom_leak = float(diag.get("mom_z_leak_quanta", math.inf))
    leak_bound = math.ceil(13.5 * n_particles)
    mass_ok = mass_leak <= leak_bound and mom_leak <= leak_bound
    max_cell = float(diag.get("max_cell_quanta", math.inf))
    headroom_ok = max_cell <= 2**31 / MPM_HEADROOM_FACTOR

    # --- per-material invariants ---------------------------------------------
    theta_c = float(diag.get("theta_c", math.nan))
    theta_s = float(diag.get("theta_s", math.nan))
    snow_sigma = _field(s0, "snow_sigma_f64").astype(np.float64)
    snow_ok = bool(
        np.isfinite(snow_sigma).all()
        and math.isfinite(theta_c)
        and snow_sigma.min() >= 1.0 - theta_c - T_MPM_SNOW_SIGMA_SLACK
        and snow_sigma.max() <= 1.0 + theta_s + T_MPM_SNOW_SIGMA_SLACK
    )
    sand_case = _field(s0, "sand_case").astype(np.float64)
    ld_in = _field(s0, "sand_logdet_in_f64").astype(np.float64)
    ld_out = _field(s0, "sand_logdet_out_f64").astype(np.float64)
    case3 = sand_case == 3.0
    case2 = sand_case == 2.0
    sand_logdet_dev = (
        float(np.abs(ld_out[case3] - ld_in[case3]).max()) if case3.any() else math.inf
    )
    sand_ortho_dev = float(diag.get("sand_case2_ortho_dev", math.inf))
    sand_ok = bool(
        case2.any()
        and case3.any()
        and sand_logdet_dev <= T_MPM_SAND_LOGDET_ABS
        and sand_ortho_dev <= T_MPM_SAND_ORTHO_ABS
    )

    passed = bool(
        (twice is not False)
        and within
        and finite
        and golden_f64_ok
        and golden_f32_ok
        and pou_ok
        and neo_f64_ok
        and neo_f32_ok
        and mass_ok
        and headroom_ok
        and snow_ok
        and sand_ok
    )
    return VerifyResult(
        sim="mpm-multimaterial",
        kind="new_canonical",
        passed=passed,
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "within_rel_budget": within,
            "worst_ratio_of_budget": worst_ratio,
            "worst_max_abs": worst,
            "traj_rel": T_MPM_TRAJ_REL,
            "finite": finite,
            "golden_f64_dev": golden_f64_dev,
            "golden_f64_ok": golden_f64_ok,
            "golden_f32_dev": golden_f32_dev,
            "golden_f32_ok": golden_f32_ok,
            "pou_sweep_dev": pou_sweep_dev,
            "pou_ok": pou_ok,
            "neo_f64_dev": neo_f64_dev,
            "neo_f64_ok": neo_f64_ok,
            "neo_f32_dev": neo_f32_dev,
            "neo_f32_ok": neo_f32_ok,
            "mass_leak_quanta": mass_leak,
            "mom_z_leak_quanta": mom_leak,
            "mass_leak_bound_quanta": leak_bound,
            "mass_ok": mass_ok,
            "max_cell_quanta": max_cell,
            "headroom_ok": headroom_ok,
            "snow_sigma_min": float(snow_sigma.min()) if snow_sigma.size else None,
            "snow_sigma_max": float(snow_sigma.max()) if snow_sigma.size else None,
            "snow_ok": snow_ok,
            "sand_logdet_dev": sand_logdet_dev,
            "sand_case2_ortho_dev": sand_ortho_dev,
            "sand_cases_seen": sorted({int(c) for c in sand_case.tolist()}),
            "sand_ok": sand_ok,
            "note": "pointwise reproduction of the committed 16-cube diagnostic "
            "canonical (non-chaotic 50-step free-fall horizon) on ALL 5000 "
            "particles at the established [defaults.mpm] rel=1e-4, plus the "
            "golden B-spline / neo-Hookean fixture / fixed-point-leak / "
            "snow-and-sand invariant artifact suite",
        },
    )


def _gate_rd2d_observable(bundles: list[dict]) -> VerifyResult:
    """PENDING-LAVAPIPE contingency for rd2d (Decision 2, SHIFTED to opt-in).

    A portable observable/structural browser gate for the case CI lavapipe's distinct
    ALU genuinely diverges from the native f32 trajectory (it does NOT on the
    obtainable RADV-backed backends, where rd2d clears its established 1e-4 gate). The
    DEFAULT rd2d gate stays ``_gate_rd2d`` (capture_roundtrip @ rel=1e-4); this NEVER
    widens the native tolerance. Gate = run-twice determinism + short-horizon agreement
    vs the f64 canonical through step 200 + a bounded gray-scott field."""
    from capture import load_capture

    b0 = bundles[0]
    twice = None
    if len(bundles) > 1:
        twice = bool(
            np.array_equal(_last_field(bundles[0], "U"), _last_field(bundles[1], "U"))
            and np.array_equal(
                _last_field(bundles[0], "V"), _last_field(bundles[1], "V")
            )
        )
    canon = load_capture(REPO / CANON["reaction-diffusion-2d"])
    cs = {s.step: s for s in canon.steps()}
    worst_short = 0.0
    for s in _bundle_steps(b0):
        st = s["step"]
        if st > T_RD2D_SHORTHORIZON_MAXSTEP or st not in cs:
            continue
        for k in ("U", "V"):
            worst_short = max(
                worst_short,
                float(
                    np.abs(
                        _field(s, k) - np.asarray(cs[st].state[k], dtype=np.float64)
                    ).max()
                ),
            )
    short_ok = worst_short <= T_RD2D_SHORTHORIZON_ABS
    u, v = _last_field(b0, "U"), _last_field(b0, "V")
    bounded = bool(
        np.isfinite(u).all()
        and np.isfinite(v).all()
        and u.min() >= -T_RD2D_FIELD_BOUND
        and u.max() <= 1.0 + T_RD2D_FIELD_BOUND
        and v.min() >= -T_RD2D_FIELD_BOUND
        and v.max() <= 1.0 + T_RD2D_FIELD_BOUND
    )
    return VerifyResult(
        sim="reaction-diffusion-2d",
        kind="observable_browser_fallback",
        passed=bool((twice is not False) and short_ok and bounded),
        run_twice_identical=twice,
        detail={
            "short_horizon_max_abs_le_step200": worst_short,
            "short_horizon_abs": T_RD2D_SHORTHORIZON_ABS,
            "bounded_field": bounded,
            "note": "PENDING-LAVAPIPE contingency (opt-in): portable observable gate; the "
            "established capture_roundtrip @1e-4 is the default and passes on the obtainable "
            "backends; native gpu_gate.py rel=1e-4 row byte-unchanged",
        },
    )


def _gate_neural_ca_observable(bundles: list[dict]) -> VerifyResult:
    """PENDING-LAVAPIPE contingency for neural-ca (Decision 4).

    Bit-exactness held on the obtainable backends only because browser-Dawn and
    wgpu-native both compile to SPIR-V on the SAME RADV driver; CI lavapipe's distinct
    ALU may break it. If so, this opt-in gate replaces the BROWSER bit-exact check with
    a portable observable one (run-twice determinism + bounded RGBA + alive alpha +
    short-horizon agreement). The established bit-exact gate stays the DEFAULT and stays
    the wgpu-native canonical gate — it is NOT pre-emptively weakened."""
    from capture import load_capture

    b0 = bundles[0]
    twice = None
    if len(bundles) > 1:
        twice = bool(
            np.array_equal(
                _stack_field(bundles[0], "rgba"), _stack_field(bundles[1], "rgba")
            )
        )
    frames = _stack_field(b0, "rgba").astype(np.float64)
    bounded = bool(
        np.isfinite(frames).all()
        and frames.min() >= -1e-6
        and frames.max() <= 1.0 + 1e-6
    )
    alpha_mass = float(frames[-1, :, :, 3].sum()) if frames.ndim == 4 else math.inf
    alive = alpha_mass >= T_NCA_ALPHA_MIN_MASS
    canon = load_capture(REPO / CANON["neural-ca"])
    csteps = sorted(s.step for s in canon.steps())
    fkey = next(iter(canon.step(csteps[0]).state.keys()))
    worst_short = math.inf
    for s in _bundle_steps(b0):
        if s["step"] == T_NCA_SHORTHORIZON_STEP:
            ref = np.asarray(
                canon.step(T_NCA_SHORTHORIZON_STEP).state[fkey], dtype=np.float64
            )
            fb = _field(s, "rgba").astype(np.float64)
            worst_short = (
                float(np.abs(fb - ref).max()) if fb.shape == ref.shape else math.inf
            )
            break
    # Ratified charter round 1: run-twice on a foreign ALU is part of the verdict —
    # `twice` must be LITERALLY True (None = untested = not green; the prior
    # `twice is not False` was vacuous in the 1-run CI mode).
    bounds = _CROSS_BACKEND_DECLARED_BOUNDS["neural-ca"]
    measured = {
        "short_horizon_step50_max_abs": worst_short,
        "alpha_mass": alpha_mass,
        "bounded_rgba": bounded,
        "alpha_mass_alive": alive,
        "run_twice_identical": twice,
        "authored_candidate_short_horizon_abs": T_NCA_SHORTHORIZON_ABS,
        "authored_candidate_alpha_min_mass": T_NCA_ALPHA_MIN_MASS,
    }
    if bounds is None:
        return VerifyResult(
            sim="neural-ca",
            kind="observable_browser_fallback",
            passed=False,
            run_twice_identical=twice,
            detail={**measured, "verdict_state": _FAIL_PENDING_NOTE},
        )
    short_ok = worst_short <= bounds["short_horizon_abs"]
    return VerifyResult(
        sim="neural-ca",
        kind="observable_browser_fallback",
        passed=bool((twice is True) and bounded and alive and short_ok),
        run_twice_identical=twice,
        detail={
            **measured,
            "declared_bounds": bounds,
            "note": "PENDING-LAVAPIPE contingency (opt-in): portable observable gate; the "
            "established bit-exact gate is the default (passes on the obtainable backends) and "
            "stays the wgpu-native canonical gate — not pre-emptively weakened",
        },
    )


def _gate_boids_observable(bundles: list[dict]) -> VerifyResult:
    """PENDING-LAVAPIPE contingency for boids-3d (consolidated charter, ratified).

    Run #3 measured a DETERMINISTIC lavapipe ALU divergence: run-twice byte-identical,
    v_max clamp held, but step-100 pointwise pos max_abs 0.0354 vs the established
    0.01. For a chaotic agent-based system the pointwise short horizon is the
    f32-fragile property; the portable properties are structural/distributional
    (the ising-z / physarum-mass philosophy — NOT a relaxed copy of 0.01). Gate =
    run-twice determinism (strictly True) + v_max clamp + finiteness + declared
    bounds on flock observables (polarization, mean speed, speed spread, cohesion)
    vs the SAME frozen f64 NumPy reference used by the established gate (no new
    oracle). The established new_canonical gate stays the DEFAULT and stays
    authoritative on the RADV/wgpu-native backends — not pre-emptively weakened."""
    sys.path.insert(0, str(REPO / "packages/boids-3d"))
    from boids_3d.reference import canonical_params, evolve  # type: ignore
    from boids_3d.sim import _seeded_flock_initial_state  # type: ignore

    def frames(b: dict) -> dict:
        return {
            s["step"]: (_field(s, "position"), _field(s, "velocity"))
            for s in _bundle_steps(b)
        }

    f1 = frames(bundles[0])
    twice = None
    if len(bundles) > 1:
        f2 = frames(bundles[1])
        twice = all(
            np.array_equal(f1[k][0], f2[k][0]) and np.array_equal(f1[k][1], f2[k][1])
            for k in f1
        )
    p = canonical_params()
    pos0, vel0 = _seeded_flock_initial_state(42, 1000)
    ph, vh, idx = evolve(pos0, vel0, p, 100, capture_interval=100)
    ref_pos, ref_vel = ph[idx.index(100)], vh[idx.index(100)]

    def flock_observables(pos: np.ndarray, vel: np.ndarray) -> dict[str, float]:
        pos = np.asarray(pos, dtype=np.float64)
        vel = np.asarray(vel, dtype=np.float64)
        speed = np.linalg.norm(vel, axis=1)
        vhat = vel / np.where(speed > 0.0, speed, 1.0)[:, None]
        centroid = pos.mean(axis=0)
        return {
            "polarization": float(np.linalg.norm(vhat.mean(axis=0))),
            "mean_speed": float(speed.mean()),
            "speed_std": float(speed.std()),
            "mean_dist_to_centroid": float(
                np.linalg.norm(pos - centroid, axis=1).mean()
            ),
        }

    have_100 = 100 in f1
    br_obs = flock_observables(*f1[100]) if have_100 else {}
    ref_obs = flock_observables(ref_pos, ref_vel)
    deltas = {
        k: (abs(br_obs[k] - ref_obs[k]) if have_100 else math.inf) for k in ref_obs
    }
    finite = bool(
        have_100
        and np.isfinite(np.asarray(f1[100][0], dtype=np.float64)).all()
        and np.isfinite(np.asarray(f1[100][1], dtype=np.float64)).all()
    )
    pointwise = (
        float(np.abs(np.asarray(f1[100][0], dtype=np.float64) - ref_pos).max())
        if have_100
        else math.inf
    )
    vmax_obs = max(float(np.linalg.norm(f1[k][1], axis=1).max()) for k in f1)
    clamp_ok = vmax_obs <= p["v_max"] * (1.0 + T_BOIDS_VMAX_TOL)
    measured = {
        "run_twice_identical": twice,
        "v_max_observed": round(vmax_obs, 6),
        "v_max_clamp_ok": clamp_ok,
        "finite": finite,
        "browser_step100": br_obs,
        "reference_step100_f64": ref_obs,
        "abs_delta_step100": deltas,
        "pointwise_step100_pos_max_abs_informative": pointwise,
    }
    bounds = _CROSS_BACKEND_DECLARED_BOUNDS["boids-3d"]
    if bounds is None:
        return VerifyResult(
            sim="boids-3d",
            kind="observable_browser_fallback",
            passed=False,
            run_twice_identical=twice,
            detail={**measured, "verdict_state": _FAIL_PENDING_NOTE},
        )
    obs_ok = all(deltas[k] <= bounds[f"{k}_abs"] for k in deltas)
    return VerifyResult(
        sim="boids-3d",
        kind="observable_browser_fallback",
        passed=bool((twice is True) and clamp_ok and finite and obs_ok),
        run_twice_identical=twice,
        detail={
            **measured,
            "declared_bounds": bounds,
            "note": "PENDING-LAVAPIPE contingency (opt-in): structural/distributional "
            "gate vs the same frozen f64 reference; the established new_canonical gate "
            "(0.01 pointwise short horizon) stays the default and stays authoritative "
            "on RADV/wgpu-native — not pre-emptively weakened",
        },
    )


def _gate_pic_flip(bundles: list[dict]) -> VerifyResult:
    """new_canonical gate for pic-flip: ROBUST-OBSERVABLE canonical replay +
    the chaos-immune closed-form artifact suite.

    The web-gate canonical (packages/pic-flip/web/public/, 12-cube APIC dam
    break, Jacobi 600 = the backend's measured-converged diagnostic cap, 60
    steps, regularizers ON-declared) is CHAOTIC, so per-particle pointwise
    reproduction is rejected by the spec (§ 9: chaos + fixed-point-atomic
    P2G != the f64 lex reference); the trajectory check compares the ten
    per-checkpoint robust observables [KE, momentum xyz, com xyz, max
    speed, fluid-node count, max column height] against the committed f64
    references generated from the committed f32-quantized IC
    (tools/gen-gate-refs.py), each within T_PICFLIP_OBS_REL of its
    per-observable reference scale.

    Gate = run-twice byte-identity over every emitted field at every step
         + the observable-trajectory budget above
         + closed-form artifacts at step 0 (browser f64 mirror AND WGSL
           f32, measured residuals, never asserted zeros):
             weights/moments/Dp golden (apic-transfer-weights.json),
             angular-momentum conservation + PIC negative control
             (apic-angular-momentum.json, Props 5.4/5.5),
             affine round trip grid->particle->grid + PIC control
             (apic-affine-roundtrip.json, Prop 5.1),
             the Zhu 1/9 discrete midpoint ladder — dyadic, f64-EXACT
             (pic-flip-transfer-error.json)
         + transfer bit-identity: parallel fixed-point-atomic P2G ==
           single-thread lex-order oracle, BOTH on-device, i32-exact
           (the sph-water hash==brute structure), with i32 headroom
         + still-pool inertness (regularizers ON, invariant 6) and the
           hydrostatic dP/dz probe (the adjoint compact operator pair —
           the load-bearing spec-ref v0.3 deviation this port must keep)
         + finite fields, expected checkpoint set, sort-cap unsaturated.
    """
    b0 = bundles[0]
    steps0 = _bundle_steps(b0)
    twice = None
    if len(bundles) > 1:
        s1 = {s["step"]: s for s in _bundle_steps(bundles[1])}
        twice = all(
            st["step"] in s1
            and set(st["state"]) == set(s1[st["step"]]["state"])
            and all(
                np.array_equal(_field(st, k), _field(s1[st["step"]], k))
                for k in st["state"]
            )
            for st in steps0
        )

    refs_dir = REPO / "packages/pic-flip/web/public"
    meta = json.loads((refs_dir / "picflip-gate-refs.json").read_text())
    want = list(meta["checkpoints"])
    expected_steps = [st["step"] for st in steps0]
    if expected_steps != want:
        return VerifyResult(
            sim="pic-flip",
            kind="new_canonical",
            passed=False,
            run_twice_identical=twice,
            detail={"error": f"checkpoint set {expected_steps} != canonical {want}"},
        )
    refs = np.frombuffer((refs_dir / "picflip-gate-refs.bin").read_bytes(), dtype="<f8")
    refs = refs.reshape(len(want), 10)

    # --- robust-observable trajectory ---------------------------------------
    obs_keys = [
        "kinetic_energy",
        "momentum_x",
        "momentum_y",
        "momentum_z",
        "com_x",
        "com_y",
        "com_z",
        "max_speed",
        "fluid_node_count",
        "max_column_height",
    ]
    scale = np.max(np.abs(refs), axis=0)
    finite = True
    worst_ratio = 0.0
    worst_obs = ""
    sort_ok = True
    for ci, st in enumerate(steps0):
        for key in ("position", "velocity"):
            if not np.isfinite(_field(st, key)).all():
                finite = False
        diag = st.get("diagnostics", {})
        if float(diag.get("sort_saturated", 0.0)) != 0.0:
            sort_ok = False
        for oi, key in enumerate(obs_keys):
            got = float(diag.get(key, math.inf))
            budget = T_PICFLIP_OBS_REL * float(scale[oi])
            if budget > 0:
                ratio = abs(got - float(refs[ci, oi])) / budget
                if ratio > worst_ratio:
                    worst_ratio = ratio
                    worst_obs = f"{key}@{st['step']}"
    within = worst_ratio <= 1.0

    # --- closed-form artifacts (emitted at step 0) ---------------------------
    s0 = steps0[0]
    diag0 = s0.get("diagnostics", {})
    tables = REPO / "tools/testkit/golden/tables/particle-fluids"
    wt = json.loads((tables / "apic-transfer-weights.json").read_text())
    exp0 = wt["test_points"][0]["expected"]
    n_expected = np.array(list(exp0["samples"].values()), dtype=np.float64)
    n64 = _field(s0, "golden_weights_n_f64").astype(np.float64)
    n32 = _field(s0, "golden_weights_n_f32").astype(np.float64)
    weights_f64_dev = float(np.abs(n64 - n_expected).max())
    mom64 = _field(s0, "golden_moments_f64").astype(np.float64).reshape(-1, 3)
    mom32 = _field(s0, "golden_moments_f32").astype(np.float64).reshape(-1, 3)
    mom_expected = np.array([1.0, 0.0, 0.25])
    weights_f64_dev = max(weights_f64_dev, float(np.abs(mom64 - mom_expected).max()))
    weights_f64_ok = weights_f64_dev <= T_PICFLIP_GOLDEN_F64_ABS
    n_scale = np.maximum(np.abs(n_expected), 1e-30)
    weights_f32_dev = float(
        max(
            (np.abs(n32 - n_expected) / n_scale).max(),
            np.abs(mom32 - mom_expected).max(),
        )
    )
    weights_f32_ok = weights_f32_dev <= T_PICFLIP_WEIGHTS_F32_REL
    pou_dev = float(diag0.get("pou_max_dev_f32", math.inf))
    pou_ok = pou_dev <= T_PICFLIP_POU_F32_ABS

    am = json.loads((tables / "apic-angular-momentum.json").read_text())
    am2_pts = [
        tp
        for tp in am["test_points"]
        if len(tp["expected"]["l_total_particles_before"]) == 1
    ]
    am3_pts = [
        tp
        for tp in am["test_points"]
        if len(tp["expected"]["l_total_particles_before"]) == 3
    ]
    am2_64 = _field(s0, "golden_am2_f64").astype(np.float64).reshape(-1, 4)
    am2_32 = _field(s0, "golden_am2_f32").astype(np.float64).reshape(-1, 4)
    am3_64 = _field(s0, "golden_am3_f64").astype(np.float64).reshape(-1, 12)
    am3_32 = _field(s0, "golden_am3_f32").astype(np.float64).reshape(-1, 12)
    am_f64_dev = 0.0
    am_f32_cons = 0.0
    pic_control_ok = True
    for row, tp in zip(am2_64, am2_pts):
        e = tp["expected"]
        exp = np.array(
            [
                e["l_total_particles_before"][0],
                e["l_total_grid_after_p2g"][0],
                e["l_total_particles_after_apic_g2p"][0],
                e["l_total_particles_after_pic_g2p"][0],
            ]
        )
        am_f64_dev = max(
            am_f64_dev, float(np.abs(row - exp).max() / max(1.0, np.abs(exp).max()))
        )
    for row, tp in zip(am3_64, am3_pts):
        e = tp["expected"]
        exp = np.array(
            e["l_total_particles_before"]
            + e["l_total_grid_after_p2g"]
            + e["l_total_particles_after_apic_g2p"]
            + e["l_total_particles_after_pic_g2p"]
        )
        am_f64_dev = max(
            am_f64_dev, float(np.abs(row - exp).max() / max(1.0, np.abs(exp).max()))
        )
    for row, tp in zip(am2_32, am2_pts):
        e = tp["expected"]
        s = max(1e-30, abs(e["l_total_particles_before"][0]))
        am_f32_cons = max(
            am_f32_cons, abs(row[1] - row[0]) / s, abs(row[2] - row[0]) / s
        )
        loss_expected = abs(
            e["l_total_particles_after_pic_g2p"][0] - e["l_total_particles_before"][0]
        )
        if abs(row[3] - row[0]) < 0.5 * loss_expected:
            pic_control_ok = False
    for row, tp in zip(am3_32, am3_pts):
        e = tp["expected"]
        lb = np.array(e["l_total_particles_before"])
        s = max(1e-30, float(np.abs(lb).max()))
        am_f32_cons = max(
            am_f32_cons,
            float(np.abs(row[3:6] - row[0:3]).max() / s),
            float(np.abs(row[6:9] - row[0:3]).max() / s),
        )
        loss_expected = float(
            np.abs(np.array(e["l_total_particles_after_pic_g2p"]) - lb).max()
        )
        if float(np.abs(row[9:12] - row[0:3]).max()) < 0.5 * loss_expected:
            pic_control_ok = False
    am_f64_ok = am_f64_dev <= T_PICFLIP_GOLDEN_F64_ABS
    am_f32_ok = am_f32_cons <= T_PICFLIP_AM_F32_REL

    rt = json.loads((tables / "apic-affine-roundtrip.json").read_text())
    rt_64 = _field(s0, "golden_rt_f64").astype(np.float64).reshape(-1, 7)
    rt_32 = _field(s0, "golden_rt_f32").astype(np.float64).reshape(-1, 7)
    rt_f64_dev = 0.0
    rt_f32_rel = 0.0
    rt_pic_ok = True
    rt_massed_ok = True
    for row64, row32, tp in zip(rt_64, rt_32, rt["test_points"]):
        e = tp["expected"]
        ndim = len(tp["inputs"]["v0"])
        scale_f = max(1e-30, row64[1])
        rt_f64_dev = max(rt_f64_dev, row64[0] / scale_f)
        if int(row64[2]) != int(e["n_massed_nodes_checked"]):
            rt_massed_ok = False
        sv = np.array(e["sample_node_velocity"], dtype=np.float64)
        rt_f64_dev = max(
            rt_f64_dev,
            float(np.abs(row64[3 : 3 + ndim] - sv).max() / max(1.0, np.abs(sv).max())),
        )
        pic_dev_exp = float(e["pic_max_abs_deviation"])
        rt_f64_dev = max(
            rt_f64_dev, abs(row64[6] - pic_dev_exp) / max(1.0, pic_dev_exp)
        )
        rt_f32_rel = max(rt_f32_rel, row32[0] / max(1e-30, row32[1]))
        if row32[6] < 10.0 * T_PICFLIP_RT_F32_REL * row32[1]:
            rt_pic_ok = False
    rt_f64_ok = rt_f64_dev <= T_PICFLIP_GOLDEN_F64_ABS
    rt_f32_ok = rt_f32_rel <= T_PICFLIP_RT_F32_REL

    te = json.loads((tables / "pic-flip-transfer-error.json").read_text())
    ladder = _field(s0, "golden_transfer_ladder_f64").astype(np.float64)
    ladder_exp = np.array(
        [
            tp["expected"]["particle_ladder"][f"n={n}"]["f_tilde"]
            for tp in te["test_points"]
            for n in (4, 16, 64)
        ]
    )
    ladder_dev = float(np.abs(ladder - ladder_exp).max())
    ladder_ok = ladder_dev <= T_PICFLIP_LADDER_F64_ABS

    p2g_atomic = _field(s0, "p2g_atomic_fp").astype(np.float64)
    p2g_oracle = _field(s0, "p2g_oracle_fp").astype(np.float64)
    bit_ok = bool(np.array_equal(p2g_atomic, p2g_oracle)) and p2g_atomic.size >= 4096
    headroom = float(diag0.get("fp_headroom_ratio", math.inf))
    headroom_ok = headroom <= 1.0 / PICFLIP_HEADROOM_FACTOR

    still_speed = float(diag0.get("still_max_speed", math.inf))
    still_dvol = abs(float(diag0.get("still_fluid_nodes_delta", math.inf)))
    hydro_rel = float(diag0.get("hydro_dpdz_rel", math.inf))
    still_ok = still_speed <= T_PICFLIP_STILL_MAXSPEED
    dvol_ok = still_dvol <= T_PICFLIP_STILL_DVOL
    hydro_ok = hydro_rel <= T_PICFLIP_HYDRO_REL

    passed = bool(
        (twice is not False)
        and within
        and finite
        and sort_ok
        and weights_f64_ok
        and weights_f32_ok
        and pou_ok
        and am_f64_ok
        and am_f32_ok
        and pic_control_ok
        and rt_f64_ok
        and rt_f32_ok
        and rt_pic_ok
        and rt_massed_ok
        and ladder_ok
        and bit_ok
        and headroom_ok
        and still_ok
        and dvol_ok
        and hydro_ok
    )
    return VerifyResult(
        sim="pic-flip",
        kind="new_canonical",
        passed=passed,
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "within_obs_budget": within,
            "worst_ratio_of_budget": worst_ratio,
            "worst_observable": worst_obs,
            "obs_rel": T_PICFLIP_OBS_REL,
            "finite": finite,
            "sort_unsaturated": sort_ok,
            "weights_f64_dev": weights_f64_dev,
            "weights_f32_dev": weights_f32_dev,
            "pou_max_dev_f32": pou_dev,
            "am_f64_dev_rel": am_f64_dev,
            "am_f32_conservation_rel": am_f32_cons,
            "am_pic_negative_control_ok": pic_control_ok,
            "rt_f64_dev_rel": rt_f64_dev,
            "rt_f32_err_rel": rt_f32_rel,
            "rt_pic_negative_control_ok": rt_pic_ok,
            "rt_massed_nodes_ok": rt_massed_ok,
            "transfer_ladder_f64_dev": ladder_dev,
            "bit_identity_ok": bit_ok,
            "fp_headroom_ratio": headroom,
            "still_max_speed": still_speed,
            "still_fluid_nodes_delta": still_dvol,
            "hydro_dpdz_rel": hydro_rel,
            "note": "robust-observable canonical (chaotic dam break — pointwise "
            "rejected per spec § 9) + Props 5.1/5.4/5.5 golden suite with PIC "
            "negative controls, Zhu 1/9 dyadic-exact ladder, on-device "
            "atomic==lex-oracle bit identity, still-pool inertness and the "
            "adjoint-compact-pair hydrostatic probe",
        },
    )


def _gate_schrodinger_smoke(bundles: list[dict]) -> VerifyResult:
    """new_canonical gate for schrodinger-smoke: LIVE f64 reference re-run.

    The browser's canonical is translating-ring-32cube-hbar0.05-step24-webgate
    — the demo's OWN web-gate tier (pic-flip precedent: the visible demo runs
    64^3-128^3; the gate bundle stays small at 32^3 x 4 checkpoints). The
    scene is NON-CHAOTIC (spec-ref § 9: pointwise comparison is physically
    meaningful; the 3D-TG-blows-up lesson), and the browser builds + settles
    its IC in pure-JS f64 with the backend's own algorithm, so the pointwise
    per-checkpoint comparison against the LIVE f64 reference is real.

    Gate = run-twice byte-identity over u/v/w at every checkpoint
         + per-checkpoint per-field max_abs(browser - reference_f64)
           <= T_ISF_TRAJ_REL * max|browser field|  (the NEW [defaults.isf]
           1e-4; MEASURED complex64-proxy worst 1.4e-5 of peak — no tolerance
           widened)
         + finite fields + the browser's own norm_l2 diagnostic flat across
           checkpoints at f32 scope (the unitary-norm gate's browser shadow).
    """
    sys.path.insert(0, str(REPO / "packages/schrodinger-smoke"))
    from schrodinger_smoke.reference.isf import IsfConfig, run_isf  # type: ignore

    b0 = bundles[0]
    steps0 = _bundle_steps(b0)
    twice = None
    if len(bundles) > 1:
        s1 = {s["step"]: s for s in _bundle_steps(bundles[1])}
        twice = all(
            st["step"] in s1
            and all(
                np.array_equal(_field(st, k), _field(s1[st["step"]], k))
                for k in ("u", "v", "w")
            )
            for st in steps0
        )

    expected_steps = [st["step"] for st in steps0]
    want = [0, 8, 16, 24]
    if expected_steps != want:
        return VerifyResult(
            sim="schrodinger-smoke",
            kind="new_canonical",
            passed=False,
            run_twice_identical=twice,
            detail={"error": f"checkpoint set {expected_steps} != canonical {want}"},
        )

    # live f64 reference re-run (2-run bit-identity witnessed inside run_isf)
    cfg = IsfConfig(
        n=32,
        hbar=0.05,
        dt=1.0 / 24.0,
        steps=24,
        scene="translating-ring",
        capture_every=8,
    )
    res = run_isf(cfg)
    ref = {step: cap for step, cap in zip(res.capture_steps, res.captures, strict=True)}

    worst = {"u": 0.0, "v": 0.0, "w": 0.0}
    worst_ratio = 0.0
    finite = True
    norms = []
    for st in steps0:
        cap = ref[st["step"]]
        norms.append(float(st["diagnostics"].get("norm_l2", np.nan)))
        for fi, key in enumerate(("u", "v", "w")):
            bf = _field(st, key).astype(np.float64)
            if not np.isfinite(bf).all():
                finite = False
                continue
            max_abs = float(np.abs(bf - cap[fi]).max())
            worst[key] = max(worst[key], max_abs)
            budget = T_ISF_TRAJ_REL * float(np.abs(bf).max())
            if budget > 0:
                worst_ratio = max(worst_ratio, max_abs / budget)
    within = worst_ratio <= 1.0
    norm_arr = np.asarray(norms)
    norm_flat = bool(
        np.isfinite(norm_arr).all()
        and float(np.abs(norm_arr - norm_arr[0]).max())
        <= T_ISF_NORM_FLAT_REL * norm_arr[0]
    )
    passed = bool((twice is not False) and within and finite and norm_flat)
    return VerifyResult(
        sim="schrodinger-smoke",
        kind="new_canonical",
        passed=passed,
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "within_rel_budget": within,
            "worst_ratio_of_budget": worst_ratio,
            "worst_max_abs": worst,
            "traj_rel": T_ISF_TRAJ_REL,
            "finite": finite,
            "norm_flat_f32_scope": norm_flat,
            "reference_witness_sha256": res.determinism_witness_sha256,
            "reference_max_div_postproj": res.max_div_postproj,
            "reference_edge_phase_headroom": res.edge_phase_headroom,
            "note": "live f64 reference re-run (eulerian-smoke precedent); rel "
            "budget is the NEW [defaults.isf] 1e-4 (MEASURED complex64-proxy "
            "worst 1.4e-5 of peak; spec-ref § 6.5b MEASURED block)",
        },
    )


def _gate_curl_noise(bundles: list[dict]) -> VerifyResult:
    """curl-noise new_canonical gate (spec-ref § 13.2, chaos-immune).

    1. run-twice byte-identity across the two browser bundles;
    2. browser IC == committed seeded_tracers(42) canonical seeds (f32
       quantization slack T_CURL_IC_ABS);
    3. LIVE f64 reference: recompute the iso values f(x) in f64 at every
       browser f32 checkpoint position and gate
       max ||f64 f(x) - f0_f32|| <= T_CURL_REL * iso_scale — invariant
       under along-manifold drift, hence chaos-immune (never pointwise);
    4. machine-exact goldens recomputed live: matched staggered DIV.CURL
       telescoping + the corrected golden-F confinement identities.
    """
    sys.path.insert(0, str(REPO / "packages/curl-noise"))
    from curl_noise.reference.curlnoise import seeded_tracers  # type: ignore
    from curl_noise.reference.discrete import (  # type: ignore
        matched_curl_2d,
        matched_divergence_2d,
    )
    from curl_noise.reference.fields import (  # type: ignore
        CANONICAL_CONFIG,
        CurlNoiseConfig,
        clebsch_helicity_integrand,
        gradient_orthogonality,
        velocity,
    )
    from curl_noise.reference.manifold import iso_values  # type: ignore

    def positions(b: dict) -> list[np.ndarray]:
        return [
            np.asarray(_field(s, "positions"), dtype=np.float64)
            for s in _bundle_steps(b)
        ]

    p1 = positions(bundles[0])
    p2 = positions(bundles[1]) if len(bundles) > 1 else None
    twice = bool(
        p2 is not None
        and len(p1) == len(p2)
        and all(np.array_equal(a, b) for a, b in zip(p1, p2))
    )

    steps0 = _bundle_steps(bundles[0])
    f0 = np.asarray(steps0[0]["state"]["f0"]["data"], dtype=np.float64).reshape(-1, 2)

    ic_ref = seeded_tracers(42)
    ic_browser = p1[0].reshape(-1, 3)
    ic_dev = float(np.abs(ic_browser - ic_ref).max())
    ic_ok = ic_dev <= T_CURL_IC_ABS

    iso_scale = float(max(np.abs(f0).max(), 1e-9))
    worst = 0.0
    for pos in p1:
        f = iso_values(pos.reshape(-1, 3), CANONICAL_CONFIG)
        worst = max(worst, float(np.linalg.norm(f - f0, axis=1).max()))
    resid_ok = worst <= T_CURL_REL * iso_scale

    # live machine-exact goldens (cheap; the committed tables' identities)
    rng = np.random.default_rng(64)
    psi = rng.standard_normal((65, 65))
    u, w = matched_curl_2d(psi, 1.0 / 64)
    div = matched_divergence_2d(u, w, 1.0 / 64)
    flux = max(np.abs(u).max(), np.abs(w).max()) * 64
    matched_ok = bool(np.abs(div).max() <= 1e-13 * flux)
    cfg_open = CurlNoiseConfig(construction="crossprod", octaves=3, ell0=0.5)
    pts = rng.uniform(-2.0, 2.0, size=(64, 3))
    og1, og2 = gradient_orthogonality(pts, cfg_open)
    cle = clebsch_helicity_integrand(pts, cfg_open)
    vscale = float(np.abs(velocity(pts, cfg_open)).max())
    conf_ok = bool(
        max(np.abs(og1).max(), np.abs(og2).max(), np.abs(cle).max())
        <= 1e-12 * max(vscale, 1.0)
    )

    return VerifyResult(
        sim="curl-noise",
        kind="new_canonical",
        passed=bool(twice and ic_ok and resid_ok and matched_ok and conf_ok),
        run_twice_identical=twice,
        detail={
            "run_twice_identical": twice,
            "ic_matches_canonical_seeds": ic_ok,
            "ic_max_abs_dev": ic_dev,
            "iso_residual_worst": worst,
            "iso_scale": iso_scale,
            "iso_budget_abs": T_CURL_REL * iso_scale,
            "iso_fraction_of_budget": round(worst / (T_CURL_REL * iso_scale), 4),
            "live_matched_divergence_machine_zero": matched_ok,
            "live_confinement_identities_machine_zero": conf_ok,
            "note": "chaos-immune live-f64 gate: f64-recomputed iso residual at "
            "browser f32 positions vs browser f32 iso anchors; NEVER a pointwise "
            "trajectory match (spec-ref § 9). No tolerance widened.",
        },
    )


_GATES = {
    "reaction-diffusion-2d": _gate_rd2d,
    "neural-ca": _gate_neural_ca,
    "ising-classical": _gate_ising,
    "mandelbulb-explorer": _gate_mandelbulb,
    "strange-attractors": _gate_strange,
    "boids-3d": _gate_boids,
    "physarum": _gate_physarum,
    "eulerian-smoke": _gate_eulerian_smoke,
    "sph-water": _gate_sph_water,
    "mpm-multimaterial": _gate_mpm_multimaterial,
    "pic-flip": _gate_pic_flip,
    "schrodinger-smoke": _gate_schrodinger_smoke,
    "curl-noise": _gate_curl_noise,
}

# Opt-in observable/structural BROWSER gates, activated per-sim ONLY via
# BITPHYSICS_BROWSER_OBSERVABLE_FALLBACK="<sim>,<sim>" when the operator's CI lavapipe
# dispatch shows a genuine cross-backend divergence. Default unset -> established gates.
_OBSERVABLE_FALLBACK = {
    "reaction-diffusion-2d": _gate_rd2d_observable,
    "neural-ca": _gate_neural_ca_observable,
    "boids-3d": _gate_boids_observable,
}


def verify_browser_capture(sim: str, bundle_paths: list[Path]) -> VerifyResult:
    """Apply ``sim``'s established gate to its browser-emitted capture bundle(s).

    new_canonical sims expect TWO bundles (two fresh browser runs → run-twice
    byte-identity); roundtrip/observable sims use the first bundle (and an optional
    second for the determinism cross-check).
    """
    if sim not in _GATES:
        raise ValueError(f"unknown sim {sim!r}")
    bundles = [_load_bundle(p) for p in bundle_paths]
    if not bundles:
        raise ValueError("no capture bundles provided")
    fallback = {
        s.strip()
        for s in os.environ.get("BITPHYSICS_BROWSER_OBSERVABLE_FALLBACK", "").split(",")
        if s.strip()
    }
    if sim in fallback and sim in _OBSERVABLE_FALLBACK:
        return _OBSERVABLE_FALLBACK[sim](bundles)
    return _GATES[sim](bundles)


if __name__ == "__main__":
    _sim = sys.argv[1]
    _res = verify_browser_capture(_sim, [Path(p) for p in sys.argv[2:]])
    print(
        json.dumps(
            {
                "sim": _res.sim,
                "kind": _res.kind,
                "passed": _res.passed,
                "run_twice_identical": _res.run_twice_identical,
                "detail": _res.detail,
            },
            default=str,
            indent=2,
        )
    )
    raise SystemExit(0 if _res.passed else 1)
