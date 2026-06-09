---
date: 2026-06-09T13-24-25Z
author: phase-5 browser-divergence-resolution PHASE-1 landing session (Claude Code)
subject: "Phase-5 BROWSER-DIVERGENCE RESOLUTION — PHASE-1 landing. The 3 web sims that failed their established gate through the browser (rd2d, neural-ca, boids) are RESOLVED by a shared capture/live-loop mutual-exclusion fix (the harness race), hardened across ALL 7 web frontends. MEASURED post-fix: all 7 run-twice BYTE-IDENTICAL + clear their established gate on the obtainable backends (wgpu-native + browser ANGLE-Vulkan). rd2d's Phase-0 'cross-backend' offset was ALSO the race (now 2.64e-5 == wgpu-native) → Decision 2 SHIFTED to an opt-in pending-lavapipe contingency. CI lavapipe still un-dispatchable in-env."
kind: sub-phase-landing
artifact: sub-phase
verdict: CONFIRMED
verdict-state: CONFIRMED
phase: 5
sub_phase: "browser-divergence-resolution"
head_sha: PLACEHOLDER-BACKFILL-PER-CONVENTION-12
prior_phase_tag: v0.4.0-phase-4
integrity_invariant: "0 HARD_FAIL / 16 SOFT_WARN"
parent_audits:
  - "[[browser-divergence-charter-2026-06-09T12-49-00Z]]"
  - "[[sub-phase-web-deploy-5.1-landing-2026-06-09T04-12-03Z]]"
  - "[[web-build-track-batch-3-and-close-2026-06-09T03-54-41Z]]"
evidence_paths:
  - common/common-web/src/capture-export.ts
  - common/common-web/src/settings-panel.ts
  - tools/productization/web-deploy/verify.py
  - packages/boids-3d/web/src/main.ts
  - packages/neural-ca/web/src/main.ts
  - packages/reaction-diffusion-2d/web/src/main.ts
  - packages/physarum/web/src/main.ts
  - packages/ising-classical/web/src/main.ts
  - packages/mandelbulb-explorer/web/src/main.ts
  - packages/strange-attractors/web/src/main.ts
  - tools/productization/web-build/gpu_gate.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tolerance-budget.toml
evidence_hashes:
  common/common-web/src/capture-export.ts: sha256:0078609048dd8a1dbfaaff8584d4edcddbc9264d1e9782a13104cebcd3648f2f
  common/common-web/src/settings-panel.ts: sha256:6814ce3da244b6b320509816f4c68105640533ed27334d50ff9fe02e6e5d25fc
  tools/productization/web-deploy/verify.py: sha256:5db2744b1fbf37f771435a925cf35a841614c12572cf518417b9e643c56202d6
  packages/boids-3d/web/src/main.ts: sha256:b0ad2ad2fe7c6f731f6a75d02db043687b13e97d8d0c1736f4fac3d39ee1b6ae
  packages/neural-ca/web/src/main.ts: sha256:637c372533f2e83291a4a3b83b43b5162c5cb77ab0d716aa7ceb98cb478ac55d
  packages/reaction-diffusion-2d/web/src/main.ts: sha256:38e638c8c0d5540b0f3fdf7ca05042a907411c5525f4cf6f9bc431a919d9b0f7
  packages/physarum/web/src/main.ts: sha256:0815422a4231a819e0f3fc7f4f669692a1a31bf348691e2533d3b10d36cb520a
  packages/ising-classical/web/src/main.ts: sha256:b88f88e706c71e59167335907dc50c50ea8a445e93af8d945247172db159f4f2
  packages/mandelbulb-explorer/web/src/main.ts: sha256:8f6d839a057ad04c6c12ba380ec8ff092b8b5bb1a6b31c7c3a005b7c9dd9ff2d
  packages/strange-attractors/web/src/main.ts: sha256:fd59b50352d72a6cdbaa8776145725e7c290a7dddaca79bff8be50a58eb2ad9a
  tools/productization/web-build/gpu_gate.py: sha256:bb9c4d003c324f084a30c4b19d9b984c914218cf38584d5bd4a294b806c94ffe
  tools/testkit/equivalence/tolerance.toml: sha256:d19084331cd6504ac284db289ca0453dd92a690603beceb536ef0405bb51c0ba
  tools/testkit/equivalence/tolerance-budget.toml: sha256:e3922b3e3feeddb80a8dc3f27217a257b9eec2eef4c15a61244162bbe4b4dc1e
