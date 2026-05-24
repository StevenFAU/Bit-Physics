---
date: 2026-05-24T15-29-43Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: sub-phase
artifact_id: ci-action-migration-and-banked-cleanup-landing-sha-backfill
subject: "Landing SHA back-fill ledger (Convention #12 + N1 enumeration). Single placeholder-bearing artifact committed at Stage 2: the sub-phase landing audit -> head_sha back-filled to 1ab6913. CHANGELOG.md, the conventions § J amendment, and the stage-2-evidence .txt files carry no head_sha -> none require back-fill. Terminal back-fill (recursion-stopper); this ledger's committing commit is reported in the coordinator summary, NOT further back-filled. Never --amend. SUB-PHASE LANDING-COMPLETE LOCALLY; push is operator action."
verdict-state: CONFIRMED
head_sha: 1ab69139076fa83929100336145a5a558ca29ee9
head_sha_at_checkpoint: 1ab69139076fa83929100336145a5a558ca29ee9
parent_audits:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/landing-2026-05-24T15-29-43Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/landing-2026-05-24T15-29-43Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-2-evidence/replay-2026-05-24T15-29-43Z.txt
evidence_hashes:
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-2-evidence/replay-2026-05-24T15-29-43Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
---

# Landing SHA Back-Fill Ledger — Sub-Phase CI-Action-Migration-and-Banked-Cleanup

(Convention #12 SHA back-fill, FINAL sub-phase commit; SEPARATE commit, never `--amend`. N1-tightened
enumeration per `sub-phase-audit-chain-correctness` Stage-1b N1.)

## § 1. Enumeration of placeholder-bearing Stage-2 artifacts

(FACT — `grep -rn 'SHA_PENDING'` over the Stage-2 changeset before this commit; back-filled to the
committing-commit SHA via `git rev-parse`.)

| Artifact | Placeholders | Committing commit (head_sha) |
|---|---|---|
| `landing-2026-05-24T15-29-43Z.md` | `<COMMIT_N_SHA_PENDING>` ×3 (head_sha, head_sha_at_checkpoint, closing line) | `1ab69139076fa83929100336145a5a558ca29ee9` |
| `CHANGELOG.md` (additive entry) | NONE | committed with the landing (`1ab6913`); no front-matter |
| `docs/conventions/sub-phase-conventions.md` (§ J amendment) | NONE | committed with the landing (`1ab6913`); sha256 `4ac8341a…037e0b` |
| `stage-2-evidence/{python-sweep,integrity-sweep,replay,ts-sweep}-…txt` | NONE | committed with the landing (`1ab6913`); integrity `c19492ad…` (= MPM-close baseline) + replay `9399fc33…` (= bit-identity invariant) |
| this ledger (`landing-sha-back-fill-…md`) | NONE | the back-fill commit (this commit; the recursion-stopper) |

**Single placeholder-bearing artifact at Stage 2: the landing audit.**

## § 2. Back-fill-induced sha-drift + commit-first-then-sha256

Back-filling the landing audit's `head_sha` EDITS its blob, so its committed-blob sha256 changes between
its first commit (`1ab6913`) and this back-fill commit. Downstream citations of the landing sha256 must
use the **post-back-fill HEAD value** (verify via `git show <this-commit>:<path> | sha256sum`, do NOT
transcribe — audit-chain-correctness § 9 N2). The landing audit's recorded `evidence_hashes` (integrity
`c19492ad…`, replay `9399fc33…`, conventions `4ac8341a…`) were verified committed-clean at `1ab6913`
(commit-first-then-sha256; conventions § B.6 Mode 3). The conventions doc + evidence `.txt` files carry
no `head_sha` and are unaffected by this back-fill.

## § 3. Terminal recursion-stopper

This ledger is the FINAL sub-phase commit; its committing commit is NOT itself back-filled (conventions
§ B.2 — you do not back-fill the back-fill). Its `head_sha` reflects write-time HEAD (`1ab6913`, the
landing commit); the back-fill commit SHA + the post-back-fill landing sha256 are reported in the
coordinator summary, regenerated at summary-composition time.

## § 4. Verdict

**CONFIRMED.** The single placeholder-bearing Stage-2 artifact (the landing audit) enumerated +
back-filled to its committing-commit SHA `1ab6913` in this single separate commit (never `--amend`).
**Sub-phase audit chain complete** (plan-drafting → Stage 0 → Stage 1a → Stage 1b → Stage 2 landing →
this back-fill). No `-phase-N` tag. **SUB-PHASE LANDING-COMPLETE LOCALLY; push is operator action**
(remote-CI validation of the S-CI2 bumps pending).
