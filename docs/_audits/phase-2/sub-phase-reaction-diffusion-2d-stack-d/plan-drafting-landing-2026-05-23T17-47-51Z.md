---
date: 2026-05-23T17-47-51Z
author: reaction-diffusion-2d-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: reaction-diffusion-2d-stack-d-plan-drafting-landing
subject: "FIRST cross-stack port sub-phase plan-drafting CLOSE — THIRD spec-Phase-2 sub-phase plan-drafting complete. Charter at docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md authored; structurally inherits sub-phase-agent-based.md with cross-stack-port deltas. Three load-bearing drifts vs phase-2-plan § 2.5 surfaced + dispositioned. D1-D6 surface preview with leans + alternatives; D6 NEW (port directory shape) surfaced by drift analysis. Conventions doc sha256 167fe349…f2c58c2e verified at HEAD. Cumulative shifts at plan-drafting close: 110 (107 inherited + 3 plan-drafting N1/N2/N3). No blocking dependencies for Stage 0 dispatch."
verdict-state: CONFIRMED
head_sha: bb10a7521ccf86aad51e1d629a3a5a734980f4bc
head_sha_at_checkpoint: bb10a7521ccf86aad51e1d629a3a5a734980f4bc
parent_audits:
  - docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md
  - docs/_audits/phase-0/block-8-rd-2d-2026-05-19T16-00-36Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md
evidence_paths:
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
---

# Plan-Drafting Landing Audit — Sub-Phase RD-2D → Stack-D

## 1. Plan-drafting scope summary

(FACT — `docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md` charter at commit `09faeb7`; `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md` probe at commit `d72b80b`.)

**THIRD spec-Phase-2 sub-phase plan-drafting; FIRST per-sim cross-stack port sub-phase under spec-Phase-2.** Drafts the implementation plan for porting `reaction-diffusion-2d` from Stack-B (TypeScript / WebGPU; Phase-0 Block 8 frozen) to Stack-D (Python / Taichi).

This plan-drafting is the **first** to:

- **Dispatch a per-sim cross-stack port sub-phase** under spec-Phase-2. Predecessors at Phase-2 (`sub-phase-taichi-integration`, `sub-phase-capture-determinism-contract`) were infrastructure-only. This sub-phase is the FIRST to engage gates 4–14 of spec § 3.5 + phase-2-plan § 1.5.1 v6 amendment at sim-test scale.
- **Surface load-bearing drift between phase-2-plan § 2.5 (drafted pre-Phase-0-Block-8) and HEAD state** at three concordant sites (canonical descriptor, cross-stack tolerance value, portfolio directory shape). Exercise the D1=SUPERSEDE ratification operationally: consume § 2.5 as REFERENCE not dispatch.
- **Establish IC-15 (per-sim cross-stack-port spec-sheet template)** as the new IC produced by this sub-phase's outputs. Subsequent Phase-2 cross-stack ports inherit IC-15 by reference.
- **Surface a NEW D-class question (D6 — port directory shape)** that did not exist at probe time per the dispatch contract; the drift analysis forced its emergence at plan-drafting close.
- **Operationally consume IC-13 + IC-14 from capture-determinism-contract** as the load-bearing same-stack determinism contract for the Stack-D port (gate 10) and the test-surface mechanism for the cross-stack equivalence diff (gate 14).
- **Operationally consume IC-11 + IC-12 from Taichi-integration** as the Stack-D infrastructure substrate (set_taichi_deterministic + docs/common/taichi.md rules + tools/testkit/taichi_harness regression surface + hello_taichi.py structural exemplar).

## 2. Drafting deliverables — final-status table

