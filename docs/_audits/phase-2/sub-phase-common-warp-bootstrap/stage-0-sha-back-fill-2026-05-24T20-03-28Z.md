---
date: 2026-05-24T20-03-28Z
author: common-warp-bootstrap-stage-0-agent
phase: 2
artifact: stage
artifact_id: sub-phase-common-warp-bootstrap-stage-0-sha-backfill
subject: "Stage-0 SHA back-fill ledger (Convention #12 + N1 enumeration). Enumerates EVERY placeholder-bearing audit committed in the Stage-0 chain (COMMIT 1 = dd7106e) and the commit SHA each head_sha is back-filled to: stage-0 checkpoint -> dd7106e; stage-0 determinism evidence -> dd7106e. Both placeholders were <COMMIT_1_SHA_PENDING> (the two Stage-0 audits landed in the single COMMIT 1). This ledger is the TERMINAL Stage-0 commit; its own committing commit (COMMIT 2) is the recursion-stopper (you do not back-fill the back-fill) and is reported in the coordinator summary, NOT further committed. SEPARATE commit; never --amend."
verdict-state: CONFIRMED
head_sha: dd7106e71fb9d27343c5d758b4c1e289ce83871d
head_sha_at_checkpoint: dd7106e71fb9d27343c5d758b4c1e289ce83871d
parent_audits:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-checkpoint-2026-05-24T20-03-28Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-evidence-warp-determinism-2026-05-24T20-03-28Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-checkpoint-2026-05-24T20-03-28Z.md
  - docs/_audits/phase-2/sub-phase-common-warp-bootstrap/stage-0-evidence-warp-determinism-2026-05-24T20-03-28Z.md
---

# Stage-0 SHA Back-Fill Ledger — Sub-Phase Common-Warp-Bootstrap

(Convention #12 SHA back-fill, FINAL Stage-0 commit; SEPARATE commit, never
`--amend`. N1-enumeration discipline per `sub-phase-audit-chain-correctness`
Stage-1b N1 — enumerate EVERY placeholder-bearing audit committed in the chain,
not just one.)

## § 1. Enumeration of placeholder-bearing audits

(FACT — `grep -rln 'COMMIT_._SHA_PENDING' docs/_audits/phase-2/sub-phase-common-warp-bootstrap/`
over the Stage-0 chain before this commit; each audit's `head_sha` is back-filled
to its OWN committing-commit SHA, captured via `git rev-parse HEAD` after COMMIT 1.)

| Audit | Placeholder | Committing commit (head_sha) | Back-fill verification |
|---|---|---|---|
| `stage-0-checkpoint-2026-05-24T20-03-28Z.md` | `<COMMIT_1_SHA_PENDING>` ×1 (front-matter `head_sha`) | `dd7106e71fb9d27343c5d758b4c1e289ce83871d` | `git show dd7106e:…/stage-0-checkpoint-…md` is the pre-back-fill blob; post-back-fill blob is this commit's tree |
| `stage-0-evidence-warp-determinism-2026-05-24T20-03-28Z.md` | `<COMMIT_1_SHA_PENDING>` ×1 (front-matter `head_sha`) | `dd7106e71fb9d27343c5d758b4c1e289ce83871d` | `git show dd7106e:…/stage-0-evidence-warp-determinism-…md` is the pre-back-fill blob; post-back-fill blob is this commit's tree |
| `stage-0-replay-2026-05-24T20-03-28Z.txt` | NONE (reproducibility evidence; no front-matter) | `dd7106e…` (recorded; no back-fill) | content sha256 `9399fc33…718909f34` (the bit-identity invariant) |
| `stage-0-integrity-sweep-2026-05-24T20-03-28Z.txt` | NONE (reproducibility evidence; no front-matter) | `dd7106e…` (recorded; no back-fill) | content sha256 `c19492ad…d22cb52` (the integrity-sweep baseline) |
| this ledger (`stage-0-sha-back-fill-…md`) | NONE | COMMIT 2 (this commit; the recursion-stopper) | reported in coordinator summary; NOT further back-filled |

**Both Stage-0 placeholder-bearing audits landed in the single COMMIT 1
(`dd7106e`)**, so both `head_sha` values back-fill to the same SHA. The two `.txt`
reproducibility files carry no front-matter (no placeholder); their content
sha256s are the well-known invariants recorded verbatim in the checkpoint
`evidence_hashes`. `head_sha_at_checkpoint` was filled at write-time (no
placeholder): the checkpoint's + evidence's = `090ac940…` (the pre-Stage-0 HEAD;
plan-drafting close); this ledger's = `dd7106e…` (COMMIT 1, HEAD at ledger-write).

## § 2. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling a `head_sha` EDITS the audit's blob, so the checkpoint's + evidence's
committed-blob sha256 CHANGE between COMMIT 1 (`dd7106e`) and this back-fill commit
(COMMIT 2). Per the N2 precedent, any downstream artifact (e.g. the Stage-1a or
Stage-2 audit) citing those sha256s must cite the **post-back-fill HEAD value**
(`git show <this-commit>:<path> | sha256sum`, never transcribe). The checkpoint
deliberately recorded its `evidence_hashes` only for back-fill-STABLE files — the
two `.txt` reproducibility outputs (invariants `9399fc33…` / `c19492ad…`) and the
external stable anchors (conventions `f4eb7eb7…`, taichi.md `a420d275…`,
capture-v1.json `7715a50a…`, harness.py `4a1478c8…`, common-py pyproject
`a663ea10…`) — none of which this chain edits, so none drift.

## § 3. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1)

Every sha256 this chain records is the **committed-blob** sha256 (read via
`git show HEAD:<path>` after commit), NOT in-memory pre-hook content — the
`end-of-file-fixer` pre-commit hook may append a trailing newline at commit time
(conventions § B.6 Mode 3). At COMMIT 1 the hook reported `fix end of files …
Passed` with no modification, so the two `.txt` files' committed bytes equal the
`sha256sum`-verified working-tree bytes (`9399fc33…` / `c19492ad…`). Any
post-back-fill committed-blob sha256 needed downstream is regenerated via
`git show`/`sha256sum` at use-time, never transcribed from context.

## § 4. Terminal recursion-stopper

This ledger is the FINAL Stage-0 commit. Its own committing commit (COMMIT 2) is
NOT itself back-filled — you do not back-fill the back-fill (conventions § B.2:
the back-fill commit SHA is reported in the agent's final summary, not committed
into a further audit). Its `head_sha` reflects COMMIT 1 (`dd7106e`) per the
canonical front-matter schema; COMMIT 2's SHA is in the coordinator summary.

## § 5. Verdict

**CONFIRMED.** Both placeholder-bearing Stage-0 audits enumerated + back-filled to
their committing-commit SHA (`dd7106e`) in this single separate commit (never
`--amend`). Stage-0 chain complete: checkpoint + determinism evidence + 2
reproducibility `.txt` (COMMIT 1 `dd7106e`) → this back-fill (COMMIT 2). 1 Stage-0
shift (S0-W1 scope-allocation reconciliation); cumulative 168 → 169. No `-phase-N`
tag. Stage 0 ends here; operator reviews the Stage-0 close and dispatches Stage 1a
separately.
