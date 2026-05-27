---
date: 2026-05-27T20-08-34Z
author: phase-2-cleanup-plan-drafting-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-plan-drafting-sha-backfill
stage: plan-drafting-sha-backfill
verdict: CONFIRMED
subject: >
  Plan-drafting SHA back-fill ledger (Convention #12). Records the 4-commit
  plan-drafting chain SHAs and the single self-referential token back-filled:
  the plan-drafting landing audit's § 1 commit-chain table row 3 (COMMIT 3's
  own SHA), back-filled in COMMIT 4. The landing audit's head_sha was pinned to
  a real prior commit (COMMIT 2, 4dac480) where its evidence resolves, so no
  head_sha placeholder existed (the clean approach used since lfs Stage-0). The
  probe report (tools/testkit/probes/) and charter (docs/phases/) carry no
  head_sha front-matter -> no back-fill, recorded for the chain at COMMIT 1
  (71483f17) / COMMIT 2 (4dac480). This ledger is the TERMINAL plan-drafting
  artifact; its own committing commit (COMMIT 4) is the recursion-stopper and is
  reported in the coordinator summary, NOT further committed. Separate commit;
  never --amend.
head_sha: 95a24d99d07de1758e5034b0d39669e6172e0f0a
head_sha_at_checkpoint: 95a24d99d07de1758e5034b0d39669e6172e0f0a
parent_audits:
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md
evidence_paths:
  - tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md
  - docs/phases/sub-phase-phase-2-cleanup.md
  - docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# Plan-drafting SHA back-fill ledger — sub-phase-phase-2-cleanup

Convention #12 (conventions § B.2): SHA back-fill is always a separate commit, never
`git --amend` of a published commit. This ledger records the full enumeration.

## Commit chain (final SHAs)

| Commit | Artifact | Path | SHA |
|---|---|---|---|
| 1 | probe report | `tools/testkit/probes/reports/sub-phase-phase-2-cleanup-probe.md` | `71483f17e8bff824143d7bcdda97c66a09f329d6` |
| 2 | charter | `docs/phases/sub-phase-phase-2-cleanup.md` | `4dac480db90b2c7b07fe72b12f9739b83b63ee25` |
| 3 | plan-drafting landing audit | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/plan-drafting-landing-2026-05-27T20-08-34Z.md` | `95a24d99d07de1758e5034b0d39669e6172e0f0a` |
| 4 | this back-fill ledger | `docs/_audits/phase-2/sub-phase-phase-2-cleanup/sha-back-fill.md` | reported in coordinator summary (recursion-stopper; not committed-then-back-filled) |

## Placeholder enumeration (every token back-filled)

| Token | File | Back-filled to | In commit |
|---|---|---|---|
| § 1 commit-chain table row 3 SHA cell ("back-filled in COMMIT 4") | plan-drafting landing audit | `95a24d99d07de1758e5034b0d39669e6172e0f0a` (COMMIT 3, its own committing commit) | COMMIT 4 |

No other placeholders existed:

- The **landing audit's `head_sha`** (`4dac480…`, COMMIT 2) is a real prior commit where its
  evidence (probe + charter) resolves — verified `verify_evidence` 4 pass / 0 fail. **Not**
  self-referential → no back-fill (the clean approach used since lfs Stage-0).
- The **probe report** (`tools/testkit/probes/reports/…`) is a probe report, not an audit; it
  carries no `head_sha` front-matter → nothing to back-fill. Recorded for the chain at COMMIT 1
  `71483f17e8bff824143d7bcdda97c66a09f329d6`.
- The **charter** (`docs/phases/…`) is a plan, not an audit; it carries `head_sha_at_draft:
  e1fc154…` (the session-start anchor, a stable FACT, not a self-reference) → nothing to
  back-fill. Recorded for the chain at COMMIT 2 `4dac480db90b2c7b07fe72b12f9739b83b63ee25`.
- The landing audit's `head_sha_at_checkpoint` (`4dac480…`, COMMIT 2) and `evidence_hashes`
  (probe `f090fde2…`, charter `59f50090…`) were real at write time → no back-fill.

The COMMIT-4 edit touches the `plan-drafting-landing-*.md` audit (the row-3 SHA cell), which is
not a `*.ledger.md` file, so the `audit-append-only.yml` gate permits it (it enforces
prefix-immutability only on `*.ledger.md`; spec `docs/architecture.md:1448`). The landing audit's
own `evidence_hashes` do not hash itself, so the back-fill edit changes no `verify_evidence`
outcome (it still resolves probe + charter at `head_sha 4dac480`; prior audits still PASS, no
regression). Separate commit (COMMIT 4); never `--amend`.

## Plan-drafting chain complete

Plan-drafting **SHIFTED-with-notes** (precondition-5 deviation + UNKNOWN-2; landing audit § 5).
Operator routes D1–D6 + confirms UNKNOWN-2 (PROCEED vs hard-STOP on the I7-test deviation) →
coordinator dispatches Stage 0. No `-phase-N` tag (this is a Phase-2-tail sub-phase; cleanup is
steady-state hygiene → no v-tag by default per charter § 7 Stage 2). No tag pushed by agent (I7).
