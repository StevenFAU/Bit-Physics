# Spec — Gray-Scott Verification-Visible Demo (Stack-B web frontend)

> **Sim:** `reaction-diffusion-2d` (Gray-Scott, `continuous-ca`)
> **Surface:** Stack-B WebGPU web demo — `packages/reaction-diffusion-2d/web/`
> **Lane:** Phase-6 Lane B (portfolio presentation polish) — `docs/phases/phase-6-charter.md` § 3.1
> **Spec anchors:** `docs/architecture.md` § 10.1 (web demos), § 1.2 (four identities: pedagogical + portfolio), § 2.5 (determinism), § 2.6 (measured-then-declared tolerances), § 5.2.1 (reaction-diffusion)
> **Template precedent:** `packages/strange-attractors/web/verification-demo-spec.md` (Lorenz, landed) — this sheet adopts its four-layer structure and build-time data-spine discipline. Coordinates with `packages/strange-attractors/web/feature-expansion-spec.md` § 3.1.a (shared colormap module) — see § 3.4, § 6.
> **Status:** v0.2 — IMPLEMENTED (landed with this spec; § 7 acceptance verified at landing: gate green at measured max_abs 2.6414220577697378e-05, run-twice + live gate re-run proven in-browser, poster + loop regenerated). v0.2 (2026-07-03): **divergence narrative corrected against the committed Phase-5 audits** — the draft's centerpiece claim was superseded at HEAD; § 3.3 now tells the post-resolution story. Live gate re-run added as the PROVE flagship; RENDER/INTERACT expanded; template-parity items restored. Change log in § 10.
> **Kernel changes:** NONE. All work is additive presentation, live-view, reading committed audit data, and client-side hashing/comparison.

---

## 1. Purpose

Elevate the deployed Gray-Scott demo from a *canvas + settings panel* into an *instrument* that makes the backend's testing and determinism discipline **visible and interactive** — the second application of the Lorenz template, and the sim that best carries the project's honesty thesis.

Why rd2d earns priority #2 (from the rollout ordering): it introduces a **second gate kind** (`capture_roundtrip`, vs Lorenz's `new_canonical`), and it carries the portfolio's **richest honesty story** — not a live divergence, but a **complete, committed honesty arc**: the 5.1 gate measured an alarming 0.074 browser divergence; the tolerance was *not* widened; a charter session diagnosed it; the "cross-backend f32" hypothesis was **REFUTED by measurement** (it was a frontend harness race); the fix landed across all 7 demos; and the contingency gate designed for genuine divergence sits dormant with its bounds *intentionally undeclared* until a third backend is actually measured. Every step of that arc is a committed artifact this demo can bind to (§ 3.3). It is also the sim with the **fullest cross-surface story** — the same kernel runs on four stacks and ships a native binary — and the sim whose canonical capture is small enough to **re-run the gate criterion live in the visitor's browser** (§ 3.3, the flagship).

## 2. Why this sim (recommendation rationale)

