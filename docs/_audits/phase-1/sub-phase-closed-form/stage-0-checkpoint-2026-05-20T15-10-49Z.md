---
date: 2026-05-20
author: closed-form-sub-phase-agent
artifact: stage
artifact_id: closed-form-stage-0
stage: 0-preflight
subject: "Closed-form sub-phase Stage 0 (pre-flight) checkpoint"
verdict-state: complete
head_sha: 6d5ac0e2b60de3b668a6e03182dcdb3a12be5140
head_sha_at_checkpoint: 6d5ac0e2b60de3b668a6e03182dcdb3a12be5140
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
evidence_paths:
  - docs/_audits/phase-1/sub-phase-closed-form/stage-0-replay-2026-05-20T15-10-49Z.txt
  - docs/_audits/phase-1/sub-phase-closed-form/stage-0-evidence-reverify-2026-05-20T15-10-49Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/failing-tests-evidence/strange-attractors-2026-05-20T12-54-18Z.txt
  - tools/testkit/failing-tests-evidence/mandelbulb-explorer-2026-05-20T12-54-18Z.txt
evidence_hashes:
  docs/_audits/phase-1/sub-phase-closed-form/stage-0-replay-2026-05-20T15-10-49Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-1/sub-phase-closed-form/stage-0-evidence-reverify-2026-05-20T15-10-49Z.txt: sha256:77bd5270cf6ed9513670667062de1a787916b15be164a1a538814a37c9733760
  tools/testkit/failing-tests-evidence/strange-attractors-2026-05-20T12-54-18Z.txt: sha256:c4f72e2595bfe0702ac1d1721371e65ea985661be89c114e100da783104cac63
  tools/testkit/failing-tests-evidence/mandelbulb-explorer-2026-05-20T12-54-18Z.txt: sha256:d4a89d3e782e639c179238d7fc5f4c307a99cf0ec74d9ebb5d8db547b37e2ca0
---

# Closed-form Sub-Phase — Stage 0 (Pre-flight) Checkpoint

## 1. Scope

(FACT — `docs/phases/sub-phase-closed-form.md` § 4.1.) Stage 0 is
pre-flight for the closed-form sub-phase under spec-Phase-1.
Three tasks: cross-phase audit replay (Task 0.0), tolerance-budget
carryover (Task 0.1), Phase 1 failing-tests evidence sha256 re-verify
(Task 0.2). No sim work; no edits outside `tolerance-budget.toml`
and new audit files under
`docs/_audits/phase-1/sub-phase-closed-form/`.

Pre-state at session start: `HEAD = 91429f3fa8ee85a4af4ba751379423cd0137291d`
(closed-form charter rename commit). Working tree clean.

## 2. Commits in this stage

| SHA | Commit message | Sub-deliverable | Notes |
|---|---|---|---|
| `6d5ac0e` | `chore(closed-form-stage0-tolerance-budget): sub-phase carryover from phase-1` | Task 0.1 — `[phase]` carryover | Only `[phase].phase` and `[phase].opened_at` changed; no `[budgets.*]` widening (spec § 2.6 prohibits widening without separate operator amendment). |
| (this audit) | `chore(closed-form-stage0-checkpoint): Stage 0 pre-flight complete` | Closing | Will land at the next commit after this file is staged. |

## 3. Task 0.0 — Cross-phase audit replay (FACT)

(FACT — `docs/_audits/phase-1/sub-phase-closed-form/stage-0-replay-2026-05-20T15-10-49Z.txt`,
sha256:`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`.)

Command (verbatim from charter § 4.1, invoked under `uv run` so the
workspace venv resolves `integrity.scripts.replay_prior_phase`):

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

