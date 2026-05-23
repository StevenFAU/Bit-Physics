---
date: 2026-05-23T16-13-27Z
author: capture-determinism-contract-sub-phase-agent
phase: 2
artifact: stage
artifact_id: capture-determinism-contract-stage-0
subject: "Capture-determinism-contract Stage 0 pre-flight CONFIRMED — 18th invocation of bit-identity replay invariant; 9-sim RED evidence sha256 byte-identical to MPM § 6.2 baseline; probe inventory ratified at HEAD (3 VULNERABLE / 7 IMMUNE / 0 UNCLEAR); R-D6 empirical-validation passed (Date.now() global shim eliminates flake; Module-direct path REFUTED, SHIFTED); no blocking dependencies surfaced; Stage 1 monolithic lean preserved"
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER-BACK-FILLED-PER-CONVENTION-12>
head_sha_at_checkpoint: <PLACEHOLDER-BACK-FILLED-PER-CONVENTION-12>
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-2026-05-23T15-37-24Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-landing-2026-05-23T15-49-23Z.md
evidence_paths:
  - docs/conventions/sub-phase-conventions.md
  - docs/phases/sub-phase-capture-determinism-contract.md
  - tools/testkit/equivalence/tolerance-budget.toml
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-replay-2026-05-23T16-04-12Z.txt
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-red-evidence-reverify-2026-05-23T16-04-12Z.txt
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-probe-ratification-2026-05-23T16-04-12Z.txt
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-immune-tests-2026-05-23T16-04-12Z.txt
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-py-tracktimes-2026-05-23T16-04-12Z.txt
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
  docs/phases/sub-phase-capture-determinism-contract.md: sha256:e817616134a720508d8885d98dfb1d0f6885b50bcb244ee80001b986d9b1f28f
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-replay-2026-05-23T16-04-12Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-red-evidence-reverify-2026-05-23T16-04-12Z.txt: sha256:709fcdfda33d8211eae197b665a03ecc9f93c6bec48a884174b97e4490287a9f
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-probe-ratification-2026-05-23T16-04-12Z.txt: sha256:071ed8cd0798d3ef1dfb2bf0a908f79b2ec3470d4c91622096d2774164181909
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-immune-tests-2026-05-23T16-04-12Z.txt: sha256:2e3d0558bcee31b9c59686f2ff92e75a08a40cdef47a9d16e58e455fc430f06d
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-py-tracktimes-2026-05-23T16-04-12Z.txt: sha256:2f660d4ad33595cd9e3b150db97d61d2201f9f1456a3ca21671e3728561e1ac2
  tools/testkit/equivalence/tolerance-budget.toml: sha256:a2afbecf2aaaff8954dbd4347be12d334801e8611bb4d2c6368687ba3fb63b31
---

# Capture-Determinism-Contract Sub-Phase — Stage 0 Checkpoint

## 1. Stage 0 scope summary

(FACT — Stage 0 dispatch prompt per charter § 7.1; D1-D5 operator routings ratified at plan-drafting landing audit close.)

**Pre-flight only.** No Stage 1 implementation work. Five tasks executed per charter § 4.1:
- Task 0.0 — Cross-phase replay (18th invocation of bit-identity invariant).
- Task 0.1 — Tolerance-budget [phase] carryover (commit `4fa9a07`).
- Task 0.2 — 9-sim Phase-1 RED evidence sha256 reverify vs MPM § 6.2 baseline.
- Task 0.3 — Probe-finding ratification (4 sub-tasks: boundary-delay baseline / inventory re-grep / R-D6 shim PoC / Python track_times=False validation).
- Task 0.4 — Blocking-dependency identification (5 conditions checked).

**Stage 0 verdict: CONFIRMED.** All five tasks PASS. One SHIFTED finding (N1) for plan-drafting-probe § 4.2(b) refutation — scope-impact negligible.

## 2. Task-by-task results

(FACT — per-task evidence files at `evidence_paths` above; sha256 verified at `evidence_hashes`.)

