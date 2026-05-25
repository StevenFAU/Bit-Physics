---
artifact: task
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-1c-sha-back-fill
phase: phase-2
date: 2026-05-25T16-45-00Z
head_sha_at_checkpoint: 7384b31c0a1fdc7ec1a74ff07042036c1d1af269
backfilled_commit_2_sha: 26739b510e52be1d67c837cfd24fa476fab4ee5d
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-1c-checkpoint-2026-05-25T16-45-00Z.md
---

# Stage-1c SHA back-fill — sub-phase-lattice-boltzmann-d3q19-stack-e (COMMIT 3)

Convention #12 (section B.2) + N1 enumerate-all-placeholders. The Stage-1c chain
is three commits:

- **COMMIT 1** `7384b31c0a1fdc7ec1a74ff07042036c1d1af269` —
  `feat(...-stage-1c): cross-stack equivalence witness + dual gate-14 GREEN
  bit-exact + corpus fixture` (equivalence.md § E + scope row + gate-14 un-skip +
  the Couette schema-corpus fixture).
- **COMMIT 2** `26739b510e52be1d67c837cfd24fa476fab4ee5d` —
  `docs(...-stage-1c): stage-1c checkpoint ...` (committed with
  `head_sha: PENDING-COMMIT-2-SHA-BACKFILL`).
- **COMMIT 3** (this) — back-fills the checkpoint `head_sha` to COMMIT 2.

## § 1. N1 enumeration — every placeholder-bearing Stage-1c audit

| Audit file | `head_sha` placeholder → | Back-filled value |
|---|---|---|
| `stage-1c-checkpoint-2026-05-25T16-45-00Z.md` | `PENDING-COMMIT-2-SHA-BACKFILL` | `26739b510e52be1d67c837cfd24fa476fab4ee5d` |

`head_sha_at_checkpoint` = `7384b31c...` (COMMIT 1, the equivalence/un-skip/fixture
the checkpoint audits) is correct as-committed and is NOT a placeholder.

## § 2. N2 note — fixture-hash + committed-blob stability

- The checkpoint `fixture_hashes` (Couette corpus `.h5` `71cd6e14...` [= the
  canonical Couette byte-copy / LFS oid], `.json` `64454f65...`) are the committed
  content sha256, back-fill-stable. NOTE: the fixture `.json` sha256 is the
  POST-`end-of-file-fixer` value (the pre-commit hook appended a trailing newline at
  COMMIT 1; the checkpoint records the committed value).
- Committed-blob id (`git hash-object`) of the checkpoint `.md` was
  `282df2bb0e58bbcbd58bc7b033f6bfdc518e8f8f` at COMMIT 2; the back-fill edit
  (placeholder -> `26739b51`) changes it at this commit (COMMIT 3).

## § 3. Terminal recursion-stopper

COMMIT 3's own sha is NOT back-filled into any audit. It is reported in the
coordinator summary only. Separate commit; never `--amend`.

## § 4. Cumulative

0 new Stage-1c shifts. Cumulative **218 (HELD)** entering Stage 2.

---

*End of Stage-1c SHA back-fill audit (COMMIT 3). Convention #12 + N1 enumeration;
never `--amend`.*