- **FACT.** rd2d's browser gate is `capture_roundtrip` at `[defaults.reaction-diffusion]` rel=1e-4 / abs=0.0 (`tools/testkit/equivalence/tolerance.toml:22`, `:113`; gate fn `tools/productization/web-deploy/verify.py:267`), and it is **run-twice byte-identical in the browser** (`_gate_rd2d` checks `run_twice_identical` at `tools/productization/web-deploy/verify.py:276`; post-fix 7/7 byte-identical, `docs/_audits/phase-5/browser-divergence-resolution-landing-2026-06-09T13-24-25Z.md` § 0). The "run it twice → identical hash" proof therefore genuinely succeeds.
- **FACT.** Post harness-race fix, the browser build matches the f64 canonical at **measured max_abs 2.6414220577697378e-05** (« the declared 1e-4) — **bit-identical to the wgpu-native result** on the same RADV hardware (resolution audit § 0 "rd2d SHIFT"; `tools/productization/web-deploy/verify.py:74-75`). Two independent WGSL compilers (Dawn/Tint in the browser, Naga in wgpu-native) producing byte-equal f32 fields is itself a showable result.
- **FACT (the honesty arc, § 3.3).** The pre-fix 5.1 measurement recorded max_abs **0.074 by step 2000** with early steps correct (step 200 ~1e-6) — honestly logged and retained at `docs/perf-ledger.md:84` (a pre-fix historical row, deliberately not rewritten). `tolerance.toml` stayed byte-unchanged through the whole episode (sha-pinned in both audits). The opt-in short-horizon/field-bound contingency gate exists (`tools/productization/web-deploy/verify.py:69-82`) but is **dormant, bounds undeclared**, pending a genuine third-backend (lavapipe) measurement — measured-then-declared, § 2.6 made procedural.
- **INFERENCE.** The Pearson 1993 F/k plane is a famous, directly-interactive pattern-selection map — dragging F/k through it (solitons → coral → maze → mitosis) is a first-class INTERACT payoff no other sim offers as cleanly.
- **FACT.** Self-contained: one compute pass (`packages/reaction-diffusion-2d/src/gray_scott.wgsl`, 63 lines) + one render pass (`packages/reaction-diffusion-2d/web/src/render.wgsl`, 43 lines); web app 500 lines (`packages/reaction-diffusion-2d/web/src/main.ts`). Already has Play/Study, four F/k presets, cursor-seed injection, honesty note, and a verdict line — this work *completes* a strong base.
- **FACT.** Fullest cross-surface story: baselines on numpy-reference, taichi-cpu, vulkan-cpp, and webgpu-headless (`docs/perf-ledger.md:17`, `:30`, `:43`, `:84`), plus a validated native binary `reaction-diffusion-2d-stack-c` (`docs/perf-ledger.md:80`), plus a differentiable variant (`docs/perf-ledger.md:56`).
- **FACT.** The canonical capture is compact (128², f64) — the final captured frame is ~256 KiB — so the **gate criterion itself can be re-run client-side** against the committed canonical fields (§ 3.3). Lorenz could not do this cheaply; rd2d makes it the template's next escalation.

## 3. Scope

Four additive layers. Nothing here mutates `packages/reaction-diffusion-2d/src/gray_scott.wgsl` (the compute kernel), the capture pinning, the gate, `tolerance*.toml`, or the seed-42 IC asset. The render shader `packages/reaction-diffusion-2d/web/src/render.wgsl` **is** in scope: it is presentation, not a compute kernel, and the gate reads GPU buffer readbacks via `readState` → `exposeCapture` (`tools/productization/web-deploy/verify.py:267`) — never canvas pixels — so render-side changes cannot perturb the gate (§ 6).

### 3.1 Layer 1 — INTERACT (raise to prototype tactility)

- **Live F/k sliders** as the primary control; the 4 existing regimes (`REGIMES` in `packages/reaction-diffusion-2d/web/src/main.ts:146`) become jump-to bookmarks that set slider positions. Only `liveParamBuf` is rewritten per change (`packages/reaction-diffusion-2d/web/src/main.ts:178`, `:222`) — cheap, no readback in the hot path (the RAF already steps `STEPS_PER_FRAME = 8` live steps). Dragging across the Pearson plane switches pattern morphology in real time.
  - **Ranges & annotations:** F ∈ [0.01, 0.08], k ∈ [0.045, 0.07] (the Pearson 1993 pattern-forming window). Tick annotations at the four documented presets — canonical (0.0367/0.0649), solitons (0.030/0.062), coral (0.0545/0.062), maze (0.029/0.057). Optional secondary Du/Dv sliders (default-collapsed).
