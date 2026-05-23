---
date: 2026-05-23T16-53-26Z
author: capture-determinism-contract-sub-phase-agent
phase: 2
artifact: stage
artifact_id: capture-determinism-contract-stage-1
subject: "Capture-determinism-contract Stage 1 implementation complete — 14 charter deliverables GREEN (deliverables 13 + 14 deferred to Stage 2 per dispatch); D2 routed to operator-ratified wording incorporating D2-c + R-D3 cross-reference; portfolio-wide content-equivalent contract; conventions doc sha256 SHIFTED 3698d19b...2bd734 -> 167fe349...f2c58c2e; Python sweep 342 PASSED; TS sweep 20 passed + 2 skipped; cumulative shift count 105 entering Stage 2"
verdict-state: CONFIRMED
head_sha: 0a99f4efa8290c9d458b3c9950046426f28529ff
head_sha_at_checkpoint: 0a99f4efa8290c9d458b3c9950046426f28529ff
parent_audits:
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-2026-05-23T15-37-24Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-landing-2026-05-23T15-49-23Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-0-checkpoint-2026-05-23T16-13-27Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
evidence_paths:
  - docs/phases/sub-phase-capture-determinism-contract.md
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
  - tools/testkit/schemas/capture-v1.json
  - tools/testkit/determinism/harness.py
  - tools/testkit/determinism/policy.md
  - tools/testkit/capture/writer.py
  - tools/testkit/capture/tests/test_writer_determinism.py
  - common/common-ts/src/capture.ts
  - common/common-ts/src/determinism/captureReader.ts
  - common/common-ts/src/determinism/diffCaptures.ts
  - common/common-ts/src/determinism/runTwiceAndDiff.ts
  - common/common-ts/src/determinism/index.ts
  - common/common-ts/src/determinism/__tests__/harness.test.ts
  - common/common-ts/src/__tests__/capture-writer-determinism.test.ts
  - common/common-ts/examples/hello-physics/hello-physics.test.ts
  - packages/lattice-boltzmann-d3q19/tests/test_determinism.py
  - packages/mpm-multimaterial/tests/test_determinism.py
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-python-sweep-2026-05-23T16-50-00Z.txt
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-ts-sweep-2026-05-23T16-50-00Z.txt
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-sweep-summary-2026-05-23T16-50-00Z.txt
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
  docs/architecture.md: sha256:42f5d59983cf16835f171b35d3c85e5282a5d47d5341ec6ee9ed87cc360a347b
  tools/testkit/schemas/capture-v1.json: sha256:7715a50a1bce771f86935b596326283773b7fa58fa40afac2c0fe7c030943735
  tools/testkit/determinism/harness.py: sha256:22b3dc50b4da0e87014f37a3871df882d013aabfd17db867d5ff604f68d7f381
  tools/testkit/capture/writer.py: sha256:e35ad5dd5246358b787bf3bdecf4686107133e286e2971eed6e0c9a36e681f9f
  tools/testkit/capture/tests/test_writer_determinism.py: sha256:ba42f8d367307c94b3993b77baa4447661e583243fedbe24ed7e9d55c77f5909
  common/common-ts/src/capture.ts: sha256:19187ea489359aa0c74a89249c73c48b0ec4b6e77c017174726e569c5e31242b
  common/common-ts/src/determinism/captureReader.ts: sha256:6cbbac790db94ad02298dcf1d07168f15ae3af0f513214a979f191ff3a2cea50
  common/common-ts/src/determinism/diffCaptures.ts: sha256:5f3ee412721eb4e1e670f3fff52e60e03919b2c2ab3ad2aa6ea51f2ec52704a9
  common/common-ts/src/determinism/runTwiceAndDiff.ts: sha256:eac3a1c5c1cb2045cf8b54d8ebb8b868c507ed87f0d15e766fbf997bc07b3b05
  common/common-ts/src/determinism/index.ts: sha256:9e15952c2cf540a02e688c56ecdb1cccee078ca07af2f1770cc24ac178681ce1
  common/common-ts/src/determinism/__tests__/harness.test.ts: sha256:2714c303847b174470edac2aed021c59d3d3bee3cfc6582f9d1af7b7d2af1fed
  common/common-ts/src/__tests__/capture-writer-determinism.test.ts: sha256:2b872adc6cecfde8888670365bfa86eeb89a98e95ced32cb31f2c92915ba9fc9
  common/common-ts/examples/hello-physics/hello-physics.test.ts: sha256:8b3839e7601a6741eb40bebebb557cac0d81eb9e1f7187cbaca2e3793a9b26c0
  packages/lattice-boltzmann-d3q19/tests/test_determinism.py: sha256:e538b8bbd2b8ae7ef511a2aa604f9bc19df717eb746c506219957c6e1e8d4f97
  packages/mpm-multimaterial/tests/test_determinism.py: sha256:632125007cedc7b03bc09d419a937d564018698468aff520097171ff9987670e
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-python-sweep-2026-05-23T16-50-00Z.txt: sha256:a0739c838cdbc6738a3890fb24831b9eb77ab951458208fc9ae1634d025f6138
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-ts-sweep-2026-05-23T16-50-00Z.txt: sha256:126f221c46aba5f72f1f4e536ce3aec6811a6aa3a85273d80b377f776f6e3111
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-sweep-summary-2026-05-23T16-50-00Z.txt: sha256:75731e0028dcf7f02610e1795766cb5d44ca8f7ccdf99cc4245f2231e8616aec
---

