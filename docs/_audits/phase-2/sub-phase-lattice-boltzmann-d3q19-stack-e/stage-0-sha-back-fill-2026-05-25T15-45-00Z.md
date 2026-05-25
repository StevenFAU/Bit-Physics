---
artifact: task
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-stage-0-sha-back-fill
phase: phase-2
date: 2026-05-25T15-45-00Z
head_sha_at_checkpoint: c2e9621a7488619b479430f8180d985ac3a41317
backfilled_commit_1_sha: 10af482ca05e1cccbf95fcda92c49f2004570be8
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/stage-0-checkpoint-2026-05-25T15-45-00Z.md
---

# Stage-0 SHA back-fill — sub-phase-lattice-boltzmann-d3q19-stack-e (COMMIT 2)

Convention #12 (§ B.2) + N1 enumerate-all-placeholders. COMMIT 1
(`docs(lattice-boltzmann-d3q19-stack-e-stage-0): pre-flight checkpoint + Warp
BGK-collision determinism evidence`) committed the Stage-0 audits with
`head_sha: PENDING-COMMIT-1-SHA-BACKFILL`. This is a **separate commit** (never
`--amend`) that back-fills both placeholder-bearing `.md` audits to COMMIT 1's
sha.

## § 1. N1 enumeration — every placeholder-bearing Stage-0 audit

| Audit file | `head_sha` placeholder → | Back-filled value |
|---|---|---|
| `stage-0-checkpoint-2026-05-25T15-45-00Z.md` | `PENDING-COMMIT-1-SHA-BACKFILL` | `10af482ca05e1cccbf95fcda92c49f2004570be8` |
| `stage-0-evidence-warp-bgk-collision-determinism-2026-05-25T15-45-00Z.md` | `PENDING-COMMIT-1-SHA-BACKFILL` | `10af482ca05e1cccbf95fcda92c49f2004570be8` |

Both `.md` audits were committed by COMMIT 1; their `head_sha` is COMMIT 1's sha
`10af482ca05e1cccbf95fcda92c49f2004570be8`.

## § 2. N2 note — raw-output evidence + committed-blob stability

- **The two `.txt` evidence files carry NO `head_sha`** (raw tool output — the
  replay gate-summary + the integrity findings stream). They are referenced from
  the checkpoint `evidence_paths` + `evidence_hashes` by content sha256, which is
  back-fill-stable:
  - `stage-0-replay-2026-05-25T15-45-00Z.txt` content sha256
    `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` (the
    bit-identity replay invariant; byte-identical to the Phase-1 landing replay).
  - `stage-0-integrity-sweep-2026-05-25T15-45-00Z.txt` content sha256
    `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (the
    integrity baseline; 0 HARD_FAIL / 14 SOFT_WARN).
  These content sha256 values are **unchanged** by the back-fill (the `.txt`
  blobs are not edited).
- **Committed-blob ids (`git hash-object`) shift across the two commits for the
  edited `.md` files only.** At COMMIT 1 the blobs were checkpoint
  `d2d8ca5cdbc7b31a5a1e152616b51e0d10e2f861` / evidence
  `dd7ee4e0a51fe23d0868a912327fc081101d5605`; the back-fill edit (placeholder →
  `10af482c`) changes those `.md` blobs at this commit (COMMIT 2). The `.txt`
  blobs (replay `bf4380ea…`, integrity `d25dbb63…`) are unchanged.

## § 3. Terminal recursion-stopper

COMMIT 2's own sha is **NOT** back-filled into any audit (that would require a
COMMIT 3, ad infinitum). COMMIT 2's sha is reported in the coordinator summary
only. Separate commit; never `--amend`.

## § 4. Cumulative

1 Stage-0 shift (S0-LBME1 — dispatch anchor-sha framing drift; § 0 of the
checkpoint). Cumulative **216 → 217** entering Stage 1a.

---

*End of Stage-0 SHA back-fill audit (COMMIT 2). Convention #12 + N1 enumeration;
never `--amend`.*
