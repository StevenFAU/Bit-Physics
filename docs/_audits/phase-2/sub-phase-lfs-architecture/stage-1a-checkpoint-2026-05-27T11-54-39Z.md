---
date: 2026-05-27T11-54-39Z
author: lfs-architecture-stage-1a-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lfs-architecture-stage-1a
stage: stage-1a-checkpoint
verdict: CONFIRMED-Stage-1a-RED
head_sha: <COMMIT_3_SHA_PENDING>
head_sha_at_checkpoint: <COMMIT_3_SHA_PENDING>
evidence_paths:
  - docs/phases/sub-phase-lfs-architecture.md
  - tools/testkit/lfs_migration/README.md
  - tools/testkit/failing-tests-evidence/lfs-architecture-stage-1a-2026-05-27T11-46-02Z.txt
evidence_hashes:
  docs/phases/sub-phase-lfs-architecture.md: sha256:76db61394db80691f5629a014183cd310d16941751141f4da06b167e986ec550
  tools/testkit/lfs_migration/README.md: sha256:e813bb487597b73671f154d3290b4ff5dae133dda4709ed732882e9f69fcae9c
  tools/testkit/failing-tests-evidence/lfs-architecture-stage-1a-2026-05-27T11-46-02Z.txt: sha256:9644a43597a41da39f343c73d057c86dcfc509272c407f6ef0e6534e41e812a6
deferred_items: []
ci_activation: []
top_level_deps_to_merge: []
---

# Stage 1a checkpoint — sub-phase-lfs-architecture (RED tests scaffolded)

**Verdict: CONFIRMED-Stage-1a-RED.** The invariant-verification test surface
`tools/testkit/lfs_migration/` is committed RED-first: the expected GREEN set (I1–I7
regression-locks + the cost-axis registry-completeness lock) passes, and the expected RED set
(cost-axis over-fetch + the two R2-config tests) fails with the documented failure modes that
Stage 1b will satisfy. All Stage-0 anchors hold; integrity baseline and the canonical replay are
unchanged. No migration was performed (no `.lfsconfig`, no R2, no secret, no capture, no workflow
touched). One pre-existing repo-state finding (two non-phase tags) is surfaced in § 1 / § 8; it is
**not** a Hard-Rule-2 STOP (the I7 invariant holds — see below).

