---
date: 2026-06-09T02-39-17Z
author: phase-5 web-build track PHASE-0 charter session (Claude Code)
subject: "Phase-5 WEB-BUILD track — PHASE-0 charter. Per-sim build inventory + named verification gate + build order + toolchain for the 7 Stack-B web sims that have no web build, so sub-phase 5.1 (web-deploy) has qualifying frontends to validate. CHARTER ONLY — no frontend built. Oriented from committed repo state with NO prior context."
kind: batch-charter
artifact: stage
verdict: PROPOSED
phase: 5
sub_phase: "web-build-track"
head_sha: e511540d69e27d265148ca6564f746cbbf9aae48
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
parent_audits:
  - "[[reconciliation-2026-06-02T01-15-23Z]]"
  - "[[sub-phase-pypi-release-5.3-landing-2026-06-08T14-54-09Z]]"
  - "[[sub-phase-render-passes-5.4-landing-2026-06-09T01-01-11Z]]"
  - "[[sub-phase-preprint-extraction-5.5-landing-2026-06-09T02-18-00Z]]"
evidence_paths:
  - docs/phases/phase-5-web-build-track.md
  - docs/phases/phase-5-productization.md
  - tools/testkit/equivalence/tolerance.toml
  - common/common-ts/package.json
  - packages/reaction-diffusion-2d/src/index.ts
  - packages/ising-classical/src/index.ts
  - packages/neural-ca/typescript/src/index.ts
evidence_hashes:
  docs/phases/phase-5-web-build-track.md: sha256:763361d0a451b7d49dbb550d62b4322a9aa1408fe48b2fce06e55b86dd404f4e
---

# Phase 5 — WEB-BUILD track — PHASE-0 charter (per-sim inventory + named gate + order)

> **CHARTER ONLY. NO frontend authored, NO `web-deploy.yml`, NO `package.json`
> committed by this pass.** This document is the per-sim build map + named
> verification gate + build order + toolchain decision that PHASE 1 (the
> self-driven build) executes once ratified. FACT = ran/read/measured at the
> cited HEAD this session; INFERENCE = reasoned. Four-state verdicts
> (CONFIRMED / SHIFTED / BLOCKED / FLAGGED). Resumed with NO prior context —
> oriented ONLY from committed repo state (§0). Commits direct to `main`
> (trunk-based). **NO tag (I7).** **HARD-STOP at §E for operator ratification.**

## §0 — Headline

