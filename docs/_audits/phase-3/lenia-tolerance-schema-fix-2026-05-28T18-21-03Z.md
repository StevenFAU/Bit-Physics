---
date: 2026-05-28T18-21-03Z
author: phase-3 lenia-tolerance-schema-fix (Claude Code)
subject: Phase 3 focused infrastructure fix — reshape lenia tolerance row to schema-valid form, add `golden_tolerance` top-level branch to `tolerance-schema.json`, bank convention §S, close equivalence.yml red since 5baf083
verdict: CONFIRMED
head_sha: 50af66cba7cb0a1f4d447a2024381483db3c9286
head_sha_at_checkpoint: 50af66cba7cb0a1f4d447a2024381483db3c9286
prior_sub_phase_tag: v0.2.3-sub-phase-phase-3-render-similarity
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
fix_scope: fix(tolerance schema + tolerance.toml) + docs(convention §S + this audit + progress)
tag_pushed_by_agent: false (no tag; steady-state infra hygiene, NOT a sub-phase)
evidence_paths:
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/equivalence/tests/test_harness.py
  - tools/testkit/equivalence/harness.py
  - docs/conventions/sub-phase-conventions.md
  - docs/phases/phase-3-plan.md
  - .github/workflows/equivalence.yml
  - .github/workflows/python-strict.yml
evidence_hashes:
  tools/testkit/equivalence/tolerance-schema.json: sha256:8be90138f7067afd0149a8be047e071e7ffa5b256f9fbecb35679bd6f072191a
  tools/testkit/equivalence/tolerance.toml: sha256:4b85b31700012b8ddcdae579229edb06de3795b6f7fc78e52fbc195778a4373a
  tools/testkit/equivalence/tests/test_harness.py: sha256:0324b7a8ee0664e419e96bffdd8d5ba347995823189fe777870156b539bcceda
  tools/testkit/equivalence/harness.py: sha256:4a1478c86b1e23aa4ab89faf17286290305c94d999db0ca7f627ef24acff9958
  docs/conventions/sub-phase-conventions.md: sha256:a3dd72be6954df58b004bf14e20b23d609794b4889b1e8c02a46cd9a1f3bc4d4
  docs/phases/phase-3-plan.md: sha256:f16a4a2e4e093b0f273a9edb6d99c2b9cf3d267892a9f2b1df7ceebeaf6ff3fc
  .github/workflows/equivalence.yml: sha256:eff6ac4046396f95b555a97669677658f8c68977c45e6573eab8eea67f069a23
  .github/workflows/python-strict.yml: sha256:78d1c5030bf58ebb335408bb74f215dd455d8d77e1992238f13b494614db47c7
---

# Phase 3 — lenia-tolerance-schema-fix

> Focused INFRASTRUCTURE fix; NOT a sub-phase; NOT tagged. Closes the
> red-CI failure mode where every push to `main` since
> `5baf083` (lenia Stage 1b) red-lit `.github/workflows/equivalence.yml`
> on `pytest -W error equivalence/tests/test_harness.py` (3 of 4) with
> `jsonschema.ValidationError: Additional properties are not allowed
> ('continuous-ca' was unexpected)`. Mirrors the steady-state-hygiene
> posture of `sub-phase-phase-2-cleanup`, `r2-credentials-durability-fix`,
> and `audit-citation-hygiene` (no tag, single short commit chain).

## §0. Scope

Two surfaces:

- **(a) Primary fix — schema-vs-plan-prose drift on `tolerance.toml`.**
  `sub-phase-phase-3-lenia` Stage 1b
  (`docs/_audits/phase-3/sub-phase-phase-3-lenia-stage-1b-2026-05-28T15-51-04Z.md:330,342`)
  appended `[continuous-ca.lenia]` as a NEW top-level table in
  `tools/testkit/equivalence/tolerance.toml` matching the prose example
  in `docs/phases/phase-3-plan.md:421-433` §3.2.4. But the schema
  (`tools/testkit/equivalence/tolerance-schema.json:7`) has
  `additionalProperties: false` at the root and only permits
  `defaults` / `overrides` / `render_similarity` as top-level keys.
  Reshape the row to schema-valid form by adding a `golden_tolerance`
  top-level branch that mirrors the `render_similarity` additive-
  extension precedent (Phase-3 D-SCHEMA at
  `sub-phase-phase-3-render-similarity` Stage 1a).