| Task | Result | Evidence sha256 |
|---|---|---|
| 0.0 — Cross-phase replay (8-gate canonical set against `v0.1.0-phase-1`; 18th invocation) | **PASS**; replay-output sha256 byte-identical to bit-identity invariant `9399fc33…909f34` (conventions doc § D.3). | `9399fc33…909f34` |
| 0.1 — Tolerance-budget carryover | **PASS**; `[phase].phase = "sub-phase-capture-determinism-contract"`, `opened_at = "2026-05-23T16:04:12Z"`; NO `[budgets.*]` widening; commit `4fa9a07`. | (verifiable via `git show 4fa9a07 -- tools/testkit/equivalence/tolerance-budget.toml`) |
| 0.2 — 9-sim Phase-1 RED evidence sha256 reverify | **PASS**; all 9 sims' RED evidence files sha256-match MPM landing § 6.2 truncated prefixes verbatim at HEAD. No drift. | `709fcdfd…0287a9f` |
| 0.3 — Probe-finding ratification (4 sub-tasks) | **PASS** with 1 SHIFTED. (a) Baseline boundary-delay: 184 bytes differ at HEAD (matches dispatch context). (b) Inventory re-grep: 3 VULNERABLE / 7 IMMUNE / 0 UNCLEAR unchanged. (c) R-D6 shim PoC: Date.now() global shim produces 0 bytes differing; Module-direct path NOT accessible (SHIFTED N1). (d) Python track_times=False: byte-identical at synthetic h5py.File(..., libver="earliest"). | `071ed8cd…4181909` |
| 0.4 — Blocking-dependency identification (5 conditions) | **PASS**; all 5 conditions clean. Conventions doc sha256 unchanged (`3698d19b…2bd734`); 12/12 IMMUNE tests + harness tests GREEN at HEAD; no new VULNERABLE tests; h5wasm 0.10.1 unchanged; h5py 3.16.0 supports `track_times=False`. | (sub-evidence `2e3d0558…c430f06d` for IMMUNE tests; remainder inline in 0.3 ratification file) |

## 3. Stage 0 convergence commits

