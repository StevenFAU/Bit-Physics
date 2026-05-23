---
date: 2026-05-23T22-42-43Z
author: audit-chain-correctness-sub-phase-agent
phase: 2
artifact: stage
artifact_id: audit-chain-correctness-stage-1b
subject: "Stage 1b CLOSE — portfolio-wide phantom-sha audit + §B.6 Mode-3 + spec § 7.5/G.7 D3-positive clarification. Phantom-sha audit report landed (14-capture: 5 MATCH / 7 NO-RECORD / 2 PHANTOM-DRIFT; both trailing-newline-confirmed, both pre-caught + sealed). §B.6 Mode-3 added (additive); rd-3d-ref RE-CLASSIFIED Mode 1 → Mode 3. Spec § 7.5 + Appendix G.7 gained additive LFS-content-OID (IC-16) clarification. Conventions doc sha256 ladder: 167fe349 → 2638dd28 (Stage 1a) → 69aa39fc (Stage 1b, new canonical baseline). architecture.md sha256 → e82b7b8e. Non-corrective per Convention A + #12 + D5. Verdict CONFIRMED; 0 new shifts; cumulative 122. Stage 2 dispatch-ready."
verdict-state: CONFIRMED
head_sha: <PLACEHOLDER — back-filled per Convention #12>
head_sha_at_checkpoint: <PLACEHOLDER>
parent_audits:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-checkpoint-2026-05-23T22-29-56Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-2026-05-23T22-39-45Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-2026-05-23T22-39-45Z.md
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/phantom-sha-audit-2026-05-23T22-39-45Z.md: sha256:8d86cc96c8268254b86182c36a67b5a23af4d76c32ab648a3b3106e10baef5b2
  docs/conventions/sub-phase-conventions.md: sha256:69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45
  docs/architecture.md: sha256:e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267
---

# Stage 1b Checkpoint — Phantom-Sha Audit + §B.6 Mode-3 + Spec § 7.5 Clarification

## 1. Scope summary

(FACT — charter § 4.3; D2 = 1a/1b; D3 = POSITIVE; D5 = no prior-audit corrections.)