- **F/k mini-map — two-way, the signature interaction:** a small 2D plot of the (F, k) plane with the named regions and a live cursor dot at the current point — the Gray-Scott "phase map" made navigable. **Draggable:** pointer-drag on the mini-map sets F/k directly (writes `liveParamBuf` through the same slider path), so the visitor *flies through pattern space* while the field morphs live. Canvas-2D, no dependency; region outlines are hand-annotated from Pearson 1993 and labeled as sketch, not measurement.
- **Cursor-seed brush** already exists (`injectCursorSeed`, `packages/reaction-diffusion-2d/web/src/main.ts:414`); add a **brush-radius control** (currently fixed `SEED_RADIUS = 4`), an **erase mode** (write the background state U=1, V=0 through the same `queue.writeBuffer` path — carve dead zones and watch fronts re-invade), and a **"clear field" button** (reload IC). Live loop only.
- **Speed control:** expose `STEPS_PER_FRAME` (currently fixed 8) as a 1–32 steps/frame slider — slow-motion for watching a mitosis event, fast-forward for pattern equilibration. Live loop only; capture unaffected (it runs its own pinned loop).
- **Live diagnostics in Play:** surface the existing Study field statistics (mass U/V, peak V, V-coverage; `packages/reaction-diffusion-2d/web/src/main.ts:358`) as a lightweight always-on readout, not Study-only (low-rate readback, sequence-token guarded — the existing `diagSeq` pattern).
- **Optional — dt stability explorer (INFERENCE, verify at build; default-collapsed with Du/Dv).** A live dt slider annotated with the forward-Euler diffusive stability bound (dt ≤ dx²/(4·max(Du,Dv)) ≈ 1.56 at canonical Du=0.16 — recompute, don't trust this sheet). Crossing the bound visibly blows the live field up; "clear field" recovers. This is *honest numerics pedagogy* — the discretization's edge shown, not hidden — and pairs with the EXPLAIN stability note (§ 3.2). Live-only via `liveParamBuf` (dt already rides the same uniform, `packages/reaction-diffusion-2d/web/src/main.ts:189`); capture stays pinned to canonical dt=1.0. Operator may strike this item if deliberate blow-up is judged off-tone for the portfolio surface.

### 3.2 Layer 2 — EXPLAIN (equation → code legibility)

- A collapsible "Equations" panel group (via `addGroup()`, `common/common-web/src/panel-shell.ts:129`) rendering the two Gray-Scott PDEs, the forward-Euler + 5-point-Laplacian discretization, and the F/k pattern-selection note, sourced from `docs/sim-specs/continuous-ca/reaction-diffusion-2d/algebraic.md`. Cite Pearson 1993 (Science 261:189, DOI 10.1126/science.261.5118.189 — already quoted at `packages/reaction-diffusion-2d/web/src/main.ts:135`).
- **The code IS the equation:** alongside each rendered term, quote the actual committed WGSL line —
  - diffusion `D_u ∇²U`, `D_v ∇²V` → Laplacian `packages/reaction-diffusion-2d/src/gray_scott.wgsl:49-54`, applied `:57-58`
  - reaction `−UV²` / `+UV²` → `packages/reaction-diffusion-2d/src/gray_scott.wgsl:56`
  - feed `F(1−U)` → `packages/reaction-diffusion-2d/src/gray_scott.wgsl:57`
  - kill `−(F+k)V` → `packages/reaction-diffusion-2d/src/gray_scott.wgsl:58`
  - forward-Euler step → `packages/reaction-diffusion-2d/src/gray_scott.wgsl:61-62`
  - periodic BC (`numpy.roll` ↔ WGSL i32 wrap) → `packages/reaction-diffusion-2d/src/gray_scott.wgsl:28-31`

  Snippet text and line anchors are **extracted at build time** by `gen-verification.mjs` (§ 4) via exact-substring match against the committed shader — the build HARD-FAILs if a pattern stops matching, so links are self-healing rather than rot-prone. Links resolve to GitHub blob URLs with `#L<n>` anchors.
- **Teachable honesty tie-ins:**
  - the conservation note from `algebraic.md` — `∫(U+V)` is **not** conserved (the feed term forces it) — rendered next to the `mass U` / `mass V` diagnostics, so the on-screen numbers have an explanation. Same for the `U,V ∈ [0,1]` monotone-bounds property.
  - the forward-Euler **stability bound** note (pairs with the § 3.1 dt explorer if kept; stands alone otherwise).
  - **IC provenance:** the seed-42 initial condition is numpy PCG64 `uniform(−1e-3, 1e-3)` and is *not reproducible in-browser* — so the demo ships the exact committed bytes as `packages/reaction-diffusion-2d/web/public/rd2d-ic-seed42.bin` rather than pretending a JS RNG is "the same" (`packages/reaction-diffusion-2d/web/src/main.ts:11-13`). A one-line note making this visible turns an implementation detail into a determinism lesson.
- No math-rendering dependency (KaTeX/MathJax): hand-rolled markup on `common/common-web/src/theme.css` classes.

### 3.3 Layer 3 — PROVE (verification bound to real data) — the honesty centerpiece

- **Live "Run it twice" proof:** reload the canonical seed-42 IC, dispatch the canonical 2000-step run twice into scratch buffers (never `buffers[]` live state), SHA-256 each final U/V field via `crypto.subtle`, display the two identical digests + the byte count. rd2d is run-twice byte-identical in-browser, so this succeeds. Optionally three-way (hash a third independent run). **FACT (constraint):** `crypto.subtle` requires a secure context; validate serves over localhost and Pages over https, so both qualify — show a plain-language notice instead of a broken button if unavailable (Lorenz precedent).
- **Live gate re-run — the flagship (new in v0.2):** ship the canonical capture's **final-frame U/V f64 fields** (~256 KiB) as a sha-pinned bundle asset (§ 4.2), and after the scratch canonical run, compute **max_abs / max_rel error against the committed f64 canonical, client-side**, displaying the measured number next to the declared rel=1e-4 budget and the banked RADV measurement (2.64e-5). The verification gate's own criterion, running on the visitor's GPU.
  - **Honest labeling:** this is the gate criterion at the *final captured step* (the most divergence-prone frame), not the full 11-frame `compare_captures` sweep — the card says so.
  - **The visitor is a fresh data point:** on RADV-class hardware this reproduces the banked 2.64e-5; on other GPUs/drivers it measures whatever it measures, **displayed verbatim, never clamped or hidden**. If it exceeds 1e-4, the card says exactly that and links the pending-lavapipe contingency story below — "you may be looking at the third backend family we have not been able to measure." A portfolio demo that can *fail honestly in front of you* is the thesis.
- **Divergence post-mortem panel — "the 0.074 that wasn't" (corrected from v0.1):** a compact timeline bound to committed artifacts, replacing the draft's (superseded) live-divergence framing:
  1. **Measured, logged:** 5.1 landing records the browser diverging from the f64 canonical — step-200 max_abs ~1e-6 but **0.074 by step 2000** — while staying run-twice byte-identical (`docs/perf-ledger.md:84`, retained unedited as the pre-fix historical row).
  2. **Not widened:** `tolerance.toml` byte-unchanged, sha-pinned through the episode (`docs/_audits/phase-5/browser-divergence-charter-2026-06-09T12-49-00Z.md`, `docs/_audits/phase-5/browser-divergence-resolution-landing-2026-06-09T13-24-25Z.md` evidence hashes).
  3. **Diagnosed, hypothesis refuted:** the charter's "cross-backend f32" hypothesis was **REFUTED by measurement** — root cause was a frontend **harness race** (the capture loop and the live RAF loop shared the ping-pong state; deterministic contamination). Fix: shared capture/live-loop mutual exclusion, hardened across all 7 demos (resolution audit § 0–§ 1; the lock is `isCapturing()` / `runCaptureExclusive` in `common/common-web/src/capture-export.ts`, and this very demo's `frame()` guard at `packages/reaction-diffusion-2d/web/src/main.ts:486`).
  4. **Post-fix:** browser matches the f64 canonical at **2.6414220577697378e-05, bit-identical to wgpu-native** — the established gate clears honestly.
  5. **Contingency, undeclared:** the opt-in short-horizon/field-bound structural gate exists for a backend that *genuinely* diverges (`tools/productization/web-deploy/verify.py:69-82`) but is dormant and its round-1 numeric bounds are **intentionally undeclared** until one RADV + one lavapipe measurement pass exists — measured-then-declared, never invented.

  This is `docs/architecture.md` § 2.6 made visceral — and it is a *stronger* story than a live divergence: the discipline caught its own harness bug instead of laundering it into a tolerance.
