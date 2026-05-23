---
date: 2026-05-23T22-04-39Z
author: audit-chain-correctness-sub-phase-agent
phase: 2
artifact: stage
artifact_id: audit-chain-correctness-plan-drafting-landing
subject: "Plan-drafting CLOSE for the spec-Phase-2 audit-chain-correctness sub-phase (focused-infrastructure; bundles §B.6 Option-1 verify_evidence LFS-content-OID fix + portfolio-wide capture .json phantom-sha audit — RD-2D Stack-D N5a/N5b). Charter at docs/phases/sub-phase-audit-chain-correctness.md authored; structurally inherits sub-phase-taichi-integration (focused-infra) + sub-phase-capture-determinism-contract (amendment pattern). Conventions doc sha256 167fe349…f2c58c2e verified at HEAD (not BLOCKED). Empirical phantom-sha survey landed: exactly 2 confirmed drifts (rd-2d-stack-d, rd-3d-ref), both trailing-newline-confirmed, both already landing-caught; R-A3 decomposition trigger NOT hit. verify_evidence fix has a clean OID-parse path (R-A1 defused). D1-D6 surfaced with leans + alternatives + downstream; NOT pre-committed. Two plan-drafting shifts (S1 §7.6 anchor falsified→§7.5; S2 §B.6 Mode-1 mis-classifies the rd-3d phantom→candidate Mode-3). Cumulative shifts: 120 inherited + 2 = 122 entering Stage 0. No blocking dependencies."
verdict-state: CONFIRMED
head_sha: cc9a6863c7a3f09c5a6b3a9ad7ef1403e8dee540
head_sha_at_checkpoint: cc9a6863c7a3f09c5a6b3a9ad7ef1403e8dee540
parent_audits:
  - docs/_audits/phase-0/landing-2026-05-19T17-28-32Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-probe-2026-05-23T21-54-02Z.md
evidence_paths:
  - docs/phases/sub-phase-audit-chain-correctness.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-probe-2026-05-23T21-54-02Z.md
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
---

# Plan-Drafting Landing Audit — Sub-Phase Audit-Chain-Correctness

## 1. Plan-drafting scope summary

(FACT — charter at commit `92294d3`; probe at commit `9120675`.)

**FOURTH spec-Phase-2 sub-phase plan-drafting; SECOND focused-infrastructure
sub-phase under spec-Phase-2** (after `sub-phase-taichi-integration`). Drafts the
implementation plan for the audit-chain-correctness sub-phase, which bundles the
two banked-for-operator N5 items from the RD-2D Stack-D landing (§ 8 N5 / § 10):

- **N5a — §B.6 Option-1 `verify_evidence` LFS-content-OID fix.** Portfolio-wide
  tooling; every sub-phase's gate-5 evidence check consumes it.
- **N5b — portfolio-wide capture-`.json` phantom-sha audit.** Enumerate + verify +
  classify; non-corrective of append-only prior audits.

Both address **audit-chain hash correctness** — thematically coherent. This
plan-drafting is the first to:

- **Consume a prior sub-phase's banked-for-operator N5 items as a sub-phase
  mandate** (rather than inheriting D-class routings). The RD-2D Stack-D landing
  routed these explicitly to a focused-infrastructure sub-phase.
- **Resolve a recurring conventions-doc drift mode at the tool level.** §B.6
  Mode 2 has been annotated (Option 3) across 5 landing audits; the fix retires
  the annotation obligation.
- **Surface an empirical re-classification of a prior sub-phase's shift root
  cause** (rd-3d-ref N1: §B.6 Mode-1 "content evolution" → phantom-sha) without
  editing the append-only prior audit.

## 2. Drafting deliverables — final-status table

| # | Deliverable | Path | Closing-commit |
|---|---|---|---|
| 1 | Plan-drafting probe report | `docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-probe-2026-05-23T21-54-02Z.md` | `9120675` |
| 2 | Sub-phase charter | `docs/phases/sub-phase-audit-chain-correctness.md` | `92294d3` |
| 3 | Plan-drafting landing audit (this audit) | `docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-landing-2026-05-23T22-04-39Z.md` | (this commit) |
| 4 | Convention #12 SHA back-fill commit (probe + this audit) | — | (next commit) |

**All 3 drafting deliverables CONFIRMED at plan-drafting close.** Charter is
Stage-0-dispatchable pending D1–D6 routing.

