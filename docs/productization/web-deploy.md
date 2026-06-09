# Productization — web-deploy

> Phase 5 sub-phase: 5.1. Authored by: phase-5-web-deploy-agent (planning); extended by: per-sim authors (post-phase).
> Architecture: see `docs/phases/phase-5-productization.md` § 5 (shared) and § 6.1 (sub-phase-specific).

## 1. Purpose

The web-deploy pipeline build-and-validates the 7 Stack-B WebGPU web frontends
(`packages/<sim>/web/`, built by the Phase-5 web-build track) into
headless-deployable static bundles, and re-verifies each through a **real headless
browser**: it serves the production Vite build, loads it in headless Chromium with
WebGPU, drives the `common/common-web` capture-export hook, and re-applies the sim's
**own established gate** (the web-build-track-charter gate — `capture_roundtrip`,
`observable`, or `new_canonical`) to the **browser-emitted** capture. This closes the
browser-WebGPU round-trip the web-build track validated only on `wgpu-native`. The
artifact is a deployable web demo per sim; the consumer (post-phase) is GitHub Pages.
No tolerance is added or widened; the `deploy` job is gated off.

## 2. Pipeline shape

- **build-and-validate** (CI-gated): matrix `sim ∈ {the 7}`, `ubuntu-latest`. Per job:
  Vite production build (§6.1) → headless browser-WebGPU drive + capture → `verify.py`
  re-applies the sim's gate. Triggers: `push: tags ['web-v*']`, `pull_request` on the
  tool tree / workflow / web surfaces, `workflow_dispatch`. (Does NOT run on bare `main`
  push — like the other Phase-5 release workflows.)
- **deploy** (GATED OFF): `actions/deploy-pages` to GitHub Pages, gated on
  `workflow_dispatch + confirm_deploy=true`. Never runs in Phase 5.
- Concurrency `web-deploy-${{ github.ref }}`, cancel-in-progress false. Caching: npm via
  `setup-node`. Permissions: `contents: read` baseline; `pages: write` + `id-token: write`
  on the deploy job only.

## 3. Qualifying sim criteria (verbatim from phase plan § 6.1)

All must hold: (a) a Vite build that succeeds; (b) a capture-export hook; (c) a settings
panel per spec § 10.1 (tier/seed/capture); (d) does not declare `productization.web: false`
in its spec sheet § 13. Sims missing any → DEFERRED to sim owner (Phase 5 does not patch
sims). **All 7 Stack-B sims qualify** (probe `tools/testkit/probes/reports/phase-5-web-deploy.md`).

## 4. Smoke test contract

Per qualifying sim, build-and-validate =

1. **Vite build** succeeds, exit 0 (§6.1).
2. **Headless browser-WebGPU run**: serve the built bundle over localhost (a SECURE
   context — required for `navigator.gpu`), load in headless Chromium, assert the WebGPU
   path engaged (`navigator.gpu` + a real adapter + the settings panel mounted — the apps
   have NO Canvas2D/WebGL fallback, so a mounted panel proves WebGPU booted), drive the
   capture-export hook, zero unexpected console errors.
3. **Browser capture → the sim's established gate** (`verify.py`, no widening):
   - `capture_roundtrip` — rd2d (`compare_captures` rel=1e-4), neural-ca (bit-exact 0/0).
   - `observable` — ising (`energy_per_spin` z-score < 3.0 vs the NumPy reference ensemble;
     the app pins the capture seed → single self-averaging sample vs ensemble, same
     observable + same 3.0 threshold).
   - `new_canonical` — mandelbulb / strange / boids / physarum: run-twice BYTE-IDENTICAL
     (two browser captures) + the sim's structural anchors (f32 DE floor / on-attractor
     envelope / short-horizon + v_max / mass-balance).

The thresholds are byte-equal to the web-build track's `gpu_gate.py` (asserted by
`smoke/test_pipeline.py`). **WebGPU is a different f32 implementation than the canonical's
`wgpu-native`** — see § 6 / § 8 for the characterized cross-implementation divergences.

WebGPU runs Chromium-only (Safari/Firefox WebGPU is partial — caniuse: Chrome/Edge stable
since 113, Firefox behind a flag on some platforms, Safari 18+ partial). The smoke is
Chromium-only by design.

## 5. Sharding scheme

Not required; the 7-job matrix fits within budget (worst sim ~5 min; jobs run in parallel,
wall-clock ≈ slowest job ≈ ~8 min < 60 min per § 4.12).

## 6. Failure modes

