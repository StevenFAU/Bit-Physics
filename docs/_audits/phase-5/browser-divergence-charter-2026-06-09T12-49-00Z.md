---
date: 2026-06-09T12-49-00Z
author: phase-5 browser-divergence-resolution PHASE-0 charter session (Claude Code)
subject: "Phase-5 BROWSER-DIVERGENCE RESOLUTION — PHASE-0 charter. Diagnose the 3 web sims that fail their established gate through the browser (rd2d, neural-ca, boids) and propose, per sim, an HONEST resolution (within-backend BUG → fix, vs cross-backend f32 → gate-choice). Measured live on wgpu-native (RADV) + browser Dawn (ANGLE-Vulkan) on the RX 6800 XT; CI lavapipe NOT obtainable in-env. CHARTER ONLY — no fix authored. Oriented from committed repo state, no prior context."
kind: batch-charter
artifact: stage
verdict: PROPOSED
verdict-state: PROPOSED
phase: 5
sub_phase: "browser-divergence-resolution"
head_sha: d6ebd49e210cb87d187873df4f99950f7f00dfe7
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
parent_audits:
  - "[[sub-phase-web-deploy-5.1-landing-2026-06-09T04-12-03Z]]"
  - "[[web-build-track-batch-3-and-close-2026-06-09T03-54-41Z]]"
  - "[[web-build-track-charter-2026-06-09T02-39-17Z]]"
evidence_paths:
  - packages/reaction-diffusion-2d/src/gray_scott.wgsl
  - packages/neural-ca/typescript/src/nca_inference.wgsl
  - packages/boids-3d/src/boids.wgsl
  - packages/reaction-diffusion-2d/web/src/main.ts
  - packages/neural-ca/web/src/main.ts
  - packages/boids-3d/web/src/main.ts
  - tools/productization/web-build/gpu_gate.py
  - tools/productization/web-deploy/verify.py
  - tools/productization/web-deploy/pipeline.py
  - tools/productization/web-deploy/web/headless/driver.mjs
evidence_hashes:
  packages/reaction-diffusion-2d/src/gray_scott.wgsl: sha256:38facf2c89d86cc1cd7e5244693b033ec58a504cd7b805bdad2d48140404a82d
  packages/neural-ca/typescript/src/nca_inference.wgsl: sha256:9021fd3d6c16efc9eb9b8dad0a86a2469159e2b66d3b976297d61a10f59a530d
  packages/boids-3d/src/boids.wgsl: sha256:a8ab713e082b0615f206f9542693c664eb643bdbe43492dd7a4e9d3122148b9f
  packages/reaction-diffusion-2d/web/src/main.ts: sha256:309b0e66b7e0935bf0bac573ca6ffc3a9637194c7a6d1cec007d5854054c0b19
  packages/neural-ca/web/src/main.ts: sha256:2d8b97eba7fc689afda6fd1acd4893b16355f7fbbc27b88ade2d6ef01b0f7204
  packages/boids-3d/web/src/main.ts: sha256:598fe97ac84b4114a47e0a71d3821f6b0e27a3fe94c35ba80355683134150866
  tools/productization/web-build/gpu_gate.py: sha256:bb9c4d003c324f084a30c4b19d9b984c914218cf38584d5bd4a294b806c94ffe
  tools/productization/web-deploy/verify.py: sha256:5c8396a5790e9db41525f2d19d33d50da18d7a7e39bd180bf624f19b3d402380
  tools/productization/web-deploy/pipeline.py: sha256:13b029ddbc3d0109f0e4828913341f1fec6900a004b1eb94bba573311fc6cac5
  tools/productization/web-deploy/web/headless/driver.mjs: sha256:b72fb263f890e06c044842b59d3a077fde062a591f8d2b17c732715c362d0be8
  # frozen-since-5.1 (byte-equal to the 5.1 landing audit's cited hashes): gpu_gate/verify/pipeline/driver
  tools/testkit/equivalence/tolerance.toml: sha256:d19084331cd6504ac284db289ca0453dd92a690603beceb536ef0405bb51c0ba
  tools/testkit/equivalence/tolerance-budget.toml: sha256:e3922b3e3feeddb80a8dc3f27217a257b9eec2eef4c15a61244162bbe4b4dc1e
