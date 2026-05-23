---
date: 2026-05-23T22-39-45Z
author: audit-chain-correctness-sub-phase-agent
phase: 2
artifact: task
artifact_id: audit-chain-correctness-phantom-sha-audit
subject: "Portfolio-wide capture-.json phantom-sha audit (RD-2D Stack-D N5b). 14 tracked captures/**/*.json enumerated at HEAD: 5 MATCH / 7 NO-RECORD / 2 PHANTOM-DRIFT. The 2 drifts (rd-2d-stack-d a7780645…, rd-3d-ref ccd0e4ea…) both satisfy the trailing-newline signature sha256(content − \\n), confirming the pre-commit end-of-file-fixer root cause. Both already caught at their respective landings (both landings record correct committed values); phantoms survive only in sealed checkpoints. rd-3d-ref drift RE-CLASSIFIED from §B.6 Mode 1 (content evolved) to Mode 3 (phantom-sha) — the blob never changed. Non-corrective per Convention A + #12 + D5: NO edits/annotations to the phantom-bearing prior audits; this report is the canonical going-forward record. Incidence bounded at 2 (R-A3 >30 trigger far off)."
verdict-state: CONFIRMED
head_sha: 7bf36dc445b858fe22afadd186e0a4497987b8c0
head_sha_at_checkpoint: 7bf36dc445b858fe22afadd186e0a4497987b8c0
parent_audits:
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/plan-drafting-probe-2026-05-23T21-54-02Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-checkpoint-2026-05-23T22-17-45Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-1a-checkpoint-2026-05-23T22-29-56Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/phantom-survey-2026-05-23T22-17-45Z.txt
  - docs/conventions/sub-phase-conventions.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-audit-chain-correctness/stage-0-evidence/phantom-survey-2026-05-23T22-17-45Z.txt: sha256:436599c26573cadef4bcadef6ea4208d883f22b1a206c541ebd152cf52091161
---

# Portfolio-Wide Capture-`.json` Phantom-Sha Audit

## 1. Scope summary

(FACT — RD-2D Stack-D landing § 8 N5b; charter § 1.4.2; this report is the N5b deliverable.)

A portfolio-wide audit of capture-`.json` sidecar manifests for the **phantom-sha**
drift mode: a recorded sha256 that equals `sha256(content − trailing \n)` rather
than `sha256(committed blob)`, caused by the pre-commit `end-of-file-fixer` hook
appending a trailing newline at commit time *after* an agent computed the sha256
on in-memory pre-hook content.

**Result:** of 14 tracked `captures/**/*.json` at HEAD — **5 MATCH · 7 NO-RECORD ·
2 PHANTOM-DRIFT**. The 2 drifts (rd-2d-stack-d, rd-3d-ref) both satisfy the
trailing-newline signature. Both were already caught at their respective sub-phase
landings (both landings record the correct committed value); the phantom values
survive only in **sealed, append-only checkpoints**. This report is the canonical
going-forward record (per Convention A + Convention #12 + D5 — no prior audit is
edited or annotated).

## 2. Methodology

(FACT — survey re-run at HEAD; method per plan-drafting probe § 5 + Stage 0 Task 0.3.)

- **Lookback bound.** The pre-commit `end-of-file-fixer` hook has been active since
  the **initial** `.pre-commit-config.yaml` at `1f052df` (2026-05-18, Phase 0
  Block 1). Lookback is therefore **portfolio-wide** (Phase 0 → HEAD); every
  capture `.json` ever committed passed through the hook.
- **Survey method.** For every tracked `captures/**/*.json` at HEAD: (a) compute
  the committed-blob sha256 (`git show HEAD:<path> | sha256sum`); (b) enumerate
  every sha256 recorded for that path in any audit under `docs/_audits/` committed
  since hook activation; (c) classify each recorded value.
