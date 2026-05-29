---
date: 2026-05-29T03-30-00Z
author: phase-3 mass-spring-cloth landing (Claude Code)
subject: Phase 3 task-5 mass-spring-cloth — LANDING audit (whole sub-phase Stage 0->2). FIRST NEW Stack-C SIM + first soft-body category. closed-with-shifted-7. NO tag.
verdict: CONFIRMED-closed-with-shifted-7
head_sha: 1d52bbd
prior_sub_phase_landed_at: be3e468
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
d_tag: NO
gate_3_red_evidence_sha256: ac64b1de3636359f358c928202a6e54d309551354ec0ede6f2392335074816ea
vendored_bender_sha: aa62c44f0d43956452e1f960a40333ec2d6d3ea5
evidence_paths:
  - docs/phases/sub-phase-phase-3-mass-spring-cloth.md
  - docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md
  - tools/testkit/golden/derivations/cloth-catenary-limit.md
  - docs/spec-amendments-proposed.md
  - packages/mass-spring-cloth/shaders/cloth_xpbd.comp
evidence_hashes:
  docs/phases/sub-phase-phase-3-mass-spring-cloth.md: sha256:dea81c0aba0d7f67d314d4015a0af3a530173caeec9b242bb13fc6ada0291233
  docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md: sha256:11c0040f66c7b06fe58bf5e679e990faaa64ed4871b85c41269a43cee6cd9a6a
  tools/testkit/golden/derivations/cloth-catenary-limit.md: sha256:8d8a09259a0f781358cbc222875edfabcb4a8e47b27ac4e3fa6fa36666bb3494
  docs/spec-amendments-proposed.md: sha256:70963efc065944c75886ac2ba512a4ee6c747a3d72c401144968babc4185772e
  packages/mass-spring-cloth/shaders/cloth_xpbd.comp: sha256:6f4818020ec6321f650b96da6bf1a167ff51247d95aee9676124b5dba45bace5
---

# Phase 3 — task-5 mass-spring-cloth — LANDING audit

> **WHOLE SUB-PHASE LANDED** (Stage 0 → 1a → 1b → 1c → 2) at HEAD `1d52bbd`,
> pushed `origin/main`. **FIRST NEW Stack-C (Vulkan/C++20) sim of Phase 3 + first
> `soft-body` category.** Closes **closed-with-shifted-7** per §2.15. **NO tag**
> (D-TAG NO; phase-close tag `v0.3.0-phase-3` at task-10). Cloth is TERMINAL — no
> consumer-site obligation (plan §3.1).

## Landing verification (§R / replay / gate-13 / append-only / verify_evidence / §S.5)

- **§R integrity (two-field):** `0 HARD_FAIL / 14 SOFT_WARN` (invariant HELD);
  digest `b7460150…e6abb15e` (live-measured; drifted from the Stage-0 anchor
  `f5b7eea1…` as EXPECTED — golden tables + fixture + vendored reference + rows
  added). Count is the invariant; digest is informational. [FACT]
- **Cross-phase replay:** `replay_prior_phase --prior-phase phase-2` →
  `ok=True` (8/8 gates). [FACT]
