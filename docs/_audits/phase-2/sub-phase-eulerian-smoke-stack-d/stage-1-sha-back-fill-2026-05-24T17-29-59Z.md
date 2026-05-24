---
date: 2026-05-24T17-29-59Z
author: eulerian-smoke-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-d-stage-1-sha-backfill
subject: "Stage-1 SHA back-fill ledger (Convention #12 + audit-chain-correctness N1 enumerate-all-placeholders). Enumerates EVERY placeholder-bearing audit committed in the Stage-1 chain and the commit SHA each head_sha is back-filled to: stage-1 checkpoint head_sha -> its own committing commit 1617a2b8; head_sha_at_checkpoint -> 42ed61eb (HEAD at checkpoint-write-time, the implementation commit). COMMITs 1/2/3 (tolerance 29837da, failing-tests 2341920, implementation 42ed61eb) and the stage-1-evidence/*.txt carry no placeholder-bearing front-matter. This ledger is the TERMINAL Stage-1 artifact; its own committing commit is the recursion-stopper (reported in the coordinator summary, NOT further committed). Never --amend. Stage-1 VERDICT was Hard-Rule-2-STOP (gate-14 within_tolerance=False on both canonicals; chaotically-unstable trajectories); operator routing required before any Stage 2."
verdict-state: CONFIRMED
head_sha: 1617a2b817e388cd6cd123110e15c23ba62264c5
head_sha_at_checkpoint: 1617a2b817e388cd6cd123110e15c23ba62264c5
parent_audits:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1-checkpoint-2026-05-24T17-29-59Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/stage-1-checkpoint-2026-05-24T17-29-59Z.md
---

# Stage-1 SHA Back-Fill Ledger — Sub-Phase Eulerian-Smoke-Stack-D

(Convention #12 SHA back-fill, FINAL Stage-1 commit; SEPARATE commit, never
`--amend`. N1-enumeration discipline — enumerate EVERY placeholder-bearing audit
committed in the chain, not just one.)

## § 1. Enumeration of placeholder-bearing audits

(FACT — `grep -rn` for the placeholder tokens `STAGE1-BACKFILL-PENDING` /
`STAGE1-CHECKPOINT-PENDING` over the Stage-1 chain before this commit; each
audit's deferred `head_sha` is back-filled via `git rev-parse`.)

| Audit / commit | Placeholder | Back-fill value | Note |
|---|---|---|---|
| `stage-1-checkpoint-2026-05-24T17-29-59Z.md` | `STAGE1-BACKFILL-PENDING` (front-matter `head_sha`) | `1617a2b817e388cd6cd123110e15c23ba62264c5` (its OWN committing commit, COMMIT 4) | back-filled in this commit |
| `stage-1-checkpoint-2026-05-24T17-29-59Z.md` | `STAGE1-CHECKPOINT-PENDING` (front-matter `head_sha_at_checkpoint`) | `42ed61eb794ddb5accc9f07b52f13b9c4f0502ab` (HEAD at checkpoint-write-time = the implementation commit, COMMIT 3) | back-filled in this commit |
| COMMIT 1 — `29837dad…` tolerance.toml override | NONE (data commit; no audit front-matter) | recorded for the chain, no back-fill | — |
| COMMIT 2 — `2341920…` failing-tests anchor | NONE (test surface + evidence `.txt`; no front-matter `head_sha`) | recorded for the chain, no back-fill | — |
| COMMIT 3 — `42ed61eb…` implementation | NONE (code + spec sheet + probe + perf + 2D capture; no audit front-matter `head_sha`) | recorded for the chain, no back-fill | — |
| `stage-1-evidence/{gate14-verdicts,gate13-replay}-…txt` | NONE (tool/verification output) | committed in COMMIT 4 | — |
| this ledger (`stage-1-sha-back-fill-…md`) | NONE | COMMIT 5 (this commit; the recursion-stopper) | reported in coordinator summary; NOT further back-filled |

## § 2. Stage-1 commit chain (collapsed single-stage; 5-commit decomposition)

1. **COMMIT 1** `29837dad…` — `chore(eulerian-smoke-stack-d-stage1-tolerance)`:
   `[overrides.eulerian-smoke] category="smoke"` (additive; 5th per-sim override).
2. **COMMIT 2** `2341920…` — `test(eulerian-smoke-stack-d-stage1)`: failing-tests
   gate-3 anchor (6 ModuleNotFoundError); the gate-13 worktree-replay bootstrap SHA.
3. **COMMIT 3** `42ed61eb…` — `feat(eulerian-smoke-stack-d-stage1)`: Stack-D Taichi
   Stam-Fedkiw implementation + gates 4-13 GREEN + gate-14 Hard-Rule-2 finding;
   spec sheet, probe report, perf-ledger rows, workspace registration, 2D capture.
4. **COMMIT 4** `1617a2b8…` — `docs(eulerian-smoke-stack-d-stage1-checkpoint)`: the
   Stage-1 partial checkpoint (Hard-Rule-2-STOP) + 2 evidence files.
5. **COMMIT 5** (this) — `chore(eulerian-smoke-stack-d-stage1-sha-backfill)`: this
   ledger + the checkpoint `head_sha` / `head_sha_at_checkpoint` back-fill.

## § 3. Back-fill-induced sha-drift (audit-chain-correctness N2 banked precedent)

Back-filling the checkpoint's `head_sha` + `head_sha_at_checkpoint` EDITS its
blob, so the checkpoint's committed-blob sha256 CHANGES between COMMIT 4 and this
commit. Per the N2 precedent, any downstream artifact citing the checkpoint's
sha256 must cite the **post-back-fill HEAD value** (`git show <this-commit>:<path>
| sha256sum`, never transcribed). No artifact cites the checkpoint's content
sha256 yet. The checkpoint's `evidence_hashes` entries (the two
`stage-1-evidence/*.txt` blobs) are unaffected — those blobs are not edited.

