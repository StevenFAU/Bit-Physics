---
date: 2026-05-25T12-08-25Z
author: eulerian-smoke-stack-e-stage-1a-agent
phase: 2
artifact: stage
artifact_id: sub-phase-eulerian-smoke-stack-e-stage-1a-sha-backfill
subject: "Stage-1a SHA back-fill ledger (Convention #12 + N1 enumeration). Enumerates EVERY placeholder-bearing audit committed in the Stage-1a chain and the commit SHA each head_sha is back-filled to: stage-1a checkpoint -> 03752a92 (committed in COMMIT 2). The scaffold (COMMIT 1, b04cdbde) is the gate-13 RED anchor (source, no head_sha). The failing-tests .txt evidence carries no head_sha (raw tool output, not an audit). This ledger is the TERMINAL Stage-1a artifact; its own committing commit (COMMIT 3) is the recursion-stopper, reported in the coordinator summary, NOT further committed. Never --amend."
verdict-state: CONFIRMED
head_sha: 03752a920908f538aa6234dd7022fc5d8774f11a
head_sha_at_checkpoint: 03752a920908f538aa6234dd7022fc5d8774f11a
parent_audits:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1a-checkpoint-2026-05-25T12-08-25Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1a-checkpoint-2026-05-25T12-08-25Z.md
  - docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-e/stage-1a-failing-tests-2026-05-25T12-08-25Z.txt
---

# Stage-1a SHA Back-Fill Ledger — Sub-Phase Eulerian-Smoke-Stack-E

(Convention #12 SHA back-fill, FINAL Stage-1a commit; SEPARATE commit, never `--amend`.
N1-enumeration discipline per `sub-phase-audit-chain-correctness` Stage-1b N1 — enumerate
EVERY placeholder-bearing audit committed in the chain.)

## § 1. Stage-1a commit chain

| Commit | SHA | Contents | head_sha |
|---|---|---|---|
| COMMIT 1 (scaffold; gate-13 RED anchor) | `b04cdbdefeeae90591e41e2dcbd7733cfb498382` | `packages/eulerian-smoke-stack-e/` (pkg skeleton + `pyproject.toml` + `README.md` + `tests/` ×6 + conftest) | — (source; no head_sha) |
| COMMIT 2 (checkpoint + evidence) | `03752a920908f538aa6234dd7022fc5d8774f11a` | stage-1a checkpoint + failing-tests `.txt` evidence | `<COMMIT_2_SHA_PENDING>` → `03752a92…` |
| COMMIT 3 (this back-fill) | this commit (recursion-stopper) | this ledger | reported in coordinator summary; NOT back-filled |

## § 2. Enumeration of placeholder-bearing audits

(FACT — `grep -rn 'COMMIT_._SHA_PENDING'` over the Stage-1a chain before COMMIT 3; each
audit's `head_sha` is back-filled to its OWN committing-commit SHA, captured via
`git rev-parse`.)

| Audit | Placeholder | Committing commit (head_sha) | Back-fill |
|---|---|---|---|
| `stage-1a-checkpoint-2026-05-25T12-08-25Z.md` | `<COMMIT_2_SHA_PENDING>` ×1 (front-matter `head_sha`) | `03752a920908f538aa6234dd7022fc5d8774f11a` | front-matter → `03752a92…` |
| `stage-1a-failing-tests-2026-05-25T12-08-25Z.txt` | NONE (raw tool output; no front-matter) | `03752a92…` (recorded; no back-fill) | — |
| the scaffold (`packages/eulerian-smoke-stack-e/`) | NONE (source; the gate-13 RED anchor) | `b04cdbde…` (recorded; no back-fill) | — |
| this ledger (`stage-1a-sha-back-fill-…md`) | NONE | COMMIT 3 (this commit; the recursion-stopper) | reported in coordinator summary; NOT further back-filled |

`head_sha_at_checkpoint` was filled at write-time (no placeholder): the checkpoint's =
`b04cdbdefeeae90591e41e2dcbd7733cfb498382` (the COMMIT-1 scaffold = HEAD when the
checkpoint was written). Only the checkpoint's OWN committing-commit `head_sha` was deferred.

## § 3. Back-fill-induced sha-drift (audit-chain-correctness § 9 N2 banked precedent)

Back-filling the `head_sha` EDITS the checkpoint's blob, so the checkpoint's committed-blob
sha256 CHANGES between COMMIT 2 (`d08be519…`) and this back-fill commit. Per the N2
precedent, downstream artifacts citing the checkpoint's committed-blob sha256 must use the
**post-back-fill HEAD value** (regenerate via `git show <this-commit>:<path> | sha256sum`;
never transcribe). The failing-tests `.txt` evidence is NOT edited by the back-fill, so its
`evidence_hash` recorded in the checkpoint front-matter (`90b0fba7…2cb2d313`) is STABLE and
remains valid post-back-fill (verified: committed-blob sha256 unchanged at COMMIT 2). The
scaffold (`b04cdbde`) is the gate-13 RED anchor and is likewise unaffected by the back-fill.

## § 4. Commit-first-then-sha256 (audit-chain-correctness banked precedent #1)

Every sha256 this chain records is the **committed-blob** sha256 (`git show HEAD:<path>`
after commit / `sha256sum` on the committed working-tree blob), NOT in-memory pre-hook
content — the `end-of-file-fixer` hook may append a trailing newline (conventions § B.6
Mode 3; this chain: the hook `Passed` with no modification, so the failing-tests `.txt`
committed-blob sha matched the pre-commit working-tree sha exactly).

## § 5. Terminal recursion-stopper

This ledger is the FINAL Stage-1a commit. Its own committing commit (COMMIT 3) is NOT
itself back-filled — you do not back-fill the back-fill (conventions § B.2: the back-fill
commit SHA is reported in the agent's final summary, not committed into a further audit).
Its `head_sha` reflects write-time HEAD (`03752a92`, the checkpoint commit); COMMIT 3's
SHA is in the coordinator summary.

## § 6. Verdict

**CONFIRMED.** All placeholder-bearing audits enumerated + back-filled to their own
committing-commit SHAs in this single separate commit (never `--amend`). Stage-1a chain
complete: scaffold/RED-anchor (`b04cdbde`) → checkpoint + evidence (`03752a92`) → this
back-fill (COMMIT 3). 2 Stage-1a shifts (S1a-SME1 scope conflict; S1a-SME2 R-A1
reproduction determinism-equivalence); cumulative 200 → 202. No `-phase-N` tag (D12).
Local-only (D13). Operator routes Stage 1b separately.
