---
date: 2026-05-25T17-00-00Z
author: lattice-boltzmann-d3q19-stack-e-stage-2-agent
phase: 2
artifact: sub-phase
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-e-landing-sha-backfill
subject: "Sub-phase landing SHA back-fill ledger (Convention #12 + N1 enumeration). Back-fills the landing audit head_sha -> 47b7392a (COMMIT 5). The Stage-2 doc/evidence commits (methodology+conventions e438fe3, charter eff64161, warp+CHANGELOG 7f1388d, sweep-evidence 9b1965c) are spec/convention/evidence (no head_sha). This ledger is the TERMINAL sub-phase artifact; its own committing commit (COMMIT 6) is the recursion-stopper, reported in the coordinator summary, NOT further back-filled. Never --amend."
verdict-state: CONFIRMED
head_sha: 47b7392a25466de792ed2914a31b80d2c6f56dd5
head_sha_at_checkpoint: 47b7392a25466de792ed2914a31b80d2c6f56dd5
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/landing-2026-05-25T17-00-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-e/landing-2026-05-25T17-00-00Z.md
---

# Sub-Phase Landing SHA Back-Fill Ledger — lattice-boltzmann-d3q19-stack-e

(Convention #12 SHA back-fill, FINAL sub-phase commit; SEPARATE commit, never `--amend`.
N1-enumeration per `sub-phase-audit-chain-correctness`.)

## § 1. Stage-2 commit chain

| Commit | SHA | Contents | head_sha |
|---|---|---|---|
| COMMIT 1 | `e438fe3ab2dc5647eb6e2431772e97b64e695281` | methodology § 4.1 + § 6.7 + new § 6.8 + conventions § L.7 O-1 third-instance note (D-S2-1) | — (convention docs) |
| COMMIT 2 | `eff64161eac4744285c7d02681a4688f1ce75b91` | charter §§ 2/4/6/7 reconcile to landed scope (`SHIFTED`) | — (spec doc) |
| COMMIT 3 | `7f1388d96698b4c1d63000371bf83748eaeb896d` | warp.md § 6 LBM-row f32→f64 + new § 6.3 (D15) + CHANGELOG entry | — (convention doc + CHANGELOG) |
| COMMIT 4 | `9b1965cb9c60d4a11495118ef94714086da04778` | Stage-2 verification-sweep evidence (4 .txt) | — (evidence; no head_sha) |
| COMMIT 5 | `47b7392a25466de792ed2914a31b80d2c6f56dd5` | sub-phase landing audit | `<COMMIT_5_SHA_PENDING>` → `47b7392a…` |
| COMMIT 6 | this commit (recursion-stopper) | this ledger + the back-fill edit | reported in coordinator summary; NOT back-filled |

## § 2. Enumeration of placeholder-bearing audits (N1)

(FACT — `grep -rn` over the Stage-2 chain before COMMIT 6 confirmed exactly one live
placeholder: the landing audit's front-matter `head_sha`. It is back-filled to its OWN
committing-commit SHA, COMMIT 5, via `git rev-parse HEAD` immediately after COMMIT 5.)

| Audit | Placeholder | Committing commit (head_sha) | Back-fill |
|---|---|---|---|
| `landing-2026-05-25T17-00-00Z.md` | `<COMMIT_5_SHA_PENDING>` ×1 (front-matter `head_sha`) | `47b7392a25466de792ed2914a31b80d2c6f56dd5` | front-matter → `47b7392a…` |
| methodology / conventions / charter / warp.md / CHANGELOG (COMMIT 1-3) | NONE (convention/spec docs) | recorded; no back-fill | — |
| sweep evidence ×4 (COMMIT 4) | NONE (evidence .txt; no front-matter) | recorded; no back-fill | — |
| this ledger | NONE | COMMIT 6 (recursion-stopper) | reported in coordinator summary; NOT back-filled |

`head_sha_at_checkpoint` was filled at write-time (no placeholder): the landing audit's
= `9b1965c…` (COMMIT 4 = HEAD when the landing audit was written). Only the landing
audit's OWN committing-commit `head_sha` was deferred.

## § 3. Sub-phase-wide N1 completeness (Convention #12 landing enumeration)

Every stage's placeholder-bearing checkpoint was back-filled in that stage's terminal
back-fill commit: plan-drafting→`c2e9621`, Stage 0→`ac15e99`, Stage 1a→`8ddd13d`,
Stage 1b→`4b5cbc2`, Stage 1c→`6603b50`, Stage 2→this ledger (COMMIT 6). Verified at
landing: NO live `*_PENDING` placeholder remains in any front-matter `head_sha` across
the sub-phase audit chain (the `*_PENDING` strings present are resolved-placeholder
DOCUMENTATION inside each stage's back-fill ledger, not live placeholders).

## § 4. Back-fill-induced sha-drift (N2)

Back-filling the landing audit's `head_sha` edits its blob; its committed-blob sha256
changes between COMMIT 5 and COMMIT 6. Downstream citations use the post-back-fill HEAD
value (`git show <this-commit>:<path> | sha256sum`; never transcribe). The Stage-2
doc/evidence artifacts (COMMIT 1-4) are not edited by the back-fill.

## § 5. Terminal recursion-stopper

This ledger is the FINAL sub-phase commit. Its own committing commit (COMMIT 6) is NOT
back-filled (conventions § B.2: reported in the agent's final summary). Its `head_sha`
reflects write-time HEAD (`47b7392a…`, the landing-audit commit COMMIT 5).

## § 6. Verdict

**sub-phase-CONFIRMED.** The one live placeholder-bearing Stage-2 audit (the landing)
was back-filled to its committing-commit SHA (`47b7392a…`, COMMIT 5) in this single
separate commit (never `--amend`). The sub-phase is COMPLETE: 14 gates landed; gate-14
cross-stack BIT-EXACT (shape (a), THIRD instance, FIRST laminar); portfolio 23/23 GREEN;
replay HELD; integrity 0 HF / 14 SW (`c19492ad…`); O-2 chain 4/4; cumulative shifts 218
(HELD). The remaining enumerated spec § 11.3 cross-stack port is
`reaction-diffusion-2d` → Stack-C. No `-phase-N` tag (D12); local-only (D13); no push,
no tag (operator-only at sub-phase landing).
