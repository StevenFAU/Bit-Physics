---
date: 2026-05-20
author: continuous-ca-rd3d-sub-phase-agent
artifact: stage
artifact_id: continuous-ca-rd3d-stage-0
stage: 0-preflight
subject: "Continuous-CA RD-3D sub-phase Stage 0 (pre-flight) checkpoint — re-dispatch post replay-tool hotfix"
verdict-state: complete
head_sha: HEAD_SHA_PLACEHOLDER
head_sha_at_checkpoint: HEAD_SHA_PLACEHOLDER
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-blocked-replay-2026-05-20T18-52-10Z.md
  - docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md
evidence_paths:
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-replay-2026-05-20T19-14-51Z.txt
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-evidence-reverify-2026-05-20T19-14-51Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - tools/testkit/failing-tests-evidence/reaction-diffusion-3d-2026-05-20T13-26-32Z.txt
evidence_hashes:
  docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-replay-2026-05-20T19-14-51Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-evidence-reverify-2026-05-20T19-14-51Z.txt: sha256:61b45739f8942ea47e909ed0e5094f67e7c8808c2ec2d983dda50b0fab904f39
  tools/testkit/failing-tests-evidence/reaction-diffusion-3d-2026-05-20T13-26-32Z.txt: sha256:b3165ab1cd0b69d816fce8ffcdb4436d619f01c5ecfa7942eb77c4aeb2514b96
---

# Continuous-CA RD-3D Sub-Phase — Stage 0 (Pre-flight) Checkpoint

## 1. Scope

(FACT — `docs/phases/sub-phase-continuous-ca-rd3d.md` § 4.1 / § 7.1.)
Stage 0 is pre-flight for the continuous-CA RD-3D sub-phase (third
per-sim implementation sub-phase under spec-Phase-1, first with
MMS-based gate 5; Phase 1 audit § 15 row 3 + agent-based audit § 10
row 1). Four tasks: cross-phase audit replay (Task 0.0), tolerance-
budget carryover (Task 0.1), Phase 1 RD-3D failing-tests evidence
sha256 re-verify (Task 0.2), RD-2D MMS regression-scope surfacing
(Task 0.3 — NEW this sub-phase per charter § 1.6 / § 4.1). No sim
work; no edits outside `tolerance-budget.toml` and new audit files
under `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/`.

This is a **re-dispatch** after the prior Stage 0 BLOCKED state at
`docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-blocked-replay-2026-05-20T18-52-10Z.md`
(dcb434a). The blocker was a HEAD-tool / tagged-content version-skew
defect in `tools/integrity/integrity/scripts/replay_prior_phase.py`
surfaced by the agent-based Stage 2 `_SUBDIRS_PICKED_UP` extension.
The defect was repaired by the focused hotfix sub-phase landing at
1f5fa0c
(`docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md`);
the replay tool now binds gate invocations to the worktree's own
`.venv/bin/python` via `_resolve_cmd_for_worktree`.

Pre-state at session start: `HEAD = 1f5fa0cf4313b13dd7d28e84d9b7e3730a5165e6`
(post-hotfix SHA back-fill). Working tree clean. The sibling closed-
form sub-phase landed at SHA `2cc0f21` and the sibling agent-based
sub-phase landed at SHA `739c93f` (post-Convention-#12 back-fill on
`714e60d`); neither is in the replay-chain parent set
(charter § 11.4 — `_resolve_phase_handle`'s single-integer regex
mechanically rejects multi-segment / suffixed phase handles).

The four operator routings of the § 11.5 operator-routable items
(supplied at re-dispatch) are AUTHORITATIVE for this sub-phase and
unchanged by this checkpoint:

| # | Item | Operator routing |
|---|---|---|
| 1 | § 1.4 language-pivot re-anchor | CONFIRMED — Python NumPy reference; Stack C C++/Vulkan deferred to Phase 2+ cross-stack sub-phase. |
| 2 | § 1.6 / Task 0.3 RD-2D MMS regression scope | Reading (b) — out-of-scope for this sub-phase's Stage 2 sweep; banked as Phase-0-amendment candidate. |
| 3 | § 4.3 Step 2.7 B17 PATH-A target list | CONFIRMED lean three-target list (RD-3D source + RD-3D MMS solution + optional MMS runner/analyze if mutation-fruitful). |
| 4 | § 11.4 v0.1.3 tag | No intermediate tag; default lean. |

## 2. Commits in this stage

