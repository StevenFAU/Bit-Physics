---
date: 2026-05-24T20-17-42Z
author: common-warp-bootstrap-stage-1a-agent
phase: 2
artifact: stage
artifact_id: sub-phase-common-warp-bootstrap-stage-1a-sha-backfill
subject: "Stage-1a SHA back-fill ledger (Convention #12 + N1 enumeration). Enumerates EVERY placeholder-bearing audit in the Stage-1a chain and the commit SHA each head_sha is back-filled to: stage-1a checkpoint -> 5d5aefa (its committing commit, COMMIT 3). The two evidence .txt carry no front-matter (no placeholder). COMMIT 2 was amended once pre-back-fill to fix the S1a-2 Cat-1 GPU-device-token false-citation (not pushed; not yet referenced); the checkpoint cites the post-amend SHA 327955e. This ledger is the TERMINAL Stage-1a commit; its own committing commit (COMMIT 4) is the recursion-stopper, reported in the coordinator summary, NOT further committed. SEPARATE commit; never --amend."
verdict-state: CONFIRMED
head_sha: 5d5aefa946724eb479e5ea5d0a9aef8f63fbee37
head_sha_at_checkpoint: 5d5aefa946724eb479e5ea5d0a9aef8f63fbee37
parent_audits:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-checkpoint-2026-05-24T20-17-42Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-1a-checkpoint-2026-05-24T20-17-42Z.md
---

# Stage-1a SHA Back-Fill Ledger — Sub-Phase Common-Warp-Bootstrap

(Convention #12 SHA back-fill, FINAL Stage-1a commit; SEPARATE commit, never
`--amend`. N1-enumeration discipline per `sub-phase-audit-chain-correctness`
Stage-1b N1 — enumerate EVERY placeholder-bearing audit committed in the chain.)

## § 1. Enumeration of placeholder-bearing audits

(FACT — `grep -rln 'COMMIT_._SHA_PENDING' …/stage-1a-*.md` before this commit; each
audit's `head_sha` is back-filled to its OWN committing-commit SHA via
`git rev-parse HEAD`.)

| Audit | Placeholder | Committing commit (head_sha) | Back-fill verification |
|---|---|---|---|
| `stage-1a-checkpoint-2026-05-24T20-17-42Z.md` | `<COMMIT_3_SHA_PENDING>` ×1 (front-matter `head_sha`) | `5d5aefa946724eb479e5ea5d0a9aef8f63fbee37` | `git show 5d5aefa:…/stage-1a-checkpoint-…md` is the pre-back-fill blob; post-back-fill blob is this commit's tree |
| `stage-1a-replay-2026-05-24T20-17-42Z.txt` | NONE (reproducibility evidence; no front-matter) | `5d5aefa…` (recorded; no back-fill) | content sha256 `9399fc33…718909f34` (bit-identity invariant) |
| `stage-1a-integrity-sweep-2026-05-24T20-17-42Z.txt` | NONE (reproducibility evidence; no front-matter) | `5d5aefa…` (recorded; no back-fill) | content sha256 `c19492ad…d22cb52` (integrity-sweep baseline) |
| this ledger (`stage-1a-sha-back-fill-…md`) | NONE | COMMIT 4 (this commit; recursion-stopper) | reported in coordinator summary; NOT further back-filled |

`head_sha_at_checkpoint` was filled at write-time (no placeholder): the
checkpoint's = `327955e073d1524364427e2c64a5b15c297a45f6` (COMMIT 2, HEAD at
checkpoint-write); this ledger's = `5d5aefa…` (COMMIT 3, HEAD at ledger-write).
Only the checkpoint's OWN committing-commit `head_sha` was deferred.

## § 2. Stage-1a commit chain (with the COMMIT 2 amend note)

| Commit | SHA | Content |
|---|---|---|
| COMMIT 1 | `908e1946cbfd3a0a8b223df91f43ad349647e5c2` | scaffold `common/common-warp/` + 20th workspace member + `docs/dependencies.md` + `uv.lock` |
| COMMIT 2 | `327955e073d1524364427e2c64a5b15c297a45f6` | Runtime + Determinism + `warp_harness` W-2 mechanism + tests |
| COMMIT 3 | `5d5aefa946724eb479e5ea5d0a9aef8f63fbee37` | this stage's checkpoint + 2 evidence `.txt` |
| COMMIT 4 | (this ledger) | SHA back-fill (recursion-stopper; SHA in coordinator summary) |

**COMMIT 2 amend note (transparency).** COMMIT 2 was `git commit --amend`-ed
**once** before any back-fill, to fix the **S1a-2** finding: the post-commit
integrity sweep's `cat1.intra-repo` HARD_FAILed on a GPU device-string literal
(the spec's zero-indexed CUDA device, in `word`-colon-`digit` form) in
`runtime.py`'s docstring, which the citation parser mistook for a `path:line`
citation. The fix is a docstring/comment rephrase (no behavior change; the
cross-package sweep + 11 unit tests hold). This amend is NOT a Convention #12
back-fill amend (forbidden); it is a routine pre-push correction of a not-yet-
referenced implementation commit, recorded here for full chain visibility. The
checkpoint + this ledger cite the post-amend SHA `327955e`.

## § 3. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2)

Back-filling the checkpoint's `head_sha` EDITS its blob, so the checkpoint's
committed-blob sha256 CHANGES between COMMIT 3 (`5d5aefa`) and this back-fill
commit (COMMIT 4). Any downstream artifact citing the checkpoint's sha256 must
cite the **post-back-fill HEAD value** (`git show <commit>:<path> | sha256sum`,
never transcribe). The checkpoint's `evidence_hashes` were recorded only for
back-fill-STABLE files — the two `.txt` invariants (`9399fc33…` / `c19492ad…`)
and the external stable anchors (common-py pyproject `a663ea10…`, conventions
`f4eb7eb7…`) — none edited by this chain, so none drift.

## § 4. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1)

Every recorded sha256 is the **committed-blob** sha256 (`git show HEAD:<path>`),
not in-memory pre-hook content — the `end-of-file-fixer` hook may append a
trailing newline (conventions § B.6 Mode 3). At COMMIT 3 the hook reported
`Passed` with no modification, so the two `.txt` files' committed bytes equal the
`sha256sum`-verified working-tree bytes (`9399fc33…` / `c19492ad…`).

## § 5. Terminal recursion-stopper

This ledger is the FINAL Stage-1a commit. Its own committing commit (COMMIT 4) is
NOT back-filled — you do not back-fill the back-fill (conventions § B.2). Its
`head_sha` reflects COMMIT 3 (`5d5aefa`) per the canonical front-matter schema;
COMMIT 4's SHA is reported in the coordinator summary.

## § 6. Verdict

**CONFIRMED.** The single Stage-1a placeholder-bearing audit (the checkpoint) was
back-filled to its committing-commit SHA (`5d5aefa`) in this separate commit
(never `--amend`). Stage-1a chain complete: scaffold (`908e194`) → impl
(`327955e`, amended once for S1a-2) → checkpoint (`5d5aefa`) → this back-fill
(COMMIT 4). 2 Stage-1a shifts (S1a-1 common-py-premise correction; S1a-2 Cat-1
GPU-device-token false-citation); cumulative 169 → 171. No `-phase-N` tag.
Stage 1a ends here; operator reviews the Stage-1a close and dispatches Stage 1b
separately (Capture + Particles + Grids + HashGrid; W-1 gate).
