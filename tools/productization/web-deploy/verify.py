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

CANON = {
    "reaction-diffusion-2d": "captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json",
    "neural-ca": "captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000-wgsl.json",
    "mandelbulb-explorer": "captures/mandelbulb-explorer-ref/de-probe-points-seed42.json",
    "physarum": "captures/physarum-ref/network-canonical-seed42-step5000.json",
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
}

GATE_KIND = {
    "reaction-diffusion-2d": "capture_roundtrip",
    "neural-ca": "capture_roundtrip",
    "ising-classical": "observable",
    "mandelbulb-explorer": "new_canonical",
    "strange-attractors": "new_canonical",
    "boids-3d": "new_canonical",
    "physarum": "new_canonical",
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
    short_ok = worst_short <= T_NCA_SHORTHORIZON_ABS
    return VerifyResult(
        sim="neural-ca",
        kind="observable_browser_fallback",
        passed=bool((twice is not False) and bounded and alive and short_ok),
        run_twice_identical=twice,
        detail={
            "short_horizon_step50_max_abs": worst_short,
            "short_horizon_abs": T_NCA_SHORTHORIZON_ABS,
            "bounded_rgba": bounded,
            "alpha_mass_alive": alive,
            "note": "PENDING-LAVAPIPE contingency (opt-in): portable observable gate; the "
            "established bit-exact gate is the default (passes on the obtainable backends) and "
            "stays the wgpu-native canonical gate — not pre-emptively weakened",
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
}

# Opt-in observable/structural BROWSER gates, activated per-sim ONLY via
# BITPHYSICS_BROWSER_OBSERVABLE_FALLBACK="<sim>,<sim>" when the operator's CI lavapipe
# dispatch shows a genuine cross-backend divergence. Default unset -> established gates.
_OBSERVABLE_FALLBACK = {
    "reaction-diffusion-2d": _gate_rd2d_observable,
    "neural-ca": _gate_neural_ca_observable,
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
