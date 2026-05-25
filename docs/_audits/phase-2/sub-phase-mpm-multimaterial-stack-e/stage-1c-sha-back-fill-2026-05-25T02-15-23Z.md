---
date: 2026-05-25T02-15-23Z
author: mpm-multimaterial-stack-e-stage-1c-agent
phase: 2
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-1c-sha-backfill
subject: "Stage-1c SHA back-fill ledger (Convention #12 + N1 enumeration). The Stage-1c checkpoint head_sha is back-filled to its committing commit (COMMIT 2 -> a53a8316). The preceding COMMIT 1 (equivalence.md per-field witness + test docstring cleanup; 12bc66c9) carries no head_sha (sim-spec doc + test, not an audit) -> recorded for the chain, no back-fill. This ledger is the TERMINAL Stage-1c artifact; its own committing commit (COMMIT 3) is the recursion-stopper, reported in the coordinator summary. Never --amend."
verdict-state: CONFIRMED
head_sha: a53a8316e608c6c24b4351821f5e3ac031fc5e74
head_sha_at_checkpoint: a53a8316e608c6c24b4351821f5e3ac031fc5e74
parent_audits:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1c-checkpoint-2026-05-25T02-15-23Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1c-checkpoint-2026-05-25T02-15-23Z.md
---

# Stage-1c SHA Back-Fill Ledger — Sub-Phase MPM-Multimaterial-Stack-E

(Convention #12 SHA back-fill, FINAL Stage-1c commit; SEPARATE commit, never `--amend`.
N1-enumeration discipline per `sub-phase-audit-chain-correctness` N1 — enumerate EVERY
placeholder-bearing audit committed in the chain.)

## § 1. Enumeration of placeholder-bearing audits

(FACT — `grep -rn 'COMMIT_._SHA_PENDING'` over the Stage-1c chain before COMMIT 3.)

| Artifact | Commit | Placeholder | Back-fill |
|---|---|---|---|
| `equivalence.md` Stack-E per-field witness + `test_cross_stack_equivalence.py` docstring cleanup | `12bc66c9bb8ded896333d8fcb6a1032b8f316b83` (COMMIT 1) | NONE (sim-spec doc + test; not an audit) | — (recorded) |
| `stage-1c-checkpoint-2026-05-25T02-15-23Z.md` (+ 3 evidence `.txt`) | `a53a8316e608c6c24b4351821f5e3ac031fc5e74` (COMMIT 2) | `<COMMIT_2_SHA_PENDING>` ×1 (front-matter `head_sha`) | front-matter → `a53a8316…` |
| this ledger (`stage-1c-sha-back-fill-…md`) | COMMIT 3 (this commit; recursion-stopper) | NONE | reported in coordinator summary; NOT further back-filled |

`head_sha_at_checkpoint` was filled at write-time (no placeholder): the checkpoint's =
`12bc66c9bb8ded896333d8fcb6a1032b8f316b83` (COMMIT 1, the HEAD at checkpoint-write-time).
Only the checkpoint's OWN committing-commit `head_sha` was deferred.

## § 2. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling the checkpoint's `head_sha` EDITS its blob, so the checkpoint's committed-blob
sha256 CHANGES between COMMIT 2 (`a53a8316`) and this back-fill commit. Per the N2
precedent, downstream artifacts citing the checkpoint's committed-blob sha256 must use the
post-back-fill HEAD value. **No within-stage downstream artifact cites the checkpoint's own
blob sha** (this ledger references the checkpoint by PATH, not sha). The three evidence
`.txt` files cited by committed-blob sha256 in the checkpoint front-matter
(`stage-1c-gate14-equivalence` `51951f3c…`; `stage-1c-replay` `9399fc33…`;
`stage-1c-integrity-sweep` `c19492ad…`) are STABLE — the back-fill does not edit those
files (verified: `git show COMMIT_2:<path> | sha256sum` matched the front-matter values
before this back-fill).

## § 3. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1)

Every sha256 this chain records is the committed-blob sha256 (`git show HEAD:<path>` after
commit). The three Stage-1c evidence `.txt` files each end with a trailing newline, so the
`end-of-file-fixer` hook left them unchanged at COMMIT 2 (hook reported "Passed"); their
recorded committed-blob sha256s equal their working-tree content sha256s. The
`equivalence.md` committed-blob sha256 is `b6ccc014…` (COMMIT 1; recorded in the checkpoint
§ 6).

## § 4. Terminal recursion-stopper

This ledger is the FINAL Stage-1c commit. Its own committing commit (COMMIT 3) is NOT
back-filled (conventions § B.2: reported in the agent's final summary). Its `head_sha`
reflects write-time HEAD (`a53a8316`, the checkpoint commit).

## § 5. Verdict

**CONFIRMED.** The single placeholder-bearing audit (the checkpoint) is back-filled to its
committing-commit SHA in this separate commit (never `--amend`). Stage-1c chain complete:
equivalence.md witness + test cleanup (`12bc66c9`) → checkpoint + evidence (`a53a8316`) →
this back-fill (COMMIT 3). Formal gate-14 BIT-EXACT (`within_tolerance=True`,
`max_abs_err = max_rel_err = 0.0` across 4 fields × 11 frames; matches S1b-ME2 exactly);
`equivalence.md` Stack-E witness authored ADDITIVELY (159 ins / 0 del; Convention A); D7
override REUSE verified (no edit). Integrity baseline-MATCH (`c19492ad…`); replay HELD
(`9399fc33…`, 46th). 2 shifts (S1c-1, S1c-2); cumulative 189 → 191. No `-phase-N` tag (D12).
Local-only (D13). Operator routes Stage 2 (landing) separately.