| | |
|---|---|
| **Pass HEAD** | `6b38011` (5.5 closed here; this charter lands on top; `head_sha` back-filled per Convention #12 — FACT) |
| **Local vs origin** | local `main` is **4 commits ahead of origin/main** (5.2–5.5 landings + back-fills not yet pushed). Clean tree bar two pre-existing untracked `common/common-ts/**/package-lock.json`. Trust live state (#8). — FACT |
| **Disk** | **578 GB free** (`/dev/nvme0n1p5`, 10% used). Node web builds are MB-scale; ample. — FACT |
| **Node toolchain** | `node v22.22.3` ✓, `npm 10.9.8` ✓. **`pnpm` ABSENT, `corepack` ABSENT** — yet the repo commits `pnpm-lock.yaml` + `pnpm-workspace.yaml`. Network present (`npm install` already produced the untracked `package-lock.json`). **Toolchain DECISION required (§D).** — FACT |
| **Headless WebGPU** | **Chromium 149.0.7827.53 (snap)** present; Vulkan ICDs include a **real AMD Radeon RX 6800 XT (RADV)** + **llvmpipe/lavapipe** software fallback. Headless WebGPU is *plausible* but UNPROVEN — first PHASE-1 probe. — FACT (presence) / INFERENCE (WebGPU bring-up) |
| **The 7 sims** | all **`web: true`** live (§13 confirmed). **3 WGSL-seeded** (rd2d, ising-classical, neural-ca) + **4 greenfield** (boids-3d, physarum, mandelbulb-explorer, strange-attractors). — FACT |
| **Big surprise #1** | the 3 WGSL "TS entries" are **Node-targeted capture emitters**, NOT browser frontends (use `node:fs` to read `.wgsl`, `h5wasm/node` + `node:crypto` to write captures, no canvas/DOM/settings-panel). neural-ca's is a **stub** (`throw "Stage 1b-B"`). The shader + param-buffer layout are reusable; the *browser surface* is unwritten for all 7. — FACT |
| **Big surprise #2** | **neural-ca's committed canonical is ALREADY WGSL** (`stack: wgsl / wgpu-native-vulkan, f32, epsilon`) — the strongest round-trip target. — FACT |
| **Big surprise #3** | the verification gate is **NOT uniform**. Per-sim: 2 clean cross-stack round-trips (rd2d, mandelbulb), 1 same-shader round-trip (neural-ca), 1 statistical-observable (ising — its own code says WebGPU RNG ≠ NumPy PCG64), 1 needs-a-measured-budget (boids), 2 new-canonical-determinism+anchors (physarum atomics, strange-attractors chaos). **Named per sim in §B.** — FACT/INFERENCE |
| **Verdict** | **PROPOSED** — charter complete; HARD-STOP for ratification. No build performed. |

## §1 — Method / what was measured (FACT)

Read in full: `phase-5-web-build-track.md` (the work-list), `phase-5-productization.md`
§6.1 (the web-deploy gate), `reconciliation-2026-06-02…` (R1 programmatic bootstrap +
R2 §13 five-boolean + R3 tolerance routing), the 5.3 landing (the 3.8 bootstrap-gate
recipe + the Stage-0/1/2 + Convention #12 disciplines), `sub-phase-conventions.md`
(Stage pattern, Convention A append-only, #12 SHA back-fill, NO-tag default).

Measured live, not from the prompt (#8):
- `find packages -name package.json -o -name 'vite.config.*'` under `packages/` = **∅**
  (the only Node project is `common/common-ts/`). FACT — confirms 5.1 BLOCKED premise.
- The 3 `.wgsl` + 3 `.ts` entries exist and were READ (see §A). FACT.
- Every one of the 7 sims has a committed `captures/<sim>-ref/` canonical `.json`+`.h5`;
  each manifest's `sim`/`stack`/`config.dtype`/`determinism` was inspected (see §B). FACT.
- `tools/testkit/equivalence/tolerance.toml` was read for existing cross-stack budgets
  (see §B). FACT.
- Headless capability probed read-only: `chromium --version`, `vulkaninfo --summary`,
  `/usr/share/vulkan/icd.d/`. FACT.
- All 7 `productization.web` flags read live from each `spec-ref.md` §13 = `true`. FACT.

## §2 — The 7 sims: live inventory (bucket + what-exists + what's-needed)

> "Current TS/WGSL surface" measured by reading the files, not inferred from the
> scoping note. The scoping note labeled rd2d/ising/neural-ca "PARTIAL"; the
> measured reality is **the shaders + param layout exist but the browser frontend
> (canvas render, settings panel, browser capture export) is unwritten on all 3** —
> their `index.ts` targets Node, not a Vite/browser bundle.

| # | Sim | Bucket | What EXISTS today (measured) | What a real web build NEEDS |
|---|---|---|---|---|
| 1 | reaction-diffusion-2d | WGSL-seeded | `gray_scott.wgsl` (63 L, ping-pong compute) + `src/index.ts` (207 L, **Node** driver: `readFileSync` WGSL, `CaptureWriter`→`h5wasm/node`, full param-buffer + manifest). No canvas/DOM/panel. | `package.json`+Vite; `.wgsl` via `?raw` import; **browser** RAF render to `<canvas>`; settings panel; browser/Playwright capture-export hook |
| 2 | ising-classical | WGSL-seeded | `metropolis.wgsl` (81 L, checkerboard parallel-Metropolis) + `src/index.ts` (196 L, **Node** driver, LCG seeded IC, writes `spins` field). Code comment: "bit-stream differs from NumPy's PCG64". No browser surface. | as rd2d; + the gate caveat (§B) |
| 3 | neural-ca | WGSL-seeded | `nca_inference.wgsl` (135 L) + `typescript/src/index.ts` (46 L, **STUB** — `throw "Stage-1b-B"`). The real WGSL canonical was generated by `python/neural_ca/wgsl_harness.py` (wgpu-py native). Reads LFS checkpoint. | implement the driver (port the wgsl_harness logic to browser); + as rd2d; + fetch/embed the LFS `.safetensors` checkpoint |
| 4 | boids-3d | Greenfield | Python only: `boids_3d/{sim,reference,invariants}.py`, golden+PBT tests, `pyproject.toml`, `captures/boids-3d-ref/`. NO WGSL, NO TS. | FULL: author WGSL compute (Reynolds 3 rules, neighbor sums) + render (instanced) + bundle + panel + capture-export |
| 5 | physarum | Greenfield | Python only (Jones-2010): `physarum/{sim,reference,invariants}.py`, tests. `atomic_ops:True` canonical. | FULL: WGSL agent compute + **atomic trail deposit** + diffuse/decay + render + bundle + panel + capture-export |
| 6 | mandelbulb-explorer | Greenfield | Python only (Quilez p8 DE): `mandelbulb_explorer/{sim,reference/quilez}.py`, `de-probe-points` canonical (16×16). | FULL: WGSL **fragment ray-march** (closed-form DE) + bundle + panel + capture-export (DE probe-point readback) |
| 7 | strange-attractors | Greenfield | Python only: `strange_attractors/{sim,integrator,reference/{lorenz,aizawa,sprott,rossler}}.py`. Lorenz trajectory canonical (chaotic). | FULL: WGSL point-cloud integrator (Lorenz/…) + additive-blend render + bundle + panel + capture-export |

## §A — Per-sim BUILD INVENTORY (bundle / WGSL wiring / panel / capture hook)

**Shared harness (rule-of-three — settle ONCE in `common/common-ts/`, the scoping
note §5 forward-flagged this):**
- **Bundle shape.** Per-sim `packages/<sim>/web/` containing `index.html`,
  `src/main.ts`, `vite.config.ts`, `package.json` (or a single aggregating Vite root
  under `tools/productization/web-deploy/web/bundle/` per §6.1 — but the *build* must
  live with the sim so 5.1 only deploys). **DECISION (§D):** npm + Vite, lockfile
  committed.
- **WGSL bundling.** Vite `?raw` text import (`import shader from './x.wgsl?raw'`) — no
  extra plugin needed; replaces the Node `readFileSync(...wgsl)` path. Settle the import
  convention in a shared `common-ts` helper.
- **Settings panel (spec §10.1).** ONE shared `@bit-physics/common-ts` component
  (`tier`, `seed`, `capture-to-disk` at minimum) rather than 7 bespoke panels. Absent on
  all 7 today.
- **Capture-export hook.** **Preferred (low-risk):** the browser bundle exposes the raw
  state arrays on `window` (or a callback); the **Playwright/Node driver** writes the
  `.h5`+`.json` via the EXISTING `common-ts` Node `CaptureWriter` — this reuses the
  proven, cross-stack-tested writer and sidesteps a browser-h5wasm port. **Alternative:**
  a browser h5wasm `CaptureWriter` variant (common-ts already freezes `Date.now` for the
  write window per the determinism contract, per the scoping note §5) emitting a
  downloadable blob. PHASE 1 picks per the 5.1 round-trip recipe (R1: Playwright Chromium
  re-emit → `compare_captures`), which favors the Node-driver path.

Per-sim specifics layered on the shared harness:

- **rd2d** — reuse `gray_scott.wgsl` + the existing param-buffer/manifest logic verbatim
  (only swap Node I/O for browser RAF + `?raw`). Lowest-risk of all 7.
- **ising-classical** — reuse `metropolis.wgsl` + driver; render `spins` as a domain
  image. Gate caveat in §B.
- **neural-ca** — implement the stubbed driver by porting `wgsl_harness.py`'s buffer
  binding/dispatch to browser; embed/fetch the LFS checkpoint (`neural-ca-emoji-disk.safetensors`,
  already materialized locally per the 5.3 landing). The canonical is WGSL → cleanest match.
- **boids-3d / physarum** — author WGSL compute (Reynolds rules; Jones agents + atomic
  trail) from the Python `sim.py`/`reference.py` algorithm; instanced/point render.
- **mandelbulb-explorer** — author a fragment-shader ray-march of the SAME closed-form DE
  (`reference/quilez.py`); capture re-emits the 16×16 DE probe points by evaluating the DE
  at the canonical sample coords (NOT screen pixels).
- **strange-attractors** — author a WGSL integrator (port `integrator.py` + `reference/lorenz.py`);
  render the point cloud.

## §B — The VERIFICATION SURFACE (named gate per sim — the load-bearing section)

Every web build clears **two universal gates** + **one per-sim correctness gate**:

- **(i) §6.1 Vite-build-succeeds** — `vite build` exit 0. Load-bearing, all 7. Concrete.
- **(ii) Headless run** — the bundle initializes WebGPU in headless Chromium and runs N
  steps with **error count = 0**. All 7. (§6.1 documented fallback: if headless WebGPU
  init fails, degrade to "page loads, error count = 0" — but see §D FLAG: this host has a
  real RADV GPU + lavapipe, so true WebGPU bring-up is the target.)
- **(iii) Per-sim correctness gate** — the heterogeneous, honest part. **Every one of the
  7 has a committed `captures/<sim>-ref/` canonical**, so a round-trip is *structurally*
  available — but whether the WebGPU(f32, parallel) output can MATCH the canonical
  field-for-field varies sharply. Measured disposition:

| # | Sim | Canonical stack / dtype | Round-trip feasible? | **NAMED correctness gate** | Tolerance row |
|---|---|---|---|---|---|
| 1 | reaction-diffusion-2d | numpy-reference / f64 | **YES** — deterministic diffusion-reaction, no RNG in dynamics | **Cross-stack capture round-trip** vs `reaction-diffusion-2d-ref` via `compare_captures` | **EXISTS**: `[overrides.reaction-diffusion-2d]` rel=1e-4 (AT-BUDGET) — PHASE 1 MEASURES f32-GPU vs f64-NumPy stays ≤1e-4 over 2000 steps |
| 2 | mandelbulb-explorer | numpy-reference / f64 closed-form | **YES** — closed-form DE, no accumulation | **Cross-stack round-trip** of the 16×16 DE probe-points vs `mandelbulb-explorer-ref` | **EXISTS**: `[defaults.closed_form]` rel=1e-5 — PHASE 1 measures f32 DE eval ≤1e-5 |
| 3 | neural-ca | **wgsl / wgpu-native-vulkan / f32 / epsilon** | **YES (strongest)** — canonical IS WGSL; same shader + same frozen checkpoint | **Same-shader round-trip** vs `neural-ca-ref(-wgsl)` | `[defaults.continuous-ca]=0.0/0.0` (5.3, for the bit-exact PyTorch path). Browser-WGSL vs native-WGSL may be epsilon, not bit-exact → PHASE 1 MEASURES; if >0, declare a small MEASURED `[overrides.neural-ca]` + budget (operator-gated) |
| 4 | boids-3d | numpy-reference / f64 | **PARTIAL** — f32 parallel neighbor-sum reduction order ≠ sequential f64 NumPy | **Cross-stack round-trip vs `boids-3d-ref`, GATED on a MEASURED budget** — NO `[defaults.agent-based]`/`[overrides.boids-3d]` row exists. Fallback if divergence too large: **new-canonical** (run-twice determinism + the sim's golden/PBT invariants: separation/alignment/cohesion conservation) | **MISSING** — needs a MEASURED `[overrides.boids-3d]` + `[budgets.agent-based.cross_stack]` cap (Cat-X requires the cap; operator-gated). SURFACED §E |
| 5 | physarum | numpy-reference / f64, **atomic_ops:True** | **NO (likely)** — atomic trail deposit order is non-deterministic across the parallel grid vs sequential NumPy | **New-canonical: run-twice determinism (epsilon posture) + the sim's anchors** (deposit-golden, mass/decay PBT invariants). NOT a pointwise NumPy round-trip. | new-canonical → gated by its own determinism + anchors, no cross-stack row needed |
| 6 | ising-classical | numpy-reference / f64 | **NO** — its OWN `index.ts` states the WebGPU LCG/checkerboard update "differs from NumPy's PCG64; cross-stack equivalence is Phase-4+ scope" | **Statistical-observable anchor** (energy/magnetization at T=2.27 vs Onsager/analytic — the §13 preprint anchors) **OR new-canonical determinism+anchors**. NOT a spin-field round-trip. | `[defaults.lattice-spin]=0.0/0.0` is the *single-stack* (NumPy↔NumPy) row; it does NOT certify a WebGPU↔NumPy spin round-trip. Gate is observable-based, no field tolerance row |
| 7 | strange-attractors | numpy-reference / f64, **chaotic Lorenz** | **NO (full trajectory)** — f32 integration of a chaotic system diverges exponentially from f64 within ~10³ steps (positive Lyapunov) | **Structural/statistical anchors** (`test_lorenz_structural_golden`: attractor bounding box / invariant measure / short-horizon agreement) + run-twice determinism. NOT a pointwise 10⁴-step round-trip. | `[defaults.closed_form] rel=1e-5` would FAIL pointwise on chaos → do NOT use it for the full trajectory; gate is structural |

**Summary of the gate taxonomy (the honest answer to part B):**
- **Clean cross-stack round-trip, budget already in `tolerance.toml`:** rd2d, mandelbulb (2).
- **Same-shader round-trip, may need a small MEASURED row:** neural-ca (1).
- **Round-trip pending a MEASURED operator-gated budget, else new-canonical:** boids-3d (1).
- **New-canonical (run-twice determinism + sim anchors), no NumPy field match:** physarum
  (atomics), strange-attractors (chaos) (2).
- **Statistical-observable anchor (its own code rules out a field round-trip):** ising (1).

None of these is "it renders." Each names the actual artifact compared and the actual
pass criterion.

## §C — BUILD ORDER + BATCHING (recommendation)

**Risk-ascending order** (lowest gap + cleanest gate first; de-risks the shared harness
before the hard physics):

1. **reaction-diffusion-2d** — shader + driver exist; cross-stack budget exists; pure
   deterministic. **This is the harness-shakedown sim** — it forces the shared
   Vite/`?raw`/panel/capture-export decisions into existence against the easiest gate.
2. **mandelbulb-explorer** — greenfield but the *simplest greenfield* (single fragment
   ray-march, no compute ping-pong, no RNG, closed-form gate already budgeted).
3. **neural-ca** — shader exists; strongest (same-shader) round-trip; but needs the LFS
   checkpoint fetch/embed + driver implementation. Higher wiring cost, low gate risk.
4. **ising-classical** — shader + driver exist, but the gate shifts to statistical
   observables (new work) — do it once the harness is proven.
5. **boids-3d** — greenfield compute + the measured-budget decision.
6. **strange-attractors** — greenfield + chaos → structural-anchor gate.
7. **physarum** — greenfield + atomics → hardest shader + new-canonical gate. Last.

**Batching recommendation:** **THREE PHASE-1 batches**, not one self-driving run — the
shared harness must be *proven* before the hard sims, and the gate work (measured
budgets, statistical anchors, structural anchors) is per-sim research, not mechanical:
- **Batch 1 (harness + easy gates):** rd2d + mandelbulb. Lands the shared
  Vite/panel/capture-export/`?raw` harness in `common-ts` + the first 2 frontends + the
  first headless-WebGPU probe. Smallest blast radius.
- **Batch 2 (shader-exists / wiring):** neural-ca + ising. LFS checkpoint + the
  observable-anchor gate.
- **Batch 3 (greenfield-hard):** boids + strange-attractors + physarum. The measured
  budget, chaos structural anchors, atomics.
Each batch is its own Stage-0/1/2 mini-cycle with a landing audit, per the conventions.

## §D — TOOLCHAIN (decision + flags)

**DECISION (proposed): npm + Vite, lockfile committed; do NOT depend on pnpm.**
- **Why.** `pnpm`/`corepack` are ABSENT; `npm 10.9.8` is present and already in use
  (the untracked `common/common-ts/**/package-lock.json` prove an `npm install` ran).
  The committed `pnpm-lock.yaml`/`pnpm-workspace.yaml` are NOT actually wired as a
  workspace (the `pnpm-workspace.yaml` has **no `packages:` field** — only a
  `minimumReleaseAgeExclude` list), so nothing depends on pnpm resolution. Mirrors the
  de-Docker portable-toolchain pattern (5.2/5.4/5.5): pin to the locally-available
  toolchain, commit the lockfile, avoid an absent global tool.
- **Pin.** Vite + `@vitejs/plugin-*` pinned in each `package.json`; `node>=22` engines
  (matches `common-ts`). `@webgpu/types` already vendored in `common-ts`.
- **Drift to clean up (SURFACED §E):** the repo carries `pnpm-lock.yaml` AND untracked
  `package-lock.json` for the same `common-ts`. PHASE 1 should converge on ONE
  (recommend committing `package-lock.json`, retiring or regenerating the pnpm lock) to
  avoid a two-lockfile integrity ambiguity.

**Capability FLAGS:**
- **Headless WebGPU (load-bearing, UNPROVEN).** Chromium 149 (snap) + Vulkan (real RADV
  6800 XT + lavapipe) are present → bring-up is *plausible*. **First PHASE-1 action: a
  read-only probe** — launch headless Chromium with `--headless=new --enable-unsafe-webgpu
  --enable-features=Vulkan` and confirm `navigator.gpu.requestAdapter()` resolves. **Snap
  confinement may block** the flags/socket — if so, fall back to (a) a non-snap Chromium,
  (b) Playwright's bundled Chromium (`npm install` it — network present), or (c) the
  §6.1 documented "page loads, error count = 0" degradation. The wgpu-py native harness
  (`neural_ca/wgsl_harness.py`) is a **shader-equivalence cross-check, NOT the §6.1
  browser gate** — it validates the `.wgsl`, not the Vite bundle.
- **Playwright not installed** — `npx --no-install` can't fetch it offline, but
  `npm install -D playwright` has network. Needed for the capture round-trip driver
  (Batch 1).
- **LFS checkpoint (neural-ca)** — `neural-ca-emoji-disk.safetensors` is already
  materialized locally (per the 5.3 landing); no R2 fetch needed for the build. R2 creds
  remain ABSENT (carried FLAG) — only matters if a fresh fetch is required.

## §E — STOP / SURFACED for operator (decide / ratify) — HARD-STOP

**No frontend, no `package.json`, no `web-deploy.yml` was authored.** This charter is the
only artifact this pass writes. PHASE 1 begins on `continue` (or amended scope).

Surfaced decisions:

1. **Toolchain: ratify npm + Vite** (not pnpm), lockfile committed, per §D. Confirm the
   two-lockfile cleanup direction (commit `package-lock.json`, retire pnpm lock).
2. **Batching: ratify 3 batches** (rd2d+mandelbulb → neural-ca+ising → boids+strange+physarum),
   each a Stage-0/1/2 cycle, vs. one self-driving run. (Recommend 3.)
3. **boids-3d gate (§B row 4): authorize PHASE 1 to MEASURE** the f32-GPU vs f64-NumPy
   round-trip and, if it diverges past bit-exact, add a MEASURED `[overrides.boids-3d]`
   relative/absolute + the required `[budgets.agent-based.cross_stack]` cap
   (operator-gated per Cat-X — overrides REQUIRE a budget cap or integrity HARD_FAILs).
   If divergence is too large for any honest budget → fall back to **new-canonical**
   (determinism + the sim's golden/PBT anchors). Confirm the operator is OK with EITHER
   outcome being declared from measurement.
4. **ising-classical gate (§B row 6): ratify the statistical-observable anchor** (energy/
   magnetization vs analytic) as the correctness gate — NOT a spin-field round-trip (the
   sim's own code rules that out). Confirm this is acceptable vs. treating the WebGPU
   output as a new-canonical.
5. **physarum / strange-attractors gates (§B rows 5,7): ratify new-canonical** (run-twice
   determinism + the sim's structural/PBT anchors) rather than a NumPy field round-trip
   (atomics / chaos make pointwise match physically impossible).
6. **neural-ca (§B row 3): authorize a small MEASURED `[overrides.neural-ca]`** if
   browser-WGSL vs native-WGSL is epsilon rather than bit-exact (measure-then-declare).
7. **Headless WebGPU capability (§D):** acknowledge the first PHASE-1 act is the
   capability probe; ratify the §6.1 "page loads, error count = 0" fallback if true
   WebGPU bring-up fails under snap confinement.
8. **Push posture:** local `main` is 4 commits ahead of origin (unpushed 5.2–5.5). PHASE
   1 will need a push (and the §S.5 CI sweep); confirm push is desired now or deferred.

## §6 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt / scoping note) | Measured / reasoned | Disposition |
|---|---|---|---|
| C-1 | 3 WGSL sims "PARTIAL — shader+entry exist; add bundle" | the `.ts` entries are **Node capture-emitters** (node:fs / h5wasm/node), NOT browser frontends; neural-ca's is a STUB. Browser surface unwritten on all 3 | SHIFTED — reuse shader+param layout; the *frontend* is greenfield-ish for all 3 |
| C-2 | Greenfield 4 have "no canonical to match → new-canonical" | **all 4 have a committed `captures/<sim>-ref/`** | SHIFTED — round-trip is structurally available; feasibility varies (§B). boids/mandelbulb can round-trip; physarum/strange cannot (atomics/chaos) |
| C-3 | "the 3 WGSL-seeded first — lower risk" | rd2d yes; but ising's gate is hard (statistical) and neural-ca needs LFS+driver. **mandelbulb (greenfield) is lower-risk than ising** | SHIFTED — order is risk-ascending across both cohorts (§C), not strictly cohort-first |
| C-4 | gate = "capture round-trip vs canonical (same as 5.3)" for most | true for rd2d/mandelbulb/neural-ca; **ising's own code + physarum atomics + strange chaos make a field round-trip impossible** | SHIFTED — 3 distinct gate types named (§B); never "it renders" |
| C-5 | toolchain = pnpm (committed lockfile) | pnpm/corepack ABSENT; npm present + already used; pnpm-workspace defines no packages | SHIFTED — npm+Vite (§D); de-Docker portable pattern |
| C-6 | headless WebGPU a likely blocker | real RADV GPU + lavapipe + Chromium 149 present → plausible | FLAGGED — probe first; §6.1 fallback documented |
| C-7 | render_similarity (0.9242) + variant (0.8702) HARD floors | this charter touches NO `render_similarity/`/`variant/` source — only this doc | UNAFFECTED |

## §7 — Closing

PHASE-0 charter COMPLETE; verdict **PROPOSED**. The 7 `web:true` Stack-B sims are
inventoried live (§2/§A): **3 WGSL-seeded** (shaders + param layout exist, but as
Node capture-emitters — browser frontend unwritten; neural-ca stubbed) + **4 greenfield**
(Python-only). The **verification surface is named per sim** (§B) and is deliberately
heterogeneous: 2 budgeted cross-stack round-trips (rd2d, mandelbulb), 1 same-shader
round-trip (neural-ca), 1 measured-budget-or-new-canonical (boids), 2 new-canonical
determinism+anchors (physarum atomics, strange chaos), 1 statistical-observable (ising)
— each a REAL artifact-vs-criterion gate, never "it renders." **Build order is
risk-ascending** (rd2d → mandelbulb → neural-ca → ising → boids → strange → physarum) in
**3 PHASE-1 batches** (§C). **Toolchain is npm + Vite** (pnpm absent; de-Docker portable
pattern, §D), with the **headless-WebGPU probe as the first PHASE-1 act** (real GPU +
lavapipe present; §6.1 fallback documented). **No frontend was built; no `web-deploy.yml`
authored; no tag (I7).** Eight items are surfaced for ratification (§E). **HARD-STOP —
resume on `continue` or amended scope.**