- **Verification card** bound to committed files (via § 4): gate kind `capture_roundtrip`; declared rel 1e-4 / abs 0.0; **measured** max_abs 2.64e-5 (RADV, == wgpu-native); run-twice byte-identical; reference determinism claim `bit-exact-same-hw` and canonical provenance (seed 42, 128², 2000 steps, capture-interval 200, payload `sha256:bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0`) from `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json`. Replaces the current hardcoded verdict/honesty literals (`packages/reaction-diffusion-2d/web/src/main.ts:463`) with data-bound values, and fixes the placeholder manifest checksum (`packages/reaction-diffusion-2d/web/src/main.ts:318`, currently `"0".repeat(64)`) to the real payload sha.
  - **Exported-manifest corrections (intended, enumerated — Lorenz § 4.1 discipline):** `payload.checksum` (placeholder zeros → the committed canonical payload sha) and the honesty/verdict strings' source (hardcoded → generated module; values unchanged where already correct). These are the **only** intended capture-output diffs; step/state arrays are untouched (§ 7.6). The export's `determinism.claimed: "epsilon"` (browser-surface claim) stays, now sourced.
- **Cross-surface strip (optional):** "one kernel, five surfaces" — the four perf-ledger baselines (`docs/perf-ledger.md:17`, `:30`, `:43`, `:84`) + the native binary row (`:80`), as evidence of the § 2.6 cross-stack-equivalence discipline; note the vulkan-cpp port is **full-horizon bit-exact** vs the NumPy reference (gate-14 max_abs 0.0, `docs/perf-ledger.md:43`) — worth one highlighted cell.

