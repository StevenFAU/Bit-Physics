---
date: 2026-05-24T14-48-58Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: stage
artifact_id: ci-action-migration-and-banked-cleanup-stage0-sha-backfill
subject: "Stage 0 SHA back-fill ledger (Convention #12 + N1 enumeration). Enumerates EVERY placeholder-bearing audit committed at Stage 0: the Stage-0 checkpoint -> head_sha back-filled to 5b80a59. Single placeholder-bearing audit this stage (the replay evidence .txt carries no head_sha). Terminal back-fill (recursion-stopper); this ledger's committing commit (COMMIT N+1) is reported in the coordinator summary, NOT further back-filled. Never --amend. The audit-chain-correctness Stage-0 back-fill was commit-only (no ledger file); this sub-phase follows its own dispatch SECTION 5 and lands the ledger."
verdict-state: CONFIRMED
head_sha: 5b80a59c4964a7ef98cd358d69da9a7bf717e647
head_sha_at_checkpoint: 5b80a59c4964a7ef98cd358d69da9a7bf717e647
parent_audits:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-checkpoint-2026-05-24T14-48-58Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-checkpoint-2026-05-24T14-48-58Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-evidence/replay-2026-05-24T14-48-58Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-evidence/replay-2026-05-24T14-48-58Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
---

# Stage 0 SHA Back-Fill Ledger — Sub-Phase CI-Action-Migration-and-Banked-Cleanup

(Convention #12 SHA back-fill, FINAL Stage-0 commit; SEPARATE commit, never `--amend`. N1-tightened
enumeration per `sub-phase-audit-chain-correctness` Stage-1b N1 — enumerate EVERY placeholder-bearing
audit committed at Stage 0.)

## § 1. Enumeration of placeholder-bearing Stage-0 audits

(FACT — `grep -rn 'SHA_PENDING'` over the Stage-0 chain before this commit; each audit's `head_sha`
back-filled to its OWN committing-commit SHA, captured via `git rev-parse` / `git log`.)

| Audit | Placeholders | Committing commit (head_sha) |
|---|---|---|
| `stage-0-checkpoint-2026-05-24T14-48-58Z.md` | `<COMMIT_N_SHA_PENDING>` ×3 (head_sha, head_sha_at_checkpoint, closing line) | `5b80a59c4964a7ef98cd358d69da9a7bf717e647` |
| `stage-0-evidence/replay-2026-05-24T14-48-58Z.txt` | NONE (replay output; no front-matter) | committed with the checkpoint (`5b80a59`); sha256 `9399fc33…909f34` (= bit-identity invariant; stable) |
| this ledger (`stage-0-sha-back-fill-…md`) | NONE | COMMIT N+1 (this commit; the recursion-stopper) |

**Single placeholder-bearing audit at Stage 0: the checkpoint.** (Unlike plan-drafting, which had
two — probe + landing.)

## § 2. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling the checkpoint's `head_sha` EDITS its blob, so the checkpoint's committed-blob sha256
changes between its first commit (`5b80a59`) and this back-fill commit. Any downstream artifact
citing the checkpoint's sha256 must cite the **post-back-fill HEAD value** (verify via
`git show <this-commit>:<path> | sha256sum`, do NOT transcribe). The replay evidence `.txt` carries
no `head_sha` and is unaffected — its sha256 `9399fc33…909f34` (the bit-identity invariant) is stable.

## § 3. Commit-first-then-sha256 + terminal recursion-stopper

Every sha256 this chain records is the **committed-blob** sha256 (read via `git show HEAD:<path>`
after commit), NOT in-memory pre-hook content (`end-of-file-fixer` trailing-newline; conventions
§ B.6 Mode 3). This ledger is the FINAL Stage-0 commit; its committing commit (COMMIT N+1) is NOT
itself back-filled — you do not back-fill the back-fill (conventions § B.2). Its `head_sha` reflects
write-time HEAD (`5b80a59`, the checkpoint commit); COMMIT N+1's SHA + the post-back-fill checkpoint
sha256 are reported in the coordinator summary, regenerated at summary-composition time.

## § 4. Verdict

**CONFIRMED.** The single placeholder-bearing Stage-0 audit (the checkpoint) enumerated + back-filled
to its committing-commit SHA `5b80a59` in this single separate commit (never `--amend`). Stage-0 chain
complete: checkpoint (`5b80a59`) → this back-fill (COMMIT N+1). No `-phase-N` tag. Operator routes
Stage 1a separately.
