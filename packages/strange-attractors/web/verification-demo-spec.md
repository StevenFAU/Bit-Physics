# Spec — Lorenz Verification-Visible Demo (Stack-B web frontend)

> **Sim:** `strange-attractors` (Lorenz, `closed-form`)
> **Surface:** Stack-B WebGPU web demo — `packages/strange-attractors/web/`
> **Lane:** Phase-6 Lane B (portfolio presentation polish) — `docs/phases/phase-6-charter.md` § 3.1
> **Spec anchors:** `docs/architecture.md` § 10.1 (web demos), § 1.2 (four identities: pedagogical + portfolio), § 2.5 (determinism), § 2.6 (measured-then-declared tolerances)
> **Status:** v2.1 — IMPLEMENTED (landed with this spec; § 7 acceptance verified at landing). v2 revisions after full codebase survey: corrected data-spine values against committed artifacts (§ 4), added the RENDER layer (§ 3.4), moved the spine from a runtime-fetched `public/` file to a committed generated module, and tightened acceptance to machine-checkable form (§ 7). v2.1: afterglow trails moved in-scope as a render-pass-only trails slider (§ 3.4; operator green-light 2026-07-02).
> **Kernel changes:** NONE. All work is additive presentation, live-view, reading committed audit data, and client-side hashing.

---

## 1. Purpose

Elevate the deployed Lorenz demo from a *canvas + settings panel* into an *instrument* that makes the backend's testing and determinism discipline **visible and interactive** to a visitor — realizing the project's two under-built identities (pedagogical archive; portfolio piece) on a single sim, as the reference template the other six web demos can later adopt.

The demo must **show, not assert**: the verification claims are bound to the repository's own committed audit artifacts, and the determinism claim is provable by the visitor in-browser. And it must **look like it matters**: the current 1-pixel flat-shaded point cloud undersells both the physics and the discipline; the RENDER layer (§ 3.4) brings the visual quality to the level of the verification story, using only techniques already banked in this codebase.

## 2. Why this sim (recommendation rationale)

- **FACT.** Lorenz is `new_canonical + run-twice` and passes byte-identical run-twice in the browser (web-deploy gate; `tools/productization/web-deploy/verify.py:408`; measured PASS recorded at `docs/perf-ledger.md:88`). The "run it twice → identical hash" proof therefore genuinely succeeds.
- **INFERENCE.** A *chaotic* system that nonetheless replays bit-for-bit is the sharpest possible demonstration of determinism-as-a-feature — sensitive dependence and reproducibility in the same artifact.
- **FACT.** The demo is self-contained: one compute pass + one render pass, ~490 lines (`packages/strange-attractors/web/src/main.ts`), no broadphase / no fluid coupling. Bounded surface → clean definition of done.
- **FACT.** It is already the most-developed of the seven web demos (Play/Study, 4 regime presets, honesty note, verdict line) — this work *completes* a strong base rather than generating one.

**Not boids:** the deployed `boids-3d` is a different sim from the 2D `boids-v4.html` prototype, and it currently **fails** its browser determinism gate (open item `boids-3d-wgsl-precision-review`, `docs/phases/phase-6-charter.md` § 2.6). It cannot demonstrate determinism in-browser without kernel + gate work (Lane A) — out of scope here.

## 3. Scope

Four additive layers. Nothing here mutates `packages/strange-attractors/src/lorenz_rk4.wgsl`, the capture pinning, the gate, tolerances, or seeds. The render shader `packages/strange-attractors/web/src/render.wgsl` **is** in scope: it lives in the web presentation surface, is not a compute kernel, and the gate reads GPU buffer readbacks — never pixels (`tools/productization/web-deploy/verify.py:423`) — so render-side changes cannot perturb the gate (§ 6).

### 3.1 Layer 1 — INTERACT (raise to prototype tactility)