(SHIFTED — minor; the charter prose lists the bare `python3 -m …`
form. Under HEAD's workspace layout `integrity` is a `uv`-installed
package not on `python3 -m`'s default sys.path; the canonical
`justfile`-style invocation prefixes `uv run`. Phase 1's gate runners
already adopt this shape — `GATE_COMMANDS` in
`tools/integrity/integrity/scripts/replay_prior_phase.py` uses
`["uv", "run", "pytest", …]` for pytest/equivalence/determinism. No
substantive change; surfacing per Convention #8 / playbook P14.)

Outcome — exit 0; phase handle `phase-1` resolves to
`v0.1.0-phase-1` via `_resolve_phase_handle`'s
`_PHASE_HANDLE_RE = ^phase-(\d+)$` regex (FACT —
`tools/integrity/integrity/scripts/replay_prior_phase.py` line 42).
All 8 gates PASS:

| Gate | Result |
|---|---|
| integrity | PASS |
| pytest | PASS |
| equivalence | PASS |
| determinism | PASS |
| perf-ledger | PASS |
| property | PASS |
| mutation | PASS |
| tolerance-budget | PASS |

Summary line: `summary: prior_phase=v0.1.0-phase-1 ok=True`. No P20
block triggered; no `stage-0-blocked-replay-*.md` written.

## 4. Task 0.1 — Tolerance-budget carryover (FACT)

(FACT — commit `6d5ac0e`; `git diff v0.1.0-phase-1..6d5ac0e --
tools/testkit/equivalence/tolerance-budget.toml` shows only `[phase]`
block edits.)

```
[phase]
-phase = "phase-1"
-opened_at = "2026-05-20T04:00:00Z"
+phase = "sub-phase-closed-form"
+opened_at = "2026-05-20T15:10:49Z"
```

No `[budgets.*.cross_stack]` entry widened (or otherwise modified) —
spec § 2.6 requires widening to be a separate operator-approved
amendment. The Phase 1 defaults
(`closed_form.cross_stack = {relative = 1e-5, absolute = 0.0}`,
etc.) remain in force for this sub-phase.

## 5. Task 0.2 — Phase 1 failing-tests evidence re-verify (FACT)

(FACT — `docs/_audits/phase-1/sub-phase-closed-form/stage-0-evidence-reverify-2026-05-20T15-10-49Z.txt`,
sha256:`77bd5270cf6ed9513670667062de1a787916b15be164a1a538814a37c9733760`.)

Both closed-form Phase 1 failing-tests evidence files hash
byte-for-byte to the values the Phase 1 landing audit recorded:

| Evidence path | Computed sha256 | Phase 1 audit sha256 | Match |
|---|---|---|---|
| `tools/testkit/failing-tests-evidence/strange-attractors-2026-05-20T12-54-18Z.txt` | `c4f72e2595bfe0702ac1d1721371e65ea985661be89c114e100da783104cac63` | `c4f72e25…cac63` | ✓ |
| `tools/testkit/failing-tests-evidence/mandelbulb-explorer-2026-05-20T12-54-18Z.txt` | `d4a89d3e782e639c179238d7fc5f4c307a99cf0ec74d9ebb5d8db547b37e2ca0` | `d4a89d3e…2ca0` | ✓ |

Gate-13 precondition (Phase 1 RED evidence still hashes at HEAD)
holds. No BLOCKED state; both files remain UNTOUCHED through Stage 1
per charter § 4.2 step 2 (they are the gate-13 anchor; new GREEN
evidence will land at separate per-sim paths).

## 6. IC contract conformance

Stage 0 lands no IC implementations — IC-2/IC-4/IC-7 / IC-8 / IC-9 /
IC-10 inherited from `v0.1.0-phase-1` unchanged. Re-anchor verification
of the IC-7 doubled-directory path
(`tools/diagnostics/diagnostics/tier2/closed_form/checks.py` — Phase 1
shift #2) deferred to Stage 1 per playbook P14, when each sim's
`test_diagnostics.py` actually imports the module.

## 7. Deviations from charter (SHIFTED register)

| # | Shift | Rationale |
|---|---|---|
| 1 | Replay invocation uses `uv run python -m …` rather than the charter's bare `python3 -m …`. | Workspace package layout: `integrity` is installed into the `uv`-managed venv, not on the system `python3`'s sys.path. Matches the canonical `GATE_COMMANDS` shape inside the replay script itself. No semantic change. |

No new shifts beyond #1. The 21 inherited shifts from the Phase 1
landing audit § 14 carry forward unmodified per charter § 11.1.

## 8. Banked items

| ID | Status at Stage 0 close |
|---|---|
| B17 (per-target mutation runners + first real kill-rate baseline) | UNCHANGED — open, owner-decision banked for Stage 2 Step 2.7 (PATH-A vs PATH-B). |
| Cat 3 `_gather_tables` non-recursion (shift #16) | UNCHANGED — open, banked for Stage 2 Step 2.3 surfacing. |
| Open Phase 1 items B2–B6, B11, B16 | UNCHANGED — out of this sub-phase's scope per charter § 1.2 / § 11.2. |

## 9. What remains

Nothing — Stage 0 is `complete`, NOT `partial-needs-continuation`.
Operator dispatches Stage 1 in a fresh session per charter § 5 step 4
using charter § 7.2 verbatim.

## 10. Phase-coherence anchor

Stage 0 confirms the closed-form sub-phase's input contract: Phase 1
landed at `v0.1.0-phase-1` (SHA `afdf44a5`); the 8-gate cross-phase
replay against that tag is GREEN at this HEAD; both closed-form
failing-tests evidence files still hash to the values recorded in
the Phase 1 landing audit. The sub-phase is cleared to enter Stage 1
(per-sim implementation: strange-attractors → mandelbulb-explorer).