`head_sha` is `<COMMIT_3_SHA_PENDING>` at write time (this checkpoint bundles the charter § 11
amendment in its own commit, so its evidence resolves at that commit); the SHA back-fill (commit 4,
Convention #12) sets it to commit 3's actual SHA.

## § 1 — Anchor re-check (P1)

HEAD at session start: `9610fc3` (Stage-0 SHA back-fill, the last Stage-0 commit). Preconditions
1–8 verified: HEAD is a successor of the Stage-0 chain; `v0.2.0-phase-2` present; the five Stage-0
commits (`0ae3c57` / `d2df754` / `ee9aabb` / `df4b6cc` / `9610fc3`) present; catalog vendored;
charter reflects the Stage-0 D-class amendment block.

| Anchor | Stage 0 close | HEAD re-run | Status |
|---|---|---|---|
| Integrity baseline (I3) | 0 HF / 14 SW; digest `c19492ad…6d22cb52` | `integrity --all --mode strict` → 0 HF / 14 SW; digest `c19492ad…6d22cb52` | MATCH |
| verify_evidence — Stage 0 checkpoint | 8 / 0 | re-run → 8 / 0 (head_sha `ee9aabb`) | MATCH |
| verify_evidence — plan-drafting landing | 4 / 0 | re-run → 4 / 0 (head_sha `c771d70`) | MATCH |
| Replay (I2) phase-1 → `v0.1.0-phase-1` | `ok=True` 8/8 | re-run → `ok=True` 8/8 | MATCH |
| Charter sha256 | `4597c3ce…` (Stage-0 close, pre-Stage-1a) | `4597c3ce…` at session start; `76db6139…` after the Stage-1a § 11 amendment (commit 3) | EXPECTED CHANGE |
| Catalog at `docs/planning/` | `361efbd6…` | `361efbd6…` | MATCH |
| I1 — 3 pinned Phase-2 audits | 9/0 · 48/0 · 13/0 | re-run → 9/0 · 48/0 · 13/0 | MATCH |
| I5 — prior-tag LFS resolvability | (probe-implied) | phase-0 (0 ptrs) / phase-1 (0 ptrs) / phase-2 (31 ptrs) all resolve from local store; 0 missing | PASS |
| Cost-axis — LFS-fetching workflows | 2 of 10 (`python-strict`, `cpp-strict`) | `grep "lfs: true" .github/workflows/` → 2 of 10 (same two) | MATCH |

No load-bearing drift. The only HEAD change is the Stage-1a chain itself; the charter sha256
change is the intended § 11 dashboard amendment (commit 3).

**I7 pre-existing-tag finding (NOT a STOP).** The repo carries two non-phase tags from prior work:
`pre-lfs-migration-backup` → `cf13d1c` (the prior `sub-phase-git-lfs-migration` history-rewrite
backup, charter § 1.3) and `v0.1.9` → `1ea43b9` (an mpm point-release). Both are **ancestors of
`v0.2.0-phase-2`** (they predate this sub-phase) and are lightweight tags. The I7 invariant — *this
sub-phase pushes no tag* — is intact: `git tag --contains v0.2.0-phase-2` lists only
`v0.2.0-phase-2`, i.e. no tag points into the sub-phase range. The I7 test was re-encoded to lock
exactly that property rather than a naive "exactly three tags" assumption (which the two
pre-existing tags would have spuriously tripped).

## § 2 — Invariant verification surface (P2)

New surface `tools/testkit/lfs_migration/` (11 tests across 9 `test_*.py` files + `_helpers.py` +
`_gen_red_evidence.py` + `README.md`). RED/GREEN mechanism: the three RED tests carry a built-in
`xfail(strict=True)` marker via `red_until_stage_1b()`; a normal run reports them XFAIL (suite
green under `-W error` / `filterwarnings = ["error"]`); `--runxfail` makes them fail for real;
`strict=True` forces marker removal once Stage 1b makes them pass (XPASS fails the suite).

| Test | Invariant | State | Asserts | RED hypothesis / PASS target |
|---|---|---|---|---|
| `test_i1_content_oid.py` | I1 | GREEN | verify_evidence PASS on 3 pinned audits; every HEAD pointer well-formed; local object sizes match pointers; sha256(content)==OID witnessed ≤32 MiB | Locks content-OID semantics; Stage 1b's pointer-byte-preserving migration must keep it green |
| `test_i2_replay_lock.py` | I2 | GREEN | phase-1 canonical replay `ok=True` 8/8 | Locks bit-identity replay against Stage 1b regression |
| `test_i3_integrity_baseline.py` | I3 | GREEN | `integrity --all --mode strict` = 0 HARD_FAIL | Gate is 0 HF (digest grows with new audits); Stage 1b must not introduce a HARD_FAIL |
| `test_i4_append_only_lock.py` | I4 | GREEN | append-only workflow present + configured; `.ledger.md` prefix check (set empty today) | Locks the enforcing workflow; Stage 1b must not weaken it |
| `test_i5_worktree_replay.py` | I5 | GREEN | prior-tag (phase-0/1/2) pointers well-formed + locally resolvable | Live worktree-smudge sample deferred to Stage 1c; Stage 1b retains GitHub LFS (D4) so this stays green |
| `test_i6_convention_12.py` | I6 | GREEN | sub-phase back-fill commits are separate + doc-only + cite Convention #12 | Locks Stage 1a's own commit-4 back-fill discipline |
| `test_i7_no_agent_tags.py` | I7 | GREEN | no tag points into `v0.2.0-phase-2..HEAD`; phase tags present | Stage 1b/1c push no tag |
| `test_cost_axis_selective_fetch.py::…registry_is_complete` | cost-axis | GREEN | requirement registry == present workflow set | Catches an undeclared workflow addition |
| `test_cost_axis_selective_fetch.py::…no_workflow_overfetches_lfs` | cost-axis | **RED** | only a `full`-requirement workflow may set `lfs: true` | Currently `cpp-strict` + `python-strict` over-fetch. PASS target § 3 |
| `test_r2_config_present.py::…lfsconfig_points_to_r2` | R2-config | **RED** | repo-root `.lfsconfig` references R2 / `lfs-s3` | No `.lfsconfig`. PASS target: Stage 1b M1 |
| `test_r2_config_present.py::…all_r2_secrets_referenced_by_a_workflow` | R2-config | **RED** | all four R2 secrets referenced via `secrets.<NAME>` | None referenced. PASS target: Stage 1b workflow edits |

Surface state: **13 passed, 3 xfailed** (normal run); **13 passed, 3 failed** (`--runxfail`).

## § 3 — Cost-axis test (P3)

LFS-fetching workflows at HEAD: **2 of 10** (`.github/workflows/python-strict.yml:16`,
`.github/workflows/cpp-strict.yml:29`) — matches
the probe; no drift. **No existing repo taxonomy** for "this workflow needs captures" was found
(`grep -ril` across `.github/`, `docs/conventions/`, `docs/ops/`, `tools/testkit/` → none). Per the
dispatch's § P3 allowance, Stage 1a introduces a **minimal, in-test registry** (not a repo-wide
convention artifact): `WORKFLOW_CAPTURE_REQUIREMENT` in `test_cost_axis_selective_fetch.py`, sourced
from probe § P3, mapping each workflow to `none` / `corpus-only` / `full`. This is localized test
data with documented provenance — it does not feel out of scope (no STOP), and it encodes the
**rule**, not merely the current state: *a workflow may set `lfs: true` only if its requirement is
`full`*. Per § P3, no workflow is `full` (cpp-strict = none; python-strict = corpus-only), so the
over-fetch test is RED today and the rule stays meaningful post-Stage-1b (a future `full` workflow
could legitimately set `lfs: true`). The companion registry-completeness test is GREEN and catches
an undeclared workflow addition.

