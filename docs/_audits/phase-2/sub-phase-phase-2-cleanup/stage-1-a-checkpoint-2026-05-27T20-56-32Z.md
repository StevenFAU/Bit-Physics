---
date: 2026-05-27T20-56-32Z
author: phase-2-cleanup-stage-1-agent
phase: 2
artifact: stage
artifact_id: sub-phase-phase-2-cleanup-stage-1-a
stage: stage-1-a-checkpoint
verdict: CONFIRMED-Stage-1-A
head_sha: e91a5eb31bfc497d2b924022662ef338bf6ff3ba
head_sha_at_checkpoint: e91a5eb31bfc497d2b924022662ef338bf6ff3ba
evidence_paths:
  - docs/phases/phase-1-plan.md
  - docs/phases/phase-2-cross-stack-replication.md
  - packages/eulerian-smoke/README.md
  - docs/phases/sub-phase-phase-2-cleanup.md
evidence_hashes:
  docs/phases/phase-1-plan.md: sha256:a357544ea5a81ce426766de8ede4b802881b687a2aab0da41f4b770453d585f3
  docs/phases/phase-2-cross-stack-replication.md: sha256:d2b5ff86f692fdeb6b191d7f6407978b8e6bd981567fd7513209ab900c54e2f2
  packages/eulerian-smoke/README.md: sha256:9e509fcff9ae45cf42e26873d62279e6e2f832e19274d4bf52b135581abde58c
  docs/phases/sub-phase-phase-2-cleanup.md: sha256:57c8306a12dc4424b4422f2b336cf72488e728c1ae76cd6046de3eeba8c84aa9
deferred_items:
  - "K-2 phase-3-plan.md (7 occ) — deferred to Phase-3 plan-drafting Convention-M re-anchor (D1 lock; intentional carve-out)"
ci_activation: []
top_level_deps_to_merge: []
---

# Stage-1.A checkpoint audit — sub-phase-phase-2-cleanup (Cluster A: citation & path drift)

**Verdict: CONFIRMED-Stage-1-A.** Both cluster items resolved cleanly. K-2 (§ 2.13 golden-path
drift) fixed in the two executed plans; phase-3-plan.md deferred per D1 (explicit carve-out).
PD-2 (README test-invocation consistency) standardized across 11 package READMEs. Two
theme-commits (R-4: one commit per theme, not per occurrence). No scope expansion; no STOP.
Integrity baseline held byte-for-byte; I1–I7 hold.

## § 1 — Cluster-open re-anchor (Convention M, at HEAD `94c1149` → cluster start)

Re-enumerated both items against HEAD before editing. No drift since plan-drafting / Stage 0:

| Item | Probe count | Re-anchored count | Match |
|---|---|---|---|
| K-2 phase-1-plan.md | 9 (lines) | 9 lines / **10 occ** (line 1630 carries 2) | matches probe line-count; occ count recorded |
| K-2 phase-2-cross-stack-replication.md | 3 | 3 | ✓ |
| K-2 phase-3-plan.md (DEFER) | 7 | 7 | ✓ (untouched) |
| PD-2 package READMEs | 11 | 11 | ✓ (eulerian-smoke-stack-d already correct, not in set) |

**(FACT)** Canonical replacement path verified against `docs/architecture.md` §§ 2.13 / glossary
(`docs/architecture.md:326,341,590,1159,2379`): the golden verifier lives at `tools/testkit/golden/`;
the drift string `tools/testkit/code_verification/golden/` predates the 51e0ee1 module-path move.
**(FACT)** `docs/conventions/sub-phase-conventions.md:1081` contains the drift string inside a
deliberate "correct-vs-dispatch-wrong" banked note ("…not the dispatch's `…code_verification/golden/…`")
— left as-is (not a drift occurrence).

## § 2 — Item-by-item disposition

