---
date: 2026-05-20
author: agent-based-sub-phase-agent
artifact: stage
artifact_id: agent-based-stage-0
stage: 0-preflight
subject: "Agent-based sub-phase Stage 0 (pre-flight) checkpoint"
verdict-state: complete
head_sha: 6e267a14dd3f9552dd0a10d64c2f456f55331719
head_sha_at_checkpoint: 6e267a14dd3f9552dd0a10d64c2f456f55331719
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
evidence_paths:
  - docs/_audits/phase-1/sub-phase-agent-based/stage-0-replay-2026-05-20T17-37-47Z.txt
  - docs/_audits/phase-1/sub-phase-agent-based/stage-0-evidence-reverify-2026-05-20T17-37-47Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/failing-tests-evidence/boids-3d-2026-05-20T13-04-01Z.txt
  - tools/testkit/failing-tests-evidence/physarum-2026-05-20T13-04-01Z.txt
evidence_hashes:
  docs/_audits/phase-1/sub-phase-agent-based/stage-0-replay-2026-05-20T17-37-47Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-1/sub-phase-agent-based/stage-0-evidence-reverify-2026-05-20T17-37-47Z.txt: sha256:9f6c71de135eefe4b9c654315fe3ef9ba2de2a8117bbe8105aa1b23858a34f57
  tools/testkit/failing-tests-evidence/boids-3d-2026-05-20T13-04-01Z.txt: sha256:7d59ffdbd96d96ac3bb33439a00102a36fd29015acd564aef544850cf6e39b7b
  tools/testkit/failing-tests-evidence/physarum-2026-05-20T13-04-01Z.txt: sha256:8ee52dc7cff8a207fb8bed468b2e72cd84ea5196fafbdf646481ed328c043855
---

# Agent-based Sub-Phase — Stage 0 (Pre-flight) Checkpoint

## 1. Scope

(FACT — `docs/phases/sub-phase-agent-based.md` § 4.1.) Stage 0 is
pre-flight for the agent-based sub-phase (second per-sim implementation
sub-phase per Phase 1 audit § 15 / closed-form sub-phase audit § 10)
under spec-Phase-1. Three tasks: cross-phase audit replay (Task 0.0),
tolerance-budget carryover (Task 0.1), Phase 1 boids-3d + physarum
failing-tests evidence sha256 re-verify (Task 0.2). No sim work; no
edits outside `tolerance-budget.toml` and new audit files under
`docs/_audits/phase-1/sub-phase-agent-based/`.

Pre-state at session start: `HEAD = 6188224bb6461a6e67cd403a6febbc557660f376`
(agent-based sub-phase charter commit). Working tree clean. The
sibling closed-form sub-phase landed at SHA `2cc0f21` and is NOT in
the replay-chain parent set (charter § 11.4 — `_resolve_phase_handle`'s
single-integer regex mechanically rejects multi-segment / suffixed
phase handles).

## 2. Commits in this stage

| SHA | Commit message | Sub-deliverable | Notes |
|---|---|---|---|
| `968b03f` | `chore(agent-based-stage0-tolerance-budget): sub-phase carryover from phase-1` | Task 0.1 — `[phase]` carryover | Only `[phase].phase` and `[phase].opened_at` changed; no `[budgets.*]` widening (spec § 2.6 prohibits widening without separate operator amendment). |
| `6e267a14dd3f9552dd0a10d64c2f456f55331719` | `chore(agent-based-stage0-checkpoint): Stage 0 pre-flight complete` | Closing — this audit | Convention #12 SHA back-fill follows in a separate commit per charter § 4.1 closing + closed-form audit § 8.2 N2 (every-stage-close discipline). |
| (next commit) | `chore(agent-based-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12` | SHA back-fill | New commit; never `--amend`. |

## 3. Task 0.0 — Cross-phase audit replay (FACT)

(FACT — `docs/_audits/phase-1/sub-phase-agent-based/stage-0-replay-2026-05-20T17-37-47Z.txt`,
sha256:`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`.)

Command (verbatim from charter § 4.1; `uv run` invocation form
inherited from closed-form Stage 0 SHIFTED entry — the canonical
`GATE_COMMANDS` shape inside the replay script itself uses
`["uv", "run", "pytest", …]`, so the human-facing invocation
matches):

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Outcome — exit 0; phase handle `phase-1` resolves to `v0.1.0-phase-1`
(SHA `9998bc1`) via `_resolve_phase_handle`'s `^phase-(\d+)$` regex
(FACT — `tools/integrity/integrity/scripts/replay_prior_phase.py`).
The closed-form sub-phase landing (SHA `2cc0f21`) is mechanically
unreachable as a replay handle (charter § 11.4). All 8 gates PASS:

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