(FACT — all 3 plan-drafting deliverables landed at this audit's close.)

| # | Deliverable | Path | Closing-commit |
|---|---|---|---|
| 1 | Plan-drafting probe report | `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md` | `d72b80b` |
| 2 | Sub-phase charter | `docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md` | `09faeb7` |
| 3 | Plan-drafting landing audit (this audit) | `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-landing-2026-05-23T17-47-51Z.md` | (this commit) |
| 4 | Convention #12 SHA back-fill commit | — | (next commit) |

**All 3 drafting deliverables CONFIRMED at plan-drafting close.** Acceptance for "plan-drafting complete": probe report + charter + landing audit committed; SHA back-fill commit pending; charter dispatchable by operator pending D1-D6 routing.

## 3. Stage convergence commits (plan-drafting)

(FACT — `git log --oneline c4be56b..HEAD`.)

| # | SHA | Subject | Stage |
|---|---|---|---|
| 1 | `d72b80b` | `chore(reaction-diffusion-2d-stack-d-plan-drafting-probe)` | Plan-drafting |
| 2 | `09faeb7` | `docs(sub-phase-reaction-diffusion-2d-stack-d)` (charter) | Plan-drafting |
| 3 | `(this commit)` | `chore(reaction-diffusion-2d-stack-d-plan-drafting-landing-audit)` | Plan-drafting |
| 4 | `(back-fill commit)` | `chore(reaction-diffusion-2d-stack-d-plan-drafting-sha-backfill)` | Plan-drafting |

**4 plan-drafting commits at this audit's close** (including Convention #12 SHA back-fill).

## 4. Anchor verification at plan-drafting close (Convention M)

(FACT — verified at this audit's authoring time.)

| Anchor | Pre-plan-drafting | Post-plan-drafting | Status |
|---|---|---|---|
| Conventions doc sha256 | `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e` | (unchanged) | append-only protected at plan-drafting; first sub-phase to dispatch against this baseline |
| Capture-determinism-contract landing head_sha | `9bf5b68` + SHA back-fill `c4be56b` | (unchanged) | sealed at parent sub-phase close |
| Taichi-integration landing head_sha | `cf7d5535e96274084dade333a97135799807418b` + SHA back-fill `412b1b9` | (unchanged) | sealed |
| Stack-B canonical capture `gray-scott-lambda-128sq-seed42-step2000.h5` sha256 | `bcae544ae58ceb1fb06f9b8be2441f9116eebd8ea5d21dd616f2daf6f92148f0` | (unchanged) | sealed at Phase 0 Block 8 |
| Stack-B canonical capture `.json` sha256 | `585d7d8ab2db7db7b64b498b5436f414835e1e67ffb6a7ad962f3d4803d3a7bc` | (unchanged) | sealed at Phase 0 Block 8 |
| RD category default tolerance | `relative = 1e-4, absolute = 0.0` (tolerance.toml + tolerance-budget.toml + spec-ref.md § 9 + determinism.md cross-stack section) | (unchanged) | three concordant sites |
| Tolerance-budget phase value | `"sub-phase-capture-determinism-contract"` | (unchanged; Stage 0 Task 0.1 will bump) | Stage 0 carryover at this sub-phase's Stage 0 dispatch |
| MMS solution Stack-D-callable | `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py` | (unchanged; verified pure NumPy + numpy.typing) | sealed at Phase-1 RD-3D Stage 2 R8 |
| Bit-identity replay invariant | `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (18 invocations) | (unchanged; no replay during plan-drafting) | sealed; Stage 0 Task 0.0 = 19th |

**No drift surfaced at plan-drafting close.** All anchors match charter + probe-body recordings.

## 5. D1-D6 verdicts at plan-drafting close

(Per dispatch contract: D-class decisions surfaced at charter close; NOT pre-committed. Operator routes at Stage 0 dispatch.)

### D1 — Sub-phase naming convention

- **Lean (adopted in charter file + audit-dir name + commit slug prefix):** `sub-phase-reaction-diffusion-2d-stack-d`.
- **Alternative A:** `sub-phase-rd2d-stack-d-port`.
- **Alternative B:** `sub-phase-reaction-diffusion-2d-port-stack-d`.
- **Downstream implication:** the precedent established here propagates to 7 subsequent Phase-2 cross-stack port sub-phases. Operator may route alternative; rename is mechanical (charter file + audit dir + commit slug + workspace member name).

### D2 — Stage 1 decomposition

- **Lean (adopted in charter § 4.2):** Stage 1a (failing-tests) / 1b (impl) / 1c (cross-stack equivalence harness extension).
- **Alternative:** monolithic Stage 1.
- **Rationale:** Phase-1 per-sim precedent + IC-8 + phase-2-plan § 1.5.1 Gate 3 footer-hash discipline + probe estimate (~+800 to +1200 lines) exceeds Convention A's +500/-50 single-commit heuristic.
- **Downstream implication:** ~14 total commits (decomposed) vs ~10 (monolithic).

### D3 — Cross-stack equivalence tolerance value

- **Lean (adopted in charter § 1.4.2 + § 2 gate 14):** `relative = 1e-4, absolute = 0.0` per HEAD `tolerance.toml` + `tolerance-budget.toml`.
- **NO per-sim override needed** at category default.
- **Dispatch contract's "1e-5 lean" is CORRECTED to 1e-4** per probe § 6.2 (phase-2-plan § 2.5's "1e-5" was stale; HEAD reality is concordant at 1e-4 across three load-bearing sites).
- **Alternative:** if Stage 1c surfaces 1e-4 untenable (R-P2), operator routes either (a) tolerance amendment (separate operator-approved commit per spec § 2.6 + conventions doc § L) or (b) step-horizon override.
- **Downstream implication:** no tolerance.toml edit at Stage 1c (lean); if widening needed, separate amendment chain.

### D4 — Step-horizon for cross-stack equivalence

- **Lean (adopted in charter § 1.4.2 + § 2 gate 14):** full canonical step-2000 (HEAD-frozen descriptor).
- **Alternative:** shorter horizon (e.g., step ≤ 1000) if Stage 1c R-P2 surfaces a principled reason.
- **Downstream implication:** Stage 1c documents the step at which cross-stack diff approaches/exceeds 1e-4 regardless.

### D5 — Banked-items disposition

- **Lean (adopted in charter § 11.2):**
  - **Partial scope-in for cross-stack verification methodology** (this sub-phase IS the first cross-stack pair landing). `equivalence.md` (Stage 1c deliverable) consolidates the harness invocation pattern + tolerance routing + step-horizon documentation discipline.
  - **CONSUMED at this sub-phase:** Taichi smoke kernel patterns (hello_taichi.py) — structural template for the Stack-D Taichi-DSL kernel.
  - **DEFER:** testing-improvements; evidence_paths LFS remediation; conventions doc § B.6 addendum; mid-Phase-1 capture regeneration; LBM/MPM `sim_runner_diagnostic` seed-propagation defect.
- **Alternative:** full DEFER on cross-stack methodology (wait for second cross-stack pair before any consolidation). Probe lean: PARTIAL is correct.

### D6 — Port directory shape (NEW — surfaced by phase-2-plan § 2.5 drift analysis)

- **Lean (adopted in charter §§ 1.1, 4.2, 7):** Option A — `packages/reaction-diffusion-2d-stack-d/` (sibling workspace member).
- **Alternative A:** `packages/reaction-diffusion-2d/stack_d/` (subpackage inside existing Phase-1 package — VIOLATES Convention A; not recommended).
- **Alternative B:** `continuous-ca/reaction-diffusion-2d/ref-stack-d/` (phase-2-plan § 2.5 original — inconsistent with Phase-1 portfolio structure where 10 sim packages live under `packages/`; would create new top-level directory inconsistent with HEAD).
- **Downstream implication:** precedent established here propagates to 7 subsequent Phase-2 cross-stack port sub-phases. **Operator routes at charter close.**

## 6. Inherited shifts + plan-drafting shifts surfaced

### 6.1 Inherited shifts (107 cumulative entering plan-drafting)

(FACT — capture-determinism-contract landing § 8.3.)

### 6.2 Plan-drafting new shifts surfaced

(FACT — per probe § 9 + charter § 11.2.)

| ID | Description |
|---|---|
| **N1 (plan-drafting)** | **FIRST cross-stack port sub-phase routing pattern.** Sub-phase plan-drafting for a SECONDARY-STACK sim implementation does not exist in the audit chain prior to this sub-phase. Every Phase-1 per-sim sub-phase implemented its sim on its PRIMARY stack with no cross-stack equivalence gate active. This sub-phase exercises gates 4-14 for the FIRST time at sim-test scale. **Banked precedent:** sub-phase plan-drafting for cross-stack ports inherits per-sim implementation template (agent-based) + adds cross-stack equivalence + port-directory-shape D-class question + sibling spec-sheet pattern. Subsequent Stack-D / Stack-E / Stack-C port sub-phases consume this pattern. |
| **N2 (plan-drafting)** | **Phase-2-plan § 2.5 SUPERSEDE-not-follow pattern exercised structurally.** Per D1=SUPERSEDE ratification at Taichi-integration close, phase-2-plan § 2.5's monolithic 10-stage dispatch shape consumed as REFERENCE not dispatch. Three load-bearing drifts (canonical descriptor 128sq-step2000 not 512sq-step1000; cross-stack tolerance 1e-4 not 1e-5; portfolio directory shape post-Phase-1 places sim packages under packages/ not continuous-ca/<sim>/) surfaced cleanly via probe § 6. **Banked precedent:** every subsequent Phase-2 cross-stack port sub-phase plan-drafting reads its corresponding phase-2-plan § 2.X stage data as reference, anchor-checks against HEAD per Convention M, and surfaces drifts as load-bearing structural questions at probe time. |
| **N3 (plan-drafting)** | **First per-sim sub-phase to ship cross-stack equivalence as gate-14 with a TRUE matching-sim pair.** Taichi-integration Stage 2 Step 2.9 invoked the equivalence harness against hello-taichi-cpu vs advection_1d — different-sim case; emitted `within_tolerance=False` as expected. RD-2D Stack-D port is the FIRST TRUE matching-sim cross-stack invocation; gate-14 acceptance is `within_tolerance=True` at `relative = 1e-4` over the canonical capture. **Banked precedent:** subsequent Phase-2 cross-stack port sub-phases inherit the gate-14 acceptance contract from this sub-phase's Stage 1c witness. |

### 6.3 Cumulative shift count at plan-drafting close

**107 + 3 = 110** entering Stage 0 dispatch.

## 7. Tag posture (plan-drafting close)

**No `-phase-N` tag** is proposed at plan-drafting close. Spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries; next phase tag per spec is `v0.2.0-phase-2`.

**No `v0.1.11` non-phase point-release tag at plan-drafting close** per Taichi-integration § 12 + capture-determinism-contract § 12 precedent (plan-drafting commits + landing audit + SHA back-fill commits provide the audit trail; no intermediate marker tag required at plan-drafting close — only candidate at Stage 2 close).

**Forbidden either way:** any tag carrying `-phase-N` (single or multi-segment). The agent does NOT push tags per conventions doc § D.2.

## 8. Next-stage recommendation (operator-routable)

**Recommended next stage: Stage 0 — Pre-flight.**

Dispatch a fresh Claude Code session against `docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md` § 7.1 (Stage 0 prompt) after operator routing of § 11.5 D1-D6 (charter) / § 5 (this audit). The Stage 0 prompt is dispatchable verbatim.

**Stage 0 acceptance:** Task 0.0 (replay PASS — 19th invocation) + Task 0.1 (tolerance-budget carryover) + Task 0.2 (Stack-B canonical capture sha256 reverify) + Task 0.3 (canonical-descriptor scope-analysis per § N) + Task 0.4 (empirical Taichi-DSL 2D kernel pattern validation) + Task 0.5 (MMS Stack-D-callable surface verification) + Stage 0 checkpoint commit + Convention #12 SHA back-fill.

**Operator decisions required BEFORE Stage 0 dispatch:**
- D1: sub-phase naming (lean: `sub-phase-reaction-diffusion-2d-stack-d`; charter and audit artifacts already use this).
- D2: Stage 1 decomposition (lean: 1a/1b/1c).
- D3: tolerance value (lean: 1e-4 per HEAD; corrects dispatch contract's stale 1e-5).
- D4: step-horizon (lean: full step-2000).
- D5: banked items (lean: partial scope-in for cross-stack methodology).
- D6 (NEW): port directory shape (lean: `packages/reaction-diffusion-2d-stack-d/`).

**If operator routes alternatives to D1 / D6:** the charter file path + audit dir name + commit slug + workspace member name require updating BEFORE Stage 0 dispatch (mechanical renames).

**If operator routes alternative to D2 / D3 / D4 / D5:** Stage 1 prompts at charter § 7.2 / § 7.3 / § 7.4 require adjustment to reflect the routed decision; sub-stage boundaries and acceptance criteria update accordingly.

## 9. Phase coherence note (per charter § 11)

The reaction-diffusion-2d → Stack-D port sub-phase plan-drafting exercises the **first per-sim cross-stack port sub-phase plan-drafting under spec-Phase-2**. Per-area coherence:

- **THIRD spec-Phase-2 sub-phase, FIRST per-sim cross-stack port.** Predecessors at Phase-2 (Taichi-integration, capture-determinism-contract) were infrastructure-only; this sub-phase is the first to engage gates 4-14 at sim-test scale.
- **Mirrors `sub-phase-agent-based.md` shape** at the per-sim implementation template level; adapted for cross-stack port shape with new § 1.4.1 (Stack-D determinism strategy) + § 1.4.2 (cross-stack equivalence posture) + § 1.4.3 (MMS posture) + § 1.4.4 (pattern reproduction) + § 1.4.5 (Taichi-specific risks).
- **Operator-routed at D1-D6 surface** is the load-bearing dispatch context; charter's leans are the structural defaults but NOT pre-committed.
- **IC-13 + IC-14 first per-sim consumers** (capture-determinism-contract delivered these; this sub-phase is the FIRST per-sim sub-phase to consume them at sim-test scale).
- **IC-11 + IC-12 first per-sim consumers** at production scale (Taichi-integration's hello_taichi.py was smoke-tier; this sub-phase's RD-2D port is the first production-tier Stack-D consumer).
- **Bit-identity replay invariant** `9399fc33…909f34` preserved (18 invocations entering; Stage 0 Task 0.0 = 19th).
- **IC-15 (per-sim cross-stack-port spec-sheet template)** established as new IC for downstream consumption.
- **Three load-bearing drifts surfaced and dispositioned** without re-litigating the phase-2-plan or amending it (D1=SUPERSEDE ratification consumed). HEAD wins at all three drift sites; charter reflects HEAD.
- **D6 (port directory shape)** is a NEW D-class question surfaced by drift analysis — did not exist in the dispatch contract's D1-D5 preview. Honest surfacing per Hard Rule 2.
- **Cross-stack verification methodology (banked from capture-determinism-contract close + Taichi-integration § 9 row 4)** SCOPED IN PARTIALLY — equivalence.md at Stage 1c consolidates the harness invocation pattern + tolerance routing + step-horizon documentation discipline.
- **3 new banked precedents** (N1 first cross-stack port routing; N2 SUPERSEDE-not-follow exercised structurally; N3 first true matching-sim cross-stack invocation) carry forward to subsequent Phase-2 cross-stack port sub-phases.
- **Plan-drafting scope kept tight**: no implementation work; no edits outside the new charter file + new audit files; no spec amendments; no conventions-doc amendments; no tolerance-budget widening.

**Plan-drafting outputs available for downstream consumption:**

- `docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md` (charter; § 4 stage decomposition; § 7 agent prompts; § 9 R-class entries + P27 playbook): Stage 0 dispatchable verbatim.
- `docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md`: anchor source-of-truth for Phase-0 Stack-B baseline + Taichi-integration infrastructure + IC-13/14 surfaces + MMS pipeline + equivalence harness state; consumed by every subsequent stage's re-anchor work.
- This landing audit: D1-D6 verdicts at plan-drafting close (operator routes at Stage 0 dispatch).

---

This audit lands at HEAD `bb10a7521ccf86aad51e1d629a3a5a734980f4bc` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(reaction-diffusion-2d-stack-d-plan-drafting-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED**.
