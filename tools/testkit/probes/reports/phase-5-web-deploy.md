# Phase 5 web-deploy — Pre-implementation probe

## Front matter

- Date (UTC): 2026-06-09T04-12-03Z
- Author: claude-code session (phase-5 web-deploy / sub-phase 5.1 agent)
- Subject: Phase 5 web-deploy probe
- HEAD SHA at probe time: 8fe4f2b7ebdbce0b0dadd8d5081d3b15a9437c05
- Verdict-state: see § 6 closure

> All findings MEASURED live this session (Discipline #8). FACT = ran/read/measured.
> The 7 Stack-B web frontends were built by the Phase-5 web-build track (closed at
> `8fe4f2b`); 5.1 builds the **web-deploy pipeline** over them — it does NOT rebuild
> sims or invent tolerances. 5.1 closes the one gap the web-build track explicitly
> deferred: the **browser-WebGPU round-trip** (the track validated the shaders on
> wgpu-native; 5.1 authors the headless-Chromium gate that re-applies each sim's
> OWN established gate through the browser).

## § 1 — Sim inventory in scope

All 7 qualifying Stack-B web sims (the web-build track's output). Each has a real
Vite build (`packages/<sim>/web/`), the shared settings panel
(`common/common-web/src/settings-panel.ts`, mounts `[data-bp-panel]` +
`[data-bp="capture"]`), and the capture-export hook
(`common/common-web/src/capture-export.ts`, sets `window.__bitPhysicsCapture` +
`window.__bitPhysicsCaptureReady`). `__bitPhysicsReady` flips true at boot.

| Sim path | Name | Version | Entry point | Opt-out marker | Qualifying status |
|---|---|---|---|---|---|
| packages/reaction-diffusion-2d/web | @bit-physics/web-reaction-diffusion-2d | 0.0.0 | src/main.ts (vite 6.4.3) | `web: true` | QUALIFYING |
| packages/mandelbulb-explorer/web | @bit-physics/web-mandelbulb-explorer | 0.0.0 | src/main.ts | `web: true` | QUALIFYING |
| packages/neural-ca/web | @bit-physics/web-neural-ca | 0.0.0 | src/main.ts | `web: true` | QUALIFYING |
| packages/ising-classical/web | @bit-physics/web-ising-classical | 0.0.0 | src/main.ts | `web: true` | QUALIFYING |
| packages/strange-attractors/web | @bit-physics/web-strange-attractors | 0.0.0 | src/main.ts | `web: true` | QUALIFYING |
| packages/boids-3d/web | @bit-physics/web-boids-3d | 0.0.0 | src/main.ts | `web: true` | QUALIFYING |
| packages/physarum/web | @bit-physics/web-physarum | 0.0.0 | src/main.ts | `web: true` | QUALIFYING |

Evidence (MEASURED): every `src/main.ts` imports `exposeCapture` + `createSettingsPanel`
and sets `__bitPhysicsReady`; every `docs/sim-specs/.../spec-ref.md` § Productization
declares `web: true` (no `productization.web: false` anywhere). All 7 criteria of phase
plan § 6.1 hold for all 7 sims.

## § 2 — Each sim's ESTABLISHED gate (reused verbatim by 5.1; web-build-track-charter)

5.1 re-applies each sim's OWN gate to the **browser-emitted** capture. NO tolerance is
added or widened. The browser app's `exposeCapture(...)` payload (MEASURED from each
`main.ts`) and the gate it must clear:

| Sim | Gate kind | Browser-emitted field(s) | Criterion (verbatim from `tools/productization/web-build/gpu_gate.py`) | Canonical |
|---|---|---|---|---|
| reaction-diffusion-2d | capture_roundtrip | steps[]: {U,V} f64 @ interval | `compare_captures` within `[reaction-diffusion-2d]` rel=1e-4 | captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json |
| neural-ca | capture_roundtrip | steps[]: {rgba} f32 @ every 50 | array bit-exact (max_abs==0) vs wgsl canonical | captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000-wgsl.json |
| ising-classical | observable | step 10000: {spins} f64 + energy_per_spin | energy z-score < 3.0 vs NumPy 6-seed ensemble (self-averaging) | (live NumPy ensemble; no committed capture) |
| mandelbulb-explorer | new_canonical | step 0: {points,de} f64 | run-twice byte-identical + f32-vs-f64 DE floor (rel 1e-5 reported) | captures/mandelbulb-explorer-ref/de-probe-points-seed42.json |
| strange-attractors | new_canonical | steps[]: trajectory f64 | run-twice byte-identical + structural minmaxstd rel<0.12, mean abs<1.5 | (live f64 RK4 reference) |
| boids-3d | new_canonical | steps[]: positions/velocities f64 | run-twice byte-identical + step-100 pos<1e-2 + v_max clamp | (live f64 reference) |
| physarum | new_canonical | step 5000: {positions,headings,trail_map} f64 + total_mass | run-twice byte-identical + mass-balance rel<1e-3 | captures/physarum-ref/network-canonical-seed42-step5000.json |

CONSTRAINT (MEASURED): the ising browser `captureCanonical()` is hardcoded to seed 42
(`for (s) sweep(42)`) and emits a single capture; the app does not parameterize the
capture seed (I must not patch the sim). So the browser observable gate is a
**single self-averaging seed-42 sample vs the NumPy reference ensemble** at the SAME
z<3.0 threshold and the SAME observable (`energy_per_spin`) — faithful to the
established gate, NOT a widened tolerance (energy is self-averaging at N=128 by the
gate's own note). Documented in `verify.py` and the spec doc § 4.

## § 2b — Testkit / framework API surface (MEASURED from disk)

- `equivalence.harness.compare_captures(left_manifest_json, right_manifest_json)` →
  `EquivalenceVerdict(within_tolerance, per_field_diff, tolerance_table_used)`. Takes
  `.json` manifest paths (per reconciliation R1). Reused for capture_roundtrip.
- `capture.write_capture(rows: list[StepState], manifest: CaptureManifest, outdir) -> manifest_path`;
  `capture.load_capture(json_path)`; `StepState(step, state: dict[str,np.ndarray], diagnostics)`.
  Used to materialize the browser bundle into an `.h5`+`.json` capture for `compare_captures`.
- Per-sim reference modules under `packages/<sim>/.../reference/` and `.../sim.py` supply
  the f64 oracle / structural reference (imported exactly as `gpu_gate.py` imports them).
- `tools/productization/web-build/gpu_gate.py` — the 7 wgpu-native gates (frozen; 5.1
  imports the reference modules + thresholds it uses, guarded by a parity test, and does
  NOT edit this file).

## § 3 — Existing CI workflow inventory (clash check)

`.github/workflows/`: audit-append-only, binary-release, cpp-strict, determinism,
equivalence, integrity, mutation-testing, pinn-train, preprint-extraction, pypi-release,
python-strict, r2-roundtrip-proof, r2-sweep-proof, render-passes, structure,
tolerance-budget-check, ts-strict. **No `web-deploy.yml` exists** → no clash.

Trigger pattern (MEASURED, pypi-release.yml / render-passes.yml): phase-5 release
workflows trigger on `push: tags ['<prefix>-v*']` + `pull_request: paths` + `workflow_dispatch`
(NOT bare `main` push). web-deploy.yml follows the same pattern (`web-v*`). **Consequence
(FACT):** pushing my three commits to `main` does NOT auto-run web-deploy.yml; the
browser-WebGPU job is the operator's `workflow_dispatch` / PR / tag to fire. It is the one
workflow whose green specifically proves browser delivery — flagged for the operator.

## § 4 — Browser-WebGPU capability probe (THE load-bearing local fact) — CORRECTED

**MAJOR CONTRADICTION vs the web-build track (and vs this probe's own first pass).**
Headless **browser WebGPU IS available in this environment** — the track's "unavailable"
finding (and my initial pass) was a **probe artifact: it tested `about:blank`, a
NON-secure context, where `navigator.gpu` is gated off.** Over a **secure context
(localhost / https)** — how the pipeline serves the built bundle — WebGPU comes up.
MEASURED, Chrome-for-Testing 149 + Mesa/RADV:

| Flags | Target | `navigator.gpu` + adapter |
|---|---|---|
| `--headless=new --enable-unsafe-webgpu --enable-features=Vulkan --use-angle=vulkan` | `about:blank` | **false** (non-secure) |
| same | `http://localhost` | **TRUE** — real adapter |
| same `+ --use-vulkan` | `about:blank` | false |
| same `+ --use-vulkan` | `http://localhost` | **TRUE** |

The enabler is the **secure context**, not `--use-vulkan`. `wgpu-native` also works
(`AMD Radeon RX 6800 XT (RADV NAVI21) via Vulkan`).

VERDICT: the **browser-WebGPU gate RUNS LOCALLY** (ANGLE-Vulkan on the RX 6800 XT) — it
is NOT deferred-to-CI. The driver serves the bundle over localhost, asserts
`navigator.gpu` + a real adapter + the settings panel mounted (the apps have no
Canvas2D/WebGL fallback → a mounted panel proves the WebGPU path engaged), drives the
capture hook, and `verify.py` re-applies each sim's established gate to the
browser-emitted capture. The web-deploy.yml workflow ALSO carries the gate for cloud CI
(ubuntu-latest + Mesa lavapipe) — a second, independent browser-WebGPU backend.

### § 4b — Per-sim browser-WebGPU gate result (MEASURED LOCALLY, real browser WebGPU)

| Sim | Established gate | Browser result | Verdict |
|---|---|---|---|
| mandelbulb-explorer | new_canonical (f32 floor 1e-5) | run-twice identical; f32-vs-f64 DE max_abs **1.5e-5** (== wgpu-native) | **PASS** |
| strange-attractors | new_canonical (determinism + structural) | run-twice identical; all browser points on the dense f64 attractor envelope | **PASS** |
| physarum | new_canonical (determinism + mass) | run-twice identical; total_mass 22499.996 vs 22500 (rel **1.7e-7**) | **PASS** |
| ising-classical | observable (z<3.0) | energy −1.47 vs NumPy ensemble −1.418, **z=1.46** | **PASS** |
| reaction-diffusion-2d | capture_roundtrip (rel 1e-4) | deterministic; matches to step 200 (1e-6) then **diverges to 0.074** by step 2000 | **DIVERGES — surfaced** |
| neural-ca | capture_roundtrip (bit-exact 0/0) | Dawn f32 ≠ wgpu-native bit pattern; max_abs **0.786** | **DIVERGES — surfaced** |
| boids-3d | new_canonical (run-twice byte-identical) | identical to step 400 then **run-to-run non-deterministic** (~0.11 by step 1000); short-horizon 3.2e-3 + v_max OK | **DIVERGES — surfaced** |

The 3 divergences are **NOT tolerance-widening candidates** (Discipline: never widen).
They are real, characterized browser-DELIVERY properties of the Chromium/Dawn/ANGLE-Vulkan
f32 path vs the canonical's wgpu-native f32 path: (1) cross-implementation f32 divergence
in pointwise/bit-exact round-trips of sensitive systems (rd2d, neural-ca — the shaders are
correct: rd2d matches early + ranges + is deterministic), (2) browser FP non-determinism
breaking the mandatory run-twice byte-identity (boids — sensitivity amplifies a 1-ULP
run-to-run wobble Dawn introduces that RADV did not). Surfaced to operator + sim-owner per
phase plan § 5a ("irreducible → SHIFT to sim owner / tolerance-budget amendment; the
diverging bundle does not ship" — deploy is gated off regardless). `tolerance.toml` is
byte-unchanged; the dense structural / pointwise gates remain validated by the web-build
track's wgpu-native `gpu_gate.py`.

## § 5 — Wall-clock estimate for smoke matrix

Per-sim CI (lavapipe software WebGPU is slower than native): vite build ~10–40 s; browser
drive + capture ~30–240 s (physarum 5000 steps / ising 10000 sweeps are the long tails);
verify ~5–60 s. Worst-case per sim ~5 min; 7 sims in parallel matrix (fail-fast: false),
each its own job → wall-clock ≈ slowest job ≈ ~8 min. **< 60 min → no sharding** (phase
plan § 4.12).

## § 6 — Verdicts (four-state)

| Assumption (phase plan § 6.1) | Verdict | Notes |
|---|---|---|
| Every qualifying Stack-B sim has a succeeding Vite build | CONFIRMED | 7/7 vite 6.4.3 builds (re-measured in commit 2) |
| Each exposes a capture-export hook | CONFIRMED | `exposeCapture` in all 7 `main.ts` |
| Each has a settings panel (§10.1: tier/seed/capture) | CONFIRMED | shared `createSettingsPanel`, `[data-bp-panel]`/`[data-bp="capture"]` |
| None declare `productization.web: false` | CONFIRMED | all 7 spec sheets declare `web: true` |
| Headless browser WebGPU initializes for the bootstrap gate | CONFIRMED (SHIFT vs track) | AVAILABLE locally over a secure context (§4) — the track's "unavailable" was an about:blank artifact; the gate RAN LOCALLY, 4/7 PASS, 3/7 characterized-divergent (§4b), surfaced, no widening |
| `deploy` stays gated off (no live hosting) | CONFIRMED | `actions/deploy-pages` gated on `workflow_dispatch + confirm_deploy=true`; never run in Phase 5 |
| No tolerance added/widened | CONFIRMED | `verify.py` reuses each sim's established threshold; `tolerance.toml` byte-unchanged |