(FACT — the evidence file's sha256 `9399fc33…909f34` is identical to
the closed-form Stage 0 replay evidence sha256 recorded at
`docs/_audits/phase-1/sub-phase-closed-form/stage-0-checkpoint-2026-05-20T15-10-49Z.md`
line 20. Same replay against the same audit at the same prior-phase
tag is bit-identical output across the two sub-phases — confirms the
replay tool is deterministic on the inputs and the audit and tag are
both unchanged at HEAD.)

## 4. Task 0.1 — Tolerance-budget carryover (FACT)

(FACT — commit `968b03f`; `git diff 6188224..968b03f --
tools/testkit/equivalence/tolerance-budget.toml` shows only `[phase]`
block edits.)

```
[phase]
-phase = "sub-phase-closed-form"
-opened_at = "2026-05-20T15:10:49Z"
+phase = "sub-phase-agent-based"
+opened_at = "2026-05-20T17:37:47Z"
```

No `[budgets.*.cross_stack]` entry widened or otherwise modified.
The Phase 1 defaults (`closed_form.cross_stack = {relative = 1e-5}`,
`reaction-diffusion.cross_stack = {relative = 1e-4}`,
`sph.cross_stack = {relative = 1e-4}`,
`mpm.cross_stack = {relative = 1e-4}`,
`smoke.cross_stack = {relative = 1e-4}`,
`lbm.cross_stack = {relative = 1e-5}`) remain in force for this
sub-phase.

(INFERENCE — note: the budget file has no explicit `agent-based`
category entry. Spec § 2.6's default tolerance table row for
"Boids / Physarum" reads `bit-exact` (same-stack same-hw) / `epsilon
(atomics)` (same-stack different-hw) / `distributional (chaotic)`
(cross-stack). Per charter § 1.2 this sub-phase ships Stack B only,
so cross-stack tolerance is not load-bearing here; the
distributional posture is owned by Phase 2+'s cross-stack work per
charter § 11.3. No budget entry needed at this stage.)

## 5. Task 0.2 — Phase 1 failing-tests evidence re-verify (FACT)

(FACT — `docs/_audits/phase-1/sub-phase-agent-based/stage-0-evidence-reverify-2026-05-20T17-37-47Z.txt`,
sha256:`9f6c71de135eefe4b9c654315fe3ef9ba2de2a8117bbe8105aa1b23858a34f57`.)

Both agent-based Phase 1 failing-tests evidence files hash byte-for-byte
to the values the Phase 1 landing audit recorded
(`docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md` lines 36–37):

| Evidence path | Computed sha256 | Phase 1 audit sha256 | Match |
|---|---|---|---|
| `tools/testkit/failing-tests-evidence/boids-3d-2026-05-20T13-04-01Z.txt` | `7d59ffdbd96d96ac3bb33439a00102a36fd29015acd564aef544850cf6e39b7b` | `7d59ffdb…39b7b` | ✓ |
| `tools/testkit/failing-tests-evidence/physarum-2026-05-20T13-04-01Z.txt` | `8ee52dc7cff8a207fb8bed468b2e72cd84ea5196fafbdf646481ed328c043855` | `8ee52dc7…3855` | ✓ |

Gate-13 precondition (Phase 1 RED evidence still hashes at HEAD) holds.
No BLOCKED state; both files remain UNTOUCHED through Stage 1 per
charter § 4.2 step 2 — they are the gate-13 anchor for the
worktree-at-`5dd919c` replay in Stage 1 step 7. New GREEN evidence
will land at separate per-sim paths
(`tools/testkit/failing-tests-evidence/{boids-3d,physarum}-implemented-<UTC>.txt`).

## 6. IC contract conformance

Stage 0 lands no IC implementations — IC-2 / IC-4 / IC-5 / IC-8 /
IC-9 / IC-10 inherited from `v0.1.0-phase-1` (and the closed-form
sub-phase's resolved Cat 3 closed-form-subdir wiring + `verify_evidence`
sha256-prefix tolerance) unchanged.

The IC-7→IC-5 substack pivot called out in charter § 3 is a Stage 1
re-anchor (each sim's `test_diagnostics.py` imports
`diagnostics.tier2.particle.*` rather than the closed-form sub-phase's
`diagnostics.tier2.closed_form.*`); the doubled-directory layout
`tools/diagnostics/diagnostics/` is verified to exist via the Stage 0
replay's `pytest` gate (which would HARD_FAIL on a stale tier2 path).
No further re-anchor at Stage 0 per playbook P14 ("verify when load-bearing").