- **Live σ/ρ/β sliders** as the primary control; the 4 existing regimes (`REGIMES` in `main.ts`) become jump-to bookmarks that set slider positions. Dragging ρ re-integrates the **live display buffer** in real time so the ρ≈24.74 subcritical-Hopf transition to chaos is directly observable. Reuses the existing `applyRegime` re-integration path (live buffer `liveTraj` / `liveParamBuf` only).
  - **Ranges & annotations:** σ ∈ [1, 30], ρ ∈ [0, 350], β ∈ [0.5, 5]. The ρ slider carries tick annotations at the dynamically meaningful values the presets already document: 24.74 (Hopf → chaos), 28 (classic/capture), 99.65 (periodic window), 350 (limit cycle).
  - **Hot-path discipline (INFERENCE, verify during build):** re-integration is one `dispatchWorkgroups(1)` — the same dispatch the boot path runs synchronously today — so per-RAF re-integration is feasible. Coalesce to **at most one dispatch per RAF** with latest slider values; the render pass reads the GPU buffer directly, so a slider drag needs **no CPU readback** in the hot path. Readbacks (Study diagnostics, display-fit measurement) stay low-rate and superseded-guarded via the existing sequence-token pattern (`packages/strange-attractors/web/src/main.ts:319`; boids low-rate-readback precedent `packages/boids-3d/web/src/main.ts:377`).
- **Butterfly-effect toggle:** a second live trajectory from an IC offset by +1e-6 on x₀ (display-only; exact offset stated in the UI copy), integrated by the same committed kernel into its own display buffer, drawn in the warm ramp (§ 3.4) against the primary's cool ramp, visibly diverging from the first. Doubles as the motivation for structural (not pointwise) gating.
  - **Divergence diagnostics (Study):** log₁₀‖Δ‖ at the final step, and the first step index where ‖Δ‖ > 1 — sensitive dependence *measured*, not narrated.

### 3.2 Layer 2 — EXPLAIN (equation → code legibility)

- A collapsible "Equations" panel group (via the `addGroup()` extension point, `common/common-web/src/panel-shell.ts:129`) rendering the three Lorenz ODEs and the RK4 step, sourced from `docs/sim-specs/closed-form/strange-attractors/algebraic.md`, with each equation term linked to the exact implementing line in `packages/strange-attractors/src/lorenz_rk4.wgsl`, plus a "read the derivation" link to the spec sheet.
- **The code IS the equation:** alongside each rendered ODE, quote the actual committed WGSL line (σ term `packages/strange-attractors/src/lorenz_rk4.wgsl:28`, ρ term `packages/strange-attractors/src/lorenz_rk4.wgsl:29`, β term `packages/strange-attractors/src/lorenz_rk4.wgsl:30`, RK4 combination `packages/strange-attractors/src/lorenz_rk4.wgsl:35-39`). The snippet text and line anchors are **extracted at build time** by `gen-verification.mjs` (§ 4) via exact-substring match against the committed shader — the build HARD-FAILs if a pattern stops matching, so the links are self-healing rather than rot-prone. Links resolve to GitHub blob URLs with `#L<n>` anchors; the kernel is frozen by the lane boundary, and any future kernel edit breaks the build loudly instead of silently mis-anchoring.
- No math-rendering dependency (KaTeX/MathJax): hand-rolled markup on the existing `common/common-web/src/theme.css` classes.

### 3.3 Layer 3 — PROVE (verification bound to real data)

- **Live "Run it twice" proof:** dispatch the canonical integration twice into scratch buffers (never `traj` / `liveTraj`), SHA-256 each trajectory's raw bytes via `crypto.subtle`, and display the digests. Make it **three-way**: also hash the boot-time canonical buffer — three independent integrations, one hash. Display alongside the byte count (10,001 states × 3 × f32 = 120,012 bytes) so "byte-identical" is concrete. The current static `verdict` becomes a visitor-triggered demonstration.
  - **FACT (constraint):** `crypto.subtle` requires a secure context; the validate harness serves over localhost and Pages serves over https, so both qualify. Show a plain-language notice instead of a broken button if unavailable.
