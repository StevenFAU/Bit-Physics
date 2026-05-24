---
date: 2026-05-24T15-00-37Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: stage
artifact_id: ci-action-migration-and-banked-cleanup-stage1a-sha-backfill
subject: "Stage 1a SHA back-fill ledger (Convention #12 + N1 enumeration). Single placeholder-bearing audit committed at Stage 1a: the Stage-1a checkpoint -> head_sha back-filled to e67c3cd. The migration feat (8508ed9) is a code commit (no head_sha front-matter) and the post-edit replay evidence .txt carries no head_sha -> neither requires back-fill. Terminal back-fill (recursion-stopper); this ledger's committing commit (COMMIT N+2) is reported in the coordinator summary, NOT further back-filled. Never --amend."
verdict-state: CONFIRMED
head_sha: e67c3cdc35aed426dec885a60783ea370402e0a8
head_sha_at_checkpoint: e67c3cdc35aed426dec885a60783ea370402e0a8
parent_audits:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1a-checkpoint-2026-05-24T15-00-37Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1a-checkpoint-2026-05-24T15-00-37Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1a-evidence/replay-postedit-2026-05-24T15-00-37Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1a-evidence/replay-postedit-2026-05-24T15-00-37Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
---

# Stage 1a SHA Back-Fill Ledger — Sub-Phase CI-Action-Migration-and-Banked-Cleanup

(Convention #12 SHA back-fill, FINAL Stage-1a commit; SEPARATE commit, never `--amend`. N1-tightened
enumeration per `sub-phase-audit-chain-correctness` Stage-1b N1 — enumerate EVERY placeholder-bearing
audit committed at Stage 1a.)

## § 1. Enumeration of placeholder-bearing Stage-1a audits

(FACT — `grep -rn 'SHA_PENDING'` over the Stage-1a chain before this commit; each audit's `head_sha`
back-filled to its OWN committing-commit SHA, captured via `git rev-parse`.)

| Artifact | Placeholders | Committing commit (head_sha) |
|---|---|---|
| `stage-1a-checkpoint-2026-05-24T15-00-37Z.md` | `<COMMIT_N1_SHA_PENDING>` ×3 (head_sha, head_sha_at_checkpoint, closing line) | `e67c3cdc35aed426dec885a60783ea370402e0a8` |
| migration feat (9 workflows) | NONE (code commit; no front-matter) | `8508ed90e3cda6d4412e595295d4548199f300fa` (recorded for the chain; no back-fill) |
| `stage-1a-evidence/replay-postedit-2026-05-24T15-00-37Z.txt` | NONE (replay output; no front-matter) | committed with the checkpoint (`e67c3cd`); sha256 `9399fc33…909f34` (= bit-identity invariant; stable) |
| this ledger (`stage-1a-sha-back-fill-…md`) | NONE | COMMIT N+2 (this commit; the recursion-stopper) |

**Single placeholder-bearing audit at Stage 1a: the checkpoint.**

## § 2. Back-fill-induced sha-drift + commit-first-then-sha256

Back-filling the checkpoint's `head_sha` EDITS its blob, so its committed-blob sha256 changes between
its first commit (`e67c3cd`) and this back-fill commit. Downstream citations of the checkpoint sha256
must use the **post-back-fill HEAD value** (verify via `git show <this-commit>:<path> | sha256sum`, do
NOT transcribe — audit-chain-correctness § 9 N2). Every sha256 this chain records is the committed-blob
sha256 (read after commit), NOT in-memory pre-hook content (conventions § B.6 Mode 3). The post-edit
replay evidence `.txt` carries no `head_sha`; its sha256 `9399fc33…909f34` (the bit-identity invariant)
is stable.

## § 3. Terminal recursion-stopper

This ledger is the FINAL Stage-1a commit; its committing commit (COMMIT N+2) is NOT itself back-filled
(conventions § B.2 — you do not back-fill the back-fill). Its `head_sha` reflects write-time HEAD
(`e67c3cd`, the checkpoint commit); COMMIT N+2's SHA + the post-back-fill checkpoint sha256 are reported
in the coordinator summary, regenerated at summary-composition time.

## § 4. Verdict

**CONFIRMED.** The single placeholder-bearing Stage-1a audit (the checkpoint) enumerated + back-filled
to its committing-commit SHA `e67c3cd` in this single separate commit (never `--amend`). Stage-1a chain
complete: migration feat (`8508ed9`) → checkpoint (`e67c3cd`) → this back-fill (COMMIT N+2). No
`-phase-N` tag. Operator routes Stage 1b separately.