| Item | Disposition | Commit | Evidence |
|---|---|---|---|
| **K-2** § 2.13 golden-path drift (executed plans) | **RESOLVED** | `c58d4ab` | `tools/testkit/code_verification/golden` → `tools/testkit/golden` in phase-1-plan.md (10 occ → 0) + phase-2-cross-stack-replication.md (3 → 0); surgical diff (only path segment) |
| **K-2** phase-3-plan.md (7 occ) | **DEFERRED (D1)** | — | unexecuted plan; re-anchors at Phase-3 plan-drafting (Convention M, R-2). Still 7 occ at HEAD. Intentional carve-out per charter § 5 D1 + Stage-0 § 3 — **NOT an omission** |
| **PD-2** README `python3`/`python -m pytest` → `uv run` | **RESOLVED** | `e91a5eb` | 11 READMEs standardized to `uv run pytest packages/<pkg>/tests/ -v`; verified `pytest packages/eulerian-smoke/tests/` collects 10 tests from root (no PYTHONPATH/cd needed); matches python-strict.yml + audit precedent |

## § 3 — Commit boundaries (R-4: theme, not occurrence)

| Commit | Theme | Files | Net |
|---|---|---|---|
| `c58d4ab` | K-2 golden-path drift (D1) | phase-1-plan.md, phase-2-cross-stack-replication.md | 12 ins / 12 del |
| `e91a5eb` | PD-2 README uv-run consistency | 11 × `packages/*/README.md` | 11 ins / 11 del |

## § 4 — Invariant verification (I1–I7) at HEAD `e91a5eb`

| I | Invariant | State | Evidence |
|---|---|---|---|
| I1 | LFS pointer/content unchanged | **HOLD** | only `docs/` + `packages/*/README.md` edited; no `captures/`/LFS pointer touched |
| I2 | Cross-phase replay bit-identity | **HOLD** | no code / integrity-logic change; invariant unaffected |
| I3 | integrity 0 HARD_FAIL; baseline byte-for-byte | **HOLD** | `0 HARD_FAIL, 14 SOFT_WARN`; full-report sha256 `c19492ad…d22cb52` (exact) |
| I4 | verify_evidence GREEN (no regression) | **HOLD** | Stage-0 checkpoint 4/0; this checkpoint resolves at `e91a5eb` |
| I5 | append-only (no published audit edited) | **HOLD** | only net-new audit added; no prior `docs/_audits/**` edited |
| I6 | Convention #12 SHA back-fill separate commit | **HOLD** | back-fill is the separate next commit |
| I7 | no agent-pushed tags | **HOLD** | no tag pushed |

## § 5 — Verification sweep (FACT)

- `.venv/bin/python -m integrity --all --mode strict` → `0 HARD_FAIL, 14 SOFT_WARN`;
  full-report sha256 `c19492add530f3a5a0d723777cf818a702b7019ee664c733695364aa6d22cb52` (baseline held).
- `pytest tools/testkit/lfs_migration/` → `15 passed, 1 failed` (PD-1 proxy gap; unchanged, fixed at Cluster D).
- Diff surgical: `git diff` shows only the `code_verification/golden`→`golden` segment + README invocation lines.

## § 6 — Exit state

Cluster A items closed: K-2 (executed plans) RESOLVED, K-2 (phase-3) DEFERRED per D1, PD-2 RESOLVED.
No scope expansion; no STOP. Next cluster per dispatch order: **1.C** (CI / workflow / supply-chain
hygiene; UNKNOWN-1 post-reset CI verification).

## Conventions honored

Convention #8 (canonical path + occurrence counts grep-verified; no fabrication); Convention M
(re-anchored against HEAD; counts confirmed; no drift); Convention A (net-new checkpoint; back-fill
follows); Convention #12 (SHA back-fill is the separate next commit, never `--amend`); R-4 (one
commit per theme); `evidence_paths` a list / `evidence_hashes` a YAML mapping; four-state verdict
(CONFIRMED-Stage-1-A); FACT/INFERENCE tagging; no agent-pushed tag (I7).
</content>
</invoke>
