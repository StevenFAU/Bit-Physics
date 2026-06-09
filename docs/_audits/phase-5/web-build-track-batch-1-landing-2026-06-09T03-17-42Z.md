---
date: 2026-06-09T03-17-42Z
author: phase-5 web-build track PHASE-1 batch-1 session (Claude Code)
subject: "Phase-5 web-build track — batch 1 (rd2d + mandelbulb) build-and-validate landing. Both Stack-B web frontends authored + driven through the per-sim named gate: rd2d capture_roundtrip PASS, mandelbulb new_canonical PASS. Headless browser WebGPU unavailable in-env → gate runs the committed .wgsl via wgpu-native on the real GPU; browser smoke is the §6.1 DOM-load fallback."
kind: sub-phase-landing
artifact: sub-phase
verdict: SHIFTED
verdict-state: CONFIRMED
phase: 5
sub_phase: "web-build-batch-1"
head_sha: d967e7c14262ce98d29324325e5766b62fa80d3a
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
parent_audits:
  - "[[web-build-track-charter-2026-06-09T02-39-17Z]]"
  - "[[reconciliation-2026-06-02T01-15-23Z]]"
evidence_paths:
  - tools/productization/web-build/gpu_gate.py
  - packages/reaction-diffusion-2d/src/gray_scott.wgsl
  - packages/mandelbulb-explorer/src/mandelbulb_de.wgsl
  - packages/reaction-diffusion-2d/web/src/main.ts
evidence_hashes:
  tools/productization/web-build/gpu_gate.py: sha256:9b5590be981454238ed786b403ff531984ee057c58b7330c97b4f8680e8530b7
  packages/reaction-diffusion-2d/src/gray_scott.wgsl: sha256:38facf2c89d86cc1cd7e5244693b033ec58a504cd7b805bdad2d48140404a82d
  packages/mandelbulb-explorer/src/mandelbulb_de.wgsl: sha256:a795efa683848bb8b1a5052538fbb2f95cb24fef11dc053d972363efe3cc40a1
  packages/reaction-diffusion-2d/web/src/main.ts: sha256:309b0e66b7e0935bf0bac573ca6ffc3a9637194c7a6d1cec007d5854054c0b19
---

# Phase 5 — web-build track — batch 1 (rd2d + mandelbulb) landing