### 3.4 Layer 4 — RENDER (visually stunning, physics-honest)

**FACT (baseline):** the current render is a fullscreen triangle that nearest-neighbor samples the V channel through a single hardcoded magma-ish ramp with a magic ×3.5 gain (`packages/reaction-diffusion-2d/web/src/render.wgsl:23-42`), onto a fixed 512² backing store stretched to `min(90vmin, 720px)` with CSS `image-rendering: pixelated` (`packages/reaction-diffusion-2d/web/index.html:22`, `:26`). The 128² grid reads as chunky blocks. Every upgrade below is render-pass/presentation-only — the gate reads buffers, not pixels (§ 6) — and derives strictly from data already in the state buffer (the "physics-honest color" contract from the Lorenz template).

- **Bilinear reconstruction + "raw grid" honesty toggle.** Manual bilinear interpolation of the four neighboring cells in the fragment shader — the single highest-impact visual fix (smooth organic membranes instead of pixel blocks). Ship a **view toggle** back to raw nearest-cell texels: "what the buffer actually holds" — the honest-view escape hatch, one line of shader branching. Drop the CSS `pixelated` hint alongside (presentation-only `index.html` edit).
- **Channel views.** V (current), U, and a **duotone composite** (U and V through complementary house ramps) — the two-chemical story made visible; ties directly to the two PDEs in EXPLAIN. Uniform-switched in the fragment shader.
- **Gradient-lit relief.** Compute the V-field gradient by finite difference in the fragment shader (reads the same storage buffer — data-derived, no ODE re-implementation) and apply cheap diffuse+specular emboss lighting: spots become domes, mazes become carved channels. Slider from flat colormap → full relief. This is the "make it look like matter" move for a scalar field, and it is pure presentation.
- **Activity glow (fronts are alive).** Keep a render-owned snapshot buffer refreshed every K frames via `copyBufferToBuffer` (a queue copy — **no compute pass**); the fragment shader colors |V − V_snapshot| as an additive glow so growing/dividing fronts luminesce while equilibrated regions rest. Finite-difference-of-stored-states is the Lorenz speed-color precedent applied in time. K is frame-indexed (poster/loop-deterministic).
- **Colormap selection — coordinate, don't fork.** `packages/strange-attractors/web/feature-expansion-spec.md` § 3.1.a charters `common/common-web/src/colormap.ts` (viridis/inferno/magma/plasma/turbo/cividis + house ramps, WGSL emit helper). If that module has landed by build time, **consume it**; otherwise implement the ramp table locally *in the same table shape* so migration is a one-line import swap. No edits to `common-web` from this work either way (§ 6).
- **Resolution.** Size the canvas backing store to CSS size × min(devicePixelRatio, 2) at boot (Lorenz § 3.4 precedent) — bilinear + relief need the pixels.
- **Poster/loop recalibration.** rd2d has committed poster and motion-loop generator entries (`tools/productization/web-deploy/web/pages/assets/make-posters.mjs:43`, `tools/productization/web-deploy/web/pages/assets/make-loops.mjs:56`) whose current look *is* the pixelated flat colormap. Regenerate both and re-tune this sim's entries as the final step (Lorenz Step-6 discipline). Config-entry edits only.

## 4. Data spine (per-sim, minimal)

**FACT (constraint):** `packages/reaction-diffusion-2d/web/src/main.ts` hardcodes the honesty/verdict strings (`:455-467`) and ships a placeholder manifest checksum (`:318`). The PROVE layer must instead read the committed truth.

- **New:** `packages/reaction-diffusion-2d/web/gen-verification.mjs` — a build-time script (Node builtins only; Lorenz template) that reads the sim's real committed values and WGSL snippet anchors and emits **`packages/reaction-diffusion-2d/web/src/generated/verification.json`** (committed; statically imported by `main.ts` — no runtime fetch; `prebuild`/`predev` npm scripts regenerate; regeneration is idempotent at HEAD). Fail-hard contract: any missing source, unmatched WGSL anchor, unparsed threshold, or asset-hash mismatch aborts non-zero — never a silent fallback. Scoped to this sim only.

### 4.1 `verification` module shape (draft)

