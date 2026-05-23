---
date: 2026-05-23T13-41-01Z
author: taichi-integration-plan-drafting-agent
phase: 2
artifact: sub-phase
artifact_id: sub-phase-taichi-integration-plan-drafting
subject: "Plan-drafting landing audit for Taichi-integration sub-phase — FIRST spec-Phase-2 deliverable; charter at docs/phases/sub-phase-taichi-integration.md; D1/D2/D3 operator routings surfaced; subsequent stages dispatchable separately"
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER-BACKFILL-PER-CONVENTION-12>
head_sha_at_checkpoint: <PLACEHOLDER-BACKFILL-PER-CONVENTION-12>
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md
  - docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-probe-2026-05-23T13-41-01Z.md
evidence_paths:
  - docs/phases/sub-phase-taichi-integration.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-probe-2026-05-23T13-41-01Z.md
  - docs/conventions/sub-phase-conventions.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
---

# Taichi-Integration Plan-Drafting Sub-Phase — Landing Audit

## 1. Sub-phase scope summary

(FACT — `docs/phases/sub-phase-taichi-integration.md` committed at the charter-commit immediately preceding this audit; operator routed plan-drafting via the dispatch prompt at HEAD `e2d6cb5b0a2894d736f90b319a839101ad4a4158`.)

**Plan-drafting sub-phase** establishing the charter for the spec-Phase-2 entry Taichi-integration sub-phase. Mirrors the structural-discipline pattern of conventions-refactor-post-phase-1's plan-drafting + Phase-1 per-sim sub-phase plan-drafting precedents (closed-form / agent-based / RD-3D / sph-water — each plan-drafted before Stage 0 dispatch per conventions doc § A.4).

This sub-phase is the **first** to:

- **Land a spec-Phase-2 deliverable.** First charter authored under spec-Phase-2 scope; first audit dir created under `docs/_audits/phase-2/`.
- **Surface D1 — Phase-2-plan supersession vs precursor routing.** The existing `docs/phases/phase-2-cross-stack-replication.md` (3084-line monolithic 10-stage single-coordinator plan) conflicts with the established per-sub-phase pattern (conventions doc § A.4); D1 routes whether to supersede or treat as precursor.
- **Surface D2 — banked-item disposition for the six items entering spec-Phase-2** (per conventions-refactor landing § 9.2). Charter § 11.2 dispatches: testing-improvements DEFER, common-py SCOPED IN, Taichi-integration THIS, cross-stack methodology DEFER, evidence_paths-LFS DEFER, mid-Phase-1 regen DEFER.
- **Surface D3 — spec-Phase-2 replay-chain anchor decision.** Mechanically constrained by resolver regex `^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$` at `tools/integrity/integrity/scripts/replay_prior_phase.py:45` — only `v0.1.0-phase-1` is resolvable at HEAD (charter lean: continue replaying against `v0.1.0-phase-1`; bit-identity invariant `9399fc33…909f34` extends to 17+ invocations).
- **Establish IC-11 (Taichi init wrapper) + IC-12 (Taichi convention doc) ICs** as the post-Phase-1 IC numbering convention.

## 2. Plan-drafting deliverable summary (commits — see § 4)

(FACT — `git log` at this audit's HEAD will show three load-bearing commits + this audit's closing commit + one SHA back-fill commit.)

| Artifact | Path | Role |
|---|---|---|
| Plan-drafting probe report | `docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-probe-2026-05-23T13-41-01Z.md` | Anchor-source synthesis; per-source reads documented; HEAD-state grep evidence; D1/D2/D3 surface preview |
| Charter | `docs/phases/sub-phase-taichi-integration.md` | The sub-phase plan; structurally inherits sub-phase-agent-based.md template adapted to focused-infrastructure shape per numba-integration landing precedent |
| Plan-drafting landing audit | `docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-landing-2026-05-23T13-41-01Z.md` | This document; verdict-state CONFIRMED |
| SHA back-fill | (separate follow-up commit) | Convention #12 SHA back-fill on this audit's `head_sha:` per § B.2 tightened-discipline rule |

## 3. Convention compliance — plan-drafting scope