- **Verification card** bound to committed files (via § 4): gate kind, the **actual declared tolerances** (`strange_minmaxstd_rel = 0.12`, `strange_mean_abs = 1.5`; `tools/productization/web-deploy/verify.py:52-53`), the canonical run's provenance (seed 42, 10,000 steps, payload SHA-256 from the committed manifest `captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.json`), measured wall-clocks (f64 reference 0.061 s, `docs/perf-ledger.md:18`; browser harness 0.86 s, `docs/perf-ledger.md:88`), and a link to the landing audit `docs/_audits/phase-5/sub-phase-web-deploy-5.1-landing-2026-06-09T04-12-03Z.md` — with a one-line "measured, then declared — never widened."
- **Layered determinism honesty.** The card states all three claims explicitly, because they differ and the difference is the lesson:
  1. **Reference stack claim:** `bit-exact-same-hw` (committed manifest `determinism.claimed`; doc: `docs/sim-specs/closed-form/strange-attractors/determinism.md`).
  2. **Browser build, measured:** run-twice byte-identical on this device (the gate result, and what the visitor just proved).
  3. **Browser vs. f64 canonical, pointwise:** epsilon-class — chaotic f32/f64 divergence by trajectory end is *why* the gate is structural (attractor envelope), not pointwise. This is the current exported-manifest claim (`packages/strange-attractors/web/src/main.ts:192`) and it stays, now sourced instead of hardcoded.

### 3.4 Layer 4 — RENDER (visually stunning, physics-honest)

**FACT (baseline):** the current render is a flat-colored 1-px `point-list` with a hardcoded frame (`packages/strange-attractors/web/src/render.wgsl:14`), linear time-gradient color (`packages/strange-attractors/web/src/render.wgsl:21`), no blending, no depth cueing, no perspective, and a 720×720 fixed backing store (`packages/strange-attractors/web/index.html:26`) that is blurry on hiDPI. The poster pipeline compensates for its dimness with a CSS `brightness(1.9)` boost (`tools/productization/web-deploy/web/pages/assets/make-posters.mjs:46`). Every technique below already exists in this repo or is a pipeline-descriptor config change — **no new dependencies, no new compute passes.**

- **Ribbon + glow geometry.** Two render pipelines over the same trajectory buffer: (1) a `line-strip` pass — the classic silk-thread Lorenz ribbon — and (2) a screen-space quad-sprite pass with radial soft falloff for glow, using the boids vertex-decomposition pattern (`packages/boids-3d/web/src/render.wgsl:32-50`). The existing trace-in (`packages/strange-attractors/web/src/main.ts:364-365`) is kept and gains a brighter comet-head sprite at the integration front.
- **Additive blending.** `one/one` additive blend on both passes: where the trajectory folds over itself, density becomes luminance — the attractor's structure *is* the lighting. Additive is commutative, so no depth sorting is needed.
- **Physics-honest color.** Color by local speed, computed in the vertex shader as the finite difference of adjacent stored states `(traj[i+1] − traj[i]) / dt` — derived from the data, never re-implementing the ODE in presentation code. Map through a 4-stop perceptual ramp (reaction-diffusion precedent, `packages/reaction-diffusion-2d/web/src/render.wgsl:23-30`) with log compression (physarum precedent, `packages/physarum/web/src/render.wgsl:32`), in house palette (`common/common-web/src/theme.css:63-66`): deep indigo → accent teal → pale highlight for the primary; the warm ramp for the butterfly ghost. Gamma/exposure tone-mapping in the fragment shader (mandelbulb precedent), removing the need for the CSS brightness crutch.
- **Perspective + depth cueing.** Replace the flat z-shift with a mild perspective divide and depth-attenuated intensity/sprite size, preserving the existing `angle` uniform contract so drag-orbit and auto-orbit (`packages/strange-attractors/web/src/main.ts:404`) work unchanged.
- **Display framing → fit uniforms (refactor).** Replace the CPU-side `frameForDisplay` buffer rewrite (`packages/strange-attractors/web/src/main.ts:248-269`) with the P-6-ratified display-only camera-fit uniform slots + per-frame exponential damping from boids (`packages/boids-3d/web/src/main.ts:250-252`, damping loop `packages/boids-3d/web/src/main.ts:456-460`). Buffers then always hold **raw physics values** (Study diagnostics need no parallel `liveRaw` bookkeeping), regime/slider transitions glide instead of snapping, and — critically for § 3.1 — a live ρ-sweep needs no per-tick CPU readback-and-rewrite. Frame-indexed damping is deterministic under the poster RAF pump (boids precedent, already ratified).
- **Resolution.** Size the canvas backing store to CSS size × min(devicePixelRatio, 2) at boot, and add 4× MSAA to the render pipelines (config-only; universally supported) — line-strip quality depends on it.
- **Afterglow trails — render-pass-only, user-controlled (operator green-lit 2026-07-02).** A persistent HDR accumulation texture: each frame, one fullscreen draw multiplies the accumulated image by a trail factor (blend-constant `zero/constant` blending — no shader math, no compute pass), then the frame's resolved scene composites in additively; a final pass tonemaps to the swapchain. Because this is render passes only, it sits squarely inside the Lane-B presentation surface — the compute-pass concern that motivated the v2 deferral does not arise. Exposed as a **trails slider** (0 = off ⇒ the accumulator carries exactly the current frame); the fade factor is per-frame constant, hence frame-indexed and poster/loop-deterministic.
- **Poster/loop recalibration.** With GPU-side exposure, the 1.9 CSS boost (`tools/productization/web-deploy/web/pages/assets/make-posters.mjs:46`, `tools/productization/web-deploy/web/pages/assets/make-loops.mjs:59`) will overblow: regenerate the poster and motion loop and re-tune the sim's boost/zoom entries as part of Step 6.