| SHA | Commit message | Sub-deliverable | Notes |
|---|---|---|---|
| `8c0ef50` | `chore(continuous-ca-rd3d-stage0-tolerance-budget): sub-phase carryover from phase-1` | Task 0.1 — `[phase]` carryover | Only `[phase].phase` and `[phase].opened_at` changed; no `[budgets.*]` widening (spec § 2.6 prohibits widening without separate operator amendment). |
| `HEAD_SHA_PLACEHOLDER` | `chore(continuous-ca-rd3d-stage0-checkpoint): Stage 0 pre-flight complete` | Closing — this audit | Convention #12 SHA back-fill follows in a separate commit per charter § 4.1 closing + closed-form audit § 8.2 N2 (every-stage-close discipline). |
| (next commit) | `chore(continuous-ca-rd3d-stage0-sha-backfill): back-fill Stage 0 checkpoint SHA per Convention #12` | SHA back-fill | New commit; never `--amend`. |

## 3. Task 0.0 — Cross-phase audit replay (FACT)

(FACT — `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-replay-2026-05-20T19-14-51Z.txt`,
sha256:`9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`.)

Command (verbatim from charter § 4.1 / § 7.1):

```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

Outcome — exit 0; phase handle `phase-1` resolves to `v0.1.0-phase-1`
(SHA `9998bc1`) via `_resolve_phase_handle`'s `^phase-(\d+)$` regex
(FACT — `tools/integrity/integrity/scripts/replay_prior_phase.py`).
The closed-form sub-phase landing (SHA `2cc0f21`), the agent-based
sub-phase landing (SHA `739c93f`), and the replay-tool-hotfix landing
(SHA `1f5fa0c`) are all mechanically unreachable as replay handles
(charter § 11.4). All 8 gates PASS:

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
block triggered; no `stage-0-blocked-replay-*.md` written this run
(the prior `stage-0-blocked-replay-2026-05-20T18-52-10Z.md` from
`dcb434a` remains as the historical record of the version-skew
defect that the hotfix repaired).

(FACT — the evidence file's sha256 `9399fc33…909f34` is
**byte-identical** to:

- the closed-form Stage 0 replay evidence sha256
  (`docs/_audits/phase-1/sub-phase-closed-form/stage-0-checkpoint-2026-05-20T15-10-49Z.md`);
- the agent-based Stage 0 replay evidence sha256
  (`docs/_audits/phase-1/sub-phase-agent-based/stage-0-checkpoint-2026-05-20T17-37-47Z.md` line 21);
- the replay-tool-hotfix V1 validation sha256
  (`docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md` § 7 V1).

Same replay against the same audit at the same prior-phase tag is
bit-identical output across all four runs — confirms the repaired
replay tool is deterministic on the inputs AND the post-hotfix
worktree-`.venv`-interpreter binding restores the pre-defect
equivalence with the prior siblings. The version-skew defect documented
in the BLOCKED audit § 2 is structurally resolved.)

## 4. Task 0.1 — Tolerance-budget carryover (FACT)

(FACT — commit `8c0ef50`; `git diff 1f5fa0c..8c0ef50 --
tools/testkit/equivalence/tolerance-budget.toml` shows only `[phase]`
block edits.)

```
[phase]
-phase = "sub-phase-agent-based"
-opened_at = "2026-05-20T17:37:47Z"
+phase = "sub-phase-continuous-ca-rd3d"
+opened_at = "2026-05-20T19:14:51Z"
```

No `[budgets.*.cross_stack]` entry widened or otherwise modified.
The Phase 1 defaults
(`closed_form.cross_stack = {relative = 1e-5}`,
`reaction-diffusion.cross_stack = {relative = 1e-4}`,
`sph.cross_stack = {relative = 1e-4}`,
`mpm.cross_stack = {relative = 1e-4}`,
`smoke.cross_stack = {relative = 1e-4}`,
`lbm.cross_stack = {relative = 1e-5}`) remain in force for this
sub-phase.

(INFERENCE — RD-3D's category row in spec § 2.6 is the
`reaction-diffusion.cross_stack = {relative = 1e-4}` default; this
sub-phase ships Stack B Python NumPy reference only per charter
§ 1.4, so cross-stack tolerance is not load-bearing here. Cross-
stack work against Stack C C++/Vulkan is Phase-2+ scope per
charter § 11.3 and inherits the 1e-4 default unwidened.)

## 5. Task 0.2 — Phase 1 RD-3D failing-tests evidence re-verify (FACT)

(FACT — `docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-evidence-reverify-2026-05-20T19-14-51Z.txt`,
sha256:`61b45739f8942ea47e909ed0e5094f67e7c8808c2ec2d983dda50b0fab904f39`.)

The RD-3D Phase 1 failing-tests evidence file hashes byte-for-byte to
the value the Phase 1 landing audit recorded
(`docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md`):

| Evidence path | Computed sha256 | Phase 1 audit sha256 | Match |
|---|---|---|---|
| `tools/testkit/failing-tests-evidence/reaction-diffusion-3d-2026-05-20T13-26-32Z.txt` | `b3165ab1cd0b69d816fce8ffcdb4436d619f01c5ecfa7942eb77c4aeb2514b96` | `b3165ab1…2514b96` | ✓ |

Gate-13 precondition (Phase 1 RED evidence still hashes at HEAD)
holds. No BLOCKED state; this file remains UNTOUCHED through Stage 1
per charter § 4.2 step 4 — it is the gate-13 anchor for the
worktree-at-`a159086` replay in Stage 1 step 9. New GREEN evidence
will land at a separate per-sim path
(`tools/testkit/failing-tests-evidence/reaction-diffusion-3d-implemented-<UTC>.txt`).

## 6. Task 0.3 — RD-2D MMS regression-scope surfacing (NEW THIS SUB-PHASE; FACT + decision)

(FACT — charter § 1.6 / § 4.1 / § 7.1.) Per Phase 1 Stage 2 R8
amendment, an RD-2D MMS solution was co-bundled with the RD-3D
bootstrap at commit `a159086`, landing at
`tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/`.
The open question for this sub-phase: does the regression sweep at
Stage 2 step 2.2 include running RD-2D against the 2D MMS solution
(adding a `test_mms_convergence.py` to the RD-2D package and asserting
RD-2D's reference satisfies the 2D MMS within ±0.5 of formal $p=2$)?

### 6.1 Inspection at HEAD (FACT)

(FACT — `ls packages/reaction-diffusion-2d/tests/`,
`ls tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/`,
`grep -rn "reaction_diffusion_2d\|mms\|MMS" packages/reaction-diffusion-2d/tests/`.)

- `packages/reaction-diffusion-2d/tests/` ships five test files at HEAD:
  `test_code_verification.py`, `test_determinism.py`,
  `test_diagnostics.py`, `test_pbt_invariants.py`,
  `test_reference_sanity.py`. None imports from
  `tools.testkit.code_verification.mms.solutions.reaction_diffusion_2d`
  or references "mms" / "MMS" anywhere. RD-2D's gate 5 was accepted
  at Phase 0 via golden-table verification (pre-R8 posture).
- `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/`
  ships three files at HEAD: `derivation.md`, `solution.py`,
  `__init__.py`. The solution is co-bundled-for-future-use; no
  Phase-0 or Phase-1 test exercises it.

The 2D MMS solution is therefore **co-bundled but unconsumed at HEAD**.
This is the structural premise that distinguishes Reading (a) from
Reading (b) per charter § 1.6.

### 6.2 Decision (FACT — operator pre-routed at re-dispatch)

**Reading (b) — out-of-scope per operator routing.** Per Item 2 of
the original Stage 0 dispatch (operator-routable items per
charter § 11.5), confirmed authoritative at re-dispatch:

> Item 2 (RD-2D MMS regression scope): Reading (b) — out-of-scope for
> this sub-phase's Stage 2 regression sweep. Phase-0-deliverable
> verification banked as separate future work, NOT this sub-phase's
> responsibility.

Rationale (recapping charter § 1.6 default lean, confirmed by the
HEAD inspection above):

1. RD-2D shipped at Phase 0 with all 13 gates GREEN via golden-table
   gate-5; the MMS at HEAD is co-bundled forward-looking deliverable,
   not a Phase-0 gate. Re-verifying RD-2D against the 2D MMS is a
   Phase-0-retroactive enhancement.
2. Convention A (additive-on-pre-existing) would be strained by
   adding a new `test_mms_convergence.py` into the Phase-0-protected
   RD-2D package; the file is new (not edit-additive on an existing
   one), but the cognitive scope of touching a Phase-0 sim mid-
   per-sim-implementation-sub-phase is the load-bearing concern.
3. Operator scope discipline historically favors keeping per-sim
   implementation sub-phases tight on the single in-scope sim.

**Banked for future routing:** the 2D MMS regression check is a
candidate for a separate Phase-0-amendment sub-phase (or for the
future spec-Phase-2 cross-stack effort against the C++/Vulkan
RD-2D implementation). Recorded as a follow-up item in § 8 below.

Stage 1 and Stage 2 proceed with the RD-2D regression check
**excluded** from the Stage 2 step 2.2 sweep. The negative-list
in Stage 2 step 2.2 is unchanged (the four remaining Phase 1 sims
still RED with `ModuleNotFoundError`); RD-2D remains GREEN at its
Phase 0 state and is not re-verified against the 2D MMS in this
sub-phase.

## 7. IC contract conformance

Stage 0 lands no IC implementations — IC-2 / IC-4 / IC-8 / IC-9 /
IC-10 / `diagnostics.tier2.scalar_field.*` (Phase-0 surface) /
`tools/testkit/code_verification/mms/` infrastructure all inherited
from `v0.1.0-phase-1` (plus the closed-form sub-phase's resolved
Cat 3 closed-form-subdir wiring + `verify_evidence` sha256-prefix
tolerance and the agent-based sub-phase's resolved Cat 3 agent-based-
subdir pickup + determinism-strategy-declaration discipline) unchanged.

The IC substack pivot called out in charter § 3 (this sub-phase uses
`diagnostics.tier2.scalar_field.*` — neither IC-7 nor IC-5) is a
Stage 1 re-anchor (RD-3D's `test_diagnostics.py` imports
`diagnostics.tier2.scalar_field.*` rather than the closed-form
sub-phase's `diagnostics.tier2.closed_form.*` or the agent-based
sub-phase's `diagnostics.tier2.particle.*`); the doubled-directory
layout `tools/diagnostics/diagnostics/` is verified to exist via the
Stage 0 replay's `pytest` gate (which would HARD_FAIL on a stale
tier2 path). No further re-anchor at Stage 0 per playbook P14
("verify when load-bearing").

The gate-5 MMS-pipeline consumption (charter § 2 gate 5 +
`tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`)
is similarly a Stage 1 re-anchor — load-bearing for the first-of-kind
MMS-OOA verification harness; verified to exist as
`{solution.py, derivation.md, __init__.py}` at HEAD per
charter § 1.3 working-assumption + the Phase 1 Stage 2 commit
`a159086`. No further re-anchor at Stage 0.

## 8. Deviations from charter (SHIFTED register)

(No new sub-phase shifts beyond the 42 cumulative inherited per
charter § 11.1 + the version-skew defect resolution.)

The 42 cumulative shifts inherited per charter § 11.1
(21 Phase 1 audit § 14 + 6 closed-form Stage 1 + 5 closed-form
Stage 2 + 8 agent-based Stage 1 S1–S8 + 2 agent-based Stage 2 N1–N2)
carry forward unmodified.

The S(new) finding from the prior BLOCKED audit
(`docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-blocked-replay-2026-05-20T18-52-10Z.md`
§ 5 — `replay_prior_phase.py` integrity-gate invocation imports
HEAD-of-integrity rather than worktree-of-integrity) was **structurally
resolved** by the replay-tool-hotfix sub-phase landing at `1f5fa0c`
(audit
`docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md`
§ 2 — `_resolve_cmd_for_worktree` helper). It is therefore not
re-counted as a shift against this sub-phase; the resolution is
inherited at HEAD as a pre-existing tool capability. The prior
BLOCKED audit remains in the audit chain as the historical false-
start record.

### Operator-routable items already routed (recap from § 1)

The four § 11.5 operator-routable items were pre-routed at the
re-dispatch prompt; the routings are AUTHORITATIVE for this sub-phase.
Recorded in § 1 above for traceability. Stage 1 / Stage 2 prompts
consume these decisions as given:

1. Python NumPy reference (CONFIRMED).
2. RD-2D MMS regression scope Reading (b) (CONFIRMED — surfaced in
   Task 0.3 § 6 above).
3. B17 PATH-A lean three-target list (CONFIRMED — load-bearing at
   Stage 2 Step 2.7).
4. No intermediate `v0.1.3` tag (CONFIRMED — Stage 2 closes without
   a tag).

## 9. Banked items

| ID | Status at Stage 0 close |
|---|---|
| B17 (per-target mutation runners + first real kill-rate baseline) | LOAD-BEARING this sub-phase per agent-based audit § 7.6 routing + Item 3 operator confirmation. Lean three-target list confirmed; rework owned by Stage 2 Step 2.7. |
| Cat 3 `_SUBDIRS_PICKED_UP` for `continuous-ca` subdir (charter § 4.3 Step 2.3) | UNCHANGED — banked NO-OP this sub-phase. RD-3D ships no golden (gate-5 is MMS-based per RD-3D spec-ref § 7); `tools/testkit/golden/tables/continuous-ca/` does not exist at HEAD and is not created by this sub-phase. Operator-routable alternative (pre-create empty subdir + pickup entry as placeholder) is banked, default skip. |
| Cat 3 `_SUBDIRS_PICKED_UP` for `hybrid-pg` / `lattice` / `particle-fluids` subdirs | UNCHANGED — out of this sub-phase's scope per charter § 11.2; each subdir is the work of its own per-sim implementation sub-phase. |
| Cat 3 evaluator shims for the four AUDIT_LOG algorithms (`lorenz-structural-invariants`, `mandelbulb-distance-estimator-p8-quilez-2009`, `boids-reynolds-1987-3agent-step1`, `physarum-jones-2010-4agent-deposit-step1`) | UNCHANGED — out of this sub-phase's scope (no Stack-B WGSL evaluator at HEAD; RD-3D adds NO new AUDIT_LOG rows since it ships no golden). |
| RD-2D MMS regression scope (Task 0.3 disposition) | NEW BANKED ITEM — out-of-scope per Reading (b) operator routing; candidate for a separate Phase-0-amendment sub-phase or for the future spec-Phase-2 cross-stack effort. Recorded so the operator can re-route later without re-litigating the question. |
| B-hotfix-1 (perf-ledger gate's outer-interpreter binding pre-substitution) | UNCHANGED — inherited from replay-tool-hotfix audit § 9; correct-by-default post-substitution; banked as a note for future content-sensitive evolution of the perf-ledger gate. |
| B-hotfix-2 (preflight invocation form: `uv run python` vs system `python3`) | UNCHANGED — inherited from replay-tool-hotfix audit § 9; documentation/invocation-form concern; honored as a convention in this sub-phase (charter § 7.1 specifies `uv run …` for command invocations that touch the project's installed package surface). |
| Open Phase 1 items B2–B6, B11, B16 | UNCHANGED — out of this sub-phase's scope per charter § 1.2 / § 11.2. |

## 10. SHA back-fill discipline (Convention #12 — every-stage-close)

(FACT — charter § 4.1 closing + § 8; closed-form audit § 8.2 N2;
agent-based stage-0 checkpoint § 9 inherited.)

Front-matter `head_sha:` and `head_sha_at_checkpoint:` are set to
literal placeholder strings `HEAD_SHA_PLACEHOLDER` rather than to a
prior commit SHA. The closing commit
`chore(continuous-ca-rd3d-stage0-checkpoint): Stage 0 pre-flight
complete` adds this file with the placeholders intact; the
immediately-following commit
`chore(continuous-ca-rd3d-stage0-sha-backfill): back-fill Stage 0
checkpoint SHA per Convention #12` `git rev-parse HEAD`s the closing
commit and replaces both placeholders (and the matching cell in § 2
row 2) with the resolved SHA. Never `--amend`.

