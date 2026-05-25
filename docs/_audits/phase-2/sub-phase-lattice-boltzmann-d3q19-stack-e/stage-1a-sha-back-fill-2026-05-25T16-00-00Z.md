---
artifact: task
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-1a-sha-back-fill
phase: phase-2
date: 2026-05-25T16-00-00Z
head_sha_at_checkpoint: 411bf3ba141e541fe7fa5bdbdbc9d7021d6bbd4b
backfilled_commit_2_sha: 242ed4d1b799cd6b1c18ce7e805013974283bb5c
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-1a-checkpoint-2026-05-25T16-00-00Z.md
---

# Stage-1a SHA back-fill — sub-phase-lattice-boltzmann-d3q19-stack-e (COMMIT 3)

Convention #12 (§ B.2) + N1 enumerate-all-placeholders. The Stage-1a chain is
three commits (the smoke-Stack-E Stage-1a precedent):

- **COMMIT 1** `411bf3ba141e541fe7fa5bdbdbc9d7021d6bbd4b` —
  `feat(...-stage-1a): scaffold package + failing-tests RED anchor` (the 12
  package files; the gate-13 RED anchor).
- **COMMIT 2** `242ed4d1b799cd6b1c18ce7e805013974283bb5c` —
  `docs(...-stage-1a): stage-1a checkpoint + failing-tests RED evidence` (the
  checkpoint, committed with `head_sha: PENDING-COMMIT-2-SHA-BACKFILL`, + the
  failing-tests `.txt`).
- **COMMIT 3** (this) — back-fills the checkpoint's `head_sha` to COMMIT 2.

## § 1. N1 enumeration — every placeholder-bearing Stage-1a audit

| Audit file | `head_sha` placeholder → | Back-filled value |
|---|---|---|
| `stage-1a-checkpoint-2026-05-25T16-00-00Z.md` | `PENDING-COMMIT-2-SHA-BACKFILL` | `242ed4d1b799cd6b1c18ce7e805013974283bb5c` |

The checkpoint was committed by COMMIT 2; its `head_sha` is COMMIT 2's sha
`242ed4d1b799cd6b1c18ce7e805013974283bb5c`. `head_sha_at_checkpoint` =
`411bf3ba…` (COMMIT 1, the scaffold the checkpoint audits) is correct as-committed
and is NOT a placeholder.

## § 2. N2 note — raw-output evidence + committed-blob stability

- **The `stage-1a-failing-tests-…txt` evidence carries NO `head_sha`** (raw
  pytest output). It is referenced from the checkpoint `evidence_hashes` by
  content sha256 `bc310b1cd50ccaa3cfbc81da6b949623c140aa45cf1bdf32996344c88bf00232`,
  which is back-fill-stable (the `.txt` blob is not edited).
- **Committed-blob ids (`git hash-object`).** At COMMIT 2 the checkpoint blob was
  `abe52d1a822eb1f195e971a843bb23792b3c8f63` and the failing-tests blob was
  `9b35a60ac64089363df0bb1e2feb6e2779b200b7`; the back-fill edit (placeholder →
  `242ed4d1`) changes the checkpoint `.md` blob at this commit (COMMIT 3). The
  failing-tests `.txt` blob is unchanged.

## § 3. Terminal recursion-stopper

COMMIT 3's own sha is **NOT** back-filled into any audit (that would require a
COMMIT 4, ad infinitum). COMMIT 3's sha is reported in the coordinator summary
only. Separate commit; never `--amend`.

## § 4. Cumulative

0 new Stage-1a shifts. Cumulative **217 (HELD)** entering Stage 1b.

---

*End of Stage-1a SHA back-fill audit (COMMIT 3). Convention #12 + N1 enumeration;
never `--amend`.*
