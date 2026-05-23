---
title: "Conventions Refactor (Post-Phase-1) — Sub-Phase of Spec-Phase-1"
sub-phase-slug: sub-phase-conventions-refactor-post-phase-1
flavor: focused-infrastructure (doc refactor; mirrors `sub-phase-conventions-consolidation` shape)
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md
  - docs/_audits/phase-1/sub-phase-mutation-script-hotfix/repair-2026-05-22T02-57-31Z.md
  - docs/_audits/phase-1/sub-phase-conventions-consolidation/landing-2026-05-22T03-25-55Z.md
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md
  - docs/_audits/phase-1/sub-phase-git-lfs-migration/landing-2026-05-22T21-04-05Z.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
pre-conditions:
  - "Phase 1 closed structurally at v0.1.9 (SHA 1ea43b947f7dc0699e40c3570e6e113455326693). All 9 sims gates 4-13 GREEN; 5 hotfix sub-phases landed."
  - "Conventions doc at docs/conventions/sub-phase-conventions.md sha256 = 004d70117e01b3824a8b54e4c34963969ad0a4188b87f7acbca01dea9600a3e6 (verbatim against conventions-consolidation landing audit evidence_hashes)."
  - "Bit-identity replay invariant 9399fc33…909f34 held byte-identically across 15+ invocations through MPM Stage 0 (conventions doc § D.3)."
reads-first:
  - "docs/conventions/sub-phase-conventions.md (full read; this is the document being refactored — agent re-anchors section identifiers before drafting edits)"
  - "This plan"
  - "Most-recent per-sim landing audit: docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md (§ 9.3 + § 9.4 + § 10.5 — banked items for post-Phase-1 work; the source of this sub-phase's deliverable list)"