## § 4. Commit-first-then-sha256 (banked precedent #1 / #10)

Every sha256 this chain records is the **committed-blob** sha256 (read via `git
cat-file -p HEAD:<path>` after commit), NOT in-memory pre-hook content. The
failing-tests evidence (`80969ace…fa8708`) and the 2D capture `.json` blob
(`8ebf117e…d592d`) were re-captured post-`end-of-file-fixer` (the `.json` lacked
a trailing newline at first commit attempt; the hook added it and the re-staged
blob is authoritative). The 2D capture `.h5` LFS content OID is
`db05a65254bfb5e5e544641f93de2b8dbe47b575a3a301c31f1c0b202aee6c34`. The 3D capture
(held local) sha256 is `2c854bc8586abf7c4ea42c5354b051beeb794538aa99061723a17f7d00076d75`.

## § 5. Terminal recursion-stopper

This ledger is the FINAL Stage-1 commit. Its own committing commit (COMMIT 5) is
NOT itself back-filled — you do not back-fill the back-fill. Its `head_sha`
reflects write-time HEAD (`1617a2b8`, COMMIT 4) per the canonical front-matter
schema; COMMIT 5's SHA is reported in the agent's coordinator summary.

## § 6. Verdict

**CONFIRMED.** The single placeholder-bearing Stage-1 audit (the checkpoint)
enumerated + both deferred front-matter SHAs back-filled in this separate commit
(never `--amend`). Stage-1 chain complete: tolerance (`29837da`) → failing-tests
(`2341920`) → implementation (`42ed61e`) → checkpoint (`1617a2b`) → this back-fill
(COMMIT 5). Stage-1 VERDICT: **Hard-Rule-2-STOP** (gate-14 `within_tolerance=False`
on BOTH canonicals; chaotically-unstable trajectories; IC-15 aspect #1 EXERCISED).
4 Stage-1 shifts (S1-1..S1-4); cumulative 159 → 163. No `-phase-N` tag. **Stage 1
ends here; operator routing required before any Stage 2** (per checkpoint § 11).
