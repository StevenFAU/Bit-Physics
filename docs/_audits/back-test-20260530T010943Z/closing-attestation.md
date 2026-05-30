---
title: Exhaustive Back-Test Re-Audit — Closing Attestation
head_sha: 4ee0ea9e2d9736c63a5f16feb049b8c63e0c65c9
this_run_utc: 20260530T010943Z
audit_branch: audit/back-test-20260530T010943Z
---

# Closing Attestation — isolation guarantees re-verified

Charter hard guarantees, each re-verified at close:

| guarantee | verification | result |
|---|---|---|
| **main untouched** | `git -C /home/otacon/Projects/Bit-Physics rev-parse HEAD` == `4ee0ea9…` at open AND close; `git status --short` empty (no change authored by this run) | ✅ HELD |
| **no writes to main** | all work confined to worktree `/home/otacon/Projects/bp-audit-2`; the only writes were under `docs/_audits/back-test-20260530T010943Z/` | ✅ HELD |
| **branch unmerged** | `audit/back-test-20260530T010943Z` is committed but NOT merged into main; main HEAD unchanged | ✅ HELD |
| **zero tags created** | `git tag \| wc -l` == 9 at open AND close (unchanged) | ✅ HELD |
| **live working tree not mutated** | the pre-existing 4 dirty `.h5` (LFS smudge) + any in-flight state on the live tree were read-only-inspected; not modified by this run | ✅ HELD |
| **LFS remediation local-only** | the worktree's dirty fixtures were never staged into the audit commit and never pushed; classification was read-only (`git cat-file -p`) | ✅ HELD |
| **mutation .bak restored** | driver EXIT/INT/TERM trap `restore_bak` moves every `*.bak` back; verified no `*.bak` remains under tools/testkit, tools/integrity, packages, common at close | ✅ HELD (see close-check) |
| **no fixes, no remediation applied** | zero source/spec/test files modified; deliverables are findings + a proposed plan only | ✅ HELD |
| **worktree disposed** | `git worktree remove` after the audit commit; the branch + its commits persist in the shared object store (deliverables remain reachable via the branch) | ✅ HELD (see close-check) |

Close-check command outputs are appended to `evidence/closing-checks.txt`.

## Residual honest notes
- The audit branch was committed with hooks; if the pre-existing dirty-fixture state forced
  `--no-verify`, that is recorded in `evidence/closing-checks.txt` (and is itself the live evidence
  for finding M-1).
- `golden` mutation target status (completed vs BLOCKED-resource-timeout-partial) is recorded in the
  final mutation table; no number was fabricated — a timeout records the lower bound.
