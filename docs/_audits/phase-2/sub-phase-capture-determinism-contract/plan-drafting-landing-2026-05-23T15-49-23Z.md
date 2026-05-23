---
date: 2026-05-23T15-49-23Z
author: capture-determinism-contract-sub-phase-plan-drafting-agent
phase: 2
artifact: sub-phase
artifact_id: sub-phase-capture-determinism-contract-plan-drafting
subject: "Capture-determinism-contract sub-phase plan-drafting landing — probe ratified + charter ratified + D1-D5 surfaced for operator routing; SECOND spec-Phase-2 sub-phase plan-drafting deliverable; portfolio-wide contract-redesign shape; cumulative shift count 99 entering, +3 plan-drafting → 102 entering Stage 0"
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER-BACK-FILLED-PER-CONVENTION-12>
head_sha_at_checkpoint: <PLACEHOLDER-BACK-FILLED-PER-CONVENTION-12>
parent_audits:
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-2026-05-23T15-37-24Z.md
evidence_paths:
  - docs/phases/sub-phase-capture-determinism-contract.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-2026-05-23T15-37-24Z.md
  - docs/conventions/sub-phase-conventions.md
evidence_hashes:
  docs/phases/sub-phase-capture-determinism-contract.md: sha256:e817616134a720508d8885d98dfb1d0f6885b50bcb244ee80001b986d9b1f28f
  docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-2026-05-23T15-37-24Z.md: sha256:5c3649d009899604fe3edd06784dabbc99c3ca6b20020fbc9e04815d4f4b85b8
  docs/conventions/sub-phase-conventions.md: sha256:3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
---

# Capture-Determinism-Contract Sub-Phase — Plan-Drafting Landing Audit

## 1. Plan-drafting scope summary