- **CI red on `build-and-validate`**: a sim's browser capture did not clear its established
  gate. This is the pipeline WORKING — it surfaces a real browser-delivery divergence
  (cross-implementation f32 round-trip miss, or browser FP non-determinism). It does NOT
  widen a tolerance to go green. Disposition per phase plan § 5a: investigate; if irreducible,
  SHIFT to sim owner / propose a tolerance-budget amendment for the operator. The diverging
  sim's bundle does not ship (deploy is gated off regardless).
- **CI red on `deploy`**: should not happen — gated on `workflow_dispatch + confirm_deploy`.
- **Re-running on the same SHA**: safe and idempotent (deterministic build + gate; captures
  are written to a fresh temp dir).
- **Per-sim DEFERRED**: a sim that loses a qualifying criterion — sim owner restores the
  Vite build / capture hook / settings panel; not patched by this pipeline.
- **Browser WebGPU absent (a WebGPU-less runner)**: `--require-webgpu` (default) FAILs;
  `--allow-webgpu-deferral` reports `deferred` for a genuinely WebGPU-less box. The gate is
  never silently replaced by a DOM-load pass.

## 7. Go-live runbook

1. Register the repo for GitHub Pages (Settings → Pages → GitHub Actions source).
2. Configure COOP/COEP response headers if any sim uses `SharedArrayBuffer`
   (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`)
   — Pages needs a `_headers`/worker shim; document per sim.
3. Pin `actions/deploy-pages` and `actions/upload-pages-artifact` to release SHAs.
4. Dispatch `web-deploy.yml` with `confirm_deploy=true` to run the deploy job once
   build-and-validate is green for the shipping set.
5. Decide the disposition of the cross-implementation-divergent sims (§ 8) before shipping
   them (browser-specific canonical / tolerance-budget amendment / structural-only gate).

## 8. Open issues / DEFERRED items

- **Browser-WebGPU f32 ≠ wgpu-native f32 (load-bearing).** The browser-WebGPU gate ran
  locally (ANGLE-Vulkan, RX 6800 XT) and in CI (lavapipe) — both real browser WebGPU, both
  a DIFFERENT f32 implementation than the canonical's `wgpu-native`. Measured: **mandelbulb,
  strange, physarum, ising PASS** their established gate through the browser; **rd2d**
  (round-trip rel 1e-4 — browser diverges to 0.074 by step 2000; deterministic, correct
  early + ranges) and **neural-ca** (bit-exact 0/0 — browser 0.786) miss their pointwise/
  bit-exact gate cross-implementation; **boids** (mandatory run-twice byte-identity) is
  **run-to-run non-deterministic in the browser** (identical to step 400, then a 1-ULP Dawn
  wobble amplifies in the sensitive flock). These are SURFACED to operator + sim-owner; NO
  tolerance is widened. Options: (a) mint a browser-specific canonical/tolerance per spec
  § 2.6 (operator-approved); (b) gate these sims at the structural/observable level for
  browser delivery (the pointwise/bit-exact/determinism gates remain validated by the
  web-build track's wgpu-native `gpu_gate.py`); (c) pin a different browser WebGPU backend.
- **ising capture seed is pinned (seed 42)** in the app → the browser observable gate uses a
  single self-averaging sample vs the NumPy ensemble (faithful; same 3.0 threshold). A
  multi-seed browser ensemble would need the app to parameterize the capture seed (sim-owner).
- **strange/boids capture is subsampled** (trajectory/frames at the capture interval) → the
  dense structural-invariant statistic can't be reconstructed browser-side; the browser gate
  uses determinism + on-attractor containment (strange) / short-horizon + v_max (boids). The
  dense gate stays wgpu-native.

## 9. Extending coverage (post-phase contributor note)

**(a) Prerequisites.** The new sim must be a qualifying Stack-B web sim: a `packages/<sim>/web/`
Vite app importing `common/common-web` `createSettingsPanel` + `exposeCapture`, setting
`window.__bitPhysicsReady`, and a committed canonical (or live reference) with an established
web-build-track gate in `tools/productization/web-build/gpu_gate.py`.

**(b) Wiring.** Add the sim to `GATE_KIND` in `pipeline.py` and `verify.py` (with its gate
kind + thresholds, which must already exist verbatim in `gpu_gate.py` — the parity test
enforces this), add a per-sim gate in `verify.py`, and the matrix picks it up automatically
(`discover_qualifying_sims` walks `packages/*/web`). Add the sim to the workflow's
`pull_request` path globs if needed.

**(c) Validation.** Locally: `pipeline.py validate --sim <sim> --artifacts /tmp/out`
(over a secure-context localhost — the driver provides it). Confirm Vite build exit 0, the
browser-WebGPU path engages, and the gate verdict. Run `smoke/test_pipeline.py`
(no browser needed) to confirm the harness + no-widening parity.
