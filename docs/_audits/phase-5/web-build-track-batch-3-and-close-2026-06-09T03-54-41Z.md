---
date: 2026-06-09T03-54-41Z
author: phase-5 web-build track PHASE-1 batch-3 + track-close session (Claude Code)
subject: "Phase-5 web-build track — batch 3 (strange-attractors + boids-3d + physarum) build-and-validate landing + TRACK CLOSE (all 7 Stack-B web frontends built). All three greenfield sims cleared their charter-named new-canonical gate (run-twice byte-identical + structural anchors). physarum's atomic deposit is integer fixed-point → deterministic; total_mass exact. 7/7 web builds now exist for sub-phase 5.1."
kind: sub-phase-landing
artifact: sub-phase
verdict: CONFIRMED
verdict-state: CONFIRMED
phase: 5
sub_phase: "web-build-batch-3-and-close"
head_sha: f1a47adaf00541a267f7aa6eb07d3289d8b368aa
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
parent_audits:
  - "[[web-build-track-batch-2-landing-2026-06-09T03-35-36Z]]"
  - "[[web-build-track-batch-1-landing-2026-06-09T03-17-42Z]]"
  - "[[web-build-track-charter-2026-06-09T02-39-17Z]]"
evidence_paths:
  - packages/strange-attractors/src/lorenz_rk4.wgsl
  - packages/boids-3d/src/boids.wgsl
  - packages/physarum/src/physarum.wgsl
  - tools/productization/web-build/gpu_gate.py
evidence_hashes:
  packages/strange-attractors/src/lorenz_rk4.wgsl: sha256:1110173053609f2fb533fc31c465aa6d366f1089786dcb532c59f6a557e66489
  packages/boids-3d/src/boids.wgsl: sha256:a8ab713e082b0615f206f9542693c664eb643bdbe43492dd7a4e9d3122148b9f
  packages/physarum/src/physarum.wgsl: sha256:8ddd5a4799ad185af50fb7d9c3333aaac0498e3f8596809017754be82d799a26
  tools/productization/web-build/gpu_gate.py: sha256:bb9c4d003c324f084a30c4b19d9b984c914218cf38584d5bd4a294b806c94ffe
---

# Phase 5 — web-build track — batch 3 + TRACK CLOSE (all 7 built)

