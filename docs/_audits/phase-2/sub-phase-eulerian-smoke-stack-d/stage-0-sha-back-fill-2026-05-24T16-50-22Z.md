---
date: 2026-05-24T16-50-22Z
author: eulerian-smoke-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-d-stage-0-sha-backfill
subject: "Stage-0 SHA back-fill ledger (Convention #12 + audit-chain-correctness N1 enumerate-all-placeholders). Enumerates EVERY placeholder-bearing audit committed in the Stage-0 chain and the commit SHA each head_sha is back-filled to: stage-0 checkpoint -> COMMIT 2 5cb67280. COMMIT 1 (b154d696, the S-2.1 filterwarnings FOLD) is a code commit carrying NO placeholder-bearing audit. The stage-0-evidence/*.txt files carry no front-matter head_sha. This ledger is the TERMINAL Stage-0 artifact; its own committing commit (COMMIT 3) is the recursion-stopper (you do not back-fill the back-fill) and is reported in the coordinator summary, NOT further committed. Never --amend."
verdict-state: CONFIRMED
head_sha: 5cb67280be99ac4db1051df4fcbed467cc3ebce9
head_sha_at_checkpoint: 5cb67280be99ac4db1051df4fcbed467cc3ebce9
parent_audits:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-checkpoint-2026-05-24T16-50-22Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-0-checkpoint-2026-05-24T16-50-22Z.md
---

# Stage-0 SHA Back-Fill Ledger — Sub-Phase Eulerian-Smoke-Stack-D

(Convention #12 SHA back-fill, FINAL Stage-0 commit; SEPARATE commit, never
`--amend`. N1-enumeration discipline per `sub-phase-audit-chain-correctness`
Stage-1b N1 — enumerate EVERY placeholder-bearing audit committed in the chain,
not just one.)

## § 1. Enumeration of placeholder-bearing audits

(FACT — `grep -rn` for the placeholder token over the Stage-0 chain before this
commit; each audit's `head_sha` is back-filled to its OWN committing-commit SHA,
captured via `git rev-parse`.)

| Audit / commit | Placeholder | Committing commit (back-filled `head_sha`) | Back-fill verification |
|---|---|---|---|
| `stage-0-checkpoint-2026-05-24T16-50-22Z.md` | `<COMMIT_2_SHA_PENDING>` ×1 (front-matter `head_sha`) | `5cb67280be99ac4db1051df4fcbed467cc3ebce9` | `git show 5cb67280:…/stage-0-checkpoint-…md` is the pre-back-fill blob; post-back-fill blob is this commit's tree |
| COMMIT 1 — `b154d6960cc0dcf5286c531bd2651389a1b702c3` (S-2.1 filterwarnings FOLD) | NONE (code commit; 4 `pyproject.toml` edits; no audit front-matter) | recorded for the chain, no back-fill | — |
| `stage-0-evidence/{replay,integrity-sweep,filterwarnings-fold-verification}-…txt` | NONE (tool/verification output; no front-matter `head_sha`) | committed in COMMIT 2 | — |
| this ledger (`stage-0-sha-back-fill-…md`) | NONE | COMMIT 3 (this commit; the recursion-stopper) | reported in coordinator summary; NOT further back-filled |

`head_sha_at_checkpoint` on the checkpoint was filled at write-time with no
placeholder: `b154d6960cc0…` (COMMIT 1, the HEAD at checkpoint-write-time). Only
the checkpoint's OWN committing-commit `head_sha` was deferred to this back-fill.

## § 2. Stage-0 commit chain (3-commit decomposition per dispatch SECTION 5)

1. **COMMIT 1** `b154d6960cc0dcf5286c531bd2651389a1b702c3` —
   `chore(eulerian-smoke-stack-d-stage0-s21-filterwarnings-fold)`: the S-2.1
   SyntaxWarning filterwarnings FOLD into the 4 prior Stack-D ports (D3), with
   the corrected bare `ignore::SyntaxWarning` form (shift S0-1).
2. **COMMIT 2** `5cb67280be99ac4db1051df4fcbed467cc3ebce9` —
   `docs(eulerian-smoke-stack-d-stage0-checkpoint)`: the Stage-0 checkpoint
   audit + 3 evidence files.
3. **COMMIT 3** (this) — `chore(eulerian-smoke-stack-d-stage0-sha-backfill)`:
   this ledger + the checkpoint `head_sha` back-fill. Recursion-stopper.

## § 3. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling the checkpoint's `head_sha` EDITS its blob, so the checkpoint's
committed-blob sha256 CHANGES between its first commit (`5cb67280`) and this
back-fill commit. Per the N2 precedent, any downstream artifact citing the
checkpoint's sha256 must cite the **post-back-fill HEAD value** (`git show
<this-commit>:<path> | sha256sum`, never transcribed). No artifact cites the
checkpoint's content sha256 yet. The checkpoint's `evidence_hashes` entries
(replay, integrity-sweep, filterwarnings-fold-verification, the 4 `pyproject.toml`,
the doc anchors) are unaffected by this back-fill — those blobs are not edited.

## § 4. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1 / § B.6 Mode 3)

Every sha256 this chain records is the **committed-blob** sha256 (read via
`git show HEAD:<path>` after commit), NOT in-memory pre-hook content. The
COMMIT-2 evidence-blob sha256s were verified post-commit to equal the recorded
`evidence_hashes` (replay `9399fc33…718909f34` = the § D.3 bit-identity
invariant; integrity-sweep `c19492ad…d22cb52` = the streak baseline;
filterwarnings-fold-verification `d787a907…`); the `end-of-file-fixer` /
`trailing-whitespace` hooks made no modification at COMMIT 2 (both reported
Passed).

## § 5. Terminal recursion-stopper

This ledger is the FINAL Stage-0 commit. Its own committing commit (COMMIT 3) is
NOT itself back-filled — you do not back-fill the back-fill (§ B.2: the back-fill
commit SHA is reported in the agent's final summary, not committed into a further
audit). Its `head_sha` reflects write-time HEAD (`5cb67280`, COMMIT 2) per the
canonical front-matter schema; COMMIT 3's SHA is in the coordinator summary.

## § 6. Verdict

**CONFIRMED.** The single placeholder-bearing Stage-0 audit (the checkpoint)
enumerated + back-filled to its own committing-commit SHA (`5cb67280`) in this
separate commit (never `--amend`). Stage-0 chain complete: FOLD (`b154d696`) →
checkpoint (`5cb67280`) → this back-fill (COMMIT 3). 1 Stage-0 shift (S0-1,
filter-form correction); cumulative 158 → 159. No `-phase-N` tag. Stage 0 ends
here; operator routes Stage 1a separately.