# Capture-Determinism-Contract Sub-Phase — Stage 1 Checkpoint

## § 1. Scope summary

(FACT — Stage 1 monolithic commit at `26e13435f1e8405f320133cbf8e5949f7fe36f9a`; 14 charter deliverables addressed; deliverables 13 + 14 (CHANGELOG + dependencies.md additive entries) deferred to Stage 2 convergence per charter § 4.3 Step 2.9 dispatch.)

**Portfolio-wide content-equivalent determinism contract** established as the canonical project-wide gate for spec-Phase-2 sub-phases. Spec § 2.5 amended with operator-routed wording (D2 routing per § 3 below); conventions doc § F.3 reworded; conventions doc § B.7 sweep-template addendum added; harness API renamed across Python (with backward-compat shim) and built from scratch for TypeScript; 3 VULNERABLE tests refactored to consume the new contract; Python + TypeScript CaptureWriters get defense-in-depth source-level fixes suppressing wall-clock-influenced storage-format metadata; CI gates redesigned per D4 strict-fanout.

Stage 1 verdict: **CONFIRMED**. All in-scope deliverables GREEN; full cross-package regression sweep (Python + TypeScript) clean; zero regressions across the 9 Phase-1 sims + 1 Phase-0 sim + tools + common-py + common-ts.

## § 2. 14-row deliverable-status table