commit_harness_fix: dbe3c3d
commit_contingency: 94d59f7
---

# Phase 5 — BROWSER-DIVERGENCE RESOLUTION — PHASE-1 landing (all 7 re-gated)

> The 3 web sims that failed their established gate through the browser (rd2d,
> neural-ca, boids) are RESOLVED. Root cause (Phase-0, measured): a frontend
> HARNESS RACE — the live `requestAnimationFrame` loop steps the sim on the
> SAME module-level ping-pong state the capture uses. Fix: a shared capture/
> live-loop mutual-exclusion lock, hardened across ALL 7 frontends. FACT =
> ran/read/measured this session (#8). Four-state verdicts. Commits direct to
> `main` (trunk-based). **NO tag (I7). NO tolerance widened.**

## §0 — Headline

| | |
|---|---|
| **Commits** | `dbe3c3d` (harness fix: 2 `common-web` + 7 `web/src/main.ts`), `94d59f7` (opt-in observable contingencies in `tools/productization/web-deploy/verify.py`), + this audit + the #12 back-fill. — FACT |
| **SSH push** | Remote switched to `git@github.com:StevenFAU/Bit-Physics.git`; SSH auth OK; the 18 unpushed commits + this work PUSHED; **origin/main caught up (0 ahead)**. — FACT |
| **Root cause (ratified)** | a within-Dawn **HARNESS RACE**, NOT cross-backend f32 and NOT the physarum atomics case. `captureCanonical()` and the live `frame()` loop shared the module-level ping-pong index + GPU buffers; `frame()` interleaved during the capture's `await` readbacks. — FACT |
| **Fix** | shared `runCaptureExclusive` lock in `common/common-web/src/capture-export.ts`; the panel wraps `onCapture`; every `frame()` loop guards on `isCapturing()`. **NO shader, NO tolerance, NO atomics.** Hardened across **all 7** (Decision 3). — FACT |
| **Post-fix gate (7/7)** | **ALL 7 run-twice BYTE-IDENTICAL + PASS** their established gate on the obtainable backends (wgpu-native + browser ANGLE-Vulkan, RX 6800 XT). boids new_canonical; neural-ca **bit-exact 0.0**; rd2d capture_roundtrip **2.64e-5** (== wgpu-native). — FACT |
| **rd2d SHIFT (Decision 2)** | rd2d's Phase-0 "cross-backend f32 offset" (0.064) was **ALSO the harness race** (deterministic contamination). Clean, rd2d matches the f64 canonical at **2.6414220577697378e-05 — bit-identical to wgpu-native**, clearing its ESTABLISHED 1e-4 gate in-browser. The observable gate is therefore **SHIFTED to an opt-in pending-lavapipe contingency**, NOT the default — the established gate is honest and stronger. — FACT |
| **4 passing sims** | mandelbulb / strange / ising browser captures **byte-identical to 5.1**; physarum **gate-identical** (trail_map + total_mass 0.0 diff) — its non-gated agent positions were latently contaminated and are now corrected. **No passing sim regressed.** — FACT |
| **Tolerance** | `tolerance.toml` (sha `d190843…`) + `tolerance-budget.toml` (sha `e3922b3…`) **byte-unchanged**; `gpu_gate.py` (native canonical) **untouched** (sha `bb9c4d0…`); parity guard intact (9/9 smoke). — FACT |
| **Integrity** | **0 HARD_FAIL / 16 SOFT_WARN** (was 14; +2 are the Phase-0 charter's own cat5 FACT-citation warnings — benign, same class). — FACT |
| **render_similarity / variant** | 0.9242 / 0.8702 — **no such source touched** (`git diff 6821d9a..HEAD` over `render_similarity`/`variant` = ∅); CI `test-render-similarity` on the push sweep. — FACT |
| **CI lavapipe** | still **NOT dispatchable in-env** (no GitHub token). Every gate is **confirmed-on-RADV-backends, PENDING lavapipe**. Operator must `workflow_dispatch web-deploy.yml`. — FACT |
| **Verdict** | **CONFIRMED** — all 3 failures resolved, all 7 hardened + re-gated green; with the documented rd2d SHIFT and the pending-lavapipe flag. |

## §1 — The fix (Decision 1 + 3): shared capture/live-loop mutual exclusion

`common/common-web/src/capture-export.ts` gains a module-level lock: `isCapturing()`
+ `runCaptureExclusive(fn)` (sets the flag synchronously before the first await,
clears it in `finally`). `common/common-web/src/settings-panel.ts` wraps the capture
button's `onCapture` in `runCaptureExclusive`. Every one of the 7
`packages/<sim>/web/src/main.ts` `frame()` loops gains a one-line guard
`if (isCapturing()) { requestAnimationFrame(frame); return; }`, so the live loop
cannot step the sim (or read shared buffers) while a capture is in flight. This is
the **new-canonical run-twice-byte-identical discipline** met by **harness
isolation** — NOT integer-fixed-point atomics (boids/neural-ca have no atomics and
their shaders were already run-twice byte-identical on wgpu-native; the physarum
playbook does not apply). **No `.wgsl` changed; no tolerance changed.**

Hardened across **all 7** (Decision 3): the race is latent wherever a live `frame()`
loop steps shared state (boids, neural-ca, rd2d, physarum, ising). mandelbulb +
strange have no stepping loop (single-dispatch capture) and are guarded for
uniformity. CI lavapipe's different timing could have surfaced the latent cases.

## §2 — Per-sim result (MEASURED post-fix; browser ANGLE-Vulkan + wgpu-native)

### within-Dawn run-twice (the BUG → fixed to byte-identical)

| sim | pre-fix run-twice (5.1 / Phase-0) | post-fix run-twice | established gate (post-fix) |
|---|---|---|---|
| **boids-3d** | DIFFERS from step 400 (~0.07–0.12) | **BYTE-IDENTICAL** | new_canonical **PASS** (run-twice + short-horizon 3.19e-3 + v_max 3.0) |
| **neural-ca** | DIFFERS from step 100 (~0.46–0.68) | **BYTE-IDENTICAL** | capture_roundtrip **bit-exact 0.0** |
| **reaction-diffusion-2d** | byte-identical but cross-backend-divergent 0.064 | **BYTE-IDENTICAL** | capture_roundtrip **2.64e-5** @ rel=1e-4 PASS |
| mandelbulb-explorer | identical (passing) | byte-identical (== 5.1) | new_canonical PASS |
| strange-attractors | identical (passing) | byte-identical (== 5.1) | new_canonical PASS |
| ising-classical | identical (passing) | byte-identical (== 5.1) | observable PASS |
| physarum | identical (passing) | byte-identical; gate-field == 5.1 (0.0 diff) | new_canonical PASS (mass 22499.9962) |

All seven `verify.py` verdicts post-fix: **passed=True**. All seven capture-0 vs
capture-1: **byte-identical** (file sha256).

### §2.1 — the rd2d SHIFT (Decision 2 → opt-in contingency) — measured proof

The Phase-0 charter classified rd2d as the one genuine cross-backend f32 artifact
(browser-Dawn vs wgpu-native diverging to ~0.074). **That was REFUTED by re-measuring
with the clean (post-fix) capture:** the pre-fix browser rd2d differed from the
post-fix by up to 0.074 (so it WAS contaminated by the race, deterministically), and
the **post-fix browser-Dawn rd2d matches the f64 canonical at 2.6414220577697378e-05
— identical to wgpu-native's 2.6414220577697378e-05** (`gpu_gate.py`). So rd2d has NO
cross-backend divergence on the obtainable (both-RADV) backends; it clears its
ESTABLISHED `capture_roundtrip` @ rel=1e-4 in-browser. The observable/structural gate
the operator ratified (Decision 2) would have been a *weaker* gate for a divergence
that does not exist on these backends → **kept as an OPT-IN contingency**, not the
default (§3). `tolerance.toml` rel=1e-4 row byte-unchanged; the native gate still
passes at 2.64e-5.

## §3 — Lavapipe contingencies (Decision 2-SHIFTED + Decision 4): authored, READY, opt-in

`tools/productization/web-deploy/verify.py` gains `_gate_rd2d_observable` and
`_gate_neural_ca_observable` + a dispatch keyed on
`BITPHYSICS_BROWSER_OBSERVABLE_FALLBACK="<sim>,<sim>"`. **Default unset → the
ESTABLISHED gates (which pass on the obtainable backends).** These activate per-sim
ONLY if the operator's CI lavapipe dispatch shows a genuine cross-backend divergence
on lavapipe's distinct (non-RADV) ALU:
- **rd2d** observable = run-twice determinism + short-horizon agreement vs the f64
  canonical through step 200 (≤1e-4; MEASURED 1.31e-6) + bounded gray-scott field.
- **neural-ca** observable = run-twice determinism + bounded RGBA + alive alpha +
  step-50 short-horizon agreement (≤1e-2; MEASURED 0.0). The **bit-exact gate stays
  the default AND the wgpu-native canonical gate** — not pre-emptively weakened
  (Decision 4).
Both tested **PASS** on the current ANGLE captures (known-good). The new thresholds
are **outside `ESTABLISHED_THRESHOLDS`**, so the no-widening parity guard
(`smoke/test_pipeline.py`, 9/9) is unaffected.

## §4 — Backend portability / lavapipe (load-bearing, PENDING)

Both obtainable backends (wgpu-native via naga, browser-Dawn via Tint over
ANGLE-Vulkan) compile to SPIR-V and run on the **same RADV driver + RX 6800 XT** —
which is WHY neural-ca is bit-exact and rd2d matches to 2.64e-5 across them. **CI
lavapipe is a distinct CPU software-Vulkan ALU**; cross-backend agreement there is
weaker a-priori. Per-gate portability (UNMEASURED — no in-env dispatch):

| gate | wgpu-native + ANGLE-Vulkan (MEASURED) | CI lavapipe |
|---|---|---|
| harness-race fix (run-twice determinism, all 7) | PASS | **expected to hold** (race fix is backend-agnostic). PENDING |
| boids new_canonical (tolerance-based) | PASS | likely holds. PENDING |
| rd2d capture_roundtrip @1e-4 | PASS (2.64e-5) | AT RISK if lavapipe ALU diverges → `_gate_rd2d_observable` contingency ready. PENDING |
| neural-ca bit-exact 0/0 | PASS | AT RISK (bit-exactness leaned on shared RADV) → `_gate_neural_ca_observable` contingency ready. PENDING |

**The operator must `workflow_dispatch web-deploy.yml`** (confirm_deploy=false) to fill
the lavapipe column. Until then every gate is **confirmed-on-RADV-backends, PENDING
lavapipe**, with the two contingencies ready to flip per-sim.

## §5 — §S.5 full sweep + §R digest

- **Local pre-push (FACT):** all 7 web apps `tsc --noEmit` clean + `vite build` exit
  0; all 7 driven twice through real browser WebGPU → run-twice byte-identical + gate
  PASS; `verify.py` 9/9 smoke (parity guard intact); `ruff check` + `format` clean on
  `verify.py`; integrity `--all` **0 HARD_FAIL / 16 SOFT_WARN** (§R measured live; +2
  vs the 14 baseline are the Phase-0 charter's own cat5 FACT-citation SOFT_WARNs —
  benign; 0 HARD_FAIL is the load-bearing invariant and HELD).
- **Tolerance (FACT):** `tools/testkit/equivalence/tolerance.toml` (sha `d190843…`) +
  `tools/testkit/equivalence/tolerance-budget.toml` (sha `e3922b3…`) **byte-unchanged**;
  `tools/productization/web-build/gpu_gate.py` **untouched** (sha `bb9c4d0…`).
- **render_similarity (0.9242) + variant (0.8702): UNAFFECTED** — `git diff
  6821d9a..HEAD` touches no `render_similarity/`/`variant/` source; CI
  `test-render-similarity` runs on the push sweep.
- **Post-push CI:** the push-triggered sweep runs at the landing SHA;
  `web-deploy.yml` does NOT run on bare-main push (tag/PR/dispatch only) — the
  operator's dispatch is the lavapipe proof. Recorded at the #12 back-fill below.

## §6 — Scope guard (exact files; what stayed untouched)

**Changed (10):** `common/common-web/src/capture-export.ts`,
`common/common-web/src/settings-panel.ts`, the 7
`packages/<sim>/web/src/main.ts`, and `tools/productization/web-deploy/verify.py`.
**No `.wgsl` changed.**

**Untouched (confirmed):** `tools/productization/web-build/gpu_gate.py` (native
canonical gate, byte-frozen); `tolerance.toml` + `tolerance-budget.toml`
(byte-unchanged; no `[overrides.*]` added/widened; no Cat-X cap touched); the
pipeline plumbing (`pipeline.py`, `driver.mjs`); all `render_similarity/`/`variant/`
source. The 4 previously-passing sims' GATES are unchanged and their captures stayed
passing (mandelbulb/strange/ising byte-identical to 5.1; physarum gate-field
identical, non-gated aux positions corrected by the hardening — Decision 3's intent,
not a regression).

## §7 — Four-state verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| boids resolved (run-twice byte-identical + gate PASS in-browser) | **CONFIRMED** | §2 |
| neural-ca resolved (bit-exact 0.0 in-browser) | **CONFIRMED** | §2 |
| rd2d resolved | **CONFIRMED** | §2 (clears established 1e-4 at 2.64e-5) |
| rd2d needs a cross-backend gate-choice (Decision 2) | **SHIFTED** | the offset was the race; established gate passes → observable kept opt-in (§2.1, §3) |
| harness fix hardened across all 7 without regressing a passing sim | **CONFIRMED** | §2, §6 (physarum A/B 0.0 gate-diff) |
| no shader / no tolerance / no atomics | **CONFIRMED** | §6 (tolerance + gpu_gate byte-unchanged) |
| neural-ca lavapipe contingency authored ready | **CONFIRMED** | §3 |
| gates hold on CI lavapipe | **DEFERRED** | not dispatchable in-env; operator must confirm (§4) |

## §8 — CONTRADICTIONS vs EXPECTED (collector)

| # | Expected (charter / ratified decisions) | Measured | Disposition |
|---|---|---|---|
| C-1 | rd2d is the one genuine cross-backend f32 divergence; needs observable gate (Decision 2) | rd2d's 0.064 was ALSO the harness race; clean it matches wgpu-native at 2.64e-5 and clears its established 1e-4 gate | **SHIFTED** — observable kept opt-in; established gate is default + honest |
| C-2 | boids/neural-ca need a harness fix; the 4 others already clean | rd2d AND physarum were ALSO latently contaminated (rd2d gated-field, physarum non-gated aux) | **SHIFTED** — all-7 hardening (Decision 3) corrected latent contamination too |
| C-3 | hardening might perturb a passing sim → STOP | physarum gate-field 0.0 diff, mass identical, still PASS + run-twice byte-identical | **CONFIRMED-safe** — only non-gated aux fields changed (corrected); no STOP |
| C-4 | gates resolved once green locally | both local backends share RADV → agree too tightly to be representative of lavapipe | **FLAGGED** — PENDING the operator's lavapipe dispatch (§4) |
| C-5 | render/variant HARD floors | no such source touched; tolerance.toml byte-unchanged | **UNAFFECTED** |
| C-6 | integrity 0 HF / 14 SW | 0 HF / 16 SW (+2 benign cat5 from the charter) | **SHIFTED** — documented; 0 HARD_FAIL held |

## §9 — SURFACED for operator

1. **DISPATCH `web-deploy.yml`** (`workflow_dispatch`, confirm_deploy=false) — fills
   the lavapipe column; every gate is PENDING it. If lavapipe diverges on rd2d or
   neural-ca, flip `BITPHYSICS_BROWSER_OBSERVABLE_FALLBACK` per sim (contingencies
   ready, §3).
2. **rd2d SHIFT noted:** the ratified Decision-2 observable gate was NOT made the
   default because rd2d passes its stronger established gate in-browser; the
   observable gate is opt-in for the lavapipe case. Confirm acceptable.
3. **Integrity baseline:** 14 → 16 SOFT_WARN (the charter's 2 cat5 FACT-citations);
   0 HARD_FAIL holds. Operator may absorb the new baseline or trim the charter
   citations.
4. **NO tag (I7).**

## §10 — Closing

Phase-1 browser-divergence resolution is **CONFIRMED**. The 3 browser failures (rd2d,
neural-ca, boids) were ONE within-Dawn cause — a frontend capture/live-RAF-loop data
race — fixed by a shared mutual-exclusion lock hardened across all 7 frontends, with
**no shader, no tolerance, no atomics**. MEASURED post-fix: all 7 run-twice
byte-identical and clear their established gate on the obtainable backends; boids
new_canonical, neural-ca bit-exact 0.0, **rd2d 2.64e-5 == wgpu-native** (its Phase-0
"cross-backend" offset was the same race, so Decision 2's observable gate is SHIFTED
to an opt-in pending-lavapipe contingency, ready alongside neural-ca's). The 4
previously-passing sims stayed passing (no regression; physarum's gated field is
0.0-identical). `tolerance.toml`/`tolerance-budget.toml` byte-unchanged; `gpu_gate.py`
untouched; render_similarity (0.9242) + variant (0.8702) unaffected; integrity 0
HARD_FAIL (16 SOFT_WARN). The 18 unpushed commits + this work are PUSHED via SSH;
origin caught up. **CI lavapipe remains the one un-obtained backend** — the operator's
`web-deploy.yml` dispatch is the outstanding confirmation. **NO tag (I7).**
