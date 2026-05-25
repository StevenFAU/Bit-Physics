---
date: 2026-05-25T00-59-10Z
author: mpm-multimaterial-stack-e-stage-0-agent
phase: 2
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-0-sha-backfill
subject: "Stage-0 SHA back-fill ledger (Convention #12 + N1 enumeration). Enumerates EVERY placeholder-bearing audit committed in the Stage-0 chain and the commit SHA each head_sha is back-filled to: stage-0 checkpoint -> 1333384a; stage-0 warp-p2g-determinism evidence -> 1333384a (both committed in COMMIT 1). The replay + integrity-sweep .txt evidence carry no head_sha (raw tool output, not audits). This ledger is the TERMINAL Stage-0 artifact; its own committing commit (COMMIT 2) is the recursion-stopper, reported in the coordinator summary, NOT further committed. Never --amend."
verdict-state: CONFIRMED
head_sha: 1333384a9c5761a589b3d220e18171295a151477
head_sha_at_checkpoint: 1333384a9c5761a589b3d220e18171295a151477
parent_audits:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-checkpoint-2026-05-25T00-59-10Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-checkpoint-2026-05-25T00-59-10Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-0-evidence-warp-p2g-determinism-2026-05-25T00-59-10Z.md
---

# Stage-0 SHA Back-Fill Ledger — Sub-Phase MPM-Multimaterial-Stack-E

(Convention #12 SHA back-fill, FINAL Stage-0 commit; SEPARATE commit, never `--amend`.
N1-enumeration discipline per `sub-phase-audit-chain-correctness` Stage-1b N1 — enumerate
EVERY placeholder-bearing audit committed in the chain.)

## § 1. Enumeration of placeholder-bearing audits

(FACT — `grep -rn 'COMMIT_._SHA_PENDING'` over the Stage-0 chain before COMMIT 2; each
audit's `head_sha` is back-filled to its OWN committing-commit SHA, captured via
`git rev-parse`.)

| Audit | Placeholder | Committing commit (head_sha) | Back-fill |
|---|---|---|---|
| `stage-0-checkpoint-2026-05-25T00-59-10Z.md` | `<COMMIT_1_SHA_PENDING>` ×1 (front-matter `head_sha`) | `1333384a9c5761a589b3d220e18171295a151477` | front-matter → `1333384a…` |
| `stage-0-evidence-warp-p2g-determinism-2026-05-25T00-59-10Z.md` | `<COMMIT_1_SHA_PENDING>` ×1 (front-matter `head_sha`) | `1333384a9c5761a589b3d220e18171295a151477` (same COMMIT 1) | front-matter → `1333384a…` |
| `stage-0-replay-2026-05-25T00-59-10Z.txt` | NONE (raw tool output; no front-matter) | `1333384a…` (recorded; no back-fill) | — |
| `stage-0-integrity-sweep-2026-05-25T00-59-10Z.txt` | NONE (raw tool output; no front-matter) | `1333384a…` (recorded; no back-fill) | — |
| this ledger (`stage-0-sha-back-fill-…md`) | NONE | COMMIT 2 (this commit; the recursion-stopper) | reported in coordinator summary; NOT further back-filled |

`head_sha_at_checkpoint` was filled at write-time (no placeholder): the checkpoint's +
evidence's = `bc33ef11dfdca06e37cf89985cd2f3e5ea114239` (the pre-Stage-0 HEAD =
plan-drafting close). Only each audit's OWN committing-commit `head_sha` was deferred.

## § 2. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling a `head_sha` EDITS the audit's blob, so the checkpoint's + evidence's
committed-blob sha256 CHANGE between COMMIT 1 (`1333384a`) and this back-fill commit.
Per the N2 precedent, downstream artifacts citing those committed-blob sha256s must use
the **post-back-fill HEAD value** (regenerate via `git show <this-commit>:<path> |
sha256sum`; never transcribe). The two `.txt` evidence files are NOT edited by the
back-fill, so their `evidence_hashes` recorded in the checkpoint front-matter
(`9399fc33…718909f34` replay, `c19492ad…d22cb52` integrity) are STABLE and remain valid
post-back-fill.

## § 3. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1)

Every sha256 this chain records is the **committed-blob** sha256 (`git show HEAD:<path>`
after commit / `sha256sum` on the committed working-tree blob), NOT in-memory pre-hook
content — the `end-of-file-fixer` hook may append a trailing newline (conventions § B.6
Mode 3). The replay/integrity `.txt` hashes were computed on the committed blobs and
match the bit-identity replay invariant + integrity baseline exactly.

## § 4. Terminal recursion-stopper

This ledger is the FINAL Stage-0 commit. Its own committing commit (COMMIT 2) is NOT
itself back-filled — you do not back-fill the back-fill (conventions § B.2: the back-fill
commit SHA is reported in the agent's final summary, not committed into a further audit).
Its `head_sha` reflects write-time HEAD (`1333384a`, the checkpoint commit); COMMIT 2's
SHA is in the coordinator summary.

## § 5. Verdict

**CONFIRMED.** All placeholder-bearing audits enumerated + back-filled to their own
committing-commit SHAs in this single separate commit (never `--amend`). Stage-0 chain
complete: checkpoint + evidence (`1333384a`) → this back-fill (COMMIT 2). 1 Stage-0 shift
(S0-ME1 O-W7 extension); cumulative 181 → 182. No `-phase-N` tag (D12). Local-only (D13).
Operator routes Stage 1a separately.