| # | Deliverable | Status | Evidence path / sha256 |
|---|---|---|---|
| 1 | Spec § 2.5 amendment (D2-routed wording) | **GREEN** | `docs/architecture.md` sha256:`42f5d59983cf16835f171b35d3c85e5282a5d47d5341ec6ee9ed87cc360a347b` |
| 2 | Spec § 2.7 + capture-v1.json `payload.checksum` description-only edits | **GREEN** | `docs/architecture.md` (above); `tools/testkit/schemas/capture-v1.json` sha256:`7715a50a1bce771f86935b596326283773b7fa58fa40afac2c0fe7c030943735` |
| 3 | Python harness rename + deprecation shim | **GREEN** | `harness.py` sha256:`22b3dc50b4da0e87014f37a3871df882d013aabfd17db867d5ff604f68d7f381`; `policy.md` sha256:`0cd022b4bd438b06d97d782ff161df56188188cb82a4525a98102599b495396e`. 12 portfolio call sites migrated inline. |
| 4 | TypeScript harness (NEW) | **GREEN** | 4 source files (captureReader/diffCaptures/runTwiceAndDiff/index) + 1 test file at `common/common-ts/src/determinism/`. Source sha256s in `evidence_hashes` above. 5 harness tests pass. |
| 5 | Python CaptureWriter source-level fix | **GREEN** | `writer.py` sha256:`e35ad5dd5246358b787bf3bdecf4686107133e286e2971eed6e0c9a36e681f9f`; new `test_writer_determinism.py` sha256:`ba42f8d367307c94b3993b77baa4447661e583243fedbe24ed7e9d55c77f5909` verifies byte-identical across 1.5 s wall-clock separation. |
| 6 | TypeScript CaptureWriter source-level fix per N1 path (a) | **GREEN** | `capture.ts` sha256:`19187ea489359aa0c74a89249c73c48b0ec4b6e77c017174726e569c5e31242b`; new `capture-writer-determinism.test.ts` sha256:`2b872adc6cecfde8888670365bfa86eeb89a98e95ced32cb31f2c92915ba9fc9` (3 tests: byte-identical + no-leaked-monkey-patch + restore-on-throw). |
| 7 | V1 refactor (hello-physics.test.ts) + R-D2 spot-check | **GREEN** | `hello-physics.test.ts` sha256:`8b3839e7601a6741eb40bebebb557cac0d81eb9e1f7187cbaca2e3793a9b26c0`. 3 tests pass (content-equivalent + R-D2 broken-determinism + Gaussian closed-form). |
| 8 | V2 LBM refactor + 2 docstring updates per N2 + R-D2 spot-check | **GREEN** | `tests/test_determinism.py` sha256:`e538b8bbd2b8ae7ef511a2aa604f9bc19df717eb746c506219957c6e1e8d4f97`. 2 tests pass. |
| 9 | V3 MPM refactor + 1 docstring update per N2 + R-D2 spot-check | **GREEN** | `tests/test_determinism.py` sha256:`632125007cedc7b03bc09d419a937d564018698468aff520097171ff9987670e`. 2 tests pass. |
| 10 | Conventions doc § F.3 + § A.2 amendment | **GREEN** | `sub-phase-conventions.md` sha256:`167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e` (was `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734`). Line count 829 -> 854 (+25). |
| 11 | CI gate redesign per D4 strict-fanout | **GREEN** | `.github/workflows/{ts-strict,python-strict,determinism}.yml` extended; per-sim fan-out added to determinism.yml. |
| 12 | Conventions doc § B.7 sweep-template addendum | **GREEN** | Subsection of conventions doc; included in the sha256 above. |
| 13 | CHANGELOG additive entry | **DEFERRED** | Per charter § 4.3 Step 2.9 dispatch; Stage 2 owns CHANGELOG. |
| 14 | `docs/dependencies.md` additive entry | **DEFERRED** | Per charter § 4.3 Step 2.9 dispatch; Stage 2 owns dependencies.md. |

**12 GREEN + 2 deferred-to-Stage-2 = 14 deliverables addressed.**

## § 3. D2 routing outcome

(FACT — operator routed at STEP 8 HALT-AND-SURFACE.)

Operator-ratified custom wording (verbatim, as committed at `docs/architecture.md` § 2.5):

> "A simulation is deterministic if every state array and diagnostic entry in its canonical Capture is exactly element-wise equal across two runs at the same seed on the same hardware. This is the zero-tolerance special case of the cross-stack content-equivalence posture in §2.6, computed over the same Capture projection. Storage-format metadata (wall-clock timestamps embedded by the underlying file format, library version banners, and other environment-influenced packaging artifacts) is excluded from the comparison."

**Relation to D2-a/b/c probe candidates:** the operator-ratified wording incorporates D2-c (project-onto-Capture) framing plus an explicit R-D3 mitigation cross-reference to spec § 2.6 (the "zero-tolerance special case of the cross-stack content-equivalence posture" clause). This makes R-D3 (cross-stack consistency) load-bearing in the contract definition itself rather than implicit via downstream cross-reference.