- **Classification taxonomy.** MATCH (recorded == committed) · phantom-sha (recorded
  == `sha256(content − trailing \n)`; § B.6 Mode 3) · content-evolution (recorded
  == an earlier committed blob the file later diverged from; § B.6 Mode 1) ·
  LFS-pointer (recorded == content OID, tool read pointer stub; § B.6 Mode 2,
  RESOLVED at Stage 1a) · NO-RECORD (no audit cites the path's sidecar sha256).
- **Phantom-sha signature.** `recorded == sha256(committed_content with the single
  trailing \n stripped)`. Verified empirically for both drifts (§ 4, § 5).

## 3. 14-capture enumeration

(FACT — `git ls-files 'captures/**/*.json'` + `git show HEAD:<path> | sha256sum` + audit-corpus grep; provenance column is INFERENCE from sim-family / phase.)

| Capture `.json` | Provenance | Committed sha256 (HEAD) | Recorded drift | Classification |
|---|---|---|---|---|
| `boids-3d-ref/flock-1000agents-…` | Ph1 agent-based | `7e39a750…` | — | NO-RECORD |
| `boids-3d-ref/flock-3agents-canonical-…` | Ph1 agent-based | `3eabebd1…` | — | NO-RECORD |
| `eulerian-smoke-ref/lid-driven-cavity-…` | Ph1 eulerian-smoke | `52e89e95…` | — | **MATCH** |
| `eulerian-smoke-ref/taylor-green-…` | Ph1 eulerian-smoke | `9d6a78ed…` | — | **MATCH** |
| `lbm-ref/couette-…` | Ph1 lattice-boltzmann-d3q19 | `d9fbcafb…` | — | NO-RECORD |
| `lbm-ref/poiseuille-…` | Ph1 lattice-boltzmann-d3q19 | `8347922d…` | — | NO-RECORD |
| `mandelbulb-explorer-ref/de-probe-points-…` | Ph1 agent-based | `3ad25d64…` | — | NO-RECORD |
| `mpm-ref/drop-impact-…` | Ph1 mpm-multimaterial | `ea3531e0…` | — | **MATCH** |
| `physarum-ref/network-canonical-…` | Ph1 agent-based | `0c67b04d…` | — | NO-RECORD |
| `reaction-diffusion-2d-ref/gray-scott-…` | Ph0 Block 8 | `585d7d8a…` | — | **MATCH** |
| `reaction-diffusion-2d-stack-d/gray-scott-…` | Ph2 rd-2d-stack-d | `e1752ceb…` | `a7780645…` | **PHANTOM-DRIFT** (§ 4) |
| `reaction-diffusion-3d-ref/gray-scott-…` | Ph1 continuous-ca-rd3d | `5c64375f…` | `ccd0e4ea…` | **PHANTOM-DRIFT** (§ 5) |
| `sph-water-ref/dam-break-…` | Ph1 particle-fluids-sph-water | `84dbc448…` | — | **MATCH** |
| `strange-attractors-ref/lorenz-…` | Ph1 agent-based | `dbb7b77d…` | — | NO-RECORD |

**Tally: 5 MATCH · 7 NO-RECORD · 2 PHANTOM-DRIFT.** Incidence = 2 (≤ the R-A3 >30
decomposition trigger; far off).

## 4. Drift 1 — rd-2d-stack-d capture `.json`

(FACT — `sha256sum` at HEAD; RD-2D Stack-D landing § 4 + § 8 N1.)

- **Path:** `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json`
- **Phantom:** `a7780645d2159208e281a49c95b9d43c66ffd8b7e6ca3524345be19c468abd68`
- **Correct committed (HEAD):** `e1752ceb0e1847bc3c9a82a7eda2486a4418eec0908876ad016c61e5da27e104`
- **Trailing-newline signature proof:** `sha256(committed_content − trailing \n)` =
  `a7780645…` — **exact match to the phantom**. Confirms the hook-induced
  trailing-newline mechanism.
- **Where the phantom appears** (sealed, append-only): the RD-2D Stack-D **Stage 1b
  checkpoint** (`stage-1b-checkpoint-2026-05-23T20-35-18Z.md`) and **Stage 1c
  checkpoint** (`stage-1c-checkpoint-2026-05-23T20-53-53Z.md`).
- **Where the correct value appears:** the RD-2D Stack-D **landing audit § 4** (the
  canonical going-forward record per RD-2D Stack-D § 8 N1 — that landing already
  identified, corrected, and dispositioned this drift).
- **Mode classification:** § B.6 **Mode 3** (phantom-sha / trailing-newline),
  formalized at this Stage 1b's § B.6 amendment.

## 5. Drift 2 — rd-3d-ref capture `.json` (Mode-1 → Mode-3 RE-CLASSIFICATION)

(FACT — `sha256sum` at HEAD; RD-3D-ref landing `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md` § 8 N1; conventions § B.6 Mode 1 list.)

- **Path:** `captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.json`
- **Phantom:** `ccd0e4eabf36fba694a5c9bf3817cc470846c6aa2d59e52f7a2c987201475dcb`
- **Correct committed (HEAD):** `5c64375fb8be154f0de4df999ad9faa2777d969ab6f7e6e636b8b5e0bc3837b9`
- **Trailing-newline signature proof:** `sha256(committed_content − trailing \n)` =
  `ccd0e4ea…` — **exact match to the phantom**. Same hook-induced mechanism as
  Drift 1.
- **Where the phantom appears** (sealed, append-only): the RD-3D-ref **Stage 1
  checkpoint** (`stage-1-checkpoint-2026-05-20T19-42-23Z.md`, front-matter
  `evidence_hashes`) and its **Stage 2 evidence** (`stage-2-evidence/verify-evidence-…txt`
  + `anchor-recheck-…txt`).
- **Where the correct value appears:** the RD-3D-ref **landing audit front-matter
  `evidence_hashes`** records the correct `5c64375f…`; the landing § 8 N1 body
  documents the drift (truncated form) and noted "the blob never changed since the
  Stage 1 implementation commit `2942407`".
- **Mode RE-CLASSIFICATION (load-bearing).** Conventions § B.6 **Mode 1** ("file
  content evolved between audit-time and HEAD") explicitly lists "RD-3D N1" as an
  example. **This is incorrect:** Mode 1's mechanism is "an evidence file is touched
  by a later commit"; the RD-3D-ref blob was **never modified** (single commit on
  the file at `2942407` — the landing § 8 N1 says so). The recorded value is exactly
  `sha256(content − trailing \n)` — the **phantom-sha** mechanism, identical to
  Drift 1, NOT content evolution. This report **re-classifies RD-3D-ref N1 from § B.6
  Mode 1 to § B.6 Mode 3.** (Genuine Mode 1 still has valid examples — e.g. LBM N2,
  where `.pre-commit-config.yaml` / `docs/perf-ledger.md` *were* touched by later
  commits; the § B.6 Mode-3 amendment narrows Mode 1's example list accordingly via
  additive note, not deletion.)

## 6. Clean bill — MATCH + NO-RECORD entries

(FACT — § 3.)

- **5 MATCH** (eulerian-smoke ×2, mpm, rd-2d-ref, sph-water): the recorded sidecar
  sha256 equals the committed blob — no phantom; these audits recorded the
  post-hook committed value correctly.
- **7 NO-RECORD** (boids-3d ×2, lbm ×2, mandelbulb, physarum, strange-attractors):
  no audit cites these capture `.json` sidecar sha256 values (their sub-phases
  recorded the `.h5` identity and/or other evidence, not the `.json` sidecar sha).
  No latent phantom can hide here — there is no recorded value to drift from; the
  committed blobs are the authoritative identity.

**No third drift exists.** The portfolio-wide phantom-sha incidence is exactly 2.

## 7. § B.6 Mode-3 cross-reference

The phantom-sha drift mode is formalized as **§ B.6 Mode 3** at this sub-phase's
Stage 1b conventions-doc amendment (committed in the same Stage 1b sub-bundle as
this report). Mode 3 = phantom-sha / pre-commit-hook trailing-newline. See
`docs/conventions/sub-phase-conventions.md` § B.6.

## 8. Non-corrective framing (R-A2 + Convention A + Convention #12 + D5)

- The two phantom-bearing prior audits (RD-2D Stack-D Stage 1b/1c checkpoints;
  RD-3D-ref Stage 1 checkpoint + Stage 2 evidence) are **append-only-protected and
  sealed**. **NO `--amend`; NO additive annotation commits to those audits.** The
  phantom values remain in the sealed checkpoints, by design.
- The **landings** for both sub-phases already record the **correct** committed
  values (RD-2D Stack-D landing § 4; RD-3D-ref landing front-matter). **No landing
  is wrong.** The drift lived only in intermediate checkpoints.
- **This report is the canonical going-forward record** of portfolio-wide
  phantom-sha incidence. Per D5 (operator-ratified), no corrective annotation is
  routed to any prior audit; the report suffices.

## 9. Banked methodology-precedent for downstream

(INFERENCE — from the root-cause analysis; charter § 1.4.2 + § 9 R-A2.)

- **Root cause:** the pre-commit `end-of-file-fixer` hook + an agent computing
  sha256 on in-memory pre-hook content → phantom shas on text artifacts (the
  committed blob carries a trailing `\n` the in-memory content lacked).
- **Mitigation discipline (working, agent-level): commit-first-then-sha256.** Record
  the sha256 of the *committed blob*, never of in-memory pre-hook content. This
  sub-phase's own Stage 0 / Stage 1a / Stage 1b audit chains exemplify it (evidence
  files committed before their shas were recorded; the Stage 1a § B.6 amendment's
  committed-blob sha256 was verified == working-tree sha256).
- **The hook is NOT fixed here** (out of scope; it is a documentation-hygiene
  convention, not a tool defect). Two banked future-tooling options: (a) remove or
  modify the `end-of-file-fixer` hook; (b) teach `verify_evidence` to optionally
  accept both `sha256(content)` and `sha256(content − trailing \n)` for text
  artifacts. Both are banked; neither is in this sub-phase's scope.

---

This report lands at HEAD `7bf36dc445b858fe22afadd186e0a4497987b8c0` (back-filled per Convention #12 + § B.2
in the Stage 1b SHA back-fill commit; full 40-hex via `git rev-parse HEAD` at
summary-composition time).

Verdict: **CONFIRMED** (2 confirmed phantom drifts, both pre-caught + sealed;
rd-3d-ref re-classified Mode 1 → Mode 3; incidence bounded at 2; non-corrective
of prior audits).