## § 4 — R2 integration test surface (P4)

RED-only at Stage 1a; static config, **no live-network test** (R2 reachability is the Stage 1b M2
proof). The RED set matches the dispatch's expected RED set exactly:

- `test_lfsconfig_points_to_r2` — RED: no repo-root `.lfsconfig`. Target: Stage 1b M1 commits it
  pointing at the R2 S3 endpoint via the `lfs-s3` standalone transfer agent.
- `test_all_r2_secrets_referenced_by_a_workflow` — RED: none of `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME` are referenced. Target: Stage 1b
  workflow edits reference all four via `secrets.<NAME>`.

UNKNOWN-4 confirmed by operator: the four R2 repo secrets exist (`R2_BUCKET_NAME = bit-physics-lfs`).
Stage 1a did **not** read their values (presence documented by name only).

## § 5 — Failing-tests output hash

Evidence file: `tools/testkit/failing-tests-evidence/lfs-architecture-stage-1a-2026-05-27T11-46-02Z.txt`.
sha256: `9644a43597a41da39f343c73d057c86dcfc509272c407f6ef0e6534e41e812a6` (recorded in commit 1's
footer). **Reproducible byte-identically**: the pinned generator `lfs_migration._gen_red_evidence`
runs `pytest --runxfail -v --tb=short -p no:cacheprovider lfs_migration/`, applies the canonical
project normalizer (`integrity.scripts.replay_failing_tests.normalize_pytest_output`: timing
summary → `NN.NNs`, platform interpreter → `<INTERPRETER>`, absolute repo path → `<REPO>`), then
EOF-normalizes to a single trailing newline (so `end-of-file-fixer` is a no-op and the hash is
stable across the commit hook). Two independent generator runs produced byte-identical output. The
evidence shows exactly the three expected RED failures + 13 passes.

