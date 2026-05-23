---
date: 2026-05-23
author: conventions-refactor-post-phase-1-sub-phase-agent
artifact: stage
artifact_id: sub-phase-conventions-refactor-post-phase-1-stage-1
stage: 1-implementation
subject: "Conventions Refactor (Post-Phase-1) sub-phase Stage 1 — 8 refactor items A-H applied in a single sub-bundle commit; conventions doc grows 696 → 828 lines (+132 net); per-section sha256s captured for Stage 2 verification"
verdict-state: PASS
head_sha: 5782e21baf2b349f752214b6436969e338b250b2
head_sha_at_checkpoint: 5782e21baf2b349f752214b6436969e338b250b2
parent_audits:
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-checkpoint-2026-05-23T12-27-48Z.md
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-conventions-consolidation/landing-2026-05-22T03-25-55Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md
  - docs/_audits/phase-1/sub-phase-git-lfs-migration/landing-2026-05-22T21-04-05Z.md
evidence_paths:
  - docs/phases/sub-phase-conventions-refactor-post-phase-1.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-checkpoint-2026-05-23T12-27-48Z.md
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-section-baseline-2026-05-23T12-27-48Z.txt
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
  docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/stage-0-section-baseline-2026-05-23T12-27-48Z.txt: sha256:c1512413c225b0376f944292bb86f68c45890ffdd6d82fe0a03d8b51cf3a28d5
---

# Conventions Refactor (Post-Phase-1) Sub-Phase — Stage 1 Checkpoint

## 1. Stage 1 deliverable summary

(FACT — `docs(conventions-refactor-post-phase-1-stage1)` commit
`5a1c068cdce06324fe75abbb2f2c0924a5071404`.)

Eight refactor items A–H applied to `docs/conventions/sub-phase-
conventions.md` in a single sub-bundle commit per operator routing
2(e) (single-commit lean held; two-commit fallback was not engaged).
Diff size: **+143 / -11 (132 net insertions)**; conventions doc grew
**696 → 828 lines**.

| Item | Target section | Type | Edit summary |
|---|---|---|---|
| A | § N | edit + restructure | Heading retitled (drop PROPOSED); preface rewritten to graduation narrative; § N.2 retitled "Task 0.4"; § N.3 updated tense (FACT not INFERENCE); § N.4 replaced with empirical-baseline content; § N.5 added (production-correction factor range [0.5×, 1.45×] observed, [0.5×, 3×] safety-margin framing) |
| B | new § P (top-level) | insert | New top-level § P "Capture cadence routing" inserted between § L and § M; § P.1 default + § P.2 historical-instance caveat + § P.3 W1 ceiling-raise routing |
| C | § I.3 | append | Inline extension: anchor-density-predicts-kill-rate empirical observation; five-proof-point mean 0.5466 / range [0.4879, 0.5927] / ±10% baseline; cross-reference to § J.5 |
| D | § J.3 | append | PATH-A × numba per-mutant timeout wrapper REQUIRED (shell-timeout mechanism documented; pytest-timeout banked for testing-improvements); MPM Stage 2 R15 precedent cited |
| E | § B.3 row footnote + new § B.6 | edit + insert | `evidence_hashes:` row gains LFS pointer-vs-content footnote; new § B.6 "Evidence-paths strict-verify discipline" lists 4-of-7 drift frequency, two recurring drift modes, three remediation options |
| F | § B.2 step 3 | edit | Convention #12 step 3 tightened: full 40-hex via `git rev-parse HEAD` at summary-composition time, NOT transcribed from context; eulerian-smoke + MPM precedents cited |
| G | new § J.6 | insert | "Mutmut data extraction" — `.mutmut-cache` SQLite query pattern; warns against full-file baseline-JSON reads at audit time |
| H | new § J.7 | insert | "Manifest-builder low-kill-rate pattern" — sim.py low-kill framed as expected structural property; banked for testing-improvements |

Preamble (lines 3-7) updated for **internal consistency** — `§§ A–M`
→ `§§ A–P`; § N PROPOSED claim replaced with graduation narrative.
This is consistency-with-Item-A, not an out-of-scope edit.

§ L.2 row 1 (historical sph-water banked-observation table) left
untouched per § B.1 append-only-spirit: the table is a sealed
forward-looking-from-sph-water observation; resolution is documented
at § N narrative.

## 2. Per-section sha256 — before / after

(FACT — Stage 0 baseline at
`stage-0-section-baseline-2026-05-23T12-27-48Z.txt`; post-Stage-1
sha256s computed via `sed -n '<lo>,<hi>p' | sha256sum` at HEAD per
the Stage 1 sub-bundle commit `5a1c068`.)

