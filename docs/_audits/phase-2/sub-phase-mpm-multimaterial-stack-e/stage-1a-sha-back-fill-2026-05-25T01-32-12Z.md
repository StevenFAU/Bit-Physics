---
date: 2026-05-25T01-32-12Z
author: mpm-multimaterial-stack-e-stage-1a-agent
phase: 2
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-1a-sha-backfill
subject: "Stage-1a SHA back-fill ledger (Convention #12 + N1 enumeration). The Stage-1a checkpoint head_sha is back-filled to its committing commit (COMMIT 3 -> 3f521943). The two source commits (COMMIT 1 scaffold-RED 88687b17; COMMIT 2 impl-GREEN a450e6fc) carry no head_sha (source/perf-ledger/capture, not audits) -> recorded for the chain, no back-fill. This ledger is the TERMINAL Stage-1a artifact; its own committing commit (COMMIT 4) is the recursion-stopper, reported in the coordinator summary. Never --amend."
verdict-state: CONFIRMED
head_sha: 3f521943639c6d5d0ab1b68527350d881c4799d2
head_sha_at_checkpoint: 3f521943639c6d5d0ab1b68527350d881c4799d2
parent_audits:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1a-checkpoint-2026-05-25T01-32-12Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1a-checkpoint-2026-05-25T01-32-12Z.md
---

# Stage-1a SHA Back-Fill Ledger — Sub-Phase MPM-Multimaterial-Stack-E

(Convention #12 SHA back-fill, FINAL Stage-1a commit; SEPARATE commit, never `--amend`.
N1-enumeration discipline per `sub-phase-audit-chain-correctness` Stage-1b N1 — enumerate
EVERY placeholder-bearing audit committed in the chain.)

## § 1. Enumeration of placeholder-bearing audits

(FACT — `grep -rn 'COMMIT_._SHA_PENDING'` over the Stage-1a chain before COMMIT 4.)

| Artifact | Commit | Placeholder | Back-fill |
|---|---|---|---|
| scaffold + 21st member (RED anchor) | `88687b171e7a13480349ccc41c57b3cf33da92dc` (COMMIT 1) | NONE (source + tests + root pyproject + uv.lock; not an audit) | — (recorded; the gate-13 replay anchor) |
| Warp MLS-MPM implementation (GREEN) | `a450e6fceee7fa13306b074307f8a8dc013648f5` (COMMIT 2) | NONE (source + capture + perf-ledger; not an audit) | — (recorded) |
| `stage-1a-checkpoint-2026-05-25T01-32-12Z.md` | `3f521943639c6d5d0ab1b68527350d881c4799d2` (COMMIT 3) | `<COMMIT_3_SHA_PENDING>` ×1 (front-matter `head_sha`) | front-matter → `3f521943…` |
| this ledger (`stage-1a-sha-back-fill-…md`) | COMMIT 4 (this commit; recursion-stopper) | NONE | reported in coordinator summary; NOT further back-filled |

`head_sha_at_checkpoint` was filled at write-time (no placeholder): the checkpoint's =
`a450e6fceee7fa13306b074307f8a8dc013648f5` (COMMIT 2, the HEAD at checkpoint-write-time).
Only the checkpoint's OWN committing-commit `head_sha` was deferred.

## § 2. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling the checkpoint's `head_sha` EDITS its blob, so the checkpoint's committed-blob
sha256 CHANGES between COMMIT 3 (`3f521943`) and this back-fill commit. Per the N2 precedent,
downstream artifacts citing the checkpoint's committed-blob sha256 must use the post-back-fill
HEAD value (regenerate via `git show <this-commit>:<path> | sha256sum`; never transcribe). The
gate-9 capture sha256s recorded in the checkpoint (`.h5` LFS oid `689609bb…227c9e`; `.json`
`621d96bd…f533`) are STABLE — the back-fill does not edit the capture files.

## § 3. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1)

Every sha256 this chain records is the committed-blob sha256 (`git show HEAD:<path>` after
commit) — the `end-of-file-fixer` hook appended a trailing newline to the gate-9 capture
`.json` at COMMIT 2 (conventions § B.6 Mode 3); the recorded `.json` sha256 `621d96bd…f533`
is the POST-hook committed blob.

## § 4. Terminal recursion-stopper

This ledger is the FINAL Stage-1a commit. Its own committing commit (COMMIT 4) is NOT
back-filled (conventions § B.2: reported in the agent's final summary, not committed into a
further audit). Its `head_sha` reflects write-time HEAD (`3f521943`, the checkpoint commit).

## § 5. Verdict

**CONFIRMED.** The single placeholder-bearing audit (the checkpoint) is back-filled to its
committing-commit SHA in this separate commit (never `--amend`). Stage-1a chain complete:
scaffold-RED (`88687b17`) → impl-GREEN (`a450e6fc`) → checkpoint (`3f521943`) → this back-fill
(COMMIT 4). Gates 4–13 GREEN; R-A1 anchor EXACT; integrity baseline-MATCH; replay HELD. 5
shifts (S1a-ME1..S1a-ME5); cumulative 182 → 187. No `-phase-N` tag (D12). Local-only (D13).
Operator routes Stage 1b separately.