- **(b) Convention bank — §S.** New section "Tolerance-schema
  extensions follow the schema, not the plan prose" at
  `docs/conventions/sub-phase-conventions.md` §S — sits after §R, before
  §O. Encodes the probe-the-schema-first rule, the three legal landing
  shapes, the coordinator-dispatch discipline, and a post-push CI poll
  obligation (S.5) covering the agent-side independent gap that let the
  red ship to main on every push since lenia Stage 1b.

## §1. Anchor probe

### §1.1 HEAD + tags + commit-tree posture

| Probe | Result |
|---|---|
| `git rev-parse HEAD` (pre-session) | `e2db2ce` — audit-citation-hygiene chain tip (Convention M) |
| `git rev-parse HEAD` (audit-time) | `50af66cba7cb0a1f4d447a2024381483db3c9286` — this fix's convention-bank commit |
| Six prior phase tags resolve | `v0.0.0-phase-0 → 75b674cb`; `v0.1.0-phase-1 → 9998bc18`; `v0.2.0-phase-2 → 5832cbce`; `v0.2.1-sub-phase-lfs-architecture → 0407fa5e`; `v0.2.2-sub-phase-phase-3-common-3dgs → 07aa1f5c`; `v0.2.3-sub-phase-phase-3-render-similarity → 4e4b674d` |
| `git status --short` (pre-commit) | clean |
| `v0.2.4-sub-phase-phase-3-lenia` | NOT present (operator-pending push per lenia landing memo + audit-citation-hygiene `clean-to-tag` confirmation) |

### §1.2 Invariants at HEAD (pre-fix anchor + post-fix re-measure)