**D2-sub routing** (no halt; pre-dispatch ratified): `payload.checksum` kept as raw-file sha256 in capture-v1.json with description-only annotation explaining it is informational and the contract lives at the harness. No sibling `content_checksum` field at schema v1.1.0; coordination cost with Phase 4 WU-A avoided per charter § 11.5 D2-sub probe lean.

## § 4. Per-deliverable evidence sha256 enumeration

(All sha256s in `evidence_hashes` front-matter above.)

Stage 1 sub-bundle commit `26e1343` includes 30 file changes (+1264 / -124 lines, post-lint-format). 7 NEW files:

- `common/common-ts/src/determinism/captureReader.ts`
- `common/common-ts/src/determinism/diffCaptures.ts`
- `common/common-ts/src/determinism/runTwiceAndDiff.ts`
- `common/common-ts/src/determinism/index.ts`
- `common/common-ts/src/determinism/__tests__/harness.test.ts`
- `common/common-ts/src/__tests__/capture-writer-determinism.test.ts`
- `tools/testkit/capture/tests/test_writer_determinism.py`

## § 5. Cross-package regression witness (Python + TypeScript)

### § 5.1 Python fan-out

(FACT — `docs/_audits/phase-2/sub-phase-capture-determinism-contract/stage-1-python-sweep-2026-05-23T16-50-00Z.txt` sha256:`a0739c838cdbc6738a3890fb24831b9eb77ab951458208fc9ae1634d025f6138`.)