> Build-and-validate of the first two of seven Stack-B web frontends, upstream
> of sub-phase 5.1. Each sim cleared its CHARTER-named gate, MEASURED live (#8)
> — never "it renders." FACT = ran/read/measured at the cited HEAD this session;
> INFERENCE = reasoned. Four-state verdicts. Commits direct to `main`
> (trunk-based). NO tag (I7). Resumed-from-committed re-orients via the charter +
> the web-build-track note + conventions.

## §0 — Headline

| | |
|---|---|
| **Build/validate commit** | `c921462`→ amended `d967e7c` (batch-1 new files). This audit lands on top; `head_sha` back-filled per Convention #12. — FACT |
| **Result** | **2 PASS / 0 BLOCKED.** rd2d `capture_roundtrip` PASS; mandelbulb `new_canonical` PASS. — FACT |
| **Vite build (§6.1)** | rd2d ✓ exit 0; mandelbulb ✓ exit 0 (vite 6.4.3). — FACT |
| **Headless WebGPU** | **§6.1 FALLBACK for BOTH** (DOM-load smoke; NOT real headless browser WebGPU). Real headless browser WebGPU is **unavailable in this environment** (§3). The load-bearing correctness gate runs the **identical committed `.wgsl`** via wgpu-native on the **real AMD RX 6800 XT (RADV/Vulkan)** — REAL GPU validation of the actual shader. — FACT |
| **Tolerance rows added** | **NONE.** rd2d resolves via the pre-existing `[overrides.reaction-diffusion-2d]` rel=1e-4; mandelbulb is new-canonical (no tolerance.toml touch). No widening; `tolerance.toml` unchanged. — FACT |
| **Integrity (live)** | **0 HARD_FAIL / 14 SOFT_WARN, rc 0** — invariant HELD. Full-report digest `9894964135e582fc3d94448f87bdf8d859a1ff29e3675a45fa04a7f04b40b15f` (IDENTICAL to the 5.3/5.5 baseline — the additions touched no integrity-scanned surface). — FACT |
| **render_similarity / variant** | **0.9242 / 0.8702 HARD floors UNAFFECTED** — pure additions; no `render_similarity/`/`variant/` source touched. — FACT |
| **Verdict** | **SHIFTED** — both sims PASS, with THREE measured/landed SHIFTs from the charter, all surfaced (§6): (a) headless *browser* WebGPU unavailable → wgpu-native real-GPU gate + §6.1 browser fallback; (b) pnpm KEPT, not retired (ts-strict CI uses it); (c) mandelbulb round-trip → new-canonical (f32 closed-form floor 1.5e-5 just outside the 1e-5 budget; no widening). |

## §1 — Method / the per-sim gate (measured, not asserted)

Each sim cleared three gates (`tools/productization/web-build/validate.py`):

1. **Vite build** (§6.1 load-bearing) — `npm + vite build` exit 0 in `packages/<sim>/web/`.
2. **wgpu-native correctness gate** — runs the EXACT committed `.wgsl` the Vite
   bundle ships (`gray_scott.wgsl` / `mandelbulb_de.wgsl`) via wgpu-native on the
   real GPU; emits/compares a capture (round-trip) or checks run-twice
   determinism + agreement (new-canonical). This is the §3.8-equivalent
   correctness gate, on the actual shader.
3. **Headless DOM-load smoke** — §6.1 fallback (page loads, module evaluates,
   no unexpected errors). Reported explicitly as fallback per the ratified
   discipline (decision 7).

Device for gate 2: `AMD Radeon RX 6800 XT (RADV NAVI21) (DiscreteGPU) via Vulkan`.

## §2 — Per-sim results (FACT)

### reaction-diffusion-2d — `capture_roundtrip` — **PASS**
- **Vite build**: exit 0. tsc --noEmit clean. Bundle 13.7 kB.
- **Named gate**: cross-stack round-trip vs `captures/reaction-diffusion-2d-ref/`
  via `compare_captures` at the pre-existing `[overrides.reaction-diffusion-2d]`
  → `reaction-diffusion` rel=1e-4. **within_tolerance=True, max_abs=2.64e-5**
  (11 steps, U+V 128²). **Run-twice byte-identical** (GPU, max_abs=0.0).
- **IC fidelity (load-bearing)**: the canonical IC is numpy's seeded
  `uniform(-1e-3,1e-3)` perturbation (NOT the centred square alone). A first
  probe OMITTING it diverged to 1.7% (sensitive pattern-forming dynamics); with
  the exact numpy IC the f32-GPU-vs-f64-NumPy stepping round-trips at 2.6e-5.
  The browser ships the frozen seed-42 IC as `rd2d-ic-seed42.bin`; the gate
  seeds from numpy directly (independent reproduction).
- **Headless**: §6.1 DOM-load fallback PASS (canvas + module ran; only the
  expected WebGPU-unavailable notice). NOT real headless browser WebGPU.

### mandelbulb-explorer — `new_canonical` — **PASS**
- **Vite build**: exit 0. tsc clean. Bundle 13.1 kB. Authored
  `src/mandelbulb_de.wgsl` (Quilez p8 DE, port of `reference/quilez.py`) +
  a sphere-tracing display shader.
- **Named gate (charter SHIFT)**: the charter expected a clean closed-form
  round-trip at `[defaults.closed_form]` rel=1e-5. **MEASURED live**: the f32
  GPU DE agrees with the f64 canonical to **1.4994e-5 absolute** — the
  single-precision floor for this iterated DE (the repo's own
  `precision_pair_at_grid` documents ~1e-5), which at the field scale (0.798)
  is **just outside** the 1e-5 budget (`round_trip_at_1e-5: False`, misses by
  ~2×). Per the no-widen discipline this is an unworkable round-trip →
  **new-canonical**: gate = **run-twice byte-identical** (✓) + the sim's golden
  DE-samples anchor (✓ 3/3) + the agreement REPORTED honestly. `points` field
  bit-exact. **No tolerance widened or added.**
- **Headless**: §6.1 DOM-load fallback PASS. NOT real headless browser WebGPU.

## §3 — Headless-WebGPU capability (the load-bearing SHIFT, MEASURED)

Real headless **browser** WebGPU is **unavailable in this environment** (FACT,
probed four ways):
- snap Chromium 149 (`/snap/bin/chromium`): `navigator.gpu` undefined headless
  even with `--enable-unsafe-webgpu --enable-features=Vulkan` (+ lavapipe /
  swiftshader / angle-vulkan variants).
- non-snap chrome-for-testing 149.0.7827.55: same, via Playwright AND via direct
  launch + `connectOverCDP` (rules out Playwright arg-injection); `chrome://gpu`
  reports no WebGPU. With `--headless=new` and no flags, `navigator.gpu` is
  present but `requestAdapter()` returns null.

Chrome's headless GPU process cannot bring up Vulkan here (the `VK_EXT_physical
_device_drm` extension is absent). **Native wgpu-py works perfectly** on the
real RX 6800 XT (RADV/Vulkan) — the repo's own sanctioned WGSL-execution path
(`packages/neural-ca/python/neural_ca/wgsl_harness.py` precedent). So the
load-bearing correctness gate runs the identical committed `.wgsl` there (REAL
GPU), and the browser bundle's separate gate is its Vite build + the §6.1
DOM-load fallback. 5.1's cloud Playwright will exercise the browser WebGPU path
on a WebGPU-capable runner.

## §4 — Toolchain (npm + Vite; pnpm KEPT — landed-reality SHIFT)

The charter's decision 1 ("retire pnpm-lock.yaml/pnpm-workspace.yaml as
vestigial") is **REVERSED by landed reality**: `ts-strict.yml` runs
`pnpm install --frozen-lockfile` against `common/common-ts/pnpm-lock.yaml`, so
the pnpm files are **CI-load-bearing, not vestigial**. Per §0.3 (landed reality
wins) + HARD RULE 2 (never force) the pnpm files are **KEPT**; the per-sim Vite
apps use **npm + Vite 6.4.3** (pnpm/corepack absent locally), each with a
committed `package-lock.json`. The two pre-existing untracked
`common/common-ts/**/package-lock.json` are **left untracked** (common-ts stays
pnpm-only — no new two-lockfile ambiguity). Shared browser helpers live in the
new `common/common-web/` (outside the ts-strict common-ts scope), consumed as
source by Vite via relative import.

## §5 — §S.5 full sweep (this batch)

- **Local pre-push (FACT):** integrity `--all --mode strict` **0 HF / 14 SW rc 0**
  (report digest identical to baseline); `tools/testkit/equivalence/` **34/34**;
  tolerance-budget integrity **1/1** (94 deselected); both apps `tsc --noEmit`
  clean; both `vite build` exit 0; both DOM smokes PASS; mandelbulb golden
  anchor **3/3**; ruff check + format clean on the new Python.
- **render_similarity (0.9242) + variant (0.8702) HARD floors: UNAFFECTED** —
  the change set is pure additions; no `tools/testkit/render_similarity/` or
  `tools/testkit/equivalence/variant/` source touched, and `tolerance.toml` is
  unchanged.
- **Post-push CI** for the batch is back-filled at the SHA-backfill commit below.

## §6 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (charter) | Measured / reasoned | Disposition |
|---|---|---|---|
| C-1 | Headless browser WebGPU "plausible" (real RADV + lavapipe) | snap AND non-snap Chrome 149 expose no WebGPU adapter headless; native wgpu-py works | **SHIFTED** — wgpu-native real-GPU gate + §6.1 browser fallback (§3); reported per decision 7 |
| C-2 | rd2d "clean cross-stack round-trip" (easy) | first probe diverged 1.7% — the numpy seeded-noise IC was omitted; with the exact IC it round-trips at 2.6e-5 | **CONFIRMED** after IC fix; the divergence was IC, not f32 |
| C-3 | mandelbulb "clean round-trip @1e-5" | f32 DE floor is 1.5e-5 — just outside 1e-5; run-twice byte-identical | **SHIFTED** → new-canonical (no widening); §2 |
| C-4 | Retire pnpm (decision 1) | ts-strict CI uses pnpm `--frozen-lockfile` → load-bearing | **SHIFTED** — pnpm KEPT; npm only for the new apps (§4) |
| C-5 | render/variant floors might be affected | pure additions; no such source touched; tolerance.toml unchanged | UNAFFECTED |

## §7 — SURFACED for operator (decide / ratify)

1. **Headless browser WebGPU unavailable (§3).** Confirm the ratified posture:
   gate-2 wgpu-native real-GPU validation of the committed `.wgsl` + gate-3 §6.1
   DOM-load fallback is the accepted local gate for ALL seven sims, with the
   browser WebGPU path deferred to 5.1's cloud Playwright. (No sim will report
   "real headless browser WebGPU" locally.)
2. **pnpm retained (§4).** Confirm keeping the common-ts pnpm files (CI uses
   them) and using npm only for the per-sim Vite apps, vs. migrating ts-strict
   CI to npm in a separate sub-phase. The two-lockfile convergence the charter
   flagged is deferred (common-ts stays pnpm-only here).
3. **mandelbulb new-canonical (§2).** Confirm accepting the f32 closed-form
   floor (1.5e-5) gated by determinism + golden anchor (no widening) rather than
   adding a wider mandelbulb tolerance override.

## §8 — Closing

Web-build batch 1 is COMPLETE; verdict **SHIFTED**. Both Stack-B web frontends
(reaction-diffusion-2d, mandelbulb-explorer) are authored as real Vite bundles
(settings panel + capture-export hook) and cleared their charter-named gate on
the real GPU: rd2d `capture_roundtrip` PASS @rel=1e-4 (2.6e-5, run-twice
byte-identical); mandelbulb `new_canonical` PASS (run-twice byte-identical, f32
floor 1.5e-5 documented, golden anchor 3/3). No tolerance was widened or added;
`tolerance.toml` is unchanged. Three measured SHIFTs from the charter are
surfaced (headless browser WebGPU unavailable → wgpu-native gate; pnpm kept;
mandelbulb new-canonical). Integrity held 0 HF / 14 SW; the render_similarity
(0.9242) + variant (0.8702) HARD floors are UNAFFECTED. Batches 2 (neural-ca +
ising) and 3 (boids + strange-attractors + physarum) remain. This batch pushed
NO tag (I7).