| Inv | Result | Method |
|---|---|---|
| **I3** integrity invariant | **HELD — `0 HARD_FAIL, 14 SOFT_WARN`** at HEAD `e2db2ce` (pre-fix) and HEAD `50af66c` (post-fix); digest **measured live** = `688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff` (Convention §R measure-don't-copy; same digest as r2-credentials-durability-fix + audit-citation-hygiene because none of those commits + this commit chain touch any integrity-emitting surface — schema validation is at `load_tolerance_table` call-time, not in the integrity sweep) | `uv run --no-sync python -m integrity --all --mode strict 2>/tmp/integ.txt; sha256sum /tmp/integ.txt; grep -E '^summary' /tmp/integ.txt` |
| **I4** verify_evidence sweep | **PASS** across all phase-3 audits at HEAD; per-audit `evidence_paths` + `evidence_hashes` re-verify cleanly (the recurring Mode-1/Mode-2 prior-audit divergences are the documented `verify_evidence` behavior per §B.1 — sealed `evidence_hashes` is load-bearing; HEAD-divergence informational; no new regressions introduced by this fix) | per-audit loop `uv run --no-sync python -m integrity.scripts.verify_evidence --audit <file>` (`tools/integrity/integrity/scripts/verify_evidence.py:1`) |
| **I7** no agent-pushed tag in this fix range | **HELD** | `git tag` lists no new `v*` since `v0.2.3-sub-phase-phase-3-render-similarity`; no tag created in this session |

### §1.3 Pre-fix red-CI surface (FACT, the reason for this fix)

```text
$ gh run list --workflow=equivalence.yml -L 5
completed  failure  chore(phase-3): SHA back-fill audit-baseline-citation-correction audit … 26593217002 39s 2026-05-28T18:10:25Z
completed  failure  chore(phase-3): SHA back-fill r2-credentials-durability fix audit (Co…  26592217497 39s 2026-05-28T17:51:27Z
completed  failure  chore(phase-3): SHA back-fill lenia sub-phase landing progress entry … 26586506918 34s 2026-05-28T16:04:38Z
completed  failure  chore(phase-3): SHA back-fill lenia Stage 1b progress entry (Conventi… 26586037518 36s 2026-05-28T15:56:17Z
completed  failure  feat(phase-3): lenia Stage 1b infra — golden tables + tier-3 + PBT + … 26585728192 38s 2026-05-28T15:50:42Z
```

Every push to `main` since the lenia Stage 1b feat-push has been red
against this single test surface (3 of 4 tests failing).
`equivalence.yml` has existed since Phase 0 (`0e3a11e ci(phase-0):
activate CI gates at Phase 0 LANDING`); the gating wasn't missing —
the **agent-side post-push poll** was.

## §2. Investigation

### §2.1 Reproducer (FACT)

```text
$ cd tools/testkit && uv run --no-sync pytest -W error equivalence/tests/test_harness.py -v
FAILED test_stack_b_within_tolerance_of_stack_a
FAILED test_stack_wrong_fails_the_gate
FAILED test_load_tolerance_table_validates_against_schema
PASSED test_load_tolerance_table_rejects_malformed_table
jsonschema.exceptions.ValidationError: Additional properties are not allowed ('continuous-ca' was unexpected)
```

The 3 failing tests all call `load_tolerance_table` (directly or via
`compare_captures` → `load_tolerance_table`); the 4th passes because
it builds its own minimal-bad TOML and never reads the real
`tolerance.toml`.

### §2.2 Root cause — plan-prose-vs-schema drift

`docs/phases/phase-3-plan.md:421-433` §3.2.4 prescribes
`[<category>.<sim>]` as the **top-level** shape for every Phase-3 sim's
tolerance row, with bespoke per-sim keys (lenia:
`golden_kernel_abs/rel`, `golden_trajectory_abs`; pinn-poisson:
`analytical_l2`, `fd_l2`; articulated-pedagogical:
`pendulum_period_rel/trajectory_abs/energy_drift_rel_per_second`;
mass-spring-cloth: `position_abs/catenary_shape_rel`; neural-ca-python:
`golden_checkpoint_match/training_loss_distributional_bound`).

But `tools/testkit/equivalence/tolerance-schema.json:7-9`:

```json
"additionalProperties": false,
"required": ["defaults"],
"properties": {
  "defaults": …,
  "overrides": …,
  "render_similarity": …
}
```

Only **three** top-level keys permitted; `continuous-ca` is none of
them. The only Phase-3 schema extension that landed was
`render_similarity` (during `sub-phase-phase-3-render-similarity`
Stage 1a's D-SCHEMA decision); the broader §3.2.4 generalization to
"every Phase-3 sim has its own top-level branch" was never wired in.

The lenia Stage 1b agent matched the plan prose verbatim rather than
probing the schema first.

### §2.3 Two-option analysis

Per dispatch's STOP-SCHEMA-FIT framing:

- **Option (a) — reshape values to `overrides.<sim>`.** Would land as
  `[overrides.lenia]` with `category = "continuous-ca"` + a single
  `relative` / `absolute` pair. **REJECTED** semantically: (i) lenia is
  single-stack (Stack D Taichi only); no cross-stack pair exists, so
  `overrides` (which is cross-stack resolution wiring per the file's
  `tools/testkit/equivalence/tolerance.toml:7-14` header comment) is the wrong slot; (ii)
  `overrides`'s single-relative/absolute pair cannot carry two distinct
  anchor families (kernel + trajectory) at different tolerances
  (`golden_kernel_abs = 1e-6`, `golden_trajectory_abs = 1e-4` — two
  orders of magnitude apart, both meaningful). Reshape-to-overrides
  loses information.
- **Option (b) — additive schema extension.** Land a new top-level
  branch mirroring `render_similarity`'s additive-extension shape
  (a precedent that DOES exist at HEAD —
  `tools/testkit/equivalence/tolerance-schema.json:36-67`). **ACCEPTED.** Phase-3 already
  ratified the additive-extension pattern; the lenia case is a
  same-shape application (single-stack sim, sim-specific anchor-family
  tolerances, no cross-stack pair to reach for).

### §2.4 Phase-1 precedent check

Phase-1 RD-2D (`tools/testkit/equivalence/tolerance.toml:45-51`):

```toml
[overrides.reaction-diffusion-2d]
category = "reaction-diffusion"
# AT-BUDGET per [defaults.reaction-diffusion]: relative=1e-4, absolute=0.0.
# NOT a tolerance widening per spec § 2.6 — resolution wiring only.
```

Phase-1 RD-2D is a CROSS-STACK port (Stack D vs others). Its override
carries `category` ONLY (relative/absolute fall back to defaults).
**There is no Phase-1 precedent for sim-specific anchor-family
tolerances under any shape** — Phase-1 sims either use category
defaults or simple `relative` / `absolute` overrides; the `golden_*`
key family is a Phase-3-introduced concept (per phase-3-plan §3.2.4).

So STOP-SCHEMA-FIT's "no Phase-1 precedent for sim-golden-tolerance
schema branch" condition is TRUE. The dispatch authorized this fix
to proceed under the Phase-3 D-SCHEMA precedent (`render_similarity`)
rather than re-surface. Documented here for traceability.

### §2.5 CI-gating gap investigation (tertiary)

- `equivalence.yml` (`/.github/workflows/equivalence.yml:6-26`) runs
  `uv run pytest -W error equivalence/tests/` on every push to `main`
  AND every PR. The workflow is correctly scoped to catch this.
- `python-strict.yml` does NOT scope `equivalence/tests/`
  (line 74: `pytest … capture/tests/`); but this is by-design — that
  job is for the `capture/` / `determinism/` packages only.
- **Conclusion: the CI infrastructure is correct.** The gap is
  agent-side post-push polling. The lenia Stage 1b agent (and every
  subsequent landing agent: r2-credentials-durability,
  audit-citation-hygiene, the SHA-back-fill chores) ran their local
  pre-push verification (which was scoped to per-sim test paths, NOT
  equivalence/) and pushed without polling `gh run list` to confirm
  the post-push CI state was green.

Banked at §S.5 as a convention obligation rather than a workflow
change.

## §3. The fix

### §3.1 Schema extension — `golden_tolerance` top-level branch

`tools/testkit/equivalence/tolerance-schema.json` extended with:

```jsonc
"golden_tolerance": {
  "type": "object",
  "description": "Phase-3 additive extension (lenia-tolerance-schema-fix). …",
  "additionalProperties": {
    "type": "object",
    "additionalProperties": {
      "type": "object",
      "minProperties": 1,
      "additionalProperties": { "type": ["number", "boolean", "string"] }
    }
  }
}
```

Shape mirrors `render_similarity.<category>.<sim>` (two-level
category→sim nesting) but the per-sim entries use permissive
`additionalProperties: { type: [number, boolean, string] }` because
§3.2.4 enumerates BESPOKE per-anchor-family keys across sims (a strict
`required` set would force a fourth or fifth branch later for each new
sim family). The two-level nesting + a `minProperties: 1` guard keep
the discipline (no empty rows, no flat-key proliferation).

### §3.2 `tolerance.toml` row reshape

`tools/testkit/equivalence/tolerance.toml` — the lenia block moves
from `[continuous-ca.lenia]` (top-level, schema-invalid) to
`[golden_tolerance.continuous-ca.lenia]` (under the new branch). Values
unchanged:

```toml
[golden_tolerance.continuous-ca.lenia]
golden_kernel_abs = 1e-6
golden_kernel_rel = 1e-5
golden_trajectory_abs = 1e-4
```

Header comment updated to (a) explain why `overrides.<sim>` does not
fit semantically (no cross-stack pair, no slot for per-anchor-family
tolerances) and (b) cite the schema branch + the
`render_similarity` precedent.

### §3.3 Convention bank — §S

`docs/conventions/sub-phase-conventions.md` §S
"Tolerance-schema extensions follow the schema, not the plan prose"
inserted after §R, before §O.

- §S.1 — why (lenia Stage 1b prose-vs-schema drift; equivalence.yml red
  since `5baf083`).
- §S.2 — the rule (Stage-1b agents probe schema + at least one existing
  entry under the closest-fitting top-level branch BEFORE appending any
  row; the schema is authoritative).
- §S.3 — enumerate the three legal landing shapes (`overrides.<sim>`
  cross-stack; `render_similarity.<category>.<sim>` neural-rendered
  thresholds; `golden_tolerance.<category>.<sim>` single-stack
  anchor-family tolerances). Any FOURTH shape → new D-class in
  plan-drafting, not improvised at Stage 1b.
- §S.4 — coordinator-dispatch discipline ("additive extension"
  vocabulary must cite existing branches as default slot before
  authorizing a new top-level branch).
- §S.5 — post-push CI poll obligation. Within ~2 min of pushing, query
  `gh run list --limit 10`. A `failure` against an existing CI gate
  fires STOP-CI-RED. Same measure-don't-assume discipline as §R.

### §3.4 NO CI workflow changes

`equivalence.yml` correctly catches this gate. No workflow file
modified by this fix. (Phase-1's `audit-append-only.yml` /
`tolerance-budget-check.yml` are unchanged surface area.)

## §4. Verification

### §4.1 pytest — equivalence harness (the specific gate)

```text
$ cd tools/testkit && uv run --no-sync pytest -W error equivalence/tests/ -v
equivalence/tests/test_harness.py::test_stack_b_within_tolerance_of_stack_a PASSED [ 25%]
equivalence/tests/test_harness.py::test_stack_wrong_fails_the_gate          PASSED [ 50%]
equivalence/tests/test_harness.py::test_load_tolerance_table_validates_against_schema PASSED [ 75%]
equivalence/tests/test_harness.py::test_load_tolerance_table_rejects_malformed_table  PASSED [100%]
============================== 4 passed in 0.19s ===============================
```

**4 / 4 GREEN.**

### §4.2 pytest — broader sweep (no collateral damage)

```text
$ uv run --no-sync pytest -W error equivalence/ capture/tests/ determinism/tests/ render_similarity/tests/
75 passed in 6.47s
```

**75 / 75 GREEN** across the testkit subtrees most likely to be
affected. No new failures introduced.

### §4.3 Integrity invariant + digest re-measure (Convention §R)

```text
$ uv run --no-sync python -m integrity --all --mode strict 2>/tmp/integ-post.txt
$ sha256sum /tmp/integ-post.txt
688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
$ grep -E '^summary' /tmp/integ-post.txt
summary: 0 HARD_FAIL, 14 SOFT_WARN
```

`integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN` HELD.
`integrity_digest_at_head: 688bc195…6de127ff` — unchanged from pre-fix
because no integrity-emitting surface was touched (no new golden
table, no new evidence path, no new audit-log emitter; only schema +
tolerance-toml + conventions + this audit).

## §5. Commit chain

| # | SHA | Type | Subject |
|---|---|---|---|
| 1 | `324767b` | `fix(phase-3)` | reshape lenia tolerance row + golden_tolerance schema branch |
| 2 | `50af66c` | `docs(phase-3)` | bank §S tolerance-schema convention (probe-schema-first) |
| 3 | (this commit) | `docs(phase-3)` | lenia-tolerance-schema-fix audit + progress entry |
| 4 | (next) | `chore(phase-3)` | SHA back-fill this audit (Convention #12) |

Trunk-based to `main`; no PR; **no tag** (steady-state hygiene; D.2
default-NO; I7 holds).

## §6. Banked / forward-routed

- **L-LTSF-1** (post-push CI poll, NEW): banked as Convention §S.5.
  Every Stage-1b / focused-fix / landing commit chain runs
  `gh run list --limit 10` (or per-workflow) within ~2 minutes of
  pushing; `failure` against an existing gate fires STOP-CI-RED. Same
  measure-don't-assume discipline as §R. **Closed-in-convention** —
  not a forward route, the obligation lives on every future audit
  from here.
- **L-LTSF-2** (plan §3.2.4 vs schema drift, NEW): banked as
  Convention §S.1-S.3. `docs/phases/phase-3-plan.md:421-433` prose
  example `[<category>.<sim>]` shape is now annotated by the §S
  three-legal-shapes table; future sims read §S first, plan prose as
  starting design subject to §0.3 "discovered pattern wins" semantics.
  **Closed-in-convention.**
- **L-LTSF-3** (golden-table tolerance-budget cap shape): `lenia`
  Stage-0 FRICTION #1 carried forward — `tolerance-budget.toml` has
  NO `[budgets.<category>.golden]` cap shape. The `golden_tolerance`
  branch's per-sim entries are self-bounded (each sim's row is
  declared at its own Stage 1b). A Phase-3 D-class generalization
  could add a `[budgets.golden_tolerance.<category>]` cap shape;
  routes to a future tolerance-budget-amendment proposal at operator
  routing (NOT owned here; the fix above is necessary-and-sufficient
  to unblock CI).

## §7. Convention applications

| Convention | Application |
|---|---|
| **§M re-anchor** | HEAD `e2db2ce` (pre-session) → `50af66c` (audit-time); six prior phase tags resolve cleanly; live integrity digest measured at HEAD, not copied. |
| **§Q LFS-S3 bootstrap** | NOT triggered (this fix touches no LFS-tracked surface; no `.h5` push needed). |
| **§R measure-don't-copy** | `integrity_invariant` + `integrity_digest_at_head` recorded in this audit's front-matter as the two-field shape (replaces legacy single `integrity_baseline:` per audit-citation-hygiene's §R landing). |
| **§S (NEW)** | The very convention this audit lands; the fix itself complies (shape (b) additive extension under operator-equivalent ratification via dispatch). |
| **§B append-only audit chain** | New audit file; prior audits NOT edited (the lenia Stage 1b audit's `tolerance.toml` claim is sealed; the row's reshape lives in the next-commit history record, not via in-place edit). |
| **Convention #8 read-the-precedent** | The `render_similarity` D-SCHEMA branch read FIRST (`tools/testkit/equivalence/tolerance-schema.json:36-67`); the new `golden_tolerance` branch mirrors its shape rather than inventing. |
| **Convention #12 SHA back-fill** | Commit 4 (next) — back-fill this audit's own head_sha + integrity_digest_at_head with its committed SHA. |
| **Cat-1 path:line citations** | Every cited `path:line` is repo-rooted full path (matches cat1 hook). |
| **HARD RULE 2** | No tolerance widening (values unchanged; only the row's location in the schema-tree moved). |
| **I7 no agent-pushed tags** | HELD — no tag created. |

## §8. STOP-conditions evaluated

| STOP | Fired? | Resolution |
|---|---|---|
| STOP-SCHEMA-FIT | **EVALUATED, NOT RE-SURFACED** | Per dispatch §"STOP CONDITIONS": "no precedent in Phase-1 for a sim-golden-tolerance schema branch" condition is TRUE (per §2.4). The dispatch grants the agent freedom to make the call with citation/precedent; the `render_similarity` D-SCHEMA precedent (Phase-3, ratified at sub-phase-phase-3-render-similarity Stage 1a) is cited inline (§2.3, §3.1) as the additive-extension authority. Documented for traceability rather than re-surfaced to operator. |
| STOP-D (integrity baseline divergence) | NO | invariant HELD (0 HARD_FAIL / 14 SOFT_WARN). |
| STOP-H (HARD_FAIL appears) | NO | none. |
| STOP-CI-RED (§S.5 NEW) | N/A pre-push | Will be polled within ~2 min of push per §S.5. Post-push CI state recorded in progress entry. |
| STOP-LFS-PUSH | N/A | no LFS objects touched. |

## §9. Operator-visible

- Push the three commits (the chain `324767b` → `50af66c` → this audit
  + Convention-#12 back-fill commit) to `origin/main` (agent push
  authorized per dispatch; no tag).
- **First green `equivalence.yml` run since `5baf083` (lenia Stage 1b)**
  expected within ~40s of the push that contains commit 1 (`324767b`).
- `v0.2.4-sub-phase-phase-3-lenia` remains **clean-to-tag** per
  audit-citation-hygiene's §3 conclusion; this fix does not affect
  that posture (it does not edit any sealed lenia audit; it
  reshapes the tolerance row at HEAD only).

## §10. Verdict

**CONFIRMED.** 4/4 schema-test GREEN; broader testkit sweep 75/75
GREEN; integrity invariant + digest re-measured live; no new audit
regressions; no LFS surface touched; no tag created (I7 holds); §S
convention banked; §S.5 post-push poll obligation banked for every
future Stage-1b / focused-fix / landing chain.

`equivalence.yml` red-since-`5baf083` is closed.