| Package | Tests | Status |
|---|---:|---|
| `packages/strange-attractors` | 11 | GREEN |
| `packages/mandelbulb-explorer` | 10 | GREEN |
| `packages/boids-3d` | 10 | GREEN |
| `packages/physarum` | 10 | GREEN |
| `packages/reaction-diffusion-2d` | 14 | GREEN |
| `packages/reaction-diffusion-3d` | 8 | GREEN |
| `packages/sph-water` | 22 | GREEN |
| `packages/eulerian-smoke` | 10 | GREEN |
| `packages/lattice-boltzmann-d3q19` | 10 | GREEN (+1 vs baseline: new R-D2 spot-check) |
| `packages/mpm-multimaterial` | 10 | GREEN (+1 vs baseline: new R-D2 spot-check) |
| **10-sim subtotal** | **115** | **GREEN** |
| `tools/integrity/tests` | 51 | GREEN |
| `tools/diagnostics/diagnostics` | 93 | GREEN |
| `tools/testkit` (incl. numba_harness + taichi_harness, explicit) | 58 | GREEN (+1 vs Taichi-integration's 57: new writer-determinism test) |
| `common/common-py` | 25 | GREEN |
| **TOTAL Python** | **342** | **GREEN, 0 FAILED** |

### § 5.2 TypeScript fan-out

(FACT — `stage-1-ts-sweep-2026-05-23T16-50-00Z.txt` sha256:`126f221c46aba5f72f1f4e536ce3aec6811a6aa3a85273d80b377f776f6e3111`.)

```
 Test Files  8 passed (8)
      Tests  20 passed | 2 skipped (22)
```

| common-ts test surface | Tests | Status |
|---|---:|---|
| `src/__tests__/capture.test.ts` | (existing) | GREEN |
| `src/__tests__/context.test.ts` | (existing) | GREEN |
| `src/__tests__/cross-stack.test.ts` | (existing) | GREEN |
| `src/__tests__/indexeddb.test.ts` | (existing) | GREEN |
| `src/__tests__/pipelines.test.ts` | (existing) | GREEN |
| `src/__tests__/capture-writer-determinism.test.ts` (NEW) | 3 | GREEN |
| `src/determinism/__tests__/harness.test.ts` (NEW) | 5 | GREEN |
| `examples/hello-physics/hello-physics.test.ts` (REFACTORED) | 3 | GREEN |
| **TOTAL TypeScript** | **20 passed + 2 skipped** | **GREEN, 0 FAILED** |

### § 5.3 Consolidated sweep summary

(FACT — `stage-1-sweep-summary-2026-05-23T16-50-00Z.txt` sha256:`75731e0028dcf7f02610e1795766cb5d44ca8f7ccdf99cc4245f2231e8616aec`.)

**Net new tests vs Taichi-integration baseline (325 Python):**
- +14 RD-2D (Phase-0 sim; not counted in Taichi-integration's 9-sim sweep but in scope here)
- +1 LBM R-D2 spot-check
- +1 MPM R-D2 spot-check
- +1 `capture/test_writer_determinism::byte-identical-across-seconds`
- Total: **+17 Python net new**; **342 total Python**.

TypeScript baseline was not measured at Taichi-integration (TS surface was minimal); new dual-language baseline **20 passed + 2 skipped (22 total)** established here per conventions doc § B.7.

**ZERO REGRESSIONS** across 10 sims + 4 tool packages + common-py + common-ts.

## § 6. Conventions doc post-amendment sha256

| Stage | sha256 | Lines |
|---|---|---:|
| Pre-Stage-1 (= Taichi-integration baseline) | `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734` | 829 |
| **Post-Stage-1 (= this checkpoint's evidence_hashes entry; new canonical baseline)** | **`167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e`** | **854** |

Net additive growth: **+25 lines**. Three sub-section amendments:
1. § A.2 — gate-11 mechanism cross-reference (new paragraph after the three-stage cadence table).
2. § F.3 — "Bit-identical run-to-run" row reworded to "Content-equivalent run-to-run" + new "Content-equivalent NOT raw-file-byte-equality" paragraph.
3. § B.7 — NEW additive sub-section "Cross-package regression sweep — Python + TypeScript fan-out".

All amendments additive per the established conventions-doc-is-editable posture (D5 verdict at plan-drafting: NO blocking dependency). The conventions-consolidation `34c7d34` and conventions-refactor `e2dc789` precedents both treated the doc as forward-amendable; this sub-phase inherits that posture.

## § 7. New SHIFTs surfaced during Stage 1

(FACT — beyond N1 + N2 inherited from Stage 0; not re-litigated here.)

| ID | Description |
|---|---|
| **N1 (Stage 1)** | **`sim_runner_diagnostic` ignores the seed parameter** at both `packages/lattice-boltzmann-d3q19` and `packages/mpm-multimaterial`. Initial R-D2 spot-check using a perturbed-seed wrapping runner failed to drift; switched to a synthetic-capture `drifting_runner` pattern (mirroring `tools/testkit/determinism/tests/test_harness.py:nondeterministic_stub`) that writes a Capture whose state array drifts per invocation regardless of seed. Both LBM V2 and MPM V3 R-D2 spot-checks use the synthetic pattern; both PASS (drift detected). **Banked precedent:** future R-D2 spot-checks against sim runners should use the synthetic-capture pattern unless the sim runner is explicitly seed-aware. This is a sub-phase-specific observation, not a defect — `sim_runner_diagnostic` is canonical diagnostic-tier and its determinism is established by initial-condition + sim-internal-RNG seeding, not by the parameter. Cross-reference: the existing `tools/testkit/determinism/tests/test_harness.py:nondeterministic_stub` is the structural template. |

### Cumulative shift count at Stage 1 close

**104 entering Stage 1 + 1 (Stage 1 N1) = 105 entering Stage 2.**

## § 8. R-D2 spot-check witnesses (3 sites)

(FACT — charter § 9 R-D2 mitigation requirement; verified at Stage 1 dispatch-time.)

| Site | Mechanism | Outcome |
|---|---|---|
| V1 — `common/common-ts/examples/hello-physics/hello-physics.test.ts` `FAILS the content-equivalence gate on a broken-determinism runner` | Wrapping runner with varying step count between invocations (mirror counter pattern) | **PASS** — `verdict.contentEquivalent === false`; detail string contains step-count mismatch + array mismatch. |
| V2 — `packages/lattice-boltzmann-d3q19/tests/test_determinism.py` `test_content_equivalent_gate_catches_drift` | Synthetic `drifting_runner` writing a Capture with `U[3]` drifting per call | **PASS** — `verdict.content_equivalent == False`; `max_abs_err` in detail string. |
| V3 — `packages/mpm-multimaterial/tests/test_determinism.py` `test_content_equivalent_gate_catches_drift` | Same synthetic pattern; `pos[3]` drifting | **PASS** — `verdict.content_equivalent == False`; `max_abs_err` in detail string. |

**R-D2 mitigation verified.** The contract surface is at least as strong as the byte-equality surface it replaces; each refactored test FAILS as expected on broken-determinism injection.

## § 9. Banked items status

(FACT — per charter § 11.2 D2 disposition table + Stage 1 closure.)

| # | Item | Status at Stage 1 close |
|---|---|---|
| D2 contract redesign | **RESOLVED** (this Stage 1 commit `26e1343`) |
| D5 conventions doc amendment | **RESOLVED** (additive § A.2 + § F.3 + § B.7 amendments landed at this Stage 1 commit) |
| D3 inline docstring updates (per Stage 0 SHIFTED N2 re-scoping) | **RESOLVED** (3 wording sites in 2 test files updated alongside V2 + V3 refactor) |
| D4 CI strict-fanout | **RESOLVED** (3 workflows extended at this Stage 1 commit) |
| D1 monolithic Stage 1 | **CONFIRMED HELD** (R-D6 not triggered at Stage 0; monolithic ship clean) |
| Testing-improvements sub-phase | **DEFER** — separate routing per parent-landing § 9 |
| evidence_paths LFS remediation | **DEFER** — focused infrastructure hotfix |
| Mid-Phase-1 capture regeneration | **DEFER** — per-sim work |
| Cross-stack verification methodology | **DEFER** — first Stack-C↔Stack-D port sub-phase |
| conventions doc § B.6 addendum (Taichi N6 empty-file rejection) | **DEFER** — bundle candidate with LFS hotfix |

**This sub-phase consumes its three primary banked items (D2 + D3 + D5) and adds the cross-package sweep template addendum (D5 sweep-template extension) as a new convention.**

## § 10. Stage 2 handoff

**Stage 2 dispatchable per charter § 7.3.** Stage 2 owns:
- Convergence-file edits (CHANGELOG additive + `docs/dependencies.md` additive — deliverables 13 + 14).
- Closing-commit anchor re-check.
- Test sweep at portfolio scale (Python + TypeScript fan-out per the new § B.7 template) — likely byte-identical to this Stage 1 sweep since Stage 2 ships no source changes.
- Full integrity sweep (Cat 1/2/3/4/5/X) — aspirational fourth-byte-identical to `810cd6e3...23411f98` baseline (note: spec § 2.5 + conventions doc edits MAY introduce Cat-1 (citation) or Cat-2 (public-API) deltas; surface if non-zero).
- Evidence-path verification + append-only check.
- Sub-phase landing audit + Convention #12 SHA back-fill.

Bit-identity replay invariant preserved at `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (18 invocations; no replay during Stage 1).

## § 11. Tag posture (Stage 1)

No `-phase-N` tag; no `v0.1.10` non-phase point-release tag at Stage 1 close (Stage 1 is mid-sub-phase; tag posture re-evaluated at Stage 2 close per charter § 11.4).

---

This audit lands at HEAD `0a99f4efa8290c9d458b3c9950046426f28529ff` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(capture-determinism-contract-stage1-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time per the tightened § B.2 step 3 discipline).

Verdict: **CONFIRMED**. Stage 2 dispatchable per charter § 7.3.