## 7. Deviations from charter (SHIFTED register)

(No new shifts beyond the inherited set.)

The 32 cumulative shifts inherited per charter § 11.1 (21 Phase 1
audit § 14 + 6 closed-form Stage 1 audit § 8.1 S1–S6 + 5 closed-form
Stage 2 audit § 8.2 N1–N5) carry forward unmodified; the closed-form
Stage 0 single replay-invocation-form shift is absorbed into the
verbatim Task 0.0 command above (and is therefore not re-counted).

(INFERENCE — the closed-form Stage 0 audit § 8.2 N2 documented that
the Stage 0 checkpoint's `head_sha:` was incorrectly set to the prior
tolerance-budget commit rather than the closing commit; charter § 4.1
+ § 8 explicitly elevate Convention #12 SHA back-fill to apply at
every stage close. This checkpoint applies the corrected discipline:
front-matter `head_sha:` / `head_sha_at_checkpoint:` placeholders are
back-filled in a SEPARATE commit immediately following the closing
commit, per § 9 below.)

## 8. Banked items

| ID | Status at Stage 0 close |
|---|---|
| B17 (per-target mutation runners + first real kill-rate baseline) | UNCHANGED — open; owner-decision banked for Stage 2 Step 2.7 (PATH-A rework vs PATH-B carry-forward-and-re-bank-again-to-continuous-CA). Default lean per closed-form audit § 7.6: PATH-B. |
| Cat 3 `_SUBDIRS_PICKED_UP` for `agent-based` subdir (closed-form audit § 8.2 N4) | UNCHANGED — open; banked for Stage 2 Step 2.3 Decision A (lift goldens to ≥ 3 discrete `independent_reference` entries + pick up subdir) vs Decision B (further bank). |
| Cat 3 `_SUBDIRS_PICKED_UP` for `hybrid-pg` / `lattice` / `particle-fluids` subdirs | UNCHANGED — out of agent-based scope per charter § 11.2; each subdir is the work of its own per-sim implementation sub-phase. |
| Cat 3 evaluator shims for `lorenz-structural-invariants` and `mandelbulb-distance-estimator-p8-quilez-2009` | UNCHANGED — banked to continuous-CA sub-phase per closed-form audit § 9. |
| Open Phase 1 items B2–B6, B11, B16 | UNCHANGED — out of this sub-phase's scope per charter § 1.2 / § 11.2. |

## 9. SHA back-fill discipline (Convention #12 — every-stage-close)

(FACT — charter § 4.1 closing + § 8; closed-form audit § 8.2 N2.)

Front-matter `head_sha:` and `head_sha_at_checkpoint:` are set to
literal placeholder strings `6e267a14dd3f9552dd0a10d64c2f456f55331719` rather
than to a prior commit SHA. The closing commit
`chore(agent-based-stage0-checkpoint): Stage 0 pre-flight complete`
adds this file with the placeholders intact; the immediately-following
commit `chore(agent-based-stage0-sha-backfill): back-fill Stage 0
checkpoint SHA per Convention #12` `git rev-parse HEAD`s the closing
commit and replaces both placeholders with the resolved SHA. Never
`--amend`. This corrects the omission documented in closed-form
audit § 8.2 N2 and establishes the every-stage-close discipline that
charter § 8 mandates.

## 10. What remains

Nothing — Stage 0 is `complete`, NOT `partial-needs-continuation`.
Operator dispatches Stage 1 in a fresh session per charter § 5 step 4
using charter § 7.2 verbatim. Stage 1 sim order:
**boids-3d → physarum**.

## 11. Phase-coherence anchor

Stage 0 confirms the agent-based sub-phase's input contract:

- Phase 1 landed at `v0.1.0-phase-1` (SHA `9998bc1`); the 8-gate
  cross-phase replay against that tag is GREEN at this HEAD.
- The closed-form sub-phase landed at SHA `2cc0f21` and contributes
  its full audit chain to the append-only protected set (charter § 10);
  it does NOT participate in the replay chain (charter § 11.4).
- Both agent-based Phase 1 failing-tests evidence files still hash
  byte-for-byte to the values recorded in the Phase 1 landing audit
  (gate-13 precondition holds).
- Tolerance budget bumped to `sub-phase-agent-based` with no
  `[budgets.*]` widening.

The sub-phase is cleared to enter Stage 1 (per-sim implementation:
boids-3d → physarum; each sub-bundle covers gates 4–13 per charter
§ 2 + § 4.2; determinism-strategy declaration is load-bearing per
charter § 1.4 + § 7.2).