```jsonc
{
  "sim": "reaction-diffusion-2d",
  "gate": { "kind": "capture_roundtrip",
            "declared": { "relative": 1e-4, "absolute": 0.0 },      // tolerance.toml, anchored parse
            "measured_max_abs": 2.6414220577697378e-05,             // resolution audit, anchored parse
            "measured_equals_wgpu_native": true,
            "run_twice": "byte-identical" },
  "postmortem": {                                                   // § 3.3 timeline — values extracted, never retyped
    "prefix_step200_max_abs": 1e-6, "prefix_step2000_max_abs": 0.074,
    "root_cause": "frontend harness race (capture/live-loop shared ping-pong state) — cross-backend-f32 hypothesis REFUTED",
    "tolerance_widened": false,
    "contingency": { "status": "opt-in, dormant, pending-lavapipe", "bounds": "undeclared (measured-then-declared)" },
    "audits": [ "docs/_audits/phase-5/browser-divergence-charter-2026-06-09T12-49-00Z.md",
                "docs/_audits/phase-5/browser-divergence-resolution-landing-2026-06-09T13-24-25Z.md" ],
    "perf_ledger_prefix_row": "docs/perf-ledger.md:84" },
  "determinism": { "reference_claimed": "bit-exact-same-hw", "browser_claimed": "epsilon" },
  "canonical": { "descriptor": "gray-scott-lambda-128sq-seed42-step2000",
                 "seed": 42, "grid": [128,128], "step_count": 2000, "capture_interval": 200,
                 "params": { "Du": 0.16, "Dv": 0.08, "F": 0.0367, "k": 0.0649, "dx": 1.0, "dt": 1.0 },  // verbatim from the committed manifest
                 "payload_sha256": "bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0" },
  "canonical_final_fields": {                                       // § 4.2 asset for the live gate re-run
    "asset": "rd2d-canonical-step2000.bin", "bytes": 262144, "dtype": "f64", "layout": "U[128*128] ++ V[128*128]",
    "sha256": "<pinned at extraction>", "extracted_from": "captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5" },
  "surfaces": { "stacks": ["numpy-reference","taichi-cpu","vulkan-cpp","webgpu-headless"],
                "native_binary": "reaction-diffusion-2d-stack-c" },
  "code": { "<term>": { "path": "packages/reaction-diffusion-2d/src/gray_scott.wgsl", "lines": [..], "snippet": ".." } },
  "links": { "spec": "...", "algebraic": "...", "determinism": "...", "audits": [".."], "perf_ledger": "docs/perf-ledger.md" }
}
```

Sources: `tools/testkit/equivalence/tolerance.toml`, `tools/productization/web-deploy/verify.py`, `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json` (machine-readable manifest — params/sha/determinism verbatim), the two Phase-5 divergence audits (anchored-regex extraction of the headline numbers; HARD-FAIL if unmatched), `docs/perf-ledger.md`, `packages/reaction-diffusion-2d/src/gray_scott.wgsl`.

### 4.2 Canonical-fields asset (live gate re-run)

- **New committed asset:** `packages/reaction-diffusion-2d/web/public/rd2d-canonical-step2000.bin` — the step-2000 U and V f64 fields extracted from the committed canonical payload. Rides the Vite `public/` bundle exactly like the existing IC asset `packages/reaction-diffusion-2d/web/public/rd2d-ic-seed42.bin` (standalone-serve-safe; no `../../` cross-refs).
- **Extraction:** a small one-shot Python script (the repo venv already reads the canonical `.h5` via the equivalence harness) committed under the sim's web dir; run manually, output committed. `gen-verification.mjs` stays Node-builtins-only: it **re-hashes the committed asset** and HARD-FAILs if the sha diverges from the pinned value — the provenance chain is extractor script + pinned sha + the manifest's payload sha.
- The kernel-side canonical `.h5`/`.json`/IC remain untouched (§ 6).

## 5. Implementation steps