(FACT — `git log --oneline 97ff87b..HEAD` at this checkpoint's authoring time.)

| # | SHA | Subject |
|---|---|---|
| 1 | `4fa9a07` | `chore(capture-determinism-contract-stage0-tolerance-budget)` (also commits Task 0.0 replay output) |
| 2 | `(this commit)` | `chore(capture-determinism-contract-stage0-checkpoint)` |
| 3 | `(back-fill commit)` | `chore(capture-determinism-contract-stage0-sha-backfill)` |

**3 total Stage 0 commits** at close (including Convention #12 SHA back-fill). Two evidence-only commits (Task 0.0 + Task 0.1 share commit `4fa9a07`; Task 0.2 + Task 0.3 + Task 0.4 evidence rolls into this checkpoint commit + back-fill).

## 4. Anchor re-check at Stage 0 close

(FACT — verified at this checkpoint's authoring time.)

| Anchor | Value | Status |
|---|---|---|
| Conventions doc sha256 | `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734` | locked; matches conventions-refactor landing § 3.2 + Taichi-integration landing evidence_hashes + plan-drafting landing evidence_hashes |
| Charter sha256 | `e817616134a720508d8885d98dfb1d0f6885b50bcb244ee80001b986d9b1f28f` | locked at plan-drafting landing |
| Bit-identity replay invariant | `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` | **18th invocation confirmed** (17 prior — Taichi-integration § 11) |
| `tolerance-budget.toml [phase].phase` | `"sub-phase-capture-determinism-contract"` | Stage 0 Task 0.1 carryover; commit `4fa9a07` |
| `tolerance-budget.toml [phase].opened_at` | `"2026-05-23T16:04:12Z"` | Stage 0 Task 0.1 carryover |
| 9-sim Phase-1 RED evidence sha256s | all 9 byte-identical to MPM § 6.2 baseline | mass gate-13 precondition intact |
| Probe report sha256 | `5c3649d009899604fe3edd06784dabbc99c3ca6b20020fbc9e04815d4f4b85b8` | locked at plan-drafting landing |
| h5wasm version | `0.10.1` (unchanged from probe; per `common/common-ts/node_modules/h5wasm/package.json`) | Task 0.4 condition 4 NOT triggered |
| h5py version | `3.16.0` (modern; `track_times=False` kwarg works) | Task 0.4 condition 5 NOT triggered |

**No drift surfaced.**

## 5. Inherited shifts + Stage 0 shifts

### 5.1 Inherited (102 cumulative entering Stage 0)

(FACT — plan-drafting landing § 6.3.)

99 entering plan-drafting (Taichi-integration landing § 8.4) + 3 plan-drafting precedent-establishing shifts (N1 fan-out routing override / N2 diagnostic-session re-derivation discipline / N3 portfolio-wide contract-redesign shape) = **102 entering Stage 0**.

### 5.2 New shifts surfaced during Stage 0

| ID | Description |
|---|---|
| **N1** | **Plan-drafting-probe § 4.2(b) "Patch `Module._emscripten_date_now` post-init" is NOT viable**; h5wasm-node v0.10.1 does NOT expose `Module` at any documented top-level export (Task 0.3(c) empirical refutation; `module_present: false` + `module_emscripten_date_now_type: undefined`). The probe's lean (a) "Global `Date.now()` monkey-patch during the capture-write window" IS the only viable userland shim path; empirically WORKS (0 bytes differ across 1.5s wall-clock separation with Date.now frozen). **Scope impact**: Stage 1 deliverable 6 (`common/common-ts/src/capture.ts` source-level fix) uses path (a) global-shim form, NOT path (b) Module-direct form. Estimated ~5-7 lines added to `CaptureWriter.finalize()` rather than the ~3 lines path (b) would have been. Negligible delta on D1 monolithic lean. **Banked for charter cross-reference at Stage 1 commit footer** + landing-audit § 11 attribution. |
| **N2** | **Dispatch-context D3 path-and-line citations do not resolve at HEAD.** Stage 0 dispatch ratified D3 as inline updates at LBM and MPM sim.py module docstrings (dispatch named lines 26-27 of LBM sim.py and lines 14-15 of MPM sim.py), but at HEAD the "byte-identical HDF5 payloads" wording is NOT present in either sim.py (grep across both `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py` and `packages/mpm-multimaterial/mpm_multimaterial/sim.py` returned zero matches). The actual wording lives in the **test files**: LBM `packages/lattice-boltzmann-d3q19/tests/test_determinism.py` at the two module-docstring sites ("byte-equality assertion at the manifest + .h5 payload level" and "byte-identical HDF5 payloads at the same hardware"); MPM `packages/mpm-multimaterial/tests/test_determinism.py` at one per-test-docstring site ("produce byte-identical HDF5 payloads at the same hardware"). **Scope impact**: D3 inline update count revises from 2 (dispatch context's nominal sim.py sites) to **3 wording sites in 2 test files** (Stage 0 empirical re-derivation). Per-test docstring wording will be updated alongside the test-body refactor in Stage 1 STEP 6/7 (LBM) and Stage 1 STEP 7 (MPM) per charter § 4.2 sequence; ~+3-6 lines of docstring edits total — trivial Stage 1 scope delta. Operator may ratify or override at Stage 1 dispatch. |

### 5.3 Cumulative shift count at Stage 0 close

**102 + 2 = 104** entering Stage 1.

## 6. Banked items disposition (unchanged from plan-drafting landing § 7)

(FACT — plan-drafting landing § 7 D2 disposition table; no Stage 0 deltas.)

All 8 banked items inherited at plan-drafting landing remain in their current dispositions. This sub-phase consumes none of them; Stage 0 surfaces no new banked items beyond the SHIFTED N1 above.

## 7. R-D6 escape-hatch verdict — NOT triggered (monolithic Stage 1 lean preserved)

(FACT — Task 0.3(c) scaffolding-cost estimate.)

The R-D6 escape hatch (charter § 4.0; probe § 4.0) triggers if empirical validation reveals TS-harness read-surface scaffolding costs > ~+200 lines alone. Task 0.3(c) empirical findings:

| TS-harness module | Estimated lines | Source |
|---|---:|---|
| `captureReader.ts` (read surface alone) | **~80-100** | h5wasm read API (`new h5.File(path, "r")` + `file.get(path).value`) demonstrated working in the existing Gaussian-test read pattern inside `common/common-ts/examples/hello-physics/hello-physics.test.ts`; reusable `H5FileLike` interface types in `common/common-ts/src/capture.ts` lines around the H5 shim block |
| `diffCaptures.ts` | ~60-80 | pair captures by step+field; np.array_equal-equivalent over typed arrays |
| `runTwiceAndDiff.ts` | ~50-60 | orchestrator mirroring Python harness.py:62-98 |
| Types inline | ~20-30 | DeterminismVerdict + SimRunner interfaces |
| `index.ts` | ~10 | re-exports |
| `__tests__/` (3 files) | ~150-200 | vitest tests |
| **TOTAL net new TS** | **~370-480** | (source ~220-280 + tests ~150-200) |
| **READ SURFACE ALONE** | **~80-100** | well within R-D6 ~+200 threshold |

**R-D6 verdict: NOT triggered.** Monolithic Stage 1 lean preserved per D1 ratification.

## 8. Next-stage handoff

**Stage 1 dispatchable.** Charter § 7.2 prompt + D1-D5 routings + this checkpoint's SHIFTED N1 + R-D6 verdict (monolithic preserved) + scaffolding-cost estimate are the inputs.

Stage 1 deliverables (per charter § 2; 14 rows):
1. Spec § 2.5 amendment (PRIMARY; D2-c wording per D2 routing).
2. Spec § 2.7 + `capture-v1.json` description-only amendment (D2-sub: keep raw-file sha256 + add description note).
3. Canonical Python harness (rename `bit_exact` → `content_equivalent`).
4. Canonical TypeScript harness (NEW; estimated +220-280 source lines).
5. `tools/testkit/capture/writer.py` source-level fix (`track_times=False`).
6. `common/common-ts/src/capture.ts` source-level fix (Date.now() global shim per SHIFTED N1; path (a) form).
7-9. Per-test refactor V1 + V2 + V3.
10. Conventions doc § F.3 + § A.2 amendment + § B sweep-template addendum.
11. CI gate redesign (strict-fanout per D4).
12. Cross-package regression sweep template extension.
13. CHANGELOG additive entry.
14. `docs/dependencies.md` additive entry.
+ D3 inline: docstring wording updates ("byte-identical HDF5 payloads" → "content-equivalent Capture projections") at the actual locations surfaced by Stage 0 SHIFTED N2 below — namely `packages/lattice-boltzmann-d3q19/tests/test_determinism.py` (two sites — module-level docstring + per-test docstring) and `packages/mpm-multimaterial/tests/test_determinism.py` (one site — per-test docstring). Dispatch-context D3 citations nominally pointed at sim.py module docstrings, but at HEAD this wording is NOT in sim.py at all; the wording lives in `tests/test_determinism.py` per SHIFTED N2.

## 9. Tag posture (Stage 0)

No `-phase-N` tag; no `v0.1.10` non-phase point-release tag at Stage 0 close (Stage 0 is mid-sub-phase; tag posture re-evaluated at Stage 2 close per charter § 11.4).

---

This audit lands at HEAD `<PLACEHOLDER-BACK-FILLED-PER-CONVENTION-12>` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(capture-determinism-contract-stage0-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time per the tightened § B.2 step 3 discipline).

Verdict: **CONFIRMED**. Stage 1 dispatchable per charter § 7.2.