(FACT — plan-drafting probe + charter authored against HEAD `412b1b90b21957ecf3c07db690e8c64ab24386f1` and committed at probe `44941c2` + charter `8fe770c`; this landing audit lands at the landing-audit commit SHA back-filled per Convention #12.)

**SECOND spec-Phase-2 sub-phase, plan-drafting deliverable**. Portfolio-wide contract-redesign sub-phase mirroring `sub-phase-conventions-refactor-post-phase-1` shape, adapted from doc-refactor to contract-redesign surface. The deliverable closes:

- The structural-correctness gap surfaced by the hello-physics.test.ts CI failure post-Taichi-integration push to main (HDF5 OHDR mtime + h5wasm 0.10.1's missing `H5Pset_obj_track_times` binding).
- The latent same-class flake at 2 additional VULNERABLE tests (LBM `_sha256_of_file` + MPM `_sha256_of_file`).
- The implicit ambiguity in spec § 2.5 between raw-file byte-equality and content-projection equality.

This plan-drafting is the **first** to:

- **Surface a CI-fan-out-discovered structural-correctness routing override** at spec-Phase-2 entry (probe § 9 N1). The Taichi-integration landing § 10 next-sub-phase recommendation (RD-2D → Stack-D port) is SUPERSEDED in favor of this contract-redesign sub-phase, which is structurally upstream.
- **Re-derive a diagnostic-only session's findings** at HEAD when no committed written report exists (probe § 9 N2; § 4.4 attribution).
- **Apply the portfolio-wide consolidation template** at a CONTRACT-REDESIGN deliverable (rather than the doc-refactor application at conventions-refactor; probe § 9 N3).
- **Identify D5 as NOT a blocking dependency** at probe time (conventions doc § F.3 + § A.2 + § B sweep-template addendum amendments confirmed additive per conventions-doc-is-editable posture established at conventions-consolidation + conventions-refactor precedents).

## 2. Plan-drafting deliverables — final-status table

(FACT — both deliverables landed at this plan-drafting session.)

| # | Deliverable | Status | Closing evidence sha256 |
|---|---|---|---|
| 1 | Plan-drafting probe report at `docs/_audits/phase-2/sub-phase-capture-determinism-contract/plan-drafting-probe-2026-05-23T15-37-24Z.md` | **GREEN** | `5c3649d009899604fe3edd06784dabbc99c3ca6b20020fbc9e04815d4f4b85b8` (commit `44941c2`) |
| 2 | Sub-phase charter at `docs/phases/sub-phase-capture-determinism-contract.md` | **GREEN** | `e817616134a720508d8885d98dfb1d0f6885b50bcb244ee80001b986d9b1f28f` (commit `8fe770c`) |
| 3 | This landing audit + Convention #12 SHA back-fill | **PENDING** (this commit + next back-fill commit) | (back-filled) |

## 3. Plan-drafting convergence commits

(FACT — `git log --oneline 412b1b9..HEAD` at this audit's authoring time.)

| # | SHA | Subject | Stage |
|---|---|---|---|
| 1 | `44941c2` | `chore(capture-determinism-contract-plan-drafting-probe)` | Plan-drafting |
| 2 | `8fe770c` | `docs(sub-phase-capture-determinism-contract)` (charter) | Plan-drafting |
| 3 | `(this commit)` | `chore(capture-determinism-contract-plan-drafting-landing-audit)` | Plan-drafting |
| 4 | `(back-fill commit)` | `chore(capture-determinism-contract-plan-drafting-sha-backfill)` | Plan-drafting |

**4 total plan-drafting commits** (parallels Taichi-integration plan-drafting chain at `7b21ee2` / `9f5c80f` / `185401b` / `75fb99a`).

## 4. Closing-commit anchor re-check

(FACT — verified at this audit's authoring time.)

| Anchor | Value | Status |
|---|---|---|
| Conventions doc sha256 | `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734` | **VERIFIED at HEAD; matches conventions-refactor landing § 3.2 baseline. Locked.** |
| Cumulative shifts entering plan-drafting | 99 (Taichi-integration § 8.4) | inherited; not re-litigated |
| Bit-identity replay invariant | `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` | 17 invocations (Taichi-integration § 11); next invocation at this sub-phase's Stage 0 Task 0.0 = 18th |
| Probe report sha256 | `5c3649d0…f4b85b8` | matches commit `44941c2` |
| Charter sha256 | `e8176161…b1f28f` | matches commit `8fe770c` |
| `tolerance-budget.toml [phase].phase` | `"sub-phase-taichi-integration"` (Taichi-integration Stage 0 carryover; this sub-phase has not yet executed Stage 0) | unchanged at plan-drafting close; Stage 0 Task 0.1 will bump to `"sub-phase-capture-determinism-contract"` |

**No drift surfaced.** All anchors match recordings across probe + charter + parent landing audits.

## 5. D1-D5 verdicts (operator-routable — surfaced at plan-drafting close, NOT pre-committed)

(FACT — derived from probe § 8 verbatim; charter § 11.5 reproduces verbatim.)

### 5.1 D1 — Stage 1 monolithic vs decomposed

- **Probe lean:** monolithic Stage 1. Probability-weighted 70% ships cleanly at the +428/-109 estimated diff size; 30% engages D1-decomposition fallback.
- **Alternative:** Stage 1a (harness build + source-level fixes) → Stage 1b (per-test refactor + spec amendment) → Stage 1c (CI gate redesign + convergence). Each sub-stage carries its own checkpoint commit + SHA back-fill.
- **Downstream impact:** monolithic → 8-9 total commits to land; decomposed → 12-14 total commits.

### 5.2 D2 — Spec § 2.5 amendment wording

- **Probe lean:** D2-c (project-onto-Capture wording).
- **Alternatives:** D2-a (narrow); D2-b (mechanism-explicit). Full wordings at probe § 5.1.
- **D2-sub:** capture-v1.json `payload.checksum` semantics.
  - **Probe lean:** keep `payload.checksum` as raw-file sha256 + ADD description note that it is informational + contract lives at harness.
  - **Alternative:** add sibling `content_checksum` field at schema v1.1.0 (additive bump; coordination cost with WU-A).
- **Downstream impact:** operator-routed wording is the literal text Stage 1 commits to spec § 2.5.

### 5.3 D3 — Per-sim determinism-declaration refactor scope

- **Probe verdict:** **0 declarations need amendment** (probe § 8.3). No `determinism.md` files exist in any of the 9 sim packages; declarations live in `<sim>/sim.py` module docstrings and declare POSTURE not MECHANISM.
- **Alternative:** if operator wants to harmonize the LBM + MPM sim.py docstring wording about "byte-identical HDF5 payloads" with the new contract, that is +2 docstring-line edits during Stage 1 STEP 6/7. Operator routes.
- **Downstream impact:** if operator picks inline-docstring-update, +2 lines added to Stage 1; if banked, no change.

### 5.4 D4 — CI gate redesign — strict-fanout vs phased

- **Probe lean:** strict-fanout (single Stage 1 commit extends both Python-strict + ts-strict workflows).
- **Alternative:** phased (Python-strict first, ts-strict second across two sub-phases).
- **Downstream impact:** strict-fanout ships in this sub-phase's Stage 1; phased adds another sub-phase.

### 5.5 D5 — Conventions doc amendment necessity

- **Probe verdict:** **NO blocking dependency** on a conventions-refactor-v2 sub-phase. § F.3 + § A.2 + § B sweep-template addendum amendments are additive per conventions-doc-is-editable posture (conventions-consolidation `34c7d34` + conventions-refactor `e2dc789` precedents).
- **Alternative:** if operator decides the amendment surface warrants its own sub-phase, bank for conventions-refactor-v2.
- **Downstream impact:** inline ship adds ~+15/-5 lines to Stage 1; banked path adds another sub-phase + delays this one.

**Operator-routable summary table:**

| Decision | Probe lean | Alternative | Pre-committed? |
|---|---|---|---|
| D1 (Stage 1 shape) | Monolithic | Stage 1a/1b/1c | NO |
| D2 (§ 2.5 wording) | D2-c (project-onto-Capture) | D2-a / D2-b | NO |
| D2-sub (capture-v1.json checksum) | Keep raw-file + description note | Sibling `content_checksum` field | NO |
| D3 (per-sim declaration refactor count) | 0 (verdict) | +2 docstring-line update (LBM + MPM) | NO |
| D4 (CI gate redesign) | Strict-fanout (Python + TS in same Stage 1) | Phased (Python first, TS second) | NO |
| D5 (conventions doc amendment) | Inline (additive; verdict: NO blocking dep) | Bank for conventions-refactor-v2 | NO |

## 6. Inherited shifts + plan-drafting shifts

### 6.1 Inherited (99 cumulative entering plan-drafting)

(FACT — Taichi-integration landing § 8.4.)

89 from Phase 1 baseline + 7 per-sim sub-phases + 1 conventions-refactor (per conventions-refactor landing § 8.3) + 3 Taichi-integration plan-drafting + 1 Taichi-integration Stage 0 (RETROACTIVELY RESOLVED; does not subtract) + 4 Taichi-integration Stage 1 + 2 Taichi-integration Stage 2 = **99**.

### 6.2 New shifts surfaced during plan-drafting (3)

| ID | Description |
|---|---|
| **N1** | **CI-fan-out-discovered structural-correctness routing override.** First instance of routing a NEW sub-phase ahead of a parent's previously-recommended next sub-phase because CI fan-out from the parent's push to main surfaced a structurally-upstream gap. Pattern: parent sub-phase lands clean (Taichi-integration CONFIRMED at `cf7d553`); push to main triggers CI on previously-untouched gate (ts-strict on hello-physics.test.ts); CI failure surfaces structural-correctness gap; the gap routes a new sub-phase ahead of the parent's § 10 recommendation. Banked precedent for any future fan-out-discovered override. |
| **N2** | **Diagnostic-only session → plan-drafting agent re-derivation discipline.** When a pre-plan-drafting diagnostic chat session produces findings but commits no written report, the plan-drafting agent re-derives the empirical claims at HEAD (probe § 4.3 boundary-delay probe re-derivation; probe § 4.1 h5wasm strings(1) re-verification) and preserves attribution to the originating diagnostic session (probe § 10) without claiming originality. First instance at this sub-phase. Surfaces two corrections to the originating diagnosis (mtime byte-order; h5wasm cwrap surface framing) that sharpen the structural narrative without invalidating the fix scope. |
| **N3** | **Portfolio-wide contract-redesign sub-phase shape.** First instance of the portfolio-wide consolidation template applied to a CONTRACT-REDESIGN deliverable (cf. conventions-refactor's portfolio-wide DOC-REDESIGN application). Establishes the four-phase shape: (i) probe-inventory-of-affected-tests/declarations/clauses first; (ii) design-the-canonical-replacement second; (iii) refactor-consumers third; (iv) amend-spec/conventions/schema fourth. Banked precedent for any future portfolio-wide contract-redesign sub-phase. |

### 6.3 Cumulative shift count at plan-drafting close

**99 + 3 = 102** entering Stage 0.

## 7. Banked items final-state table

(FACT — per charter § 11.2 D2 disposition table.)

| # | Item | Disposition at this plan-drafting close |
|---|---|---|
| 1 | Testing-improvements sub-phase | **DEFER** — separate routing per Taichi-integration § 9 row 1 |
| 2 | common-py adoption | **RESOLVED at Taichi-integration close** (Stage 1; commit `c2900c3`) |
| 3 | Taichi-integration | **RESOLVED at Taichi-integration close** (commit `cf7d553`) |
| 4 | Cross-stack verification methodology | **DEFER** — first Stack-C↔Stack-D port sub-phase per Taichi-integration § 9 row 4 |
| 5 | evidence_paths LFS remediation (per § B.6) | **DEFER** — focused infrastructure hotfix; bundle candidate with banked item 7 |
| 6 | Mid-Phase-1 capture regeneration | **DEFER** — per-sim work per Taichi-integration § 9 row 6 |
| 7 | conventions doc § B.6 addendum — empty-file rejection drift mode (Taichi N6) | **DEFER** — bundle candidate with banked item 5 |
| 8 | Taichi smoke kernel patterns as exemplars for first Stack-D port | **CONSUMED at NEXT sub-phase (RD-2D → Stack-D port)** — not this sub-phase |

**This sub-phase consumes NO previously banked items.** It is a structurally-upstream contract redesign that surfaced via CI fan-out from Taichi-integration's push to main.

**Newly banked at this plan-drafting close:** none beyond the 3 N-shifts at § 6.2.

## 8. Next-sub-phase reordering (operator-routable)

(FACT — per Taichi-integration landing § 10 + this sub-phase's existence superseding that recommendation.)

The pre-this-sub-phase recommended next sub-phase (per Taichi-integration § 10) was **reaction-diffusion-2d → Stack D** (spec item 2.1.D). This recommendation is **NOT canceled** — it is **REORDERED to "next after this sub-phase lands"**.

| Order | Sub-phase | Status | Reason |
|---|---|---|---|
| 1 (current) | sub-phase-capture-determinism-contract | **plan-drafting CONFIRMED** (this audit); Stage 0 dispatchable | Structurally upstream of all Stack-D port work |
| 2 (next) | sub-phase-reaction-diffusion-2d-stack-d-port | banked per Taichi-integration § 10 | Smallest-scope Stack-D port; established lean |
| 3-5 | sub-phase-{sph-water, eulerian-smoke, lattice-boltzmann-d3q19}-stack-d-port | banked | Subsequent Stack-D ports per Taichi-integration § 10 table |

**Optional operator-routable interjection:** the focused infrastructure hotfix bundling banked items 5 + 7 (evidence_paths LFS + empty-file rejection drift mode) could land BETWEEN sub-phase #1 (this) and sub-phase #2 (RD-2D Stack-D port). Not blocking either way.

## 9. Phase coherence note (per charter § 11)

The capture-determinism-contract sub-phase plan-drafting exercises the portfolio-wide consolidation template at a **contract-redesign deliverable** for the first time. Per-area coherence:

- **SECOND spec-Phase-2 sub-phase.** First post-Taichi-integration sub-phase. CI fan-out from Taichi-integration's push to main surfaced the structural-correctness gap this sub-phase closes (probe § 9 N1).
- **Mirrors sub-phase-conventions-refactor-post-phase-1 shape** (portfolio-wide consolidation; doc-only refactor pattern adapted to contract-redesign surface). 14-row deliverable scope vs conventions-refactor's 8-row scope reflects the broader contract surface (harness + tests + spec + conventions + schema + CI workflows + 2 source-level fixes).
- **D5 verdict at plan-drafting close: NO blocking dependency.** Conventions doc amendments are additive per established posture.
- **99 cumulative shifts entering plan-drafting; +3 plan-drafting shifts → 102 entering Stage 0.**
- **18th invocation of bit-identity replay invariant** scheduled at Stage 0 Task 0.0.
- **3 VULNERABLE tests** identified for refactor; 7 IMMUNE tests confirmed unchanged. **2 sims (LBM + MPM)** affected; 7 sims unchanged.
- **0 per-sim determinism.md files exist** (D3 verdict count = 0); declarations live in sim.py docstrings and are mechanism-agnostic.
- **Phase 4 WU-A round-trip claim consistency verified** (probe § 6); no WU-A amendment required.

## 10. Tag posture

**No `-phase-N` tag** is proposed by this sub-phase plan-drafting. Spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries.

**No `v0.1.10` non-phase point-release tag at plan-drafting close** — plan-drafting is itself a sub-phase artifact, NOT a sub-phase boundary. Tag posture re-evaluated at Stage 2 close per conventions-refactor § 11 + Taichi-integration § 12 precedent (lean: no intermediate tag).

**Forbidden either way:** any tag carrying `-phase-N` (single or multi-segment). The agent does NOT push tags per conventions doc § D.2.

---

This audit lands at HEAD `<PLACEHOLDER-BACK-FILLED-PER-CONVENTION-12>` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(capture-determinism-contract-plan-drafting-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time per the tightened § B.2 step 3 discipline).

Verdict: **CONFIRMED**. Stage 0 dispatchable after operator routing of D1-D5 per § 5.
