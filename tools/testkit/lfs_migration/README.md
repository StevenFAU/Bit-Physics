# `lfs_migration` — invariant-verification test surface

This directory is the **stage-boundary test surface** for
`sub-phase-lfs-architecture`. It encodes, as runnable tests, the invariants the
LFS-backend migration must preserve. The authoritative source for what each
test must verify is the charter:
`docs/phases/sub-phase-lfs-architecture.md` **§ 7 — Named invariants I1–I7**
(plus § A5, the cost-axis framing in § 4.2 / § 11, and the R2 integration in
§§ 5–6).

## Purpose

Stage 1a adds this surface **RED-first** (TDD, spec § 1.3): the tests are
committed before the migration so Stage 1b has a concrete, mechanical PASS
target. Most tests are **GREEN regression-locks** (they pass today and exist to
fail loudly if Stage 1b regresses an invariant); three are **RED** (they
describe state that only Stage 1b creates).

Stage 1a itself performs **no migration**. It does not touch `.lfsconfig`, R2,
GitHub Actions secrets, any capture, or any workflow.

## RED → GREEN contract (Stage 1b's responsibility)

A RED test wears a built-in `xfail(strict=True)` marker, applied via
`red_until_stage_1b(target)` in `_helpers.py`:

- **Normal run** (`pytest lfs_migration/`, including under `-W error` /
  `filterwarnings = ["error"]`): the RED tests report **XFAIL**, so the suite
  stays green and CI is not blocked by not-yet-implemented work.
- **Evidence run** (`pytest --runxfail lfs_migration/`): the marker is ignored
  and the RED tests **fail for real** — this is how the Stage 1a failing-tests
  evidence is captured.
- **After Stage 1b** makes a RED test pass: because `strict=True`, the
  unexpected **XPASS fails the suite**, forcing whoever lands Stage 1b to
  **remove the marker**. A passing test may not keep wearing the RED badge —
  that is the contract.

Each RED marker's `reason` string states the exact Stage 1b satisfaction target.

## Test → invariant map

| Test file | Invariant | State at Stage 1a |
|---|---|---|
| `test_i1_content_oid.py` | I1 — LFS content-OID semantics | GREEN (lock) |
| `test_i2_replay_lock.py` | I2 — bit-identity replay | GREEN (lock) |
| `test_i3_integrity_baseline.py` | I3 — integrity baseline (0 HARD_FAIL) | GREEN (lock) |
| `test_i4_append_only_lock.py` | I4 — append-only audits | GREEN (lock) |
| `test_i5_worktree_replay.py` | I5 — prior-tag capture resolvability | GREEN (lock) |
| `test_i6_convention_12.py` | I6 — Convention #12 (separate SHA back-fill) | GREEN (lock) |
| `test_i7_no_agent_tags.py` | I7 — no agent-pushed tags | GREEN (lock) |
| `test_cost_axis_selective_fetch.py::...registry_is_complete` | cost-axis (§ 4.2) | GREEN (lock) |
| `test_cost_axis_selective_fetch.py::...no_workflow_overfetches_lfs` | cost-axis (§ 4.2) | **RED** |
| `test_r2_config_present.py::...lfsconfig_points_to_r2` | R2 config (§§ 5–6) | **RED** |
| `test_r2_config_present.py::...all_r2_secrets_referenced_by_a_workflow` | R2 config (§§ 5–6) | **RED** |

The three RED tests are exactly the Stage 1b deliverable surface: selective
fetch (cost-axis), `.lfsconfig` (M1), and the four R2 secret references.

## Files

- `_helpers.py` — repo geometry, offline git/LFS-pointer primitives, the
  invariant-command subprocess runner, and `red_until_stage_1b()`. Not a test
  module.
- `_gen_red_evidence.py` — deterministic failing-tests-evidence generator. Runs
  the surface with `--runxfail`, applies the canonical
  `integrity.scripts.replay_failing_tests.normalize_pytest_output`, and writes
  an EOF-clean artifact whose sha256 is reproducible byte-identically. Not a
  test module.
- `test_*.py` — the eleven invariant tests above.

## Running

```
cd tools/testkit
uv run pytest -W error lfs_migration/            # normal: 13 passed, 3 xfailed
uv run pytest --runxfail -W error lfs_migration/ # evidence: 13 passed, 3 failed
```

Notes:

- The I1/I2/I3 locks shell out to the real invariant commands
  (`integrity.scripts.verify_evidence`, `integrity.scripts.replay_prior_phase`,
  `integrity --all --mode strict`); the surface runs in a few seconds.
- The I1 content-hash witness covers objects ≤ 32 MiB by default; set
  `LFS_MIGRATION_FULL_CONTENT=1` to hash every locally-present object (the
  Stage 1b/1c A5 bulk-sweep posture).