## 11. What remains

Nothing — Stage 0 is `complete`, NOT `partial-needs-continuation`.
Operator dispatches Stage 1 in a fresh session per charter § 5 /
§ 7.2. Stage 1 scope: **reaction-diffusion-3d only** (ONE sim,
single sub-bundle commit covering gates 4–13; MMS-based gate 5 is
first-of-kind in the workspace; Python NumPy reference per
charter § 1.4 re-anchor).

## 12. Phase-coherence anchor

Stage 0 confirms the continuous-CA RD-3D sub-phase's input contract:

- Phase 1 landed at `v0.1.0-phase-1` (SHA `9998bc1`); the 8-gate
  cross-phase replay against that tag is GREEN at this HEAD with
  exit 0 and output sha256 byte-matching the closed-form + agent-
  based + hotfix-V1 baseline (`9399fc33…909f34`).
- The closed-form sub-phase landed at SHA `2cc0f21`, the agent-based
  sub-phase at SHA `739c93f`, and the replay-tool-hotfix at SHA
  `1f5fa0c`; all three contribute their full audit chains to the
  append-only protected set (charter § 10); none participates in
  the replay chain (charter § 11.4).
- The RD-3D Phase 1 failing-tests evidence file still hashes byte-
  for-byte to the value recorded in the Phase 1 landing audit
  (gate-13 precondition holds:
  `b3165ab1cd0b69d816fce8ffcdb4436d619f01c5ecfa7942eb77c4aeb2514b96`).
- Tolerance budget bumped to `sub-phase-continuous-ca-rd3d` with no
  `[budgets.*]` widening.
- RD-2D MMS regression scope routed Reading (b) (out-of-scope);
  banked for future routing.

The sub-phase is cleared to enter Stage 1 (per-sim implementation:
**reaction-diffusion-3d only**; single sub-bundle covers gates 4–13
per charter § 2 + § 4.2; determinism-strategy declaration is load-
bearing per charter § 1.5 + § 7.2; MMS-based gate 5 verification is
first-of-kind per charter § 2 gate 5 + § 4.2 step 3 with the P23
playbook entry available if the convergence study fails).
