---
date: 2026-05-25T12-50-14Z
author: eulerian-smoke-stack-e-stage-1b-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-1b-sha-backfill
subject: "Stage-1b SHA back-fill ledger (Convention #12 + N1 enumeration). Enumerates EVERY placeholder-bearing audit committed in the Stage-1b chain and the commit SHA each head_sha is back-filled to: stage-1b checkpoint -> 73ba202c (committed in COMMIT 2). The implementation (COMMIT 1, 9d9718f) is source + captures + perf-ledger + spec sheet + workspace registration (no head_sha). This ledger is the TERMINAL Stage-1b artifact; its own committing commit (COMMIT 3) is the recursion-stopper, reported in the coordinator summary, NOT further committed. Never --amend."
verdict-state: CONFIRMED
head_sha: 73ba202c4fe81fd4127924274409115507545e14
head_sha_at_checkpoint: 73ba202c4fe81fd4127924274409115507545e14
parent_audits:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1b-checkpoint-2026-05-25T12-50-14Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1b-checkpoint-2026-05-25T12-50-14Z.md
---

# Stage-1b SHA Back-Fill Ledger — Sub-Phase Eulerian-Smoke-Stack-E

(Convention #12 SHA back-fill, FINAL Stage-1b commit; SEPARATE commit, never `--amend`.
N1-enumeration discipline per `sub-phase-audit-chain-correctness` Stage-1b N1 — enumerate
EVERY placeholder-bearing audit committed in the chain.)

## § 1. Stage-1b commit chain

| Commit | SHA | Contents | head_sha |
|---|---|---|---|
| COMMIT 1 (implementation) | `9d9718f573a9d78a057c04c377e1fbd694ad4c82` | reference (`stable_fluids_warp.py` + `__init__`) + `sim.py` + `invariants.py` + `spec-ref-stack-e.md` + root `pyproject.toml` (22nd member) + `uv.lock` + `perf-ledger.md` (2 rows) + 2D canonical capture (LFS) | — (source/captures; no head_sha) |
| COMMIT 2 (checkpoint) | `73ba202c4fe81fd4127924274409115507545e14` | stage-1b checkpoint | `<COMMIT_2_SHA_PENDING>` → `73ba202c…` |
| COMMIT 3 (this back-fill) | this commit (recursion-stopper) | this ledger | reported in coordinator summary; NOT back-filled |

## § 2. Enumeration of placeholder-bearing audits

(FACT — `grep -rn 'COMMIT_._SHA_PENDING'` over the Stage-1b chain before COMMIT 3; each
audit's `head_sha` is back-filled to its OWN committing-commit SHA, captured via
`git rev-parse`.)

| Audit | Placeholder | Committing commit (head_sha) | Back-fill |
|---|---|---|---|
| `stage-1b-checkpoint-2026-05-25T12-50-14Z.md` | `<COMMIT_2_SHA_PENDING>` ×1 (front-matter `head_sha`) | `73ba202c4fe81fd4127924274409115507545e14` | front-matter → `73ba202c…` |
| the implementation (`packages/eulerian-smoke-stack-e/…` + captures + perf-ledger + spec sheet) | NONE (source/captures) | `9d9718f…` (recorded; no back-fill) | — |
| this ledger (`stage-1b-sha-back-fill-…md`) | NONE | COMMIT 3 (this commit; the recursion-stopper) | reported in coordinator summary; NOT further back-filled |

`head_sha_at_checkpoint` was filled at write-time (no placeholder): the checkpoint's =
`9d9718f573a9d78a057c04c377e1fbd694ad4c82` (the COMMIT-1 implementation = HEAD when the
checkpoint was written). Only the checkpoint's OWN committing-commit `head_sha` was deferred.

## § 3. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling the `head_sha` EDITS the checkpoint's blob, so the checkpoint's committed-blob
sha256 CHANGES between COMMIT 2 (`833d1665…`) and this back-fill commit. Per the N2
precedent, downstream artifacts citing the checkpoint's committed-blob sha256 must use the
**post-back-fill HEAD value** (regenerate via `git show <this-commit>:<path> | sha256sum`;
never transcribe). The committed 2D capture (`.h5` LFS-oid `aa67929f…`, `.json` committed-blob
`e93189ed…`) + perf-ledger + spec sheet are NOT edited by the back-fill and remain valid.

## § 4. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1)

Every sha256 this chain records is the **committed-blob** sha256 (`git show HEAD:<path>` after
commit / `sha256sum` on the committed blob), NOT in-memory pre-hook content — the
`end-of-file-fixer` hook appended a trailing newline to the 2D capture `.json` at COMMIT 1
(conventions § B.6 Mode 3; harmless — `json.load` whitespace-insensitive), so the perf-ledger
defers the `.json` committed-blob sha to this checkpoint (the stable `.h5` LFS-oid `aa67929f…`
is cited inline).

## § 5. Terminal recursion-stopper

This ledger is the FINAL Stage-1b commit. Its own committing commit (COMMIT 3) is NOT itself
back-filled — you do not back-fill the back-fill (conventions § B.2: the back-fill commit SHA
is reported in the agent's final summary). Its `head_sha` reflects write-time HEAD
(`73ba202c`, the checkpoint commit); COMMIT 3's SHA is in the coordinator summary.

## § 6. Verdict

**CONFIRMED.** All placeholder-bearing audits enumerated + back-filled to their own
committing-commit SHAs in this single separate commit (never `--amend`). Stage-1b chain
complete: implementation (`9d9718f`) → checkpoint (`73ba202c`) → this back-fill (COMMIT 3).
3 Stage-1b shifts (S1b-SME1 O-W7 narrowing; S1b-SME2 step-1 bit-exact; S1b-SME3 uv-sync
.venv-prune hazard); cumulative 202 → 205. No `-phase-N` tag (D12). Local-only (D13).
Operator routes Stage 1c separately.