(Convention note, Convention #8) The repo's failing-tests-evidence convention historically commits
*raw* pytest output and normalizes symmetrically only at replay-comparison time; the dispatch here
asks for a *reproducible* hash, so the committed artifact is the *normalized* form and the
reproduction contract is the pinned generator + canonical normalizer. The artifact is not wired
into the sim-oriented `replay_failing_tests.py --pytest-target` path (no auto-glob; that tool takes
explicit args), so no phase-landing machinery mis-handles this infra entry.

## § 6 — Stage 1b entry preconditions

- Stage 1a RED recorded with reproducible output hash (§ 5).
- I1/I2/I3 GREEN on the unchanged tree; all Stage-0 anchors hold (§ 1).
- D1 backend LOCKED (R2 via `lfs-s3`); D2/D5/D6 LOCKED at Stage 0; UNKNOWN-2/4 RESOLVED (§ 7).
- The three RED tests are the unambiguous Stage 1b PASS target: selective fetch (cost-axis),
  `.lfsconfig` (M1), four R2 secret references.
- The `strict=True` xfail markers will force Stage 1b to remove each marker as it goes green.

## § 7 — Charter amendments (commit 3)

A dated **Stage-1a amendment block** was inserted after the Stage-0 amendment block (preserving
prior text, per the established pattern), and a **dashboard-anchored amendment note** at the head of
§ 11. Together they: (1) record **UNKNOWN-2 RESOLVED** with the live dashboard data — bandwidth
**10 GB / 10 GB free, 100% consumed / throttled**; storage **380.77 GB-hr** integral
(period-average ~0.61 GB, well under the 10 GB quota); **$0 billed**; (2) re-frame § 11 so
**bandwidth is the load-bearing constraint** (R2 zero egress dissolves it) and storage is a
secondary slow-burn axis (R2 buys headroom to the Phase-4 10 GiB crossing); (3) record **UNKNOWN-4
RESOLVED** (four R2 secrets present); (4) note the mutation-testing re-tier rider remains HELD
(routed separately, out of scope). The original inventory-derived § 11 narrative is preserved
below the note. (INFERENCE) The dashboard storage GB-hr integral (time-weighted over a period in
which the Phase-2 corpus was still being committed) and the 4.852 GiB HEAD snapshot (probe § P1)
are different measurement bases; both confirm storage < quota, and the decision-relevant signal is
unchanged — bandwidth, not storage, is the live pressure. Charter sha256 `4597c3ce…` → `76db6139…`.

## § 8 — UNKNOWNs / observations for Stage 1b

- **UNKNOWN-2 / UNKNOWN-4 — RESOLVED** (§ 7). No open billing/credential UNKNOWNs remain.
- **R2 reachability from CI** — unverified by design at Stage 1a (no live-network test). Stage 1b
  M2 (test-object push/pull + sha256 round-trip) is the first live exercise of the secrets.
- **Two pre-existing non-phase tags** (`pre-lfs-migration-backup`, `v0.1.9`) — documented (§ 1).
  Not this sub-phase's doing; both predate `v0.2.0-phase-2`. Surfaced for transparency; no action
  required by Stage 1b. An operator point-release tag during the sub-phase would be a deliberate
  re-baseline of the I7 lock (it asserts no tag points into `v0.2.0-phase-2..HEAD`).
- **mutation-testing re-tier rider** — HELD; routed to a sibling dispatch (Stage-0 § 7). Out of
  Stage 1a/1b scope.
- **I1 full-content sweep** — the content-hash witness is bounded to ≤32 MiB by default
  (`LFS_MIGRATION_FULL_CONTENT=1` hashes all locally-present objects); the exhaustive A5 bulk sweep
  is the Stage 1b M4 / Stage 1c posture.

## Conventions honored

Convention #8 (no fabrications: the dashboard GB-hr vs HEAD-snapshot discrepancy is surfaced as an
INFERENCE, not papered over; the § 2.13/golden-path and other prior items untouched); Convention M
(re-anchored against live HEAD before edits); Cat-4 path:line discipline (no unresolved citations);
`evidence_hashes` as a YAML **mapping**, `evidence_paths` as a list (the verify_evidence contract);
Hard Rule 2 (the I7 pre-existing-tag finding was investigated and shown not to break the invariant —
surfaced, not silently absorbed); Convention #12 (SHA back-fill is the separate commit 4). No tag
pushed (I7).
