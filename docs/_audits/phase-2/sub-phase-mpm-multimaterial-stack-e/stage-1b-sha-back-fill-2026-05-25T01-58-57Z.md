---
date: 2026-05-25T01-58-57Z
author: mpm-multimaterial-stack-e-stage-1b-agent
phase: 2
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-e-stage-1b-sha-backfill
subject: "Stage-1b SHA back-fill ledger (Convention #12 + N1 enumeration). The Stage-1b checkpoint head_sha is back-filled to its committing commit (COMMIT 4 -> 443db05f). The three preceding commits (COMMIT 1 canonical-capture+perf-row 9d064b48; COMMIT 2 spec-sheet deadcc08; COMMIT 3 §L.6 O-W7 amendment 7a1c8fcf) carry no head_sha (capture/ledger/spec-doc/conventions-doc, not audits) -> recorded for the chain, no back-fill. This ledger is the TERMINAL Stage-1b artifact; its own committing commit (COMMIT 5) is the recursion-stopper, reported in the coordinator summary. Never --amend."
verdict-state: CONFIRMED
head_sha: 443db05f025efaa80211d31db1a5a6f0aa918e7b
head_sha_at_checkpoint: 443db05f025efaa80211d31db1a5a6f0aa918e7b
parent_audits:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1b-checkpoint-2026-05-25T01-58-57Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-e/stage-1b-checkpoint-2026-05-25T01-58-57Z.md
---

# Stage-1b SHA Back-Fill Ledger — Sub-Phase MPM-Multimaterial-Stack-E

(Convention #12 SHA back-fill, FINAL Stage-1b commit; SEPARATE commit, never `--amend`.
N1-enumeration discipline per `sub-phase-audit-chain-correctness` Stage-1b N1 — enumerate
EVERY placeholder-bearing audit committed in the chain.)

## § 1. Enumeration of placeholder-bearing audits

(FACT — `grep -rn 'COMMIT_._SHA_PENDING'` over the Stage-1b chain before COMMIT 5.)

| Artifact | Commit | Placeholder | Back-fill |
|---|---|---|---|
| canonical 128cube capture + perf-ledger row | `9d064b48a37e92d9f9647cd29dd6c73b73ddf877` (COMMIT 1) | NONE (capture + perf-ledger; not an audit) | — (recorded) |
| spec sheet `spec-ref-stack-e.md` | `deadcc08f4c5c89d965e15981c9b79aab7d5c497` (COMMIT 2) | NONE (sim-spec doc; not an audit) | — (recorded) |
| § L.6 O-W7 extension (conventions doc) | `7a1c8fcf7b7290fd7797df8db8b0c1f7f680f9ce` (COMMIT 3) | NONE (conventions doc; not an audit) | — (recorded) |
| `stage-1b-checkpoint-2026-05-25T01-58-57Z.md` | `443db05f025efaa80211d31db1a5a6f0aa918e7b` (COMMIT 4) | `<COMMIT_4_SHA_PENDING>` ×1 (front-matter `head_sha`) | front-matter → `443db05f…` |
| this ledger (`stage-1b-sha-back-fill-…md`) | COMMIT 5 (this commit; recursion-stopper) | NONE | reported in coordinator summary; NOT further back-filled |

`head_sha_at_checkpoint` was filled at write-time (no placeholder): the checkpoint's =
`7a1c8fcf7b7290fd7797df8db8b0c1f7f680f9ce` (COMMIT 3, the HEAD at checkpoint-write-time).
Only the checkpoint's OWN committing-commit `head_sha` was deferred.

## § 2. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling the checkpoint's `head_sha` EDITS its blob, so the checkpoint's committed-blob
sha256 CHANGES between COMMIT 4 (`443db05f`) and this back-fill commit. Per the N2
precedent, downstream artifacts citing the checkpoint's committed-blob sha256 must use the
post-back-fill HEAD value (regenerate via `git show <this-commit>:<path> | sha256sum`). The
canonical capture sha256s recorded in the checkpoint (`.h5` LFS oid `dfc4d699…4554d0a9`;
`.json` `29be120f…b23204`) + the post-§L.6 conventions sha256
(`3b97dc04…629d106c`) are STABLE — the back-fill does not edit those files.

## § 3. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1)

Every sha256 this chain records is the committed-blob sha256 (`git show HEAD:<path>` after
commit). The `end-of-file-fixer` hook appended a trailing newline to the canonical capture
`.json` at COMMIT 1 (§ B.6 Mode 3); the recorded `.json` sha256 `29be120f…b23204` is the
POST-hook committed blob. The `.h5` LFS oid `dfc4d699…4554d0a9` is the payload sha256
(unaffected by the sidecar EOF fix).

## § 4. Terminal recursion-stopper

This ledger is the FINAL Stage-1b commit. Its own committing commit (COMMIT 5) is NOT
back-filled (conventions § B.2: reported in the agent's final summary). Its `head_sha`
reflects write-time HEAD (`443db05f`, the checkpoint commit).

## § 5. Verdict

**CONFIRMED.** The single placeholder-bearing audit (the checkpoint) is back-filled to its
committing-commit SHA in this separate commit (never `--amend`). Stage-1b chain complete:
canonical-capture (`9d064b48`) → spec-sheet (`deadcc08`) → § L.6 amendment (`7a1c8fcf`) →
checkpoint (`443db05f`) → this back-fill (COMMIT 5). Canonical 128cube capture landed (2/2
determinism; mass-conservation 4.44e-16); gate-14 auto-confirmed BIT-EXACT (informational);
O-W7 extension formalized in § L.6. Integrity baseline-MATCH; replay HELD. 2 shifts
(S1b-ME1, S1b-ME2); cumulative 187 → 189. No `-phase-N` tag (D12). Local-only (D13).
Operator routes Stage 1c separately.