---

# Phase 5 — BROWSER-DIVERGENCE RESOLUTION — PHASE-0 charter (diagnosis + per-sim resolution + HARD-STOP)

> **CHARTER ONLY. NO fix authored, NO shader/frontend/gate edited, NO tolerance
> touched by this pass.** This document is the per-sim ROOT-CAUSE diagnosis +
> proposed HONEST resolution + backend-portability statement + scope guard that
> PHASE 1 (the self-driven fix) executes once ratified. FACT = ran/read/measured
> at HEAD this session (#8 — never the prompt's numbers, never a prior audit's
> numbers; every divergence and backend was re-measured live). INFERENCE =
> reasoned. Four-state verdicts (CONFIRMED / SHIFTED / REFUTED / DEFERRED).
> Resumed with NO prior context — oriented ONLY from committed repo state.
> Commits direct to `main` (trunk-based). **NO tag (I7).** **HARD-STOP at §10.**

## §0 — Headline

| | |
|---|---|
| **Pass HEAD** | `6821d9a` (5.1 closed here). Local `main` is **16 commits ahead of origin/main** (5.1 + back-fills unpushed); clean tree bar two pre-existing untracked `common/common-ts/**/package-lock.json`. Trust live state (#8). — FACT |
| **Env** | 577 GB free; `node v22.22.3`; Playwright `1.60.0` (in `web-deploy/web/headless/node_modules`); `.venv` has `wgpu 0.31.0`. Browser WebGPU **AVAILABLE locally** (DISPLAY=:0, snap Chromium via `CHROME_BIN`, ANGLE-Vulkan → RADV RX 6800 XT, secure-context localhost) — **MEASURED, re-confirming the 5.1 finding and REFUTING `gpu_gate.py`'s docstring + the web-build track's "unavailable"**. — FACT |
| **STEP-0 (CI/lavapipe)** | **COULD NOT dispatch `web-deploy.yml`.** No `gh` CLI; no `GH_TOKEN`/`GITHUB_TOKEN`; the only remote is an HTTPS `origin` with no creds. **Operator must `workflow_dispatch` it.** Every per-sim gate proposal below is **PENDING lavapipe confirmation**. — FACT |
| **Backend matrix obtained** | **2 of 3.** wgpu-native (wgpu/naga → SPIR-V, RADV/Vulkan) ✓ canonical; browser Dawn (Tint → SPIR-V, ANGLE-Vulkan → RADV/Vulkan) ✓ local; **CI lavapipe (Mesa llvmpipe software Vulkan) — NOT OBTAINED**. NOTE both obtained backends share the RADV driver + the same GPU (§4). — FACT |
| **Root-cause headline** | **The 3 "divergences" are TWO distinct causes, and the split is NOT what the 5.1 audit reported.** rd2d = a real **cross-backend f32 artifact** (deterministic in Dawn). **boids AND neural-ca = the SAME within-Dawn run-to-run BUG — a frontend HARNESS race (concurrent RAF live loop mutates the capture's shared GPU state)**, NOT a shader bug, NOT Dawn FP non-determinism, NOT (for neural-ca) a cross-backend artifact. — FACT/INFERENCE |
| **Decisive proof** | With the live RAF `frame()` stepping disabled (throwaway diagnostic build, reverted), **boids and neural-ca both become run-twice BYTE-IDENTICAL** and both **PASS their established gate in-browser** (boids new_canonical; neural-ca **bit-exact 0.0** vs the wgpu-native canonical). — FACT |
| **Proposed fix surface** | **2 frontend files + 1 gate file. NO shader. NO tolerance.** boids/neural-ca: `web/src/main.ts` harness isolation. rd2d: `verify.py` browser gate-choice (observable/structural). `tolerance.toml`/`tolerance-budget.toml` stay byte-unchanged; `gpu_gate.py` (native canonical) frozen; the 4 passing sims untouched. — INFERENCE (proposal) |
| **physarum playbook** | **Does NOT apply to boids.** boids has no float atomics and its shader is already run-twice byte-identical on BOTH backends; the integer-fixed-point trick is irrelevant. The applicable discipline is the *new-canonical run-twice-byte-identical requirement*, met by harness isolation. — FACT/INFERENCE |
| **HARD gates** | render_similarity (0.9242) + variant (0.8702) — pure-additive proposal, **no such source touched**; `tolerance.toml` byte-unchanged. Integrity **0 HF / 14 SW** measured live. — FACT |
| **Verdict** | **PROPOSED** — charter complete; HARD-STOP for ratification. No fix performed. |

## §1 — Method / STEP-0 backend matrix (FACT)

**What was read in full (committed state):** the 5.1 landing audit, the web-build
track charter + batch-3 close, `gpu_gate.py`, `verify.py`, `pipeline.py`,
`driver.mjs`, the 3 sims' `web/src/main.ts` + their `.wgsl`, the
sub-phase-conventions + phase-5 spec §3.8/§5a/§6.1 + the §2.6 tolerance-budget-
amendment path (via a read-only sub-agent sweep).

**What was MEASURED live (#8 — three campaigns):**

1. **Browser run-twice (within-Dawn determinism)** — drove each built bundle in
   headless Chromium (ANGLE-Vulkan) **twice** via the committed `driver.mjs`
   (fresh `browser.newContext()` per run) and diffed run-0 vs run-1 per field per
   step.
2. **wgpu-native gate (clean lockstep, no RAF)** — re-ran `gpu_gate.py` for all 3
   on the real RX 6800 XT (RADV).
3. **Cross-backend offset** — diffed the browser-Dawn capture directly against the
   wgpu-native output (same committed `.wgsl`, same IC) and against the f64
   canonical.

**Plus a throwaway CAUSATION diagnostic** (edited 2 `main.ts` to disable the live
`frame()` stepping, rebuilt, re-measured, **then `git checkout`-reverted** — tree
clean, HEAD unchanged at `6821d9a`).

**STEP-0 verdict — CI/lavapipe:** **NOT obtainable in this environment.** No
GitHub auth of any kind is present (`gh` absent; no token env; HTTPS remote with
no creds), so `web-deploy.yml`'s `build-and-validate` could not be dispatched on
the 3rd backend. **The operator must `workflow_dispatch` it** (confirm_deploy=false).
Until then the lavapipe column of the matrix is empty and every gate proposal is
flagged **pending lavapipe confirmation**.

| Backend | Path | Driver/GPU | Status |
|---|---|---|---|
| wgpu-native | wgpu/naga → SPIR-V | RADV/Vulkan, RX 6800 XT | **OBTAINED** (canonical) |
| browser Dawn | Tint → SPIR-V (ANGLE-Vulkan) | RADV/Vulkan, RX 6800 XT | **OBTAINED** (local) |
| CI lavapipe | Dawn → Mesa llvmpipe | software Vulkan (CPU) | **NOT OBTAINED** — operator dispatch |

## §2 — PER-SIM ROOT CAUSE (measured run-twice + cross-backend numbers)

### Diagnosis frame (re-stated)
- **A REAL BUG** = non-determinism *within a single backend* (same backend, two
  runs, different bits). Must be FIXED to run-twice byte-identical, then gated.
- **A CROSS-BACKEND f32 ARTIFACT** = self-consistent per backend, differs across
  backends. The bit/pointwise-match gate is *impossible* across backends, not
  *failing*; choose an honest gate, never widen the native tolerance.

### §2.1 — reaction-diffusion-2d → **CROSS-BACKEND f32 ARTIFACT** (gate-choice)

| measurement | result |
|---|---|
| within-Dawn run-twice (steps 0…2000) | **BYTE-IDENTICAL at every step (0.0)** → DETERMINISTIC in Dawn |
| wgpu-native run-twice | byte-identical (0.0); vs f64 canonical **2.64e-5** → PASS @ rel=1e-4 |
| browser-Dawn vs f64 canonical | 2.98e-8 @0 · **1.31e-6 @200** · 1.29e-2 @400 · 7.37e-2 @1400 · **6.36e-2 @2000** |
| **browser-Dawn vs wgpu-native (same shader, same IC, DIRECT)** | **bit-identical through step 200**, then 1.29e-2 @400 → **worst 7.41e-2 @1400** |

**Verdict: cross-backend f32.** rd2d is deterministic within Dawn (run-twice
identical) and bit-identical to wgpu-native for the first 200 steps; once the
Gray-Scott reaction fronts sharpen (~step 300–400) the two backends' f32 rounding
diverges and the front positions lock to slightly different cells, growing to
~0.064–0.074 (field range [0,1]) by step 2000. The established gate (`capture_roundtrip`
vs the f64 canonical @ rel=1e-4 over 2000 steps) is satisfied by wgpu-native
(2.64e-5) and is **impossible** for browser-Dawn — a gate-choice, NOT a bug, NOT a
tolerance to widen.

### §2.2 — neural-ca → **WITHIN-DAWN BUG (frontend harness race)** — reclassified

| measurement | result |
|---|---|
| within-Dawn run-twice (production build, live loop ON) | identical @0,@50; **DIFFERS from step 100** (max_abs ~0.46–0.68) → **NON-DETERMINISTIC** |
| wgpu-native run-twice | byte-identical (0.0); **bit-exact 0.0** vs the WGSL canonical → PASS |
| within-Dawn run-twice (live loop DISABLED, diagnostic) | **BYTE-IDENTICAL (0.0)** → DETERMINISTIC |
| browser-Dawn vs wgpu-native canonical (after race removed) | **bit-exact 0.0** (`verify.py` → `passed:true, bit_exact:true`) |

**Verdict: within-Dawn BUG (the harness race), NOT a cross-backend artifact.** The
5.1 audit characterized neural-ca as "Dawn f32 ≠ wgpu-native bits ~0.72–0.79
(cross-implementation)". **MEASUREMENT REFUTES that:** the ~0.74–0.79 offset and
the run-to-run variation were BOTH the frontend race. Remove the race and neural-ca
is **bit-exact 0.0** to the wgpu-native canonical *in the browser*. There is no
neural-ca cross-backend divergence on the two obtainable backends. (Caveat: that
bit-exactness leans on both backends sharing RADV — see §4 for the lavapipe risk.)

### §2.3 — boids-3d → **WITHIN-DAWN BUG (frontend harness race)** — confirmed bug, wrong fix anticipated

| measurement | result |
|---|---|
| within-Dawn run-twice (production build, live loop ON) | identical @0…@300; **DIFFERS step 400+** (~0.067–0.122) → **NON-DETERMINISTIC** |
| wgpu-native run-twice | byte-identical (0.0); short-horizon step-100 **3.19e-3** < 1e-2; v_max 3.0 → PASS |
| within-Dawn run-twice (live loop DISABLED, diagnostic) | **BYTE-IDENTICAL (0.0)** → DETERMINISTIC |
| established gate after race removed (`verify.py`) | **PASS** — run_twice true, short-horizon 3.19e-3, v_max 3.0 |

**Verdict: within-Dawn BUG = the frontend harness race.** The 5.1 audit/charter
expected "unpinned execution/accumulation order (Dawn FP/workgroup
nondeterminism)" → the physarum integer-fixed-point playbook. **MEASUREMENT
REFUTES the cause:** `boids.wgsl` is a clean ping-pong (read-only `pos_in`/`vel_in`,
write-only `pos_out`/`vel_out`, one invocation per agent, sequential `j=0..n-1`
neighbour loop, **no atomics, no shared memory, no reduction tree, no data race**)
and is run-twice byte-identical on BOTH wgpu-native AND Dawn-once-the-race-is-gone.
The non-determinism is entirely the harness.

### §2.4 — The shared mechanism (root cause, proven)

In `boids-3d/web/src/main.ts` and `neural-ca/web/src/main.ts`, the live render
loop `frame()` (kicked off by `requestAnimationFrame` at app boot) and
`captureCanonical()` **call the SAME `step()`/`stepOnce()` and mutate the SAME
module-level ping-pong index (`s`; `cur`/`nxt`) and the SAME GPU state buffers**.
`captureCanonical()` yields at every `await readBuf/readState(...)`; during that
yield the RAF `frame()` callback fires, advances the simulation, flips the
ping-pong index, and overwrites a buffer the capture loop is mid-using. The number
of interleaved live steps depends on wall-clock (how long each readback takes), so
two captures diverge — **run-to-run non-determinism by data race, not by FP**. It
appears only once a readback exceeds the ~16 ms RAF interval (the GPU queue is deep
enough), which is why divergence onsets mid-run (boids @400, neural-ca @100) rather
than at step 0. The diagnostic (disable `frame()` stepping → both deterministic)
**confirms causation**. rd2d carries the same latent pattern but did not manifest
in either measured run (its single brief readback per capture point did not give
RAF a window) — a portability risk (§4), not a current failure.

## §3 — PER-SIM PROPOSED RESOLUTION

### §3.1 — boids-3d & neural-ca → **HARNESS-ISOLATION FIX** (the determinism BUG)
**Fix (Phase 1):** isolate the capture from the live loop so `captureCanonical()`
runs in lockstep on state the RAF loop cannot touch. Either (a) a `capturing`
guard the `frame()` loop checks before calling `step()`/`stepOnce()` (pause live
stepping for the capture's duration), or (b) give the capture its own dedicated
buffers + local ping-pong state, disjoint from the live loop's. Both restore
run-twice byte-identity (proven by the diagnostic). **This satisfies the
new-canonical run-twice-byte-identical discipline** — the same *requirement*
physarum met, but via harness isolation, **NOT** integer-fixed-point atomics
(inapplicable: no atomics; shaders already deterministic). After the fix, **no
gate change and no tolerance change is needed** on the obtainable backends:
- boids clears its established `new_canonical` gate (run-twice + short-horizon
  3.19e-3 + v_max) — MEASURED PASS.
- neural-ca clears its established `capture_roundtrip` bit-exact gate
  (max_abs 0.0) — MEASURED PASS. (lavapipe caveat: §4.)

### §3.2 — reaction-diffusion-2d → **HONEST BROWSER GATE-CHOICE** (the cross-backend artifact)
The pointwise round-trip vs the f64 canonical @ rel=1e-4 over 2000 steps cannot
hold on a foreign f32 backend and **must not** absorb the offset by widening the
native row. Two honest options; **(ii) is recommended** (portable, mirrors the
ising/strange precedent):

- **(i) Browser-specific canonical + structural cross-check.** Mint a Dawn
  run-twice-byte-identical capture (rd2d IS run-twice byte-identical on Dawn —
  MEASURED) as the *browser* reference (native canonical stays the native
  reference). Tie it to the real physics with a cross-check so it is not a free
  pass: short-horizon agreement vs the f64 canonical (≤1e-4 through step 200 —
  MEASURED 1.31e-6) + total-mass conservation + bounded-in-[0,1] + structural
  pattern statistics. **Minting discipline:** the browser canonical is only minted
  after it is verified run-twice byte-identical on its target backend (the
  new-canonical discipline). **Weakness:** it is ANGLE-specific and would need a
  *second* mint for lavapipe (§4) → not portable as a single artifact.
- **(ii) Observable/structural-only browser gate (RECOMMENDED).** Gate browser
  delivery on: **run-twice determinism (per backend)** + **short-horizon agreement
  vs the f64 canonical (≤1e-4 through step 200)** + **mass conservation** +
  **bounded/structural pattern metrics** — NOT the full-2000-step pointwise match.
  Every term is physics-grounded and satisfied by any correct f32 backend (the
  early steps are near-bit-identical across backends; the observables are
  invariants), so it is **portable across ANGLE and lavapipe** without a
  per-backend artifact. The dense pointwise round-trip remains validated on
  wgpu-native by `gpu_gate.py` @ rel=1e-4 (2.64e-5).

**In both options `tolerance.toml`'s `[overrides.reaction-diffusion-2d]` rel=1e-4
row stays BYTE-UNCHANGED** (wgpu-native keeps using it; 2.64e-5 still passes). No
`[overrides.*]` is widened; no Cat-X budget cap is touched.

## §4 — BACKEND PORTABILITY (per gate; the lavapipe risk is REAL)

**Why both obtained backends agree so closely:** browser-Dawn (ANGLE-Vulkan) and
wgpu-native (wgpu/naga) BOTH compile WGSL → SPIR-V and run on the **same RADV
Vulkan driver + the same RX 6800 XT ALU**. The only difference is the WGSL→SPIR-V
front-end (Tint vs naga). That is why neural-ca is *bit-exact* across them and rd2d
agrees for 200 steps. **CI lavapipe is a different story** — a CPU software
rasterizer with its own ALU/rounding — so cross-backend agreement on lavapipe is
materially weaker. INFERENCE, strongly evidenced; UNMEASURED (no dispatch).

| gate | ANGLE-Vulkan (measured) | wgpu-native (measured) | CI lavapipe |
|---|---|---|---|
| boids `new_canonical` (run-twice + short-horizon 1e-2 + v_max) | PASS after harness fix | PASS | **likely holds** — tolerance-based + race-fix is backend-agnostic. PENDING |
| neural-ca `capture_roundtrip` **bit-exact 0/0** | PASS after harness fix | PASS | **AT RISK** — bit-exactness leaned on shared RADV; lavapipe ALU differs. PENDING |
| rd2d browser gate (option ii observables) | designed to PASS | n/a (native is `gpu_gate.py`) | **designed to hold** (observables/short-horizon). PENDING |

**Contingency to ratify (§9):** if the operator's lavapipe dispatch shows neural-ca
is NOT bit-exact there, neural-ca's *browser* gate falls back to the SAME
treatment as rd2d (observable/tolerance browser gate); its **bit-exact gate stays
for wgpu-native**. The harness-isolation fix (§3.1) is required regardless of
backend and is the load-bearing change.

## §5 — SCOPE GUARD (exact files; what stays untouched)

**This is sanctioned divergence-resolution (sim-correctness work), which DOES
touch sim/frontend/gate code that prior Phase-5 sub-phases forbade — correct for
THIS pass.** Proposed PHASE-1 edits, per sim:

| sim | file(s) that change | what changes | shader? |
|---|---|---|---|
| boids-3d | `packages/boids-3d/web/src/main.ts` | harness isolation (capture ⊥ live loop) | **NO — `boids.wgsl` untouched** |
| neural-ca | `packages/neural-ca/web/src/main.ts` | harness isolation (capture ⊥ live loop) | **NO — `nca_inference.wgsl` untouched** |
| rd2d | `tools/productization/web-deploy/verify.py` (`_gate_rd2d`) + its parity guard `tools/productization/web-deploy/smoke/test_pipeline.py` + `ESTABLISHED_THRESHOLDS` | browser observable/structural gate-choice | **NO — `gray_scott.wgsl` untouched** |

**Confirmed UNTOUCHED:**
- The **4 passing sims** (mandelbulb, strange-attractors, physarum, ising) —
  frontends, shaders, gates: no edit.
- `tools/productization/web-build/gpu_gate.py` — the **wgpu-native canonical gate**
  — byte-frozen (sha `bb9c4d0…`).
- `tolerance.toml` (sha `d190843…`) + `tolerance-budget.toml` (sha `e3922b3…`) —
  **byte-unchanged**; no `[overrides.*]` added/widened, no Cat-X cap touched.
- The pipeline plumbing (`pipeline.py`, `driver.mjs`) — unchanged.
- `render_similarity/` + `variant/` source — untouched; the 0.9242 / 0.8702 HARD
  floors UNAFFECTED.

**Latent-risk FLAG (not a change this pass):** rd2d/ising/physarum carry the same
RAF-share-state harness pattern as boids/neural-ca; they pass today only because
their capture readbacks did not open a RAF window in the measured runs. On
lavapipe (slower readbacks) they could flake run-to-run. The minimal fix targets
only the 2 measured failures; hardening the shared capture discipline across all 7
is an operator decision (§9) and would touch `common/common-web` — out of this
pass's minimal scope.

## §6 — FACT / INFERENCE enumeration

- FACT — browser WebGPU available locally (ANGLE-Vulkan/RADV, secure-context);
  re-measured, REFUTES `gpu_gate.py` docstring + web-build "unavailable".
- FACT — within-Dawn run-twice: rd2d byte-identical; neural-ca differs from step
  100; boids differs from step 400 (production builds).
- FACT — live-loop-disabled diagnostic: neural-ca & boids both run-twice
  byte-identical and both PASS their established gate (neural-ca bit-exact 0.0).
- FACT — wgpu-native gate: all 3 run-twice byte-identical; rd2d 2.64e-5,
  neural-ca bit-exact 0.0, boids short-horizon 3.19e-3 — all PASS.
- FACT — rd2d direct cross-backend (Dawn vs RADV, same shader): bit-identical to
  step 200, worst 7.41e-2 by step 1400.
- FACT — `tolerance.toml`/`tolerance-budget.toml` byte-unchanged (real sha256);
  integrity 0 HF / 14 SW measured live.
- FACT — CI/lavapipe NOT dispatchable in-env (no gh/token/creds).
- INFERENCE — the boids/neural-ca non-determinism is the RAF-shared-state race
  (proven by the disable-live-loop diagnostic); rd2d's offset is Tint-vs-naga
  SPIR-V front-end divergence on shared RADV.
- INFERENCE — lavapipe will weaken neural-ca's bit-exactness and rd2d's pointwise
  match (different ALU); boids' tolerance-based gate should survive. Strongly
  evidenced, UNMEASURED.

## §7 — Four-state verdicts (per diagnostic claim)

| Claim | Verdict | Evidence |
|---|---|---|
| Browser WebGPU available locally | **CONFIRMED** | driver ran on ANGLE-Vulkan; 3×2 captures emitted |
| boids non-determinism is within-backend (a BUG) | **CONFIRMED** | run-twice differs in Dawn; deterministic on wgpu-native + diagnostic |
| boids cause = Dawn FP / needs physarum integer-atomics | **REFUTED** | clean ping-pong shader; deterministic once RAF race removed |
| neural-ca is a cross-backend f32 divergence | **REFUTED** | bit-exact 0.0 in-browser once race removed (on RADV-shared backends) |
| neural-ca non-determinism is the SAME harness race | **CONFIRMED** | identical diagnostic outcome to boids |
| rd2d is a cross-backend f32 artifact | **CONFIRMED** | deterministic in Dawn; bit-identical to RADV ≤step200, diverges after |
| Fix needs no shader edit, no tolerance widen | **CONFIRMED** (proposal) | diagnostic passes gates with shaders/tolerance unchanged |
| lavapipe holds the same verdicts | **DEFERRED** | not dispatchable in-env; operator must confirm |

## §8 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (prompt / 5.1 audit) | Measured / reasoned | Disposition |
|---|---|---|---|
| C-1 | neural-ca = cross-backend f32 (Dawn bits ≠ wgpu-native, ~0.72–0.79) | within-Dawn HARNESS RACE; bit-exact 0.0 once removed | **REFUTED** — reclassified BUG, not cross-backend |
| C-2 | boids = "Dawn FP/workgroup nondeterminism" → physarum integer-atomics | clean ping-pong; deterministic on both backends sans the RAF race | **REFUTED cause** — fix is harness isolation, not atomics |
| C-3 | "rd2d + neural-ca are likely cross-backend f32" | only **rd2d** is cross-backend; neural-ca is the bug | **SHIFTED** — 1 cross-backend, 2 same-bug |
| C-4 | each divergence needs its own gate strategy | 2 of 3 share ONE harness fix and need NO gate change | **SHIFTED** — simpler, less invasive than anticipated |
| C-5 | browser WebGPU unavailable (`gpu_gate.py` docstring; web-build track) | AVAILABLE over secure context (ANGLE-Vulkan) | **REFUTED** — re-confirms 5.1's C-1 |
| C-6 | local ANGLE vs CI lavapipe both "real browser WebGPU", interchangeable | both obtained backends share RADV → agree tightly; lavapipe is a distinct ALU (risk) | **FLAGGED** — portability caveat (§4) |
| C-7 | render/variant HARD floors | proposal touches no such source; tolerance.toml byte-unchanged | **UNAFFECTED** |

## §9 — SURFACED for operator (decide / ratify) — HARD-STOP

1. **DISPATCH `web-deploy.yml`** (`workflow_dispatch`, confirm_deploy=false) — the
   only way to fill the lavapipe column. Every gate below is pending it. (Operator
   action — not dispatchable from this env.)
2. **Ratify the reclassification:** boids + neural-ca are ONE within-Dawn harness
   BUG (not Dawn-FP, not cross-backend); rd2d is the ONLY cross-backend f32 case.
3. **Ratify the boids/neural-ca fix = harness isolation** in the two `web/src/main.ts`
   (capture ⊥ live RAF loop), **NO shader edit, NO tolerance, NO physarum
   integer-atomics.**
4. **Ratify the rd2d browser gate = option (ii) observable/structural** (run-twice
   + short-horizon ≤1e-4 through step 200 + mass + structural), portable across
   backends, with the native `gpu_gate.py` rel=1e-4 row byte-unchanged. (Or pick
   (i) browser-specific canonical if a pointwise browser reference is preferred —
   accepting per-backend minting.)
5. **Ratify the lavapipe contingency:** if dispatch shows neural-ca is NOT
   bit-exact on lavapipe, its *browser* gate falls back to rd2d-style observables;
   the bit-exact gate stays for wgpu-native.
6. **Decide the latent-race scope:** fix ONLY the 2 measured failures (minimal,
   recommended) vs harden the shared capture discipline across all 7
   (`common/common-web`) defensively against lavapipe timing.
7. **Push posture:** local `main` is 16 commits ahead of origin (5.1 unpushed);
   this charter adds one more. Pushing needs the SSH remote URL (HTTPS has no
   creds). Confirm push now or defer.
8. **NO tag (I7).**

## §10 — STOP / Closing

PHASE-0 diagnosis COMPLETE; verdict **PROPOSED**. The 3 browser divergences were
re-measured live on the two obtainable WebGPU backends (wgpu-native/RADV and
browser-Dawn/ANGLE-Vulkan) and resolve into **two** causes — not the three the 5.1
audit implied. **rd2d** is a genuine, deterministic **cross-backend f32 artifact**
(bit-identical to wgpu-native for 200 steps, then ~0.064–0.074 by step 2000) →
honest browser gate-choice (recommended: observable/structural; native rel=1e-4
row untouched). **neural-ca and boids** are the **same within-Dawn BUG — a frontend
RAF/​capture data race**, proven by a disable-the-live-loop diagnostic after which
both run-twice byte-identical and PASS their established gate (neural-ca **bit-exact
0.0**). The physarum integer-fixed-point playbook does **not** apply (no atomics;
shaders already deterministic). The proposed fix is **2 `web/src/main.ts` files +
1 gate file, NO shader, NO tolerance**, leaving the 4 passing sims, the
wgpu-native canonical gate, the HARD floors, and `tolerance.toml` byte-unchanged.
**CI/lavapipe could NOT be dispatched in-env (no GitHub auth)** — the operator must
run it, and every gate is flagged pending that 3rd-backend confirmation, with a
named contingency if lavapipe breaks neural-ca's bit-exactness. **No fix was
authored; no shader/tolerance touched; no tag (I7).** Eight items are surfaced for
ratification (§9). **HARD-STOP — resume on `continue` or amended scope.**
