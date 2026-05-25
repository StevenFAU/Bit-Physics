---
artifact: task
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-1b-sha-back-fill
phase: phase-2
date: 2026-05-25T16-30-00Z
head_sha_at_checkpoint: 2b94ec3319da055f64e981f2bb74ad6829eab2bb
backfilled_commit_2_sha: adefa71a59a38547e86f1b17ffef8246a3fd43d0
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-1b-checkpoint-2026-05-25T16-30-00Z.md
---

# Stage-1b SHA back-fill — sub-phase-lattice-boltzmann-d3q19-stack-e (COMMIT 3)

Convention #12 (section B.2) + N1 enumerate-all-placeholders. The Stage-1b chain
is three commits (the smoke-Stack-E Stage-1b precedent):

- **COMMIT 1** `2b94ec3319da055f64e981f2bb74ad6829eab2bb` —
  `feat(...-stage-1b): Warp D3Q19 implementation + gates 4-13 GREEN + 23rd
  workspace member` (reference modules + sim.py + invariants.py + spec-ref +
  root registration + uv.lock + perf-ledger 2 rows + the two canonical captures).
- **COMMIT 2** `adefa71a59a38547e86f1b17ffef8246a3fd43d0` —
  `docs(...-stage-1b): stage-1b checkpoint ...` (committed with
  `head_sha: PENDING-COMMIT-2-SHA-BACKFILL`).
- **COMMIT 3** (this) — back-fills the checkpoint `head_sha` to COMMIT 2.

## § 1. N1 enumeration — every placeholder-bearing Stage-1b audit

| Audit file | `head_sha` placeholder → | Back-filled value |
|---|---|---|
| `stage-1b-checkpoint-2026-05-25T16-30-00Z.md` | `PENDING-COMMIT-2-SHA-BACKFILL` | `adefa71a59a38547e86f1b17ffef8246a3fd43d0` |

The checkpoint was committed by COMMIT 2; its `head_sha` is COMMIT 2's sha.
`head_sha_at_checkpoint` = `2b94ec33...` (COMMIT 1, the implementation the
checkpoint audits) is correct as-committed and is NOT a placeholder.

## § 2. N2 note — capture-hash + committed-blob stability

- The checkpoint `capture_hashes` (Poiseuille `.h5` `c44cd395...`, `.json`
  `eae63a3a...`; Couette `.h5` `71cd6e14...`, `.json` `93b0f545...`) are the
  content sha256 of the committed capture artifacts (the `.h5` content sha256 IS
  the LFS oid). These are back-fill-stable (the captures are not edited by the
  back-fill). NOTE: the two `.json` content sha256 are the POST-`end-of-file-fixer`
  values (the pre-commit hook appended a trailing newline at COMMIT 1; the
  checkpoint records the committed values).
- Committed-blob id (`git hash-object`) of the checkpoint `.md` was
  `15c7c6e4cc35d79f1823b99f69ca6d8ac4f0993a` at COMMIT 2; the back-fill edit
  (placeholder -> `adefa71a`) changes it at this commit (COMMIT 3).

## § 3. Terminal recursion-stopper

COMMIT 3's own sha is NOT back-filled into any audit. It is reported in the
coordinator summary only. Separate commit; never `--amend`.

## § 4. Cumulative

1 Stage-1b shift (S1b-LBME1 — full-horizon canonical-scale cross-stack BIT-EXACT
confirmation + the n=2 "Warp CPU f64 bit-faithful to NumPy" portfolio
observation). Cumulative **217 -> 218** entering Stage 1c.

---

*End of Stage-1b SHA back-fill audit (COMMIT 3). Convention #12 + N1 enumeration;
never `--amend`.*