| # | Step | Files | Kind |
|---|---|---|---|
| 0 | Read source-of-truth (algebraic.md, determinism.md, equivalence.md, capture manifest, gray_scott.wgsl anchors, verify.py `_gate_rd2d`, **both Phase-5 divergence audits**) | — | read-only |
| 1 | Data spine: `gen-verification.mjs` → committed `src/generated/verification.json`; `prebuild`/`predev` wiring; canonical-fields extractor + committed asset + pinned sha | `packages/reaction-diffusion-2d/web/gen-verification.mjs`, `…/web/src/generated/verification.json`, `…/web/package.json`, extractor + `…/web/public/rd2d-canonical-step2000.bin` | new |
| 2 | PROVE: run-twice hash + **live gate re-run** + post-mortem timeline panel + data-bound verification card (replaces hardcoded verdict/honesty + placeholder checksum) | `packages/reaction-diffusion-2d/web/src/verify-panel.ts`, `…/src/main.ts` | new + additive |
| 3 | EXPLAIN panel (2 PDEs + Euler/Laplacian, per-term code links, conservation/bounds/stability/IC-provenance notes) | `packages/reaction-diffusion-2d/web/src/explain.ts`, `…/src/main.ts` | new + additive |
| — | **Checkpoint:** land Steps 0–3 (data spine + the honesty story) and review before the visual/interactive work | — | review |
| 4 | RENDER: render.wgsl v2 (bilinear + raw toggle, channel views, relief lighting, activity glow, ramp table), hiDPI, snapshot-copy wiring | `packages/reaction-diffusion-2d/web/src/render.wgsl`, `…/src/main.ts`, `…/index.html` | rewrite (presentation shader) + additive |
| 5 | INTERACT: F/k sliders + draggable mini-map + brush radius/erase/clear + speed control + always-on diagnostics (+ optional dt explorer) | `…/src/main.ts` | additive |
| 6 | Poster + motion-loop regeneration; recalibrate this sim's generator entries | `tools/productization/web-deploy/web/pages/assets/make-posters.mjs`, `…/assets/make-loops.mjs` (config entries only) | additive |
| 7 | Validate (see § 7) | — | verify |

Step 4 precedes Step 5 so the mini-map drag is tuned against the final look (pattern-morphology changes read much better with bilinear + relief).

## 6. Governance & constraints (Lane-B contract)

- **HARD BOUNDARY:** no edits to `packages/reaction-diffusion-2d/src/gray_scott.wgsl`, the capture path (`captureCanonical` / `readState` / `stepCanonical`, `packages/reaction-diffusion-2d/web/src/main.ts:275`, `:221`), the gate, `tolerance*.toml`, or the seed-42 IC asset (`packages/reaction-diffusion-2d/web/public/rd2d-ic-seed42.bin`) and the canonical `captures/` artifacts. Live-view, display, reading committed audit data, and client-side hashing/comparison only (`docs/phases/phase-6-charter.md` § 3.1 lane-boundary hard rule).
- **`render.wgsl` is gate-safe:** `_gate_rd2d` compares the capture bundle (buffer readback), never canvas pixels (`tools/productization/web-deploy/verify.py:267`).
- **Snapshot copy is presentation:** the activity-glow snapshot is a render-owned buffer filled by `copyBufferToBuffer` *from* the state buffer (read-only with respect to sim state; no compute pass, no step-loop change).
- **All live controls write `liveParamBuf` or the live state buffer only** — the same two channels the existing presets and cursor-seed already use; `stepCanonical`/`paramBuf` call sites stay disjoint (the committed capture-pinning split, `packages/reaction-diffusion-2d/web/src/main.ts:171-176`).
- **Frame-indexed animation only** (poster/loop determinism): glow snapshot cadence, any easing — frame-indexed, never wall-clock.
- **Standalone-serve constraint:** all new data rides the bundle (static JSON import; `public/` assets served per-sim). No runtime cross-refs.
- **No new heavy dependencies.** Hand-rolled markup + Canvas-2D mini-map on the existing theme; `gen-verification.mjs` Node builtins only; the `.h5` extractor uses the existing repo venv.
- **Single sim.** No changes to the other six sims, the landing page, or the shared `common-web` API surface. Exception, read-only: **consume** `common/common-web/src/colormap.ts` if the strange-attractors L-1 cluster has landed it (§ 3.4) — never edit it from this work.
- **No ratification required.** Single-sim presentation polish is charter-sanctioned Lane B; no spec amendment.

## 7. Acceptance / definition of done