## 3. Stage convergence commits (plan-drafting)

| # | SHA | Subject |
|---|---|---|
| 1 | `9120675` | `chore(audit-chain-correctness-plan-drafting-probe)` |
| 2 | `92294d3` | `docs(sub-phase-audit-chain-correctness)` (charter) |
| 3 | `(this commit)` | `chore(audit-chain-correctness-plan-drafting-landing-audit)` |
| 4 | `(back-fill commit)` | `chore(audit-chain-correctness-plan-drafting-sha-backfill)` |

**4 plan-drafting commits** (including the Convention #12 SHA back-fill, which
back-fills BOTH the probe's and this audit's `head_sha:` per the RD-2D Stack-D
plan-drafting precedent).

## 4. Anchor verification at plan-drafting close (Convention M)

(FACT — verified at probe time and re-confirmed at this audit's authoring.)

| Anchor | HEAD reality | Status |
|---|---|---|
| Conventions doc sha256 | `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e` (854 lines) | MATCH — not BLOCKED; third sub-phase to dispatch against this baseline |
| `verify_evidence` fix surface | `file_at_sha` at `tools/integrity/integrity/common/repo.py:62-72` → hash at `tools/integrity/integrity/scripts/verify_evidence.py:113` | located; LFS-blind via `git show` |
| `.gitattributes` LFS patterns | exactly `captures/**/*.h5 filter=lfs` (all other binaries marked `binary`, not LFS) | MATCH + NARROWED |
| `end-of-file-fixer` activation | present in initial `.pre-commit-config.yaml` (`1f052df`, 2026-05-18) | portfolio-wide lookback |
| Phantom-sha incidence | exactly 2 (rd-2d-stack-d `a7780645…`, rd-3d-ref `ccd0e4ea…`), both trailing-newline-confirmed, both landing-caught | bounded; R-A3 not triggered |
| LFS pointer OID embedding | RD-2D Stack-D `.h5` stub `oid sha256:2e93a751…` == audit-recorded content OID | OID-parse fix path valid (R-A1 defused) |
| Architecture verify_evidence section | `docs/architecture.md` **§ 7.5** "Audit-trail discipline" (+ Appendix G.7); **§ 7.6** is "Sandbox-probe-before-assert" | **SHIFTED (S1)** — dispatch §7.6 anchor falsified |
| §B.6 Mode-2 annotation incidence | 5 landing audits (MPM / conventions-refactor / Taichi / capture-determinism / RD-2D Stack-D) | recurring burden the fix retires |
| RD-2D Stack-D landing | head_sha `7747d68…` + back-fill HEAD `2eb2a2d` | MATCH |
| Bit-identity invariant | `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` | sealed; Stage 0 Task 0.0 = next invocation |
| `tolerance.toml` `[overrides.reaction-diffusion-2d]` | present (RD-2D Stack-D Stage 1c artifact) | out of scope; cross-reference only |

**Anchor-sketch verification: RATIFIED-with-two-shifts (S1, S2).** Not BLOCKED.

## 5. D1–D6 verdicts at plan-drafting close

(Per dispatch contract: surfaced, NOT pre-committed. Operator routes at Stage 0 dispatch.)

### D1 — Canonical sub-phase name
- **Lean (adopted in charter file + audit-dir + commit slug):** `sub-phase-audit-chain-correctness` — covers both deliverables in one descriptive frame; matches conventions § B.4 descriptive-`sub-phase-<slug>` pattern.
- **Alternative A:** `sub-phase-evidence-hash-correctness` (narrower; foregrounds the verify_evidence fix, under-weights the phantom-sha audit).
- **Alternative B:** `sub-phase-verify-evidence-lfs-fix-and-audit` (most descriptive, most verbose).
- **Downstream:** the name is consumed only by this sub-phase's artifacts; rename is mechanical (charter file + audit dir + commit slug) BEFORE Stage 0 dispatch.

### D2 — Stage 1 monolithic vs decomposed (1a/1b)
- **Lean (adopted in charter § 4.0):** **1a/1b two-way.** 1a = verify_evidence OID-parse fix + tests + §B.6 Mode-2-RESOLVED amendment; 1b = phantom-sha audit report + candidate §B.6 Mode-3 + optional §7.5 clarification.
- **Alternative:** monolithic Stage 1 (the surface IS coherent; fewer commits).
- **Rationale:** probe net estimate ~+450–650 straddles Convention A's +500 heuristic; two independent workstreams with distinct verification (1a pytest GREEN vs 1b report); NOT 1a/1b/1c (amendments are small and ride with the stage that earns them). Probe's bounded 2-drift finding (R-A3 not triggered) keeps either shape tractable.
- **Downstream:** ~10–12 commits (1a/1b) vs ~8 (monolithic).

### D3 — Spec § 7.5 / Appendix G.7 amendment
- **Lean (adopted in charter § 2 deliverable 5):** **optional additive clarification; not required.** Architecture **§ 7.5** (corrected from the dispatch's §7.6 — S1) says verify_evidence hashes "the file content at head_sha"; SILENT on LFS-smudge. The plain-language "file content" intent *aligns* with the fix; a one-line "for LFS-tracked artifacts, the content OID" is additive, not corrective.
- **Alternative:** no amendment (spec silent, not incompatible).
- **Downstream:** if routed in, lands at Stage 1b alongside §B.6 Mode-3.

### D4 — CI gate redesign
- **Lean (adopted in charter § 2 deliverable 6):** **NO.** `grep -rln verify_evidence .github/` = empty; verify_evidence runs at founder/phase-closing-agent time, not CI. integrity Cat-5 (`cat5_provenance`) does audit-LINK checks, not evidence_hashes (the LFS drift was present during RD-2D's `0 HARD_FAIL` sweep — proving Cat-5 does not hash evidence).
- **Alternative:** add a forward-guard CI job invoking verify_evidence on the latest landing audit (banked enhancement).

### D5 — Corrective-annotation-commit posture for high-incidence prior audits
- **Lean (adopted in charter § 1.4.2 + R-A2):** **NO.** Both phantom landings already record the correct committed value; the phantoms survive only in append-only checkpoints (immutable by design). The new phantom-sha report is the canonical going-forward record (RD-2D Stack-D § 8 N1 precedent).
- **Alternative:** an additive follow-up annotation commit per drifted prior audit (NOT `--amend`).
- **Downstream:** if routed, the annotation commits are additive siblings; default keeps the audit chain untouched.

### D6 — LBM/MPM `sim_runner_diagnostic` seed-propagation defect
- **Lean (adopted in charter § 11.2):** **confirm DEFER (STAYS BANKED).** Probe surfaced NO adjacency to audit-chain hash correctness; per-sim test-infra of different shape; bundling adds template-shape confusion. Folds into the next per-sim LBM/MPM sub-phase.
- **Alternative:** fold in (NOT recommended — distinct shape).

**New-IC note:** highest assigned IC is **IC-15** (cross-stack methodology
candidate, deferred). This sub-phase claims **IC-16** (verify_evidence
LFS-content-OID verification semantics) if D2's 1a formalizes it; IC-15 stays
reserved. Surfaced at charter § 3.2.

## 6. Inherited shifts + plan-drafting shifts surfaced

### 6.1 Inherited shifts (120 cumulative entering plan-drafting)
(FACT — RD-2D Stack-D landing § 8 "Cumulative shift count at Stage 2 close: 115 + 5 = 120.")

### 6.2 Plan-drafting new shifts surfaced

| ID | Description |
|---|---|
| **S1 (plan-drafting)** | **Dispatch's "spec/architecture § 7.6 = audit-chain discipline; verify_evidence semantics" anchor FALSIFIED.** At HEAD, `docs/architecture.md` **§ 7.5** is "Audit-trail discipline" (verify_evidence + evidence_hashes home; also Appendix G.7); **§ 7.6** is "Sandbox-probe-before-assert (cross-role)". The D3 spec-amendment surface is § 7.5 + Appendix G.7. Precedent: RD-2D Stack-D N2 falsified-LFS-anchor — coordinator-side Convention #8 (verify dispatch anchors against HEAD, do not infer). Banked. |
| **S2 (plan-drafting)** | **§ B.6 Mode-1 mis-classifies the rd-3d-ref capture-`.json` phantom-sha (`ccd0e4ea…`) as "file content evolved between audit-time and HEAD."** Empirically the blob never changed (rd-3d landing § 8 N1 confirms single-commit-on-file) and `ccd0e4ea…` = `sha256(content − trailing \n)` — the hook-induced phantom, identical to rd-2d-stack-d N1. This is a distinct **third mode** separable from Mode 1 (content evolution; genuinely LBM N2) and Mode 2 (LFS pointer). Surfaces a candidate § B.6 **Mode-3** classification — additive conventions-doc amendment, in-scope for this sub-phase. New precedent. |

### 6.3 Cumulative shift count at plan-drafting close
**120 + 2 = 122** entering Stage 0 dispatch.

## 7. Tag posture (plan-drafting close)

**No `-phase-N` tag.** Spec § 7.12 reserves `v0.<N>.0-phase-<N>`; next is
`v0.2.0-phase-2`. No `v0.1.12` non-phase point-release at plan-drafting close
(per Taichi-integration / capture-determinism-contract / RD-2D Stack-D
precedent — only a candidate at Stage 2 close). The agent does NOT push tags
(conventions doc § D.2 / spec § 7.12).

## 8. Next-stage recommendation (operator-routable)

**Recommended next stage: Stage 0 — Pre-flight.** Dispatch a fresh Claude Code
session against `docs/phases/sub-phase-audit-chain-correctness.md` § 7.1 after
operator routing of D1–D6. Stage 0 acceptance: Task 0.0 (replay PASS — next
bit-identity invocation) + Task 0.1 (tolerance-budget carryover) + Task 0.2
(re-anchor probe findings) + Task 0.3 (confirm bounded ≤2 phantom scope) +
checkpoint + SHA back-fill.

**Operator decisions required BEFORE Stage 0 dispatch:** D1 (name; lean
`sub-phase-audit-chain-correctness`), D2 (1a/1b), D3 (optional §7.5), D4 (NO CI),
D5 (NO prior-audit annotation), D6 (confirm DEFER `sim_runner_diagnostic`).

**If operator routes alternative to D1:** charter path + audit dir + commit slug
require mechanical rename before Stage 0 dispatch. **If alternative to D2–D6:**
charter § 4 / § 7 prompts adjust accordingly.

## 9. Phase coherence note

- **FOURTH spec-Phase-2 sub-phase, SECOND focused-infrastructure.** Mirrors
  `sub-phase-taichi-integration` (focused-infra template) + adopts
  `sub-phase-capture-determinism-contract`'s amendment pattern (tool change + spec
  + conventions-doc amendment).
- **Consumes RD-2D Stack-D N5a/N5b as the sub-phase mandate**; supersedes the
  Taichi-integration-era "evidence_paths LFS remediation" banked item (noted in
  charter § 1.3 + § 11.2).
- **Empirical bounding done at plan-drafting:** exactly 2 phantom drifts, both
  pre-caught; the verify_evidence fix has a clean offline OID-parse path. Both
  N5 items are de-risked before Stage 0.
- **Two shifts surfaced and dispositioned** without editing any append-only
  artifact: S1 (dispatch anchor corrected to § 7.5) and S2 (candidate §B.6
  Mode-3). Honest surfacing per Hard Rule 2 + coordinator-side Convention #8.
- **IC-16 surfaced** as the new IC (verify_evidence LFS-content-OID semantics);
  IC-15 stays reserved for the cross-stack template.
- **Plan-drafting scope kept tight:** no implementation; no phantom-sha work
  beyond the probe-tier survey; no edits outside the new charter + new audit
  files; no spec / conventions-doc amendments (those are Stage 1).
- **D6 confirmed DEFER:** the LBM/MPM `sim_runner_diagnostic` defect stays banked
  — no adjacency to audit-chain hash correctness.

**Plan-drafting outputs for downstream consumption:**
- `docs/phases/sub-phase-audit-chain-correctness.md` (charter; § 4 stages; § 7
  agent prompts; § 9 R-A1–R-A5): Stage 0 dispatchable verbatim pending D1–D6.
- `docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-probe-2026-05-23T21-54-02Z.md`
  (anchor source-of-truth: verify_evidence surface, LFS pattern, phantom survey,
  D-class preview): consumed by every subsequent stage's re-anchor work.
- This landing audit: D1–D6 verdicts at plan-drafting close.

---

This audit lands at HEAD `cc9a6863c7a3f09c5a6b3a9ad7ef1403e8dee540` (back-filled per Convention #12 + § B.2
in a separate `chore(audit-chain-correctness-plan-drafting-sha-backfill)` commit
per the two-commit pattern; full 40-hex via `git rev-parse HEAD` at
summary-composition time).

Verdict: **CONFIRMED**.
