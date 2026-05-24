---
date: 2026-05-24T15-00-37Z
author: ci-action-migration-and-banked-cleanup-sub-phase-agent
phase: 2
artifact: stage
artifact_id: ci-action-migration-and-banked-cleanup-stage-1a
subject: "Stage 1a CLOSE — S-CI2 GitHub Actions Node-20 -> Node-24 migration landed (feat 8508ed9). Four node20 actions bumped to current latest-node24 majors across all 9 workflows (D3 re-fetch at edit time 2026-05-24): actions/checkout v4->v6 (×9), astral-sh/setup-uv v6->v8 (×6), actions/setup-node v4->v6 (×1), pnpm/action-setup v4->v6 (×1) = 17 uses: version-string changes only. All four D4 with:-block preservation items verified BYTE-FOR-BYTE post-edit (R-CI CLEARED): lfs:true (python-strict), fetch-depth:0 (audit-append-only), setup-node inputs + pnpm version (ts-strict). 9/9 workflows YAML-valid via pyyaml fallback (actionlint NOT installed; documented). Surprise-action sweep CLEAN. Task 1a.4 bit-identity invariant 9399fc33…909f34 RE-HELD post-edit (25th+ invocation; workflow edits do not perturb the tagged-content replay). HEAD un-drifted from Stage-0 4ca88cb at start. Verdict CONFIRMED; 0 new shifts; cumulative 150. D10 ratified for Stage 1b (additive strategy (i); strategy (ii) banked). No -phase-N tag."
verdict-state: CONFIRMED
head_sha: <COMMIT_N1_SHA_PENDING>
head_sha_at_checkpoint: <COMMIT_N1_SHA_PENDING>
parent_audits:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-checkpoint-2026-05-24T14-48-58Z.md
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-0-sha-back-fill-2026-05-24T14-48-58Z.md
  - docs/phases/sub-phase-ci-action-migration-and-banked-cleanup.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1a-evidence/replay-postedit-2026-05-24T15-00-37Z.txt
  - .github/workflows/audit-append-only.yml
  - .github/workflows/determinism.yml
  - .github/workflows/equivalence.yml
  - .github/workflows/integrity.yml
  - .github/workflows/mutation-testing.yml
  - .github/workflows/python-strict.yml
  - .github/workflows/structure.yml
  - .github/workflows/tolerance-budget-check.yml
  - .github/workflows/ts-strict.yml
evidence_hashes:
  docs/_audits/phase-2/sub-phase-ci-action-migration-and-banked-cleanup/stage-1a-evidence/replay-postedit-2026-05-24T15-00-37Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
---

# Stage 1a Checkpoint — S-CI2 Workflow Node-Runtime Migration

## § 1. Scope

(FACT — charter `docs/phases/sub-phase-ci-action-migration-and-banked-cleanup.md` § 1.1 + § 3 item 1
+ § 4 Stage 1a.) The substantive **S-CI2** work: bump the four GitHub Actions pinned to the
deprecated Node-20 runtime to their current latest-Node-24 majors across all 9 `.github/workflows/*.yml`,
preserving four `with:`-block items byte-for-byte (R-CI). Purely mechanical version-string migration —
**no source code, no sim, no dependency, no tolerance edit** (those are Stage 1b / out-of-scope). The
migration feat landed at `8508ed9`.

## § 2. Operator routing consumed (D1–D10)

(FACT — plan-drafting close D1–D9 + Stage-1a dispatch SECTION 1 D10.)

| D | Routing | Stage-1a action |
|---|---|---|
| D1 | Name ratified | paths/slug match |
| D2 | THREE-STAGE | this is Stage 1a |
| D3 | Targets = latest-node24 majors **re-fetched at edit time** | Task 1a.1 fresh fetch (§ 4); NOT the Stage-0 informational snapshot |
| D4 | Preservation set (no optionality) | Task 1a.2/1a.3 byte-for-byte (§ 5, § 6) — CLEARED |
| D5 | Opt-out env var NO | not used |
| D6 | Stage-1b testing-improvements + LBM co-located-only | out of Stage-1a scope |
| D7 / D8 / D9 | STAY-BANKED / STAY-BANKED / no tag | honored |
| **D10** | Stage-1b manifest-equality = additive strategy (i); strategy (ii) banked | forward-routed; recorded § 11 |

## § 3. Task 1a.0 — Preflight (HEAD verify + actionlint posture)

(FACT — `git rev-parse HEAD`; `command -v actionlint`.)

- **HEAD == `4ca88cb60223003516e8823d4d4e4b9eba7939be`** (Stage-0 close) at Stage-1a start. **NO drift.**
  D4 preservation set + 9-workflow inventory intact (re-grep matched Stage-0 § 6 verbatim). No
  Hard-Rule-2 condition.