Stage 1b of the audit-chain-correctness sub-phase: the documentation +
classification + spec-clarification stage. Lands the portfolio-wide capture-`.json`
phantom-sha audit report (RD-2D Stack-D N5b), the additive §B.6 **Mode 3**
classification, and the D3-positive additive clarification at spec § 7.5 +
Appendix G.7. No code (Stage 1a sealed the `verify_evidence` fix). Non-corrective
of prior audits (Convention A + #12 + D5).

## 2. Four-step results table

(FACT — main commit `7bf36dc`; all sha256 are committed-blob values verified == working-tree per commit-first-then-sha256.)

| Step | Artifact | sha256 (committed blob) | pre-commit |
|---|---|---|---|
| 1 | `phantom-sha-audit-2026-05-23T22-39-45Z.md` (NEW report) | `8d86cc96…0baef5b2` | cat4 Passed |
| 2 | `docs/conventions/sub-phase-conventions.md` (§B.6 Mode 3 added) | `69aa39fc…4602bf45` | cat4 Passed |
| 3 | `docs/architecture.md` (§ 7.5 + G.7 LFS-OID clarification) | `e82b7b8e…9292d267` | cat4 Passed |
| 4 | main commit `7bf36dc` | — | all hooks Passed |

## 3. Phantom-sha audit report deliverable

(FACT — `phantom-sha-audit-2026-05-23T22-39-45Z.md` § 3–§ 5.)

- **Report sha256:** `8d86cc96c8268254b86182c36a67b5a23af4d76c32ab648a3b3106e10baef5b2`.
- **14-capture survey:** **5 MATCH** (eulerian-smoke ×2, mpm, rd-2d-ref, sph-water)
  · **7 NO-RECORD** (boids-3d ×2, lbm ×2, mandelbulb, physarum, strange-attractors)
  · **2 PHANTOM-DRIFT** (rd-2d-stack-d `a7780645…`, rd-3d-ref `ccd0e4ea…`).
- **Both drifts** satisfy the trailing-newline signature (`recorded == sha256(committed − \n)`),
  are **already caught at their respective landings** (both landings record the
  correct committed value), and survive **only in sealed checkpoints**.
- **Incidence bounded at 2** (R-A3 >30 trigger far off; no D2 re-decomposition).

## 4. §B.6 Mode-3 amendment

(FACT — `docs/conventions/sub-phase-conventions.md` § B.6 post-amendment; committed-blob sha256 verified == working-tree, no phantom.)

- **NEW conventions doc baseline sha256:** `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45`
  (this is the **canonical baseline going forward**; Stage 2 + subsequent
  sub-phases verify against it).
- **Mode 3 added (additive bullet after the Stage-1a Mode-2 RESOLUTION block):**
  phantom-sha / pre-commit-hook trailing-newline drift. Root cause (agent sha256 on
  in-memory pre-hook content + `end-of-file-fixer` appends `\n`); detection signature
  (`recorded == sha256(committed − trailing \n)`); resolution (commit-first-then-sha256
  agent discipline; two banked future-tooling options); portfolio incidence exactly 2.
- **rd-3d-ref RE-CLASSIFICATION (S2 actioned):** §B.6 Mode 1 listed "RD-3D N1" as
  content-evolution; Mode 3 re-classifies it (the blob never changed — single commit
  `2942407`). Mode 1's other examples (eulerian-smoke N1, LBM N2) are genuine
  content-evolution and **left intact** (Convention A — no deletion; the Mode-3 bullet
  notes the re-classification additively).

## 5. Spec § 7.5 + Appendix G.7 amendment (D3-positive)

(FACT — `docs/architecture.md` § 7.5 + Appendix G.7 post-clarification.)

- **NEW architecture.md sha256:** `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267`
  (was `42f5d599…360a347b` pre-amendment).
- **§ 7.5:** additive paragraph "**LFS-tracked artifacts (IC-16)**" after the
  3-point evidence-verification list — states that check (3) compares the claimed
  sha256 against the content OID parsed from the pointer stub for LFS paths
  (offline; no smudge/network/auth), git-blob sha256 otherwise; cites `lfs_pointer_oid()`
  + the OID-aware compare at `tools/integrity/integrity/scripts/verify_evidence.py:120-121`.
- **Appendix G.7:** one-line additive LFS-OID note appended to item 3.
- **Existing wording unchanged** (Convention A); both are additive clarifications.

## 6. Conventions doc sha256 evolution this sub-phase (3-step ladder)

(FACT — Stage 1a + Stage 1b commits.)

| Stage | conventions doc sha256 | Change |
|---|---|---|
| pre-Stage-1a (inherited) | `167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e` | baseline |
| post-Stage-1a | `2638dd2854c2841b4c1a56449183afe7091f48d90a9e28694841f8a72d9cf7c1` | §B.6 Mode-2 RESOLVED |
| **post-Stage-1b (CANONICAL going-forward)** | `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` | §B.6 Mode-3 added |

Stage 2 + subsequent sub-phases verify against `69aa39fc…4602bf45`.

## 7. New Stage 1b shifts

**None.** The phantom-sha incidence (2), the trailing-newline signatures, and the
rd-3d-ref Mode-1→Mode-3 re-classification all match the plan-drafting probe (S2,
already counted) + Stage 0 Task 0.3. The conventions/architecture sha256 changes
are **planned deliverables**, not unexpected drift. **Cumulative shift count:
122 + 0 = 122** entering Stage 2.

## 8. Stage 2 dispatch readiness

(FACT — charter § 4.4.)

READY. Stage 2 (landing) owns convergence: CHANGELOG additive, `docs/dependencies.md`
additive (records **IC-16**), full integrity sweep, Python-only cross-package
regression sweep (§ B.7; `tools/integrity` count grows by the 5 new LFS tests),
evidence-path verification (this landing's own gate-5 consumes the Stage-1a fix on
LFS `.h5`), append-only check (the §B.6 + architecture amendments are legitimate
additive non-`_audits/` edits), landing audit, SHA back-fill. **Expected: integrity
byte-identity streak breaks benignly** (this sub-phase added source + conventions +
spec amendments — RD-2D Stack-D § 6's 5-in-a-row streak ends here for a benign,
documented reason). Stage 2 reads the conventions doc at the new baseline
`69aa39fc…4602bf45`.

---

This checkpoint lands at HEAD `<PLACEHOLDER>` (back-filled per Convention #12 +
§ B.2 in a separate `chore(audit-chain-correctness-stage1b-sha-backfill)` commit;
full 40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED** (phantom-sha audit landed; §B.6 Mode-3 added; spec § 7.5/G.7
clarified; non-corrective; 0 new shifts).