- **gate-13 (replay failing tests):** the pytest-based `replay_failing_tests` is
  N/A (cloth's RED evidence is C++ **ctest**, not pytest). Done two ways: (a) the
  committed RED evidence (`b481ab8`) hashes to `ac64b1de…16ea` = the gate-3 footer
  (immutable); (b) the now-green ctest re-runs `2/2` pass. [FACT]
- **Append-only:** CI `audit-append-only` GREEN at HEAD; no prior audit mutated. [FACT]
- **verify_evidence (this sub-phase's stage audits):** stage-0 12/0, stage-1a 14/0,
  stage-1b 14/0, stage-1c 6/0 — **all 0-fail**. [FACT]
- **§S.5 full-workflow CI sweep at `c4ba2a1`:** **ALL 10 workflows GREEN**
  (structure, audit-append-only, ts-strict, tolerance-budget-check, equivalence,
  mutation-testing, integrity, cpp-strict [1m38s — built the C++ tree + LFS-pulled
  the cloth capture + ran the cloth ctests gate-3/4/11 on a fresh runner],
  determinism, python-strict). Zero red. [FACT]

## Thirteen-gate acceptance (final)

| Gate | Verdict | Evidence |
|------|---------|----------|
| 1 spec sheet + §6 | GREEN | `docs/sim-specs/soft-body/mass-spring-cloth/spec-ref.md` |
| 2 probe | GREEN | `tools/testkit/probes/reports/mass-spring-cloth.md` |
| 3 failing suite + sha256 | GREEN | RED `ac64b1de…` → GREEN; footer-verified |
| 4 golden ≥3 anchors | GREEN | hanging (catenary, 3 anchors) + stretched (linear-elastic, 3 anchors); 6/6 doctest cases, 152 assertions |
| 5 Tier-1 / 6 Tier-2 | GREEN | inherited testkit |
| 7 Cat-1 citations | GREEN | Bender 2.2.0 + Macklin 2016 cite resolve (integrity 0 HF) |
| 8 Cat-2 public API | GREEN | `bit_physics::mass_spring_cloth` targets resolve |
| 9 replayable capture | GREEN | `flag-wind-128x128-seed42-step1000.{h5,json}` (LFS, GitHub+R2) |
| 10 determinism decl ↔ capture | GREEN | registry `bit-exact` ↔ sidecar `bit-exact-same-hw` |
| 11 PBT (≥2) | GREEN | `length_bounded_above` + `momentum_conservation_free_no_gravity` (cross-language subprocess wiring) |
| 12 perf-ledger | GREEN | `mass-spring-cloth | cpp (Vulkan) | … | 54.32s` |
| 13 landing replay | GREEN | RED evidence footer-verified + ctest re-green |

(Mutation gate N/A — sim. Gate-14 N/A — single-stack terminal.)

## D-class outcomes (operator-ratified, charter v2)

- **D-VENDOR-ROLE** ✅ — Bender vendored read-only oracle (`references/PositionBasedDynamics/`,
  2.2.0, MIT); XPBD reimplemented independently from Macklin 2016 (no FetchContent/link).
- **D-VENDOR-SHA** ✅ — vendored `2.2.0` (`aa62c44f…`, latest stable per spec D.3,
  re-verified live; MIT). §2.18 master-HEAD discrepancy → **A-3** (SHIFT-4).
- **D-DET** ✅ — **MEASURED bit-exact, HELD (no re-characterization).** Witness
  `0433ccb4…` identical across two separate process invocations on lavapipe;
  `assert_deterministic_run(tolerance=0)` passes. Registry `[soft-body.mass-spring-cloth]`
  class=`bit-exact` scope=`same-stack-same-hw`. Realization: symmetric serial GS,
  single Vulkan invocation, fixed order, no atomics/subgroups (lavapipe-ICD pin).
- **D-ANCHOR** ✅ — corrected catenary cites (SHIFT-2); 3 independent anchors;
  catenary residual 0.119% of sag < `catenary_shape_rel`=2e-3 (measured, not widened).
- **D-PBT** ✅ — `length_bounded_above` + `momentum_conservation_free_no_gravity`
  (free-cloth re-declaration); cross-language Hypothesis→subprocess→`.h5` wiring.

## closed-with-shifted-7 (each shift enumerated, §2.15)

1. **SHIFT-1 — symmetric serial GS.** One-directional serial GS converges the
   over-constrained stretched chain to a NON-uniform fixed point (boundary bias,
   not under-convergence — persists at 800 iterations). Re-declared the projection
   to **symmetric** serial GS (alternate sweep direction) — still single-invocation,
   fixed order, atomics-free, bit-exact — converging the interior to exact uniform.
   A HARD-RULE-2 "converge, don't widen" fix (surfaced, not silently adapted).
2. **SHIFT-2 — D-ANCHOR cite corrections.** Symon §10.2 is WRONG (tensors); M&T
   §6.4→§6.6 (constrained variational); Beer "Table 7.2"→Ch 7 (cables). Corrected
   in spec-ref §7 + `cloth-catenary-limit.md` (grep/web-verified). NO plan edit.
3. **SHIFT-3 — A-2 corrigendum** (D-NAMING): Appendix D.2.3/D.3 `cloth-xpbd` →
   canonical `mass-spring-cloth`, banked to `spec-amendments-proposed.md`.
4. **SHIFT-4 — A-3 corrigendum** (D-VENDOR-SHA): phase-3-plan §2.18 Bender pin
   `d0894bdb` (master HEAD) → `2.2.0` (`aa62c44f`, latest stable per spec D.3),
   banked to `spec-amendments-proposed.md`. Operator reconciles; NO plan edit.
5. **SHIFT-5 — golden tables are 1D chains** (32-particle hanging strip,
   8-particle stretched chain) rather than the charter's "32×32". The pure
   catenary / uniform-stretch linear-elastic limits are 1D regimes (a 2D sheet's
   loaded edge is NOT a pure catenary — the charter's own catenary-LIMIT regime
   note anticipated "a single hanging strip/edge"). §0.3 resolve-on-evidence; the
   canonical CAPTURE remains the 128×128 2D flag.
6. **SHIFT-6 — stretched acceptance test re-framed.** From bit-uniform spacing to
   the linear-elastic REGIME (all springs in tension, collinear, monotone, exact
   span/mean) + gate-4 interior-only per-point compare, because symmetric serial GS
   leaves a documented ~few-% non-uniformity on the two pinned-boundary springs
   (the SHIFT-1 finding). Honest regime assertion, not a tolerance widen.
7. **SHIFT-7 — Tier-3 dir underscore** `tools/diagnostics/tier3/mass_spring_cloth/`
   (existing-convention precedence over the charter's hyphenated path; §0.3),
   matching lenia/ising/rigid-body sibling dirs.

## HARD RULE 2 surfaces (all handled, none blocking)

- One-directional GS uniform-convergence assumption FALSIFIED → symmetric-GS
  re-declaration (SHIFT-1) — not a widen.
- Stretched bit-uniform-spacing assumption FALSIFIED at the boundary →
  linear-elastic regime re-frame (SHIFT-6).
- §2.18 Bender SHA conflict with spec D.3 → filed A-3 with both citations (not
  silently adapted).
- D-ANCHOR cites suspect → corrected + verified (SHIFT-2).
- D-DET: did NOT pre-declare; MEASURED; bit-exact HELD (no re-characterization needed).

## Commit chain (16 commits, HEAD `1d52bbd`, pushed origin/main)

`faeb73b` vendor Bender · `2eb8c2d` charter v2 + A-2/A-3 · `26c98b4` Stage-0 audit ·
`889b79e` scaffold · `dff007a` spec-ref+derivation+det-row · `b481ab8` RED evidence ·
`869bf68` Stage-1a audit · `fdc2543` serial-GS impl (RED→GREEN) · `378e7bc` goldens+gate-4 ·
`4655621` capture binary+PBT · `8fef4f4` Tier-3 · `8e37521` shared files ·
`f9d4303` stretched 3-anchor fix · `faf3d88` Stage-1b audit ·
`c4ba2a1` capture+fixture+perf · `1d52bbd` Stage-1c audit · `0d0452e` LANDING audit
+ progress (this audit). (Convention #12: landing SHA back-filled.)

## Verdict

**CONFIRMED — closed-with-shifted-7.** All 13 gates GREEN; D-DET bit-exact
MEASURED + HELD; integrity 0 HF / 14 SW; replay ok=True; verify_evidence 0-fail;
§S.5 all-green; LFS GitHub+R2 mirrored. Bender 2.2.0 read-only vendored.
A-2/A-3 corrigenda banked. NO tag. Phase-3 task-6 (NCA) dispatch is next.