## 4. Data spine (per-sim, minimal)

**FACT (constraint):** the current `main.ts` hardcodes the honesty/verdict strings and ships a placeholder manifest checksum (`"sha256:" + "0".repeat(64)`, `packages/strange-attractors/web/src/main.ts:191`). The PROVE layer must instead read the committed truth.

**FACT (gate safety):** `verify.py` rebuilds its own manifest from the browser bundle and reads only `manifest.sim` from it (`tools/productization/web-deploy/verify.py:237-259`); the gate verdict compares step state arrays. Correcting the exported manifest's placeholder metadata therefore cannot affect the gate.

- **New:** `packages/strange-attractors/web/gen-verification.mjs` — a build-time script (Node builtins only; the repo's **first** web codegen script, so it must be a clean template) that reads the sim's real committed values and emits **`packages/strange-attractors/web/src/generated/verification.json`**. Scoped to this sim only (NOT the portfolio-wide extractor).
  - **Committed + wired:** the generated file is committed; `prebuild`/`predev` npm scripts regenerate it. Idempotence is an acceptance criterion (§ 7.4): at HEAD, regeneration produces zero diff.
  - **Imported, not fetched:** `main.ts` imports the JSON statically (bundled by Vite; typed via `resolveJsonModule`). No runtime fetch → no 404 failure mode, and it composes with the standalone-serve constraint of the validate harness (each sim's `dist/` is served alone; nothing may reference outside it).
  - **Fail-hard contract:** any missing source file, unmatched WGSL anchor pattern, or unparsed `verify.py` threshold aborts with non-zero exit — never a silent fallback value.

### 4.1 `verification.json` shape (v2 — values copied verbatim from committed sources, never retyped)

```jsonc
{
  "sim": "strange-attractors",
  "gate": {
    "kind": "new_canonical + run-twice",
    // extracted by anchored regex from ESTABLISHED_THRESHOLDS in verify.py — HARD-FAIL if unmatched
    "tolerances": { "strange_minmaxstd_rel": 0.12, "strange_mean_abs": 1.5 }
  },
  "determinism": {
    "reference_claimed": "bit-exact-same-hw",   // verbatim from committed capture manifest
    "browser_claimed": "epsilon",               // the exported-manifest claim, now sourced not hardcoded
    "run_twice": "byte-identical"
  },
  "canonical": {
    "descriptor": "lorenz-trajectory-seed42-step10000",
    "seed": 42,
    "step_count": 10000,
    // verbatim f64 from the committed manifest — beta is 2.6666666666666665, NOT a retyped "2.6667"
    "params": { "sigma": 10.0, "rho": 28.0, "beta": 2.6666666666666665, "dt": 0.01, "ic_jitter_scale": 1e-6 },
    "payload_sha256": "sha256:9d34df5f64ab980b2482d1b2023888e3fe7bd3756d3a82f450fdadb68d231450",
    "wall_clock_reference_s": 0.061,            // docs/perf-ledger.md:18
    "wall_clock_browser_s": 0.86                // docs/perf-ledger.md:88 (full harness incl. boot)
  },
  "code_anchors": {                             // exact-substring matched against the committed WGSL at build time
    "sigma_term": { "line": 28, "text": "P.sigma * (s.y - s.x)," },
    "rho_term":   { "line": 29, "text": "s.x * (P.rho - s.z) - s.y," },
    "beta_term":  { "line": 30, "text": "s.x * s.y - P.beta * s.z," },
    "rk4":        { "start": 35, "end": 39 },
    "entry":      { "line": 42 }
  },
  "links": {
    "spec": "docs/sim-specs/closed-form/strange-attractors/spec-ref.md",
    "algebraic": "docs/sim-specs/closed-form/strange-attractors/algebraic.md",
    "determinism": "docs/sim-specs/closed-form/strange-attractors/determinism.md",
    "audit": "docs/_audits/phase-5/sub-phase-web-deploy-5.1-landing-2026-06-09T04-12-03Z.md",
    "perf_ledger": "docs/perf-ledger.md"
  }
}
```

Sources: `captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.json` (params, checksum, determinism class — machine-readable, so no markdown parsing), `tools/productization/web-deploy/verify.py` (tolerances), `packages/strange-attractors/src/lorenz_rk4.wgsl` (anchors), `docs/perf-ledger.md` (wall-clocks). Doc links rendered as GitHub blob URLs.

**Exported-manifest corrections (intended, enumerated):** `main.ts` sources from the generated module — `payload.checksum` (placeholder zeros → the committed canonical checksum; the manifest's `payload.path` already names that exact artifact, so the real checksum makes it a *true* statement), `config.params.beta` (f64-verbatim), and `determinism.claimed` (unchanged value, now sourced). These are the **only** intended capture-output diffs; step/state arrays are untouched (§ 7.6).

## 5. Implementation steps

| # | Step | Files | Kind |
|---|---|---|---|
| 0 | Read source-of-truth (algebraic.md, determinism.md, equivalence.md, capture manifest, lorenz_rk4.wgsl) | — | read-only |
| 1 | Data spine: `gen-verification.mjs` → committed `src/generated/verification.json`; wire `prebuild`/`predev`; replace `main.ts` hardcoded manifest placeholder + honesty/verdict literals with sourced values | `packages/strange-attractors/web/gen-verification.mjs`, `…/web/src/generated/verification.json`, `…/web/package.json`, `…/web/src/main.ts` | new |
| 2 | PROVE: run-twice hash proof (three-way) + verification card, data-bound | `packages/strange-attractors/web/src/verify-panel.ts`, `…/src/main.ts` | new + additive |
| 3 | EXPLAIN panel (ODEs + quoted WGSL + anchor links) | `packages/strange-attractors/web/src/explain.ts`, `…/src/main.ts` | new + additive |
| — | **Checkpoint:** land Steps 0–3 (the layers that most embody "show the discipline") and review before the visual work | — | review |
| 4 | RENDER: render.wgsl v2 (ribbon + sprite passes, additive blend, perceptual ramp, perspective/depth, tone map), fit-uniform framing refactor, hiDPI + MSAA | `packages/strange-attractors/web/src/render.wgsl`, `…/src/main.ts` | rewrite (presentation shader) + additive |
| 5 | INTERACT: live σ/ρ/β sliders (RAF-coalesced) + butterfly toggle + divergence diagnostics | `…/src/main.ts` | additive |
| 6 | Polish + theme conformance; regenerate poster + motion loop, recalibrate boost/zoom entries | `tools/productization/web-deploy/web/pages/assets/make-posters.mjs`, `…/assets/make-loops.mjs` (config entries only) | additive |
| 7 | Validate (see § 7) | — | verify |

Step 4 precedes Step 5 because the sliders depend on the fit-uniform framing refactor (no per-tick CPU rewrite in the drag hot path).

## 6. Governance & constraints (Lane-B contract)

- **HARD BOUNDARY:** no edits to `packages/strange-attractors/src/lorenz_rk4.wgsl`, the capture path (`captureCanonical` / `readTrajectory`), the gate, `tolerance*.toml`, or seed/IC generation. Live-view, display, reading committed audit data, and client-side hashing only. (`docs/phases/phase-6-charter.md:135` lane-boundary hard rule.)
- **Render shader is in-lane (reasoned, not assumed).** The charter rule forbids Lane B from *compute kernels, step loops, seeded init, capture/gate paths, tolerance/verify code*. `packages/strange-attractors/web/src/render.wgsl` is none of these: it is presentation code in the web surface, reads trajectory buffers read-only, and the gate consumes buffer readbacks, never pixels. The capture/display buffer separation already enforced in `main.ts` (`traj` capture-only, `liveTraj` display-only; `packages/strange-attractors/web/src/main.ts:122`, `packages/strange-attractors/web/src/main.ts:163-165`) is preserved unchanged.
- **Panel DOM contract untouched.** All `data-bp` driver-discovery attributes (panel root, tier, seed, capture button, status) keep their placement and visibility; all new UI enters via `addGroup()` (`common/common-web/src/panel-shell.ts:391`) and new slider rows — additive only.
- **Frame-indexed animation only.** The poster/loop generators pump RAF to a fixed frame count and screenshot; every animated quantity (trace-in, fit damping, butterfly draw) must be frame-indexed, never wall-clock — the trace-in and boids fit-damping precedents both already conform.
- **Standalone-serve constraint.** The validate harness serves each sim's `dist/` alone and hard-fails stray requests; all new data rides the bundle (static JSON import) — no `../../` cross-references, no runtime fetches required for correctness.
- **No new heavy dependencies.** Hand-rolled markup on the existing theme; `gen-verification.mjs` uses Node builtins only.
- **Single sim.** No changes to the other six sims, the landing page content model, or the shared `common-web` panel API surface (the demo *consumes* the existing `addGroup()` extension point). Poster/loop generator edits are limited to this sim's config entries.
- **No ratification required.** Single-sim presentation polish is charter-sanctioned Lane B; no spec amendment. (The v2 draft deferred afterglow on the assumption it needed a compute pass; the v2.1 design achieves it with render passes only — § 3.4 — and the operator green-lit inclusion on 2026-07-02.)

## 7. Acceptance / definition of done

1. **Gate still green.** `python tools/productization/web-deploy/pipeline.py validate --sim strange-attractors` passes in headless Chromium + WebGPU (`CHROME_BIN`) — the `new_canonical + run-twice` gate remains byte-identical, proving the presentation work did not perturb the capture/determinism path.
2. **`ts-strict` clean** (tsc + lint parity with `ts-strict.yml`), including the generated-JSON import.
3. **Run-twice proof** produces three identical SHA-256 hashes live in-browser (two scratch runs + the boot canonical buffer).
4. **Data binding machine-checked.** No retyped constants anywhere in the new UI; `node gen-verification.mjs && git diff --exit-code` passes at HEAD (generated file committed, regeneration idempotent, values match committed sources).
5. **EXPLAIN anchors self-healing.** Build HARD-FAILs on any unmatched WGSL anchor pattern or missing source; rendered links resolve to the correct `lorenz_rk4.wgsl` lines and the spec sheet.
6. **Capture unchanged where it counts.** Exported step/state arrays are byte-identical to the pre-work capture; the only manifest diffs are the three enumerated metadata corrections (§ 4.1). Capture export remains pinned to classic seed-42 regardless of live slider state.
7. **INTERACT.** The ρ-sweep visibly crosses into chaos near 24.74; the butterfly pair visibly diverges and its divergence diagnostics report in Study; slider drags hold frame rate (no per-tick CPU readback in the hot path).
8. **RENDER.** hiDPI-crisp, MSAA-clean ribbon+glow rendering; drag/auto-orbit behavior unchanged; poster and motion loop regenerated with recalibrated boost (no blown highlights); layout sane at 375 px mobile width and at the 860 px max canvas.

## 8. Out of scope

- Any compute-kernel, gate, tolerance, or seed change.
- The portfolio-wide provenance extractor, the methodology dashboard, and the data-driven landing page (separate, larger Lane-B work).
- The other six web demos (this demo is the template they later adopt).
- Publishing. The gh-pages deploy is `workflow_dispatch` + `confirm_deploy=true`, operator-dispatched; this environment has no GitHub write token.

## 9. Operator actions

- **Publish** (post-merge, when green): dispatch `web-deploy.yml` with `confirm_deploy=true`.