- **`actionlint` NOT installed** (not on PATH). Per D10-adjacent routing: actionlint is NOT installed
  as part of Stage 1a (out of scope). **Fallback posture adopted:** `python3 -c "import yaml;
  yaml.safe_load(...)"` (pyyaml 6.0.1) over each modified file + `uses:` re-grep across all 9 workflows.
  (`yq` also absent.) Fallback executed at Task 1a.3 (§ 6) — all 9 VALID.

## § 4. Task 1a.1 — D3 re-fetch (Convention #8, moment-of-assertion)

(FACT — web-fetched 2026-05-24 at edit time per Convention #8 + D3; these are the FACT targets for
this stage's edits, NOT the Stage-0 informational snapshot.)

| Action | HEAD pin (pre-edit) | Current latest major (fetched 2026-05-24) | Migrated to |
|---|---|---|---|
| `actions/checkout` | `@v4` (node20; v4.3.1 still exists) | **v6** (v6.0.2) | `@v6` |
| `astral-sh/setup-uv` | `@v6` (node20) | **v8** (v8.1.0) | `@v8` |
| `actions/setup-node` | `@v4` (node20) | **v6** (v6.4.0) | `@v6` |
| `pnpm/action-setup` | `@v4` (node20) | **v6** (v6.0.8) | `@v6` |

**No advancement / regression / yank since the Stage-0 Task-0.2 snapshot** (checkout v6, setup-uv v8,
setup-node v6, pnpm v6 — identical). No Hard-Rule-2 condition. **Deprecation date re-verify:** the
canonical GitHub Changelog (2025-09-19) Node-24 default-switch date **2026-06-16** (removal fall 2026)
holds — confirmed at Stage-0 Task 0.2 + re-confirmed this stage; unchanged.

## § 5. Task 1a.2 — Per-workflow migration (per-file diff summary)

(FACT — `git diff .github/workflows/`; 9 files, 17 insertions / 17 deletions, all on `uses:` lines.)

| Workflow | `uses:` lines changed | D4 preservation re-verified |
|---|---|---|
| `.github/workflows/audit-append-only.yml` | 1 (checkout v4→v6) | `fetch-depth: 0` preserved ✓ |
| `.github/workflows/determinism.yml` | 2 (checkout v4→v6; setup-uv v6→v8) | n/a (no D4 item) |
| `.github/workflows/equivalence.yml` | 2 (checkout; setup-uv) | n/a |
| `.github/workflows/integrity.yml` | 2 (checkout; setup-uv) | n/a |
| `.github/workflows/mutation-testing.yml` | 2 (checkout; setup-uv) | n/a |
| `.github/workflows/python-strict.yml` | 2 (checkout v4→v6; setup-uv v6→v8) | `lfs: true` preserved ✓ |
| `.github/workflows/structure.yml` | 1 (checkout v4→v6) | n/a |
| `.github/workflows/tolerance-budget-check.yml` | 2 (checkout; setup-uv) | n/a |
| `.github/workflows/ts-strict.yml` | 3 (checkout v4→v6; pnpm v4→v6; setup-node v4→v6) | setup-node inputs + pnpm `version: 10` preserved ✓ |

Every change is a version-string token bump on a `uses:` line; **no other line** (whitespace,
indentation, `with:` content, step names, run blocks) changed. Verified by full `git diff` review
(Task 1a.2(c)).

## § 6. Task 1a.3 — Post-migration verification

(FACT — pyyaml fallback + `sed -n` verbatim + `grep` sweep at post-edit HEAD.)

- **(a) YAML validity:** all **9 / 9 VALID** via `yaml.safe_load` (pyyaml 6.0.1; actionlint-fallback).
- **(b) D4 preservation byte-for-byte re-verify** (post-edit; line numbers unchanged — in-place bumps):
  - `.github/workflows/python-strict.yml:16` → `          lfs: true` (checkout now `@v6` at `:14`) ✓
  - `.github/workflows/audit-append-only.yml:26` → `          fetch-depth: 0` (checkout now `@v6` at `:24`) ✓
  - `.github/workflows/ts-strict.yml:25`–`27` → `node-version: 22` / `cache: pnpm` /
    `cache-dependency-path: common/common-ts/pnpm-lock.yaml` (setup-node now `@v6` at `:23`) ✓
  - `.github/workflows/ts-strict.yml:20` → `          version: 10` (pnpm now `@v6` at `:18`) ✓
  - **All four byte-identical to the Stage-0 § 6 verbatim capture.** Only the `uses:` token above each
    block changed.
- **(c) Surprise-action sweep: CLEAN.** Post-migration `uses:` inventory: `actions/checkout@v6` ×9,
  `astral-sh/setup-uv@v8` ×6, `actions/setup-node@v6` ×1, `pnpm/action-setup@v6` ×1. No stale
  `@v4`/`setup-uv@v6` tokens remain; no `uses:` line on any non-targeted action (Stage-0 Task-0.3
  established there are no other pinned actions).
- **(d) Remote CI:** NOT invoked (operator action at landing; boundary). Local pyyaml validity is the
  Stage-1a gate.

## § 7. Task 1a.4 — Bit-identity invariant re-check (defensive, post-edit)

(FACT — `stage-1a-evidence/replay-postedit-2026-05-24T15-00-37Z.txt`; replay procedure per
conventions § D.5.) Post-edit replay vs `v0.1.0-phase-1` GREEN (8/8 gates, `ok=True`); replay-output
sha256 `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` — **byte-identical to the
bit-identity invariant** (`9399fc33…18909f34`); **25th+ invocation; RE-HELD.** As expected, the
HEAD-workflow edits do not perturb the replay (it re-runs prior-phase gates against the tagged
`v0.1.0-phase-1` content in a worktree, independent of HEAD's `.github/workflows/`). Re-verified for
symmetry per the dispatch (Stage 0 deferred this; Stage 1a confirms the load-bearing CI-surface edit
left the invariant intact).

## § 8. Banked items / observations

- **`actionlint` absence (banked-tooling observation).** The repo's strict-mode CI policy
  (architecture § G.9) names `actionlint` as the workflow-YAML linter, but it is NOT installed in this
  environment. Stage 1a used the pyyaml `safe_load` fallback (documented). Installing `actionlint`
  (e.g., as a pre-commit hook or dev tool) is a **banked tooling-improvement candidate** (orthogonal to
  this sub-phase's scope; surfaced for a future infra sub-phase or operator routing). Not load-bearing
  here — pyyaml validity + the full git-diff review + the `uses:` re-grep cover the migration's
  correctness surface.
- **`check yaml` pre-commit hook skipped the workflow files.** The `check-yaml` pre-commit hook
  reported "(no files to check) Skipped" on the migration commit — it appears scoped away from
  `.github/workflows/`. Non-load-bearing (pyyaml validity covered it); noted for the record.
- **No `uses:`-pinned third-party action outside the four targeted** (Stage-0 Task-0.3 + Task 1a.3(c));
  the migration surface is fully enclosed by the four actions.

## § 9. R-CI risk verdict

**R-CI (with:-block preservation through the version bump): CLEARED.** All four load-bearing `with:`
blocks (`lfs: true`, `fetch-depth: 0`, setup-node inputs, pnpm `version: 10`) are byte-for-byte
identical post-edit to the Stage-0 § 6 verbatim capture (§ 6b). No `with:` line changed; only the
`uses:` version token above each. The two S-CI1-load-bearing blocks (`lfs: true` for legacy-captures
smudge; `fetch-depth: 0` for the append-only prior-tag read) are intact. **R-CI2** (target-major drift)
addressed by the Task-1a.1 fresh re-fetch. **R-CI3** (actionlint availability) resolved via the
documented pyyaml fallback.

## § 10. Stage 1b readiness

READY. Stage 1a is fully enclosed (CI workflows only); it touched no Stage-1b surface. Stage 1b's
starting state per Stage-0 Task 0.5: `pytest-timeout` absent (clean); no public `build_manifest()` —
manifests built inline (physarum has a private `_build_manifest`). The S-CI2 migration does not affect
Stage 1b's surface. No blockers.

## § 11. Forward-routed Stage 1b inheritance (D10 ratified)

(FACT — Stage-1a dispatch SECTION 1 D10.) **Stage 1b manifest-equality strategy = ADDITIVE strategy (i):**
test assertions against what `sim_runner_*` already emits at HEAD; **no sealed Phase-1 package edits.**
This realizes § J.7's intent without the strategy-(ii) public-`build_manifest()` refactor. **Strategy
(ii) (REFACTOR) is NOT routed** — it stays a banked future item if Stage 1b's additive approach surfaces
a substantive reason to refactor. Consequence for the LBM `sim_runner_diagnostic` cosmetic (D6): under
strategy (i) the manifest-equality test does NOT edit LBM `sim.py`, so the cosmetic fix does NOT
co-locate naturally → **STAYS BANKED** (Stage-0 Task 0.6 verdict holds).

## § 12. Verdict

**CONFIRMED.** S-CI2 migration landed (feat `8508ed9`); 17 `uses:` version-string changes across 9
workflows; D4 preservation 4/4 byte-for-byte (R-CI CLEARED); 9/9 YAML-valid; surprise sweep clean;
bit-identity invariant RE-HELD (25th+ invocation). **0 new Stage-1a shifts.**

**Cumulative shift count at Stage 1a close: 150 + 0 = 150** entering Stage 1b.

---

This checkpoint lands at HEAD `<COMMIT_N1_SHA_PENDING>` (back-filled per Convention #12 + § B.2 + N1
enumeration in a separate `chore(ci-action-migration-and-banked-cleanup-stage1a-sha-backfill)` commit;
full 40-hex via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED** (S-CI2 migration complete; R-CI CLEARED; bit-identity invariant HELD; not
BLOCKED; Hard Rule 2 not triggered).