> Build-and-validate of the final three greenfield web frontends, and the close
> of the web-build track: all 7 Stack-B sims now have a real Vite web build with
> a settings panel + capture-export hook, validated on the real GPU. Each sim
> cleared its CHARTER-named gate, MEASURED live (#8) — never "it renders". FACT
> = ran/read/measured this session. Four-state verdicts. Commits direct to
> `main` (trunk-based). NO tag (I7).

## §0 — Headline

| | |
|---|---|
| **Batch-3 commits** | `0f0e33e` (strange-attractors), `240a7b5` (boids-3d), `f1a47ad` (physarum). This audit + back-fill land on top; `head_sha` per Convention #12. — FACT |
| **Batch-3 result** | **3 PASS / 0 BLOCKED**, all `new_canonical`. — FACT |
| **TRACK total** | **7 / 7 web builds built + validated** (rd2d, mandelbulb, neural-ca, ising, strange-attractors, boids-3d, physarum). 5.1 is UN-BLOCKED. — FACT |
| **Vite build (§6.1)** | all 3 ✓ exit 0; all tsc --noEmit clean. — FACT |
| **Headless WebGPU** | **§6.1 FALLBACK for all 3** (DOM-load smoke). Correctness gate runs the identical committed `.wgsl` via wgpu-native on the **real RX 6800 XT (RADV/Vulkan)** — unchanged from batches 1-2 (no headless browser WebGPU in-env). — FACT |
| **Tolerance rows added** | **NONE across the entire track.** `tolerance.toml` is byte-unchanged. — FACT |
| **Determinism** | all 3 **run-twice BYTE-IDENTICAL** (mandatory for new-canonical). physarum's atomic deposit is **integer fixed-point** → order-independent → deterministic. — FACT |
| **Integrity (live)** | **0 HARD_FAIL / 14 SOFT_WARN** — invariant HELD; report digest unchanged from baseline. — FACT |
| **render_similarity / variant** | **0.9242 / 0.8702 HARD floors UNAFFECTED** — pure additions; no such source touched. — FACT |
| **Verdict** | **CONFIRMED** — 3/3 PASS; track closed with 7/7 built. No SHIFT beyond those already surfaced in batch 1 (headless-WebGPU, pnpm-kept). |

## §1 — Batch-3 per-sim results (FACT)

### strange-attractors — `new_canonical` — **PASS**
- **Vite build** exit 0, tsc clean. Authored `src/lorenz_rk4.wgsl` (classical RK4
  + Lorenz field, ports `strange_attractors.integrator`/`reference.lorenz`).
  Web app renders the trajectory as an orbiting point cloud.
- **Named gate (charter)**: f32 RK4 of the **chaotic** Lorenz system diverges
  pointwise from the f64 canonical by the trajectory end (NOT a round-trip).
  Gate = **run-twice byte-identical** (✓) + **structural attractor invariants**:
  per-axis (min, max, std) match the f64 reference to worst rel **0.0504** (< 0.12);
  mean (near-zero, ill-conditioned) within abs 1.04 (< 1.5); finite/on-attractor.

### boids-3d — `new_canonical` — **PASS**
- **Vite build** exit 0, tsc clean. Authored `src/boids.wgsl` (Reynolds
  sep/align/cohesion over the perception ball + v_max-clamped Euler; one
  invocation per agent, sorted-by-index neighbour loop matching the NumPy order).
  Web app renders the flock as an orbiting point cloud.
- **Named gate (charter decision 3)**: MEASURED the cross-stack round-trip first —
  flocking is **sensitive-dependent**: f32 vs f64 agrees to **3.2e-3 at step 100**
  (correct dynamics) but diverges to scale ~112 by step 1000. No sound tolerance
  holds → **new-canonical** (the decision-3 fallback). Gate = run-twice
  byte-identical + **short-horizon correctness** (step-100 pos < 1e-2) + the
  **v_max clamp invariant** (observed 3.0 ≤ 3.0). No `[overrides.boids-3d]` /
  `[budgets.agent-based.*]` added (round-trip not viable; no widening).

### physarum — `new_canonical` — **PASS** (the atomics sim)
- **Vite build** exit 0, tsc clean. Authored `src/physarum.wgsl` — a **3-pass**
  step (agents sense/rotate/move + deposit; apply; periodic box-blur diffuse +
  decay), ports `physarum.reference`.
- **Atomic determinism (the load-bearing design choice)**: the trail deposit is
  the sim's `atomic_ops`. Float atomic-add is non-associative → run-to-run
  non-deterministic, which would make any minted canonical fragile (the ratified
  STOP condition). So the deposit is done as **integer fixed-point
  `atomicAdd<u32>`** (deposit·65536 accumulated as u32, converted to f32 in the
  apply pass) — integer add is **order-independent**, so the run is **run-twice
  BYTE-IDENTICAL** (MEASURED ✓). The float-atomics trap is avoided by design.
- **Named gate (charter)**: atomics + agent RNG IC preclude a trail-FIELD match
  to the f64 canonical → **new-canonical**. Gate = run-twice byte-identical +
  the **exact mass-balance invariant**: `total_mass = deposit·N·(1-α)/α = 22500`.
  MEASURED `total_mass = 22500.0000`, the canonical is `22500.0000…` — relative
  diff ~1e-12 (an exact structural match), + finite.

## §2 — TRACK SUMMARY — all 7 web builds (the §6.1 qualifying surface)

| # | Sim | Cohort | Gate kind | Gate result (real GPU) | Vite | Headless |
|---|---|---|---|---|---|---|
| 1 | reaction-diffusion-2d | WGSL-seeded | capture_roundtrip | PASS @rel=1e-4 (2.6e-5) | ✓ | §6.1 fallback |
| 2 | mandelbulb-explorer | greenfield | new_canonical | run-twice ✓; f32 DE floor 1.5e-5 | ✓ | §6.1 fallback |
| 3 | neural-ca | WGSL-seeded | capture_roundtrip | **BIT-EXACT 0.0** | ✓ | §6.1 fallback |
| 4 | ising-classical | WGSL-seeded | observable | run-twice ✓; energy z=0.32 vs NumPy ensemble | ✓ | §6.1 fallback |
| 5 | strange-attractors | greenfield | new_canonical | run-twice ✓; structural rel 0.050 | ✓ | §6.1 fallback |
| 6 | boids-3d | greenfield | new_canonical | run-twice ✓; short-horizon 3.2e-3 + v_max | ✓ | §6.1 fallback |
| 7 | physarum | greenfield | new_canonical | run-twice ✓; total_mass exact (22500) | ✓ | §6.1 fallback |

Every sim ships a real Vite app (`packages/<sim>/web/`) with the shared settings
panel (`common/common-web/`) + a capture-export hook, and clears its named gate
on the real GPU via the identical committed `.wgsl` (`tools/productization/web-build/`).
**No sim validated under real *headless browser* WebGPU locally** (unavailable
in-env, §0.3 SHIFT, batch 1 §3); the browser WebGPU path is for 5.1's cloud
Playwright. **No tolerance was widened or added anywhere; `tolerance.toml` is
byte-unchanged.**

## §3 — §S.5 full sweep (this batch / track close)

- **Local pre-push (FACT):** integrity `--all --mode strict` **0 HF / 14 SW**
  (digest unchanged); all 3 batch-3 apps `tsc --noEmit` clean + `vite build`
  exit 0; all 3 GPU gates PASS on the real GPU (run-twice byte-identical); all 3
  DOM smokes PASS (§6.1 fallback); ruff check + format clean on the harness.
- **render_similarity (0.9242) + variant (0.8702) HARD floors: UNAFFECTED** —
  pure additions; no `render_similarity/`/`variant/` source touched;
  `tolerance.toml` unchanged across the whole track.
- **Post-push CI** back-filled at the SHA-backfill commit below.

## §4 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (charter) | Measured | Disposition |
|---|---|---|---|
| C-1 | boids "measure budget else new-canonical" | sensitive; diverges to ~112 by step 1000 (3e-3 at step 100) | new-canonical (decision-3 fallback); no budget added |
| C-2 | strange-attractors new-canonical (chaos) | confirmed; structural invariants match (rel 0.050) | CONFIRMED |
| C-3 | physarum new-canonical (atomics); STOP if not run-twice-identical | **integer-atomic deposit IS run-twice byte-identical**; total_mass exact | CONFIRMED — no STOP needed; the float-atomics trap was designed around |
| C-4 | order "WGSL-seeded first, lower risk" | rd2d/neural-ca easiest; ising hard (observable); greenfield mandelbulb easy | risk-ascending order held (§C of charter); no surprise |
| C-5 | render/variant floors | pure additions; untouched; tolerance.toml byte-unchanged | UNAFFECTED |

## §5 — SURFACED for operator (track close)

1. **5.1 is UN-BLOCKED** — 7 qualifying web builds now exist (`packages/<sim>/web/`,
   each with a succeeding Vite build + settings panel + capture-export). 5.1 can
   author `web-deploy.yml` + the Playwright Chromium bootstrap-verification and
   fan out one job per build. The browser WebGPU round-trip (not testable
   headless in THIS env) is 5.1's cloud-runner concern; the shaders are already
   real-GPU-validated here.
2. **Headless browser WebGPU** (carried from batch 1): unavailable in-env; the
   committed gate is wgpu-native + §6.1 DOM-load fallback. Confirm this is the
   accepted local posture (it is the only one available here).
3. **pnpm retained** (carried from batch 1): `ts-strict` CI uses it; the per-sim
   web apps use npm + Vite 6 with committed lockfiles. Two-lockfile convergence
   for common-ts deferred.
4. **No tag (I7)** — the optional point-release tag is the operator's call.

## §6 — Closing

The Phase-5 **web-build track is COMPLETE**; verdict **CONFIRMED**. All **7/7**
Stack-B sims now have a real Vite web build (settings panel + capture-export),
each cleared its charter-named gate on the real GPU via the identical committed
`.wgsl`: 2 capture_roundtrip (rd2d 1e-4; neural-ca bit-exact), 1 observable
(ising z=0.32), 4 new_canonical (mandelbulb f32-floor, strange-attractors chaos,
boids sensitivity, physarum atomics) — every one run-twice byte-identical where
new-canonical, every gate a REAL artifact-vs-criterion check, never "it renders".
**No tolerance was widened or added; `tolerance.toml` is byte-unchanged across the
whole track.** physarum's atomic determinism trap was designed around with
integer fixed-point deposit (run-twice byte-identical; total_mass exact). The
shared harness (`common/common-web/`, `tools/productization/web-build/`) +
npm/Vite toolchain are in place. Integrity held 0 HF / 14 SW; the
render_similarity (0.9242) + variant (0.8702) HARD floors are UNAFFECTED.
**Sub-phase 5.1 (`web-deploy`) is UN-BLOCKED.** Two landed-reality SHIFTs
(headless browser WebGPU unavailable → wgpu-native gate; pnpm kept) are surfaced.
This track pushed NO tag (I7).