inherited-shifts: 85 (per MPM landing § 8.3 — the dispatch context's "89" appears to have been a typo; the actual cumulative is 85 entering post-Phase-1)
sub-phase-identity: "NOT a new spec-phase. Final Phase 1 sub-phase before spec-Phase-2 dispatches. Stabilises the conventions doc for spec-Phase-2+ reference."
---

# Conventions Refactor (Post-Phase-1) Sub-Phase Plan

## § 1. Scoping

### § 1.1 Deliverable shape

Doc edits to `docs/conventions/sub-phase-conventions.md`, plus an audit chain entry for the sub-phase close. **NO** sim implementation, **NO** test changes, **NO** mutation testing, **NO** capture regeneration. The conventions doc itself is not loaded by any sim code — regression surface is minimal (Cat 1/2/3/4/5/X sweeps should remain bit-identical to MPM Stage 2 close apart from the audit-template SHIFTs documented at landing).

### § 1.2 What's different from prior sub-phases

- **Doc-only refactor.** Mirrors `sub-phase-conventions-consolidation` (commit `34c7d34`) shape exactly: focused infrastructure, single-session lean, no implementation surface.
- **Scope bounded by 8 enumerated refactor items A–H** from the MPM landing audit § 9.4 + § 10.5 + LBM landing § 9.4. The plan-drafting agent surfaces the proposed edit shape per item for operator routing BEFORE Stage 1 implementation — doc-content choices are cheaper to route at plan-drafting than to undo post-Stage-1.
- **Structural "Phase 1 closes" sub-phase.** After this lands the conventions doc reaches a stable form for spec-Phase-2 entry.

### § 1.3 Task 0.4 is NOT applicable

Conventions doc § N Task 0.4 (canonical-descriptor scope-analysis) targets sub-phases producing canonical captures. This sub-phase produces no capture and exercises no implementation perf surface. **Stage 0 explicitly skips Task 0.4** with rationale: "no canonical capture, no implementation perf surface; doc-only refactor".

---

## § 2. Deliverables — the 8 refactor items (A–H)

Each item below: (a) **target section** at HEAD, re-anchored against the doc; (b) **proposed edit shape**; (c) **operator-routable surface** at Stage 0 dispatch. Section identifiers refer to the conventions doc at sha256 `004d7011…600a3e6`.

### § 2.A. § N graduation PROPOSED → established + range [0.5×, 3×]

- **Target:** § N (lines 631–675), header label "PROPOSED" + § N.4 rationale block.
- **Edit shape:** retitle § N from "PROPOSED: Stage 0 canonical-descriptor scope-analysis" to "Stage 0 canonical-descriptor scope-analysis"; drop the "PROPOSED — explicitly forward-looking" preface; replace § N.4 ("Why this is PROPOSED, not established") with § N.4 "Empirical baseline — three single-session-ready Stage 1s" citing eulerian-smoke (`cf13d1c`) + LBM (`4f79e19`) + MPM (`bd89e78`) landings as the three anchors. Add § N.5 "Production-correction factor range" with the empirical band **[0.5×, 1.45×]** observed across three sub-phases, framed as "Stage 0 estimates are conservative bounds with sim-shape-dependent factor in [0.5×, 3×], not point estimates"; under-shoot characteristic of Stage-0-scope-wider-than-Stage-1-scope (LBM, MPM); over-shoot characteristic of opposite shape (eulerian-smoke). Cite N4 from MPM landing § 8.2 verbatim.
- **Surface:** confirm the empirical-band framing `[0.5×, 3×]` (1.45× observed; the 3× extension is a forward-projection for safety margin). Operator may prefer `[0.5×, 1.5×]` strict-observed band vs `[0.5×, 3×]` safety-margin band.

### § 2.B. Capture-cadence routing discipline (new sub-section)

- **Target:** **new sub-section**. Dispatch prompt named "§ D.2.3" but § D is replay/tag posture only — capture cadence is not in the doc at HEAD. Natural home is either (i) a new § A.2.1 under "Three-stage cadence — Stage 1 deliverables", or (ii) a new top-level § P "Capture cadence discipline" between § L and § M, or (iii) a new sub-section under § E (gate-13 worktree pattern) extended to "Gate 9 capture cadence". **Lean:** new § P (between § L "Banked observations carry-forward" and § M "65 cumulative shifts inventory") — cleanest cross-reference target; doesn't perturb existing section numbering.
- **Edit shape:** "Default to **full-cadence-capture + W1 ceiling raise** when canonical-tier wall-clock permits. Cadence-N (every-50, every-100) is the fallback when full cadence is infeasible at the W1 ceiling. Existing committed captures (eulerian-smoke lid-driven-cavity / Taylor-Green; sph-water dam-break; RD-3D Gray-Scott; MPM drop-impact at cadence-50) stay as committed; Stack-C/D Phase-2+ regeneration may revisit cadence at full-feasibility witness." Cite LBM § 9.4 row 7 + MPM Stage 0 Task 0.4 cadence-50 routing.
- **Surface:** routing alternatives: (i) new § P top-level (lean); (ii) new § A.2.1 sub-section under three-stage cadence; (iii) extend § E to "Gate 9 + Gate 13" — confirm placement.

### § 2.C. § I.3 anchor-density-predicts-kill-rate empirical note

- **Target:** § I.3 "Anchor count semantics" (lines 386–388) — extend with a new paragraph; also cross-reference from § J.5 "Mutation gate advisory posture".
- **Edit shape:** append to § I.3: "**Empirical observation across five PATH-A proof-points (RD-3D, sph-water, eulerian-smoke, LBM, MPM partial):** per-source-file mutation kill-rate above the 0.80 advisory threshold has consistently been driven by ≥ 4 discrete `independent_reference` anchors in the consuming golden table, not by general test richness. Per-file evidence: LBM `reference/constants.py` 0.8547 + `reference/equilibrium.py` 0.8469 (both anchored to d3q19-equilibrium 4-anchor lift); sph-water `kernel.py` 0.8456 (anchored to cubic-spline-kernel 3-anchor); MPM `reference/shape_functions.py` 0.8846 (anchored to mls-mpm-shape-functions 4-anchor lift). The corresponding sim-source-tier mutation kill-rate baseline across all five proof-points: mean **0.5466**, range **[0.4879, 0.5927]**, ±10% of mean. Per-file kill rates above 0.80 reflect anchor density, NOT richer behavioural tests."
- **Surface:** confirm placement (extend § I.3 vs new § J.5.1) and the kill-rate numbers verbatim from MPM landing § 7.6.

### § 2.D. § J.3 PATH-A × numba per-mutant timeout wrapper requirement

- **Target:** § J.3 "Per-target mutmut config schema" (lines 424–437) — extend the runner-form block.
- **Edit shape:** append to § J.3 a new paragraph: "**For PATH-A targets exercising @njit-decorated modules with potentially-unbounded mutations** (e.g., MPM `mls_mpm.py` 1257 mutants; sph-water `dfsph.py` 600 mutants), the runner SHOULD include a per-test wall-clock timeout. Two complementary mechanisms: (i) shell-level `timeout --kill-after=10 <N>` wrapper around the pytest invocation (worked at MPM Stage 2 recovery run at scope-restricted ~1m45s for 98 mutants); (ii) `pytest-timeout` plugin with a per-test default (e.g., 30s unit / 300s capture-generation). **This convention documents the requirement; adopting `pytest-timeout` is the testing-improvements sub-phase's responsibility, NOT this refactor's.** Until pytest-timeout lands, the shell-timeout form is the documented minimum for numba-using PATH-A targets. MPM `mls_mpm.py` mutation completion is banked for the testing-improvements work." Cite MPM landing § 8.2 N5 verbatim.
- **Surface:** confirm the convention-documents-requirement-vs-implementation-adopts-tool split. The doc edit does NOT touch any pyproject.toml or conftest.py.

### § 2.E. § B audit-template refactor — evidence_paths strict-verify drift + LFS extension

- **Target:** § B.3 "Front-matter fields" table (lines 92–104), the `evidence_paths:` + `evidence_hashes:` rows; plus a new § B.6 "Evidence-path strict-verify discipline" sub-section.
- **Edit shape:** add a footnote to the `evidence_hashes:` row in § B.3 noting the LFS-pointer-vs-content distinction. Add new § B.6 "Evidence-path strict-verify discipline" documenting: (i) the recurring drift pattern across RD-3D Stage 2 N1, eulerian-smoke Stage 2 N1, LBM Stage 2 N2, MPM Stage 2 N2 (4-of-7 per-sim sub-phases); (ii) the **root cause for LFS-tracked evidence**: `verify_evidence`'s `tools/integrity/integrity/common/repo.py:62-72::file_at_sha()` uses `git show <sha>:<path>` which returns the LFS pointer-text stub for LFS-tracked files, NOT the smudged actual content. The audit's claimed sha256 is the **actual on-disk content sha256** (matching `git lfs ls-files` OID); `verify_evidence` ends up comparing against the pointer-text sha256 and structurally fails. (iii) **Routing options** for the next-tier remediation (operator-routable; this refactor documents the discipline, does NOT pick an option): (a) teach `verify_evidence` about LFS via `git lfs smudge`; (b) split `evidence_hashes` into `pointer_sha256` vs `content_sha256` for LFS entries; (c) accept the recurring pattern with explicit annotation. (iv) **Authoritative rule:** sealed-at-commit-time sha256 is the load-bearing artifact identity per § B.1.
- **Surface:** confirm § B.6 placement (vs extending § B.3 inline). Confirm whether to enumerate the three remediation options or leave them banked.

### § 2.F. § B.2 Convention #12 SHA-transcription discipline tightening

- **Target:** § B.2 "Convention #12 — SHA back-fill at every stage close" (lines 72–86) — extend step 3 of the pattern.
- **Edit shape:** edit step 3 from "3. `git rev-parse HEAD` to capture the actual closing-commit SHA." to "3. `git rev-parse HEAD` to capture the actual closing-commit SHA. **The full 40-hex SHA MUST be captured via `git rev-parse HEAD` at summary-composition time, not transcribed from prior context.** Same-short-SHA-prefix collisions are routine (the first 8 hex characters cover ~4 billion possibilities; per-sub-phase activity routinely produces multiple SHAs sharing a short prefix). Eulerian-smoke Stage 2 N1 and MPM Stage 2 closing summary both surfaced transcription drift on the closing-summary SHA — the same short prefix, different full hex." Cite eulerian-smoke Stage 2 N1 + MPM landing § 12 verbatim.
- **Surface:** confirm wording.

### § 2.G. § J mutmut SQLite cache extraction pattern

- **Target:** § J (mutation testing) — new sub-section § J.6 "Mutation data extraction pattern".
- **Edit shape:** new § J.6: "Mutmut writes per-mutant detailed results to a SQLite database at `.mutmut-cache` (project root, gitignored). The `tools/testkit/mutation/baseline-*.json` and per-sub-phase artifact JSONs at `tools/testkit/mutation/sub-phase-<slug>-<UTC>.json` are **summary stubs** — Phase-0 framework-validated structure with summary counts. **Per-target detailed mutant-by-mutant results live in `.mutmut-cache` SQLite.** Future PATH-A sub-phases querying per-mutant kill/survive/timeout breakdowns should query the SQLite cache directly via targeted Python extraction (e.g., `sqlite3.connect(".mutmut-cache").execute('SELECT filename, status FROM mutants WHERE filename LIKE ...')`) rather than reading the summary JSONs as if they contained per-mutant detail. Warn against full-file baseline-JSON reads at audit time when only summary counts are present." Cite LBM Stage 2 N2 verbatim.
- **Surface:** confirm placement.

### § 2.H. § J sim.py manifest-builder low-kill-rate pattern formalisation

- **Target:** § J — new sub-section § J.7 "Manifest-builder low-kill-rate pattern".
- **Edit shape:** new § J.7: "Across five PATH-A proof-points, `sim.py` modules — the manifest-builder / runner-glue layer at every per-sim package — have consistently produced **low** mutation kill rates: eulerian-smoke 0.1707, LBM `sim.py` 0.2287, MPM `sim.py` 0.5862 partial (highest, driven by multi-test coverage). Root cause: the manifest-field-equality pattern. Mutations to literal field values in the manifest dict (e.g., `'algorithm': 'mls-mpm-quadratic-bspline-1d-hu-2018'`) DO change the manifest output, but downstream tests rarely equality-test every field — most mutations are unkilled. **This is expected, NOT a coverage gap requiring augmentation at the sub-phase scope.** The manifest-builder kill-rate floor (~0.20) is a project-wide structural property of the runner-glue layer; test-augmentation to lift it is a testing-improvements sub-phase candidate (separate work), not a per-sim-sub-phase deliverable." Cite eulerian-smoke + LBM § 7.6 numbers verbatim.
- **Surface:** confirm framing (informational-note vs test-augmentation-banked-item). Cross-reference to § L.2 banked-observations carry-forward.

---

## § 3. IC contracts — N/A

This sub-phase consumes no IC contracts (Phase 1 § 1.5 IC-1 through IC-7 are sim-implementation concerns; doc refactor consumes none).

---

## § 4. Stages — three-stage cadence, compressed

### § 4.1 Stage 0 — Pre-flight

- **Task 0.0** — Cross-phase replay against `v0.1.0-phase-1` with 8-gate canonical set. **Expected:** sha256 byte-identical to bit-identity invariant `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (conventions doc § D.3; 16th+ invocation).
- **Task 0.1** — Tolerance-budget carryover. Set `[phase].phase = "sub-phase-conventions-refactor-post-phase-1"`; NO `[budgets.*]` widening; mirrors `sub-phase-conventions-consolidation` Stage 0 shape.
- **Task 0.2** — Phase 1 evidence sha256 reverify (all 9 sims' failing-tests-evidence sha256 unchanged at HEAD vs Phase 1 landing audit + MPM landing § 6.2).
- **Task 0.3** — Conventions doc reverify: re-confirm conventions doc sha256 `004d7011…600a3e6` at HEAD; enumerate the actual section identifiers + line spans for each of the 8 refactor items A–H; surface any item where the target section identifier in this plan needs re-anchoring against HEAD (sections may have shifted if any commits between this plan and Stage 0 dispatch touched the conventions doc).
- **Task 0.4** — **SKIPPED with explicit rationale**: "doc-only refactor; no canonical capture; no implementation perf surface; conventions doc § N Task 0.4 not applicable."
- **Stage 0 close**: checkpoint audit at `docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-checkpoint-<UTC>.md` + Convention #12 SHA back-fill.

### § 4.2 Stage 1 — Doc edits

**Single sub-bundle commit.** All 8 refactor items A–H land in one commit:

```
docs(conventions-refactor-post-phase-1-stage1): refactor sub-phase-conventions.md per
  MPM landing § 9.4 + § 10.5 — A § N graduation; B capture-cadence default; C anchor-
  density-predicts-kill-rate; D PATH-A × numba timeout; E evidence_paths LFS extension;
  F Convention #12 SHA-transcription tightening; G mutmut SQLite cache extraction;
  H sim.py manifest low-kill-rate pattern formalisation.
```

**Acceptance check at commit-time:**
- Conventions doc parses cleanly (read-back via Read tool); section anchors resolve; FACT / INFERENCE / PROPOSED tags placed; cross-references to other sections + audit-chain audits resolve.
- All 9 per-sim sim packages + tools/integrity/tests + tools/diagnostics + tools/testkit + numba_harness still GREEN at the conventions-doc commit (regression sweep deferred to Stage 2 per A.2 cadence; conventions doc isn't loaded by sim code, expected delta is zero).

**Stage 1 close**: checkpoint audit + Convention #12 SHA back-fill.

**Two-commit fallback**: if the 8-item bundle exceeds review-ability, split into two commits — (i) graduations + extensions to existing sections (A, C, D, F); (ii) new sections + sub-sections (B, E new § B.6, G new § J.6, H new § J.7). Operator decision at Stage 0 dispatch.

### § 4.3 Stage 2 — Landing

Mirrors `sub-phase-conventions-consolidation` Stage 2 shape verbatim:

- **Step 2.1** — Closing-commit anchor re-check (Convention 7.9). Conventions doc post-Stage-1 sha256 captured; pre-Stage-1 sha256 documented; LFS-tracked artifacts unchanged.
- **Step 2.2** — Regression sweep: 300 tests across all 9 sims + tools packages, mirroring MPM landing § 6.1 — expected **all GREEN, zero delta** (conventions doc isn't loaded by sim code).
- **Step 2.3** — Cat 3 disposition: **NO-OP** (no golden table changes; no `_SUBDIRS_PICKED_UP` extension; `(closed-form, agent-based, particle-fluids, lattice, hybrid-pg)` 5-entry final state stable).
- **Step 2.4** — Full integrity sweep (Cat 1/2/3/4/5/X). Expected: **0 HARD_FAIL, 13 SOFT_WARN** (identical to MPM landing § 7.2; no Stage 2 deltas).
- **Step 2.5** — Evidence-path verification per § B.6 (new). Expected: same LFS-pointer drift on the 11 LFS-tracked captures (documented behaviour per the new § B.6); zero new drift from this sub-phase's evidence_paths (all text files; no LFS).
- **Step 2.6** — Gate-13 worktree replay: **NO-OP** (no per-sim implementation; no new gate-13 anchors). Bit-identity replay invariant implicitly verified by Stage 0 Task 0.0.
- **Step 2.7** — Append-only check: Stage 1 modifies `docs/conventions/sub-phase-conventions.md`. Per conventions doc § B.1 the doc is NOT at any prior protected-set SHA (landed first at conventions-consolidation `34c7d34`; this sub-phase modifies it additively). CI grep filter for `*.ledger.md` is trivially clean.
- **Step 2.8** — Mutation gate: **NO-OP** (no sim source changes; no per-target mutmut invocation).
- **Step 2.9** — Sub-phase landing audit at `docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-<UTC>.md` + Convention #12 SHA back-fill per the new tightened discipline (item F): full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time.

---

## § 5–10 Standard discipline (reference-only)

- **§ 5 Determinism strategy** — N/A (no sim implementation).
- **§ 6 Numba** — N/A (no sim implementation).
- **§ 7 Standing orders** — per conventions doc § A.3 role model + § C commit-message convention. `uv run python ...` over bare `python3`. Convention #12 at every stage close. No `--amend`.
- **§ 8 Sub-phase scope vocabulary** — `<sub-phase-conventions-refactor-post-phase-1-stage<N>-<scope>>`.
- **§ 9 Playbook entries** — N/A (no sim implementation; no P-class entry).
- **§ 10 Append-only invariant** — per conventions doc § B.1. This sub-phase modifies the conventions doc (NOT at any protected-set SHA prior to conventions-consolidation `34c7d34`; additive modification per the established conventions-doc-is-editable posture mirroring conventions-consolidation Stage 2 acceptance).

---

## § 11. Phase coherence

### § 11.1 Inputs

13 parent audits (Phase 1 landing + 7 per-sim landings + 5 hotfix landings; full list at front-matter). The 8 refactor items derive from MPM landing § 9.4 + § 10.5 (post-Phase-1 work catalog), with LBM landing § 9.4 + eulerian-smoke landing as additional empirical anchors for items B + C.

### § 11.2 Outputs

After this sub-phase lands the conventions doc is **stable for spec-Phase-2 entry**. The next dispatchable work:
1. **Taichi-integration sub-phase** at spec-Phase-2 entry (operator routing at MPM dispatch; mirrors numba-integration pattern; establishes Stack-D Taichi infrastructure).
2. Testing-improvements sub-phase (pytest-timeout adoption; gate-6 step-state magnitude advisory; Cat 3 evaluator shims).
3. `common-py` adoption decision (operator-routable: focused infrastructure sub-phase OR spec-Phase-2+ deliverable).

### § 11.5 Operator-routable items (lean, 3 items)

1. **Scope confirmation.** Confirm the 8 refactor items A–H are the right scope. Items NOT in scope (banked separately; surface to confirm): (i) `common-py` adoption (operator decision; separate sub-phase candidate); (ii) testing-improvements work (pytest-timeout adoption, gate-6 enhancement, Cat 3 evaluator shims) — banked for separate chat; (iii) mid-Phase-1 capture regeneration — deferred per operator routing. Surface any item to add or defer.
2. **Per-item edit-shape routing.** For each of A–H, confirm the proposed edit shape (target section, content sketch) BEFORE Stage 1 dispatch. Specifically: (a) item B placement (new § P top-level vs new § A.2.1 sub-section vs § E extension); (b) item E remediation-options enumeration (list three vs leave banked); (c) item A empirical-band framing `[0.5×, 3×]` vs `[0.5×, 1.5×]`; (d) item C placement (extend § I.3 inline vs new § J.5.1); (e) two-commit fallback for Stage 1 if bundle exceeds review-ability.
3. **`v0.1.10` tag posture.** Lean **no intermediate tag**. Sub-phase commits + landing audit provide the audit trail; next tag event is `v0.2.0-phase-2` at spec-Phase-2 dispatch. Per conventions doc § D.2 the agent NEVER pushes tags; operator-only.

---

*End of plan. Stage 0 is dispatchable in a fresh session against this plan after operator routing of § 11.5.*