| Section | Line span (post) | Pre-Stage-1 sha256 | Post-Stage-1 sha256 | Δ |
|---|---:|---|---|:---:|
| § B.2 | 72-87 | `b5b5911d…1177d6eb` | `04e9eb3fa2e12ad3b19ab6a2b8572c872c39e5aeaaeb746e40e8d6b5af14632a` | ✓ (Item F) |
| § B.3 | 88-105 | `95365044…ef808226` | `a5c9f23e52716e340aab58de98b7d768b07d7cf7ae1d33feae7ccf417da5c89c` | ✓ (Item E footnote) |
| § B.6 | 140-159 | (none) | `49091b203730733f377eba7b86e707d210872c7d0e3518db243d562fd2e18de3` | ✓ NEW (Item E) |
| § I.3 | 405-416 | `9e4514ae…5101fc1e` | `a9f9d1c2eb580fa952496ee4c98c56d76115fd93837d3522c2f440b878bee763` | ✓ (Item C) |
| § J.3 | 451-479 | `b5605797…df30fb4c` | `81114fb41d0f0eff828be3167dc60cd58a085368f9c74852cf57d4564f5ac5e1` | ✓ (Item D) |
| § J.6 | 488-502 | (none) | `60d4192ad024aff293ff932615c28c0bb754e1b1d59ceb1f431e8c911c87d9da` | ✓ NEW (Item G) |
| § J.7 | 504-520 | (none) | `28b99befd9d81b913ec0cc22e293f23208b63feb634f014e593e8f3591e729a7` | ✓ NEW (Item H) |
| § P | 606-644 | (none) | `ceb55276866dcb30c6eaaf57eba95016eb61a2a8550d1f716c198fca4643c41e` | ✓ NEW (Item B) |
| § N | 744-810 | `248b510d…6e49058b2` | `47fd77531d4f90485deec83634f4bee01a5f3c90e803c4218ec8fbf3dbc80fc2` | ✓ (Item A) |

Every affected section's sha256 differs from baseline. Every new
section has a fresh sha256. **No edits leaked beyond the 7 affected
sections + the preamble-consistency update.**

**Full conventions doc sha256:**

| Stage | sha256 |
|---|---|
| Pre-Stage-1 (= conventions-consolidation landing baseline) | `004d70117e01b3824a8b54e4c34963969ad0a4188b87f7acbca01dea9600a3e6` |
| Post-Stage-1 (= this checkpoint) | `3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734` |

## 3. Read-through coherence check

(Read-back via Read tool of the full doc post-Stage-1.) The
conventions doc reads as a coherent reference, not a patchwork:

- **Section numbering preserved.** § A B C D E F G H I J K L P M N O
  — § P inserts between L and M; § N retains its position. Letter P
  chosen over re-numbering existing § M+ to avoid cascading
  cross-references that would touch every audit citing "§ M" or
  "§ N" by letter.
- **Cross-references resolve.** New § N.5 references § P; new § P
  references § N + § N.4 Task 0.4 discipline; new § I.3 references
  § J.5 + § I.2; new § B.3 row references § B.6; new § B.6 references
  § B.1 + git-lfs-migration landing.
- **FACT / INFERENCE tags consistent.** § N preface changed from
  PROPOSED to "Established discipline"; existing FACT/INFERENCE tags
  in unchanged sections retained verbatim.
- **Tone consistent.** New material matches the established voice
  (FACT-first; landing-audit-anchored citations with full SHAs in
  back-ticks; "operational consequence" framing matches § N).

## 4. Stage 1 commit chain

| # | SHA | Subject |
|---|---|---|
| 1 | `5a1c068cdce06324fe75abbb2f2c0924a5071404` | `docs(conventions-refactor-post-phase-1-stage1): refactor sub-phase-conventions.md per MPM landing § 9.4 + § 10.5` |
| 2 | `(this commit)` | `chore(conventions-refactor-post-phase-1-stage1-checkpoint): Stage 1 close + per-section sha256s` |
| 3 | `(back-fill commit)` | `chore(conventions-refactor-post-phase-1-stage1-sha-backfill): back-fill checkpoint head_sha per Convention #12` |

## 5. Stage 1 SHIFTS

**None.** Stage 1 is mechanical doc-refactor; no new shifts surfaced.
The doc edits exactly match the plan § 2 + operator routing applied
at Stage 0. Cumulative-shift count remains **85 inherited from MPM
landing § 8.3** — unchanged from Stage 0.

## 6. Banked-for-Stage-2 — none

No banked items surfaced during Stage 1. Stage 2 entry conditions:

- ✓ Conventions doc edits land in single sub-bundle commit.
- ✓ Per-section sha256s captured for Stage 2 verification.
- ✓ Doc parses cleanly; section structure intact.
- ✓ No edits to any sealed audit; no edits to any sim source / golden
  / capture / perf-ledger; no edits to any per-sub-phase plan.

## 7. Ready for Stage 2 dispatch

Stage 2 is operator-routable in a fresh session against the plan
§ 4.3. Expected Stage 2 deliverables (mirrors conventions-
consolidation landing shape):

- Step 2.1 closing-commit anchor re-check.
- Step 2.2 regression sweep (expect 300 tests GREEN, zero delta).
- Step 2.3 Cat 3 disposition NO-OP.
- Step 2.4 full integrity sweep (expect 0 HARD_FAIL, 13 SOFT_WARN).
- Step 2.5 evidence-path verification (per the new § B.6 discipline).
- Step 2.6 gate-13 worktree replay NO-OP.
- Step 2.7 append-only check (Stage 1 modifies conventions doc; not
  at any protected-set SHA prior to conventions-consolidation
  `34c7d34`; additive modification per the established conventions-
  doc-is-editable posture).
- Step 2.8 mutation gate NO-OP.
- Step 2.9 sub-phase landing audit + Convention #12 SHA back-fill per
  the new tightened discipline (Item F).

Stage 1 verdict: **PASS**.