1. **Gate still green.** `python tools/productization/web-deploy/pipeline.py validate --sim reaction-diffusion-2d` passes in headless Chromium + WebGPU (`CHROME_BIN`) — `capture_roundtrip` clears rel 1e-4 (RADV measured ~2.6e-5) and run-twice stays byte-identical, proving the presentation work did not perturb the capture/determinism path.
2. **`ts-strict` clean** (parity with `.github/workflows/ts-strict.yml`), including the generated-JSON import.
3. **Run-twice proof** produces identical SHA-256 digests live in-browser.
4. **Live gate re-run** measures max_abs vs the committed canonical final fields on this hardware (~2.6e-5-class on RADV), displays the measured value verbatim next to the declared budget, and is labeled as the final-frame criterion (not the full 11-frame sweep). The displayed number is *measured in-session*, never the banked constant.
5. **Data binding machine-checked.** No retyped constants anywhere in the new UI; `node gen-verification.mjs && git diff --exit-code` passes at HEAD (generated file + asset sha idempotent); post-mortem panel values match the committed audits.
6. **EXPLAIN anchors self-healing.** Build HARD-FAILs on any unmatched WGSL anchor pattern or missing source; rendered links resolve to the correct `gray_scott.wgsl` lines and the spec sheet.
7. **Capture unchanged where it counts.** Exported step/state arrays byte-identical to the pre-work capture; the only manifest diffs are the enumerated metadata corrections (§ 3.3). Capture export remains pinned to canonical F/k + seed-42 + dt=1.0 regardless of live slider/brush/mini-map state.
8. **INTERACT.** F/k sweep (sliders *and* mini-map drag) visibly changes pattern morphology; brush erase/radius and speed control work in the live loop only; always-on diagnostics hold frame rate (low-rate, sequence-token-guarded readback).
9. **RENDER.** Bilinear/relief/glow/channel views render hiDPI-crisp; the raw-grid toggle restores the honest texel view; poster + motion loop regenerated and re-tuned (no blown highlights); layout sane at 375 px mobile width and the max canvas size.

## 8. Out of scope

- Any compute-kernel, gate, tolerance, or IC change; any edit to the committed canonical capture artifacts.
- The portfolio-wide provenance extractor, methodology dashboard, and data-driven landing page.
- The other web demos (they inherit the live-gate-re-run pattern later where their captures are small enough).
- Crowd-sourcing/telemetry of visitor gate-re-run results (display-only in-session; no network reporting).
- Publishing — the gh-pages deploy is `workflow_dispatch` + `confirm_deploy=true`, operator-dispatched; this environment has no GitHub write token.

## 9. Operator actions

- **Publish** (post-merge, when green): dispatch `.github/workflows/web-deploy.yml` with `confirm_deploy=true`.
- **Optional strike:** the dt stability explorer (§ 3.1) if deliberate blow-up is judged off-tone.

## 10. Change log

- **v0.2 (2026-07-03) — audit correction + moat/visual expansion.**
  1. **Divergence narrative corrected (§ 1, § 2, § 3.3, § 4.1).** v0.1 presented the 0.074 step-2000 browser divergence as a live cross-implementation f32 fact. That claim is **superseded at HEAD**: the Phase-5 audits (`docs/_audits/phase-5/browser-divergence-charter-2026-06-09T12-49-00Z.md`, `docs/_audits/phase-5/browser-divergence-resolution-landing-2026-06-09T13-24-25Z.md`) root-caused it as a frontend harness race; post-fix the browser is bit-identical to wgpu-native at 2.6414220577697378e-05, and `docs/perf-ledger.md:84` is the retained *pre-fix* historical row. The PROVE centerpiece is reframed as the committed post-mortem arc — measured → not widened → refuted → fixed → contingency-left-undeclared.
  2. **Live gate re-run added (§ 3.3, § 4.2)** — sha-pinned canonical final-frame fields asset + client-side max_abs vs the f64 canonical; the visitor's GPU becomes a fresh, honestly-displayed data point.
  3. **RENDER expanded (§ 3.4):** bilinear + raw-grid honesty toggle, U/V/duotone channel views, gradient-lit relief, activity glow via render-owned snapshot copy, hiDPI, colormap-module coordination with `packages/strange-attractors/web/feature-expansion-spec.md` § 3.1.a, poster/loop recalibration step.
  4. **INTERACT expanded (§ 3.1):** mini-map made two-way (draggable), brush erase mode, steps-per-frame speed control, optional dt stability explorer (operator-strikeable).
  5. **Template parity restored (§ 4, § 5, § 7):** generated-module path + `prebuild`/`predev` wiring + idempotence acceptance, `crypto.subtle` secure-context fallback, enumerated intended manifest diffs, checkpoint after the honesty layers, mobile-layout + poster-regen acceptance.
