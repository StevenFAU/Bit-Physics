---
date: 2026-05-24T15-10-34Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: stage
artifact_id: ci-action-migration-and-banked-cleanup-stage1b-sha-backfill
subject: "Stage 1b SHA back-fill ledger (Convention #12 + N1 enumeration). Single placeholder-bearing audit committed at Stage 1b: the Stage-1b checkpoint -> head_sha back-filled to cc1071a. The two feat commits (manifest test 7ce5d76; pytest-timeout b580ed0) are code/config commits (no head_sha front-matter) and the three stage-1b-evidence .txt files carry no head_sha -> none require back-fill. Terminal back-fill (recursion-stopper); this ledger's committing commit (COMMIT N+2) is reported in the coordinator summary, NOT further back-filled. Never --amend."
verdict-state: CONFIRMED
head_sha: cc1071a86eccb019ced05dd1e1786446c5baf428
head_sha_at_checkpoint: cc1071a86eccb019ced05dd1e1786446c5baf428
parent_audits:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-checkpoint-2026-05-24T15-10-34Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-checkpoint-2026-05-24T15-10-34Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-evidence/replay-2026-05-24T15-10-34Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1b-evidence/replay-2026-05-24T15-10-34Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
---

# Stage 1b SHA Back-Fill Ledger — Sub-Phase CI-Action-Migration-and-Banked-Cleanup

(Convention #12 SHA back-fill, FINAL Stage-1b commit; SEPARATE commit, never `--amend`. N1-tightened
enumeration per `sub-phase-audit-chain-correctness` Stage-1b N1 — enumerate EVERY placeholder-bearing
audit committed at Stage 1b.)

## § 1. Enumeration of placeholder-bearing Stage-1b audits

(FACT — `grep -rn 'SHA_PENDING'` over the Stage-1b chain before this commit; each audit's `head_sha`
back-filled to its OWN committing-commit SHA, captured via `git rev-parse`.)

| Artifact | Placeholders | Committing commit (head_sha) |
|---|---|---|
| `stage-1b-checkpoint-2026-05-24T15-10-34Z.md` | `<COMMIT_N1_SHA_PENDING>` ×3 (head_sha, head_sha_at_checkpoint, closing line) | `cc1071a86eccb019ced05dd1e1786446c5baf428` |
| manifest-equality test (`test_manifest_equality.py`) | NONE (test code; no front-matter) | `7ce5d76faad547f2e58f5305b711ab44d206ebbf` (recorded for the chain; no back-fill) |
| pytest-timeout integration (`pyproject.toml` + `uv.lock`) | NONE (config; no front-matter) | `b580ed098e3033d1949213ce57690bc26b6982d3` (recorded for the chain; no back-fill) |
| `stage-1b-evidence/{python-sweep,integrity-sweep,replay}-…txt` | NONE (tool outputs; no front-matter) | committed with the checkpoint (`cc1071a`); replay sha256 `9399fc33…909f34` (= bit-identity invariant; stable) |
| this ledger (`stage-1b-sha-back-fill-…md`) | NONE | COMMIT N+2 (this commit; the recursion-stopper) |

**Single placeholder-bearing audit at Stage 1b: the checkpoint.**

## § 2. Back-fill-induced sha-drift + commit-first-then-sha256

Back-filling the checkpoint's `head_sha` EDITS its blob, so its committed-blob sha256 changes between
its first commit (`cc1071a`) and this back-fill commit. Downstream citations of the checkpoint sha256
must use the **post-back-fill HEAD value** (verify via `git show <this-commit>:<path> | sha256sum`, do
NOT transcribe — audit-chain-correctness § 9 N2). Every sha256 this chain records is the committed-blob
sha256 (read after commit): the three Stage-1b evidence `.txt` files verified committed-clean (no
`end-of-file-fixer` trailing-newline phantom; conventions § B.6 Mode 3) — `python-sweep` `fbae1219…`,
`integrity-sweep` `c19492ad…` (= MPM-close baseline), `replay` `9399fc33…` (= bit-identity invariant).

## § 3. Terminal recursion-stopper

This ledger is the FINAL Stage-1b commit; its committing commit (COMMIT N+2) is NOT itself back-filled
(conventions § B.2 — you do not back-fill the back-fill). Its `head_sha` reflects write-time HEAD
(`cc1071a`, the checkpoint commit); COMMIT N+2's SHA + the post-back-fill checkpoint sha256 are reported
in the coordinator summary, regenerated at summary-composition time.

## § 4. Verdict

**CONFIRMED.** The single placeholder-bearing Stage-1b audit (the checkpoint) enumerated + back-filled
to its committing-commit SHA `cc1071a` in this single separate commit (never `--amend`). Stage-1b chain
complete: manifest test (`7ce5d76`) → pytest-timeout (`b580ed0`) → checkpoint (`cc1071a`) → this
back-fill (COMMIT N+2). No `-phase-N` tag. Operator routes Stage 2 separately.