(FACT — per-convention self-audit; Convention #8 forbids asserting compliance without verification.)

| Convention | Status | Evidence |
|---|---|---|
| **Convention M** (re-anchor before edit) | YES | Plan-drafting probe § 2.1–§ 2.8 re-anchors each anchor source by direct read + grep verification at HEAD `e2d6cb5b…ad4a4158` |
| **Convention #8** (never assert from memory) | YES | Every concrete path / SHA / sha256 / line number cited in probe + charter is FACT-tagged with verbatim source location |
| **Convention C** (probe API surfaces before drafting) | YES | Probe § 2.7 grep-verifies common-py surfaces + taichi mentions across `packages/` / `tools/` / `common/` |
| **Convention D** (probe call sites before drafting) | YES | Probe § 2.7 enumerates actual common_py consumers at HEAD (zero in packages/ or tools/; 4 in common/common-py/tests/ + 1 in smoke) |
| **Convention A** (new-files-first commit decomposition) | YES | Commit chain (§ 4): probe report → charter → landing audit → SHA back-fill — every artifact is a new file; no edits to pre-existing files |
| **Convention #12** (no `--amend`; SHA back-fill separate commit) | YES | This audit's `head_sha:` is placeholder; back-fill in a separate follow-up commit per § B.2 tightened-discipline (full 40-hex via `git rev-parse HEAD` at summary-composition time) |
| **Hard Rule 2** (STOP and SURFACE on structurally-wrong findings) | YES | Three cross-doc inconsistencies surfaced via D1 / D2 / D3 routings; no autonomous decisions on operator-routable surfaces; no papering-over |
| **FACT / INFERENCE / SHIFTED tagging** | YES | Charter + probe + this audit consistently tag |
| **Conventions doc sha256 verify** (3698d19b…2bd734) | YES | Probe § 2.1 verified via `sha256sum docs/conventions/sub-phase-conventions.md` at HEAD |
| **Bit-identity invariant** (9399fc33…909f34) | N/A at plan-drafting | Stage 0 Task 0.0 (when dispatched) is the 17th invocation; this audit does not replay |

## 4. Commit chain

(FACT — `git log` at this audit's HEAD; commit ordering per Convention A new-files-first.)

| # | Type / scope | Subject | Purpose |
|---|---|---|---|
| 1 | `chore(taichi-integration-plan-drafting-probe)` | plan-drafting probe report committed | Anchor-source synthesis; new file |
| 2 | `docs(sub-phase-taichi-integration)` | initial draft of Taichi-integration sub-phase charter | Charter committed; new file |
| 3 | `chore(taichi-integration-plan-drafting-landing-audit)` | plan-drafting landing audit (CONFIRMED) — first spec-Phase-2 deliverable | This audit body (landing-audit closing commit) |
| 4 | `chore(taichi-integration-plan-drafting-sha-backfill)` | back-fill landing audit SHA per Convention #12 | Convention #12 SHA back-fill on this audit's `head_sha` per § B.2 tightened-discipline — full 40-hex via `git rev-parse HEAD` at summary-composition time |

No additional convergence work outside the audit + charter + probe — plan-drafting scope is bounded by charter + audit chain. No CHANGELOG entry (no implementation surface); no Cat 3 work; no `_SUBDIRS_PICKED_UP` extension; no mutation-runner additions; no convention doc edits.

## 5. Closing-commit anchor re-check (Stage 2 equivalent — Step 2.1)

(FACT — `git log --oneline e2d6cb5..HEAD` at audit close.)

| Anchor | Pre-plan-drafting | Post-plan-drafting | Status |
|---|---|---|---|
| Conventions doc sha256 | `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734` | (unchanged) | append-only protected per § B.1 |
| All 9 sims' Phase 1 RED evidence sha256s | (MPM landing § 6.2 baseline) | (unchanged) | append-only protected per § B.1 |
| `tools/testkit/equivalence/tolerance-budget.toml` `[phase].phase` | `"sub-phase-conventions-refactor-post-phase-1"` | (unchanged) | plan-drafting does NOT carry over (next sub-phase's Stage 0 Task 0.1 owns) |
| Workspace members | (13 entries; common-py absent) | (unchanged) | plan-drafting ships no edit; Stage 1 of Taichi-integration owns |
| Taichi declaration | (`[taichi]` optional extra at common-py only) | (unchanged) | plan-drafting ships no edit; Stage 1 owns |
| LFS-tracked captures | (sealed at respective per-sim landings) | (unchanged) | LFS pointer-vs-content posture per § B.6 |

## 6. Regression / failing-tests sweep — NO-OP

This plan-drafting sub-phase ships no code or test changes. No regression sweep required at plan-drafting scope (precedent: every prior per-sim sub-phase plan-drafting was similarly NO-OP for regression; the implementation Stage 1 owns the regression-sweep responsibility).

Stage 0 Task 0.2 of the dispatched Taichi-integration sub-phase will execute the mass 9-sim RED evidence sha256 reverify against MPM landing § 6.2 baseline.

## 7. Integrity check results — NO-OP

Plan-drafting introduces no Cat 1 / 2 / 3 / 4 / 5 / X surface changes. Aspirational target for the dispatched sub-phase's Stage 2 Step 2.4: bit-identical to MPM-landing § 7.2 sha256 `810cd6e3cac165df11ab166f0b4cc08cdf33b5c3d40240855f176ff123411f98` (conventions-refactor § 7.2 + § 8.2 N4 byte-identical pattern is the structural-correctness gold-standard for additive sub-phases).

## 8. SHIFTED register

### 8.1 Inherited from prior audits (89 shifts going into spec-Phase-2)

(FACT — conventions-refactor landing § 8.3 / § 9.3 row 5; arithmetic 21+11+10+6+13+8+9+7+4=89 verified at probe § 6.)

- 21 from Phase 1 baseline (conventions doc § M.1).
- 11 from closed-form sub-phase (§ M.2).
- 10 from agent-based sub-phase (§ M.3).
- 6 from continuous-CA-rd3d sub-phase (§ M.4).
- 13 from particle-fluids-sph-water sub-phase (§ M.5).
- 8 from eulerian-smoke.
- 9 from lattice-boltzmann-d3q19.
- 7 from mpm-multimaterial.
- 4 from conventions-refactor-post-phase-1.

### 8.2 New shifts surfaced during plan-drafting

(FACT — per-shift cross-reference.)

| ID | Description |
|---|---|
| **N1** | **Plan-drafting sub-phase shape for spec-Phase-2.** Taichi-integration is the first spec-Phase-2 deliverable that plan-drafts in advance of dispatch (Phase 1 per-sim sub-phases all plan-drafted in advance per conventions doc § A.4; hotfix sub-phases like numba-integration were spawned-from-parent-R-class without per-sub-phase plan doc). This sub-phase establishes the plan-drafting precedent for spec-Phase-2 sub-phases — every subsequent spec-Phase-2 sub-phase (D1 routing pending) follows the same shape: probe + charter + plan-drafting landing audit + SHA back-fill before Stage 0 dispatch. |
| **N2** | **Post-Phase-1 IC numbering convention.** Phase 1 charter § 3.9 catalogued IC-1 through IC-10. Post-Phase-1 ICs are numbered IC-11+ per the same convention; this sub-phase's charter § 3.2 establishes IC-11 (Taichi init wrapper) + IC-12 (Taichi convention doc) and documents the numbering convention explicitly. Future spec-Phase-2 sub-phases consume the convention. |
| **N3** | **`docs/_audits/phase-2/` audit dir created.** First sub-phase audit dir under `docs/_audits/phase-2/`; mirrors `docs/_audits/phase-1/` structure (sub-phase-named children + sibling hotfix dirs). The dir creation lands as part of this plan-drafting commit chain (commit #1 probe report). |

### 8.3 Cumulative shift count after this sub-phase

**89 + 3 = 92** shifts entering Stage 0 dispatch of the Taichi-integration implementation phase. (Charter notes expected post-plan-drafting count was 89 with zero new shifts; the 3 surfaced here are minor precedent-establishing shifts, not corrections — within the historical envelope of plan-drafting sub-phases.)

The cumulative-shift count stabilises at **92 entering Taichi-integration Stage 0 dispatch**.

## 9. Operator routings surfaced (D1 / D2 / D3)

### 9.1 D1 — Phase-2-plan supersession vs precursor

**Question:** Is `docs/phases/phase-2-cross-stack-replication.md` (3084-line 10-stage monolithic single-coordinator plan, drafted pre-sub-phase-pattern) SUPERSEDED by per-sub-phase decomposition matching the Phase-1 sub-phase pattern, OR is Taichi-integration a PRECURSOR sub-phase that the existing plan's subsequent stages then consume wholesale?

**Lean (recommend, do NOT decide here):** **SUPERSEDE the existing plan's 10-stage monolithic structure with per-sub-phase decomposition matching the Phase-1 pattern.** Rationale (charter § 11.5 + probe § 5 D1):

1. Phase-1 evidence is overwhelmingly in favor of single-session-per-sim discipline. Every per-sim sub-phase that attempted multi-sim Stage 1 surfaced R-class STOP-AND-SURFACE arcs (sph-water R12-R20 alone produced 5 surfaces + spawned the numba-integration hotfix). Conventions doc § A.3 makes "one Claude Code agent at a time" load-bearing discipline.
2. Existing plan's § 1.5.1 fourteen-gate criteria, § 1.5.2 six-W-Gate Stage 0 common-warp criteria, § 1.9 architecture sockets, § 1.7 report-back format are useful as REFERENCE material for per-sub-phase plan-drafting, but the single-coordinator monolithic dispatch shape (§ 1.4.0 + § 2.1) conflicts with conventions discipline.
3. Sub-phase decomposition is consistent with the operator's actual Phase-1 dispatch pattern (each per-sim sub-phase got its own coordinator chat + Claude Code session + plan doc).

**Alternative (precursor only):** Treat Taichi-integration as the precursor that resolves common-py adoption + Taichi wiring; dispatch the existing plan's Stages 2/3/4/6 wholesale after this lands. Risk: surfaces the same multi-stage-monolithic-dispatch failure mode the Phase-1 evidence already demonstrated.

**Downstream effects of D1=SUPERSEDE:**
- Each of RD-2D→Stack-D / SPH→Stack-D / eulerian-smoke→Stack-D / LBM→Stack-D becomes its own sub-phase under `docs/phases/sub-phase-<sim>-stack-d.md`, dispatched separately after Taichi-integration lands.
- Existing plan retained as reference (or operator-routable for separate amendment / supersession audit; the amendment is itself a Phase-2-plan-revision sub-phase, mirroring the conventions-refactor-post-phase-1 sub-phase shape).
- Stack-E common-warp + Stack-E ports become their own decomposition track (out of Taichi-integration scope; surfaced for future operator routing).
- Phase 4 differentiable-Taichi variants (spec § 11.5) inherit Taichi-integration's common-py + DiffTaichi substrate through this clean per-sub-phase audit chain.

**Downstream effects of D1=PRECURSOR-ONLY:**
- Existing plan's Stages 2/3/4/6/etc. dispatch wholesale once Taichi-integration lands.
- Risk: monolithic-dispatch failure mode per Phase-1 evidence.
- Existing plan untouched; complexity of cross-stage dependency tracking falls on a single coordinator chat.

**Charter posture:** Charter does NOT pre-commit either; surfaces D1 to operator at § 11.5. Charter scope is bounded to Taichi-integration itself.

### 9.2 D2 — Banked-item disposition

Per charter § 11.2 + probe § 5 D2, the six items entering spec-Phase-2 from conventions-refactor landing § 9.2 split as follows:

| # | Item | Disposition | Rationale |
|---|---|---|---|
| 1 | Testing-improvements sub-phase | **DEFER — operator separate routing** | Not Taichi-shaped; banked-chat owner |
| 2 | `common-py` adoption decision | **SCOPED IN to Taichi-integration** | Natural surface; coupling common-py wiring + Taichi wiring is single-coherent-dispatch |
| 3 | Taichi-integration sub-phase | **THIS sub-phase** | Resolved by existence of this charter |
| 4 | Cross-stack verification methodology | **DEFER — first Stack-C-to-Stack-D port sub-phase** | Methodology consolidates after second cross-stack pair lands |
| 5 | evidence_paths strict-verify remediation (LFS) | **DEFER — operator separate routing** | Two infrastructure hotfixes in series risks coupling |
| 6 | Mid-Phase-1 capture regeneration | **DEFER** | Per-sim work; out of infrastructure scope |

Plus rows 7–9 (test-augmentation candidates / B-hotfix-1-2 / B2-B16 Phase-1 open): default-skip per row labels.

**Charter posture:** § 11.2 documents this table verbatim; operator routes at landing-audit close if disposition needs amendment.

### 9.3 D3 — spec-Phase-2 replay-chain anchor

**Constraint** (FACT — probe § 2.8 + replay resolver regex at `tools/integrity/integrity/scripts/replay_prior_phase.py:43-45`):

```python
_PHASE_HANDLE_RE = re.compile(r"^phase-(\d+)$")
_SEMVER_PHASE_TAG_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)-phase-(\d+)$")
```

Single-integer phase handles + single-integer phase tags. `v0.1.9` (the non-phase point-release tag pushed post-MPM landing) does NOT carry `-phase-N` suffix and is NOT resolvable. `v0.2.0-phase-2` does not exist at HEAD because spec-Phase-2 has not landed.

**Available anchors at HEAD:**
- `v0.1.0-phase-1` — **RESOLVABLE**. Phase 1 landing tag; bit-identity invariant `9399fc33…909f34` verified 16+ times.
- `v0.1.9` — **NOT RESOLVABLE** by the replay tool. Marker tag only.
- `v0.2.0-phase-2` — **DOES NOT EXIST**.

**Lean (recommend, do NOT decide here):** **Replay against `v0.1.0-phase-1`**. The only mechanically-resolvable phase tag at HEAD. Every Phase 1 sub-phase replayed against `v0.1.0-phase-1` per conventions doc § D.4; Taichi-integration (the FIRST spec-Phase-2 sub-phase) inherits the same anchor by the same mechanical constraint. The 16+-invocations bit-identity invariant is the heritage; Taichi-integration's Stage 0 Task 0.0 becomes the 17th invocation.

**Alternative 1 (yet-to-be-decided spec-Phase-2-anchor commit, e.g., conventions-refactor landing `e2dc789`):** NOT RESOLVABLE — would require a new tag carrying `-phase-N` suffix, but `-phase-2` is reserved for the eventual spec-Phase-2 landing per spec § 7.12. Forbidden.

**Alternative 2 (no replay until `v0.2.0-phase-2` lands):** Breaks the established Phase-1 discipline of cross-phase replay as Stage 0 Task 0.0; would forfeit the bit-identity invariant as a structural-correctness witness. Not recommended.

**Downstream effects of D3=v0.1.0-phase-1:**
- All spec-Phase-2 sub-phases (Taichi-integration + every D1-routed subsequent Stack-D port) replay against `v0.1.0-phase-1` until `v0.2.0-phase-2` lands.
- Bit-identity invariant continues as structural-correctness anchor across spec-Phase-2.
- When `v0.2.0-phase-2` eventually lands (after the LAST spec-Phase-2 sub-phase per D1's per-sub-phase decomposition), the FIRST spec-Phase-3 sub-phase replays against `v0.2.0-phase-2` per the same resolver constraint, NOT against any intermediate spec-Phase-2 sub-phase tag.

**Charter posture:** § 4.1 Stage 0 Task 0.0 specifies replay against `phase-1` → `v0.1.0-phase-1` citing the resolver regex constraint as load-bearing justification. § 11.4 documents replay-chain non-participation per § D.4.

## 10. Tag posture (Stage 2 equivalent — Step 2.11)

**No `-phase-N` tag** is proposed by this plan-drafting sub-phase. Spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries; next phase tag per spec is `v0.2.0-phase-2`.

**No `v0.1.10` non-phase point-release tag** at plan-drafting close — operator routing deferred to the dispatched Taichi-integration sub-phase's Stage 2 close (charter § 11.4 lean: NO tag, per conventions-refactor § 11 precedent).

**Forbidden either way:** any tag carrying `-phase-N` (single or multi-segment). Reserved for spec-phase boundaries. The agent does NOT push tags per conventions doc § D.2.

## 11. Sub-phase coherence note (per charter § 11)

The Taichi-integration plan-drafting sub-phase exercises the plan-then-dispatch discipline (conventions doc § A.4) at the **FIRST spec-Phase-2 deliverable surface** — establishing the charter + IC-11 / IC-12 ICs + D1 / D2 / D3 routings for operator decision before any implementation work begins.

Per-area coherence:

- **First spec-Phase-2 sub-phase.** All 9 Phase-1 sims GREEN; conventions doc stabilised; this sub-phase is the structural transition from post-Phase-1 work to spec-Phase-2 implementation work.
- **Inherits sub-phase-agent-based.md template** (most-evolved per-sim template) adapted to focused-infrastructure shape per numba-integration landing precedent. Charter structurally mirrors the 11-section template.
- **Plan-drafting only.** No Stage 0 / Stage 1 / Stage 2 work dispatched; charter pre-writes the three per-stage agent prompts for operator dispatch.
- **D1 / D2 / D3 routings surfaced** explicitly for operator. Charter does NOT pre-commit any of the three; charter scope is bounded to Taichi-integration itself.
- **89 + 3 = 92 cumulative shifts** entering Taichi-integration Stage 0 dispatch. 3 new minor precedent-establishing shifts (plan-drafting shape + post-Phase-1 IC numbering + new audit dir).
- **First `docs/_audits/phase-2/` artifact.** Sub-phase audit dir created; mirrors `docs/_audits/phase-1/` structure.
- **Conventions doc append-only protected** at sha256 `3698d19b…2bd734`; this sub-phase introduces no edits to it.
- **Reference materials.** Charter § 11.5 surfaces D1 routing of existing `docs/phases/phase-2-cross-stack-replication.md`; the plan's § 1.5.2 + § 1.9.1 + § 1.9.3 + § 1.9.4 (W-Gates + common-warp public API spec + capture-naming + harness-invocation contract) remain useful as reference material for subsequent per-sub-phase plan-drafting regardless of D1 disposition.

This audit lands at HEAD `<PLACEHOLDER-BACKFILL-PER-CONVENTION-12>` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(taichi-integration-plan-drafting-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time per the tightened § B.2 step 3 discipline).

Verdict: **CONFIRMED**.
