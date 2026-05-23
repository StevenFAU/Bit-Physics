---
date: 2026-05-23T14-06-40Z
author: sub-phase-taichi-integration-agent
phase: 2
artifact: stage
artifact_id: taichi-integration-stage-0
subject: "Stage 0 pre-flight checkpoint — Tasks 0.0/0.1/0.2/0.3 PASS; Task 0.4 baseline PASS with charter-prescribed-invocation drift surfaced (SHIFTED N1); FIRST spec-Phase-2 Stage 0 close"
verdict-state: CONFIRMED
head_sha: 0eed3d72081d53749382ffc472564f00bde4c57c
head_sha_at_checkpoint: 0eed3d72081d53749382ffc472564f00bde4c57c
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-1/sub-phase-conventions-refactor-post-phase-1/landing-2026-05-23T13-04-05Z.md
  - docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-probe-2026-05-23T13-41-01Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/plan-drafting-landing-2026-05-23T13-41-01Z.md
evidence_paths:
  - docs/phases/sub-phase-taichi-integration.md
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/equivalence/tolerance-budget.toml
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-replay-2026-05-23T14-06-40Z.txt
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-red-evidence-reverify-2026-05-23T14-06-40Z.txt
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-common-py-baseline-2026-05-23T14-06-40Z.txt
  - docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-common-py-altinvocation-baseline-2026-05-23T14-06-40Z.txt
  - common/common-py/pyproject.toml
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:3698d19b62a0e9066f2daf616bdd13670b757d4460ea8d3d7c114fb2392bd734
  docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-replay-2026-05-23T14-06-40Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-red-evidence-reverify-2026-05-23T14-06-40Z.txt: sha256:837a9242b77a30bd0ac08da1c32735865cf0c52f4bb36e941ef6abc2c017d79a
  docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-common-py-baseline-2026-05-23T14-06-40Z.txt: sha256:6712cd5f8c5b8ba794ba43f32fdf40f9f57380f7bb2474120cd2f98ee9dbd4c8
  docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-common-py-altinvocation-baseline-2026-05-23T14-06-40Z.txt: sha256:4c34738cd1ae02765e666963095aa0f82a0134cfaeb27ba09f1c4a36898f9ff2
---

# Taichi-Integration Sub-Phase — Stage 0 Pre-Flight Checkpoint

## 1. Stage 0 scope summary

(FACT — `docs/phases/sub-phase-taichi-integration.md` § 4.1 + operator dispatch with D1=SUPERSEDE / D2=as-charter / D3=v0.1.0-phase-1 / Task 0.3 PRE-ROUTED to option (a) ratifications applied.)

**FIRST spec-Phase-2 Stage 0** — establishes the pre-flight discipline at the first `docs/_audits/phase-2/` Stage-0 surface. Tasks 0.0 → 0.4 executed per charter § 4.1 exactly with no autonomous re-routing.

This Stage 0 is the **first** to:

- **Execute under D1=SUPERSEDE operator ratification.** `docs/phases/phase-2-cross-stack-replication.md` is NOT the dispatch vehicle; per-sub-phase decomposition carries forward per Phase 1 pattern.
- **Hit the 17th invocation of bit-identity replay invariant** `9399fc33…909f34` (Task 0.0 PASS).
- **Mass-reverify all 9 Phase-1 sims' RED evidence** sha256s in one Task 0.2 (gate-13 precondition since common-py wiring + Taichi dep will shift the testkit-consumer surface at Stage 1).
- **Surface a charter-prescribed-invocation drift at Task 0.4** (SHIFTED N1 — see § 8.2). The charter's `(cd common/common-py && uv run --no-sync pytest -v)` invocation is not workable at HEAD because common-py declares `bit-physics-testkit = { workspace = true }` in `[tool.uv.sources]` but is itself not a workspace member — uv refuses to build. Alternative-invocation baseline (15 passed, 3 matplotlib-skipped) confirms test content is healthy. This is the chicken-and-egg surface Stage 1's workspace registration fixes.
- **Land under the post-Phase-1 IC numbering convention** (IC-11 / IC-12 forthcoming at Stage 1 + 2).

## 2. Task 0.0 — Cross-phase replay (17th invocation)

(FACT — `docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-replay-2026-05-23T14-06-40Z.txt` sha256 `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34`.)

**Invocation (per conventions doc § D.5 workspace-validated form):**
```
uv run python -m integrity.scripts.replay_prior_phase \
  --prior-phase phase-1 \
  --audit docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md \
  --gates integrity,pytest,equivalence,determinism,perf-ledger,property,mutation,tolerance-budget
```

**Resolver behavior:** `phase-1` → `v0.1.0-phase-1` per `_PHASE_HANDLE_RE` + `_SEMVER_PHASE_TAG_RE` at `tools/integrity/integrity/scripts/replay_prior_phase.py:43-45`. Single-integer phase-tag handle is the ONLY mechanically-resolvable anchor at HEAD per D3 ratification.

**Per-gate result:**

```
PASS  gate=integrity audit_verdict=None
PASS  gate=pytest audit_verdict=None
PASS  gate=equivalence audit_verdict=None
PASS  gate=determinism audit_verdict=None
PASS  gate=perf-ledger audit_verdict=None
PASS  gate=property audit_verdict=None
PASS  gate=mutation audit_verdict=None
PASS  gate=tolerance-budget audit_verdict=None
summary: prior_phase=v0.1.0-phase-1 ok=True
```

**Exit:** 0. **Replay-output sha256:** `9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34` — **byte-identical to bit-identity replay invariant** per conventions doc § D.3. **17th invocation** (16 prior across per-sim sub-phases + hotfix V validations + LFS-migration verifications + conventions-refactor Stage 0; conventions-refactor § 2 Task 0.0 row "16th invocation" is the immediate predecessor).

Task 0.0 verdict: **PASS**.

## 3. Task 0.1 — Tolerance-budget carryover

(FACT — `tools/testkit/equivalence/tolerance-budget.toml` post-commit `81b14758…` at HEAD.)

**Edit:** `[phase].phase` carried over from `"sub-phase-conventions-refactor-post-phase-1"` → `"sub-phase-taichi-integration"`; `opened_at` bumped from `"2026-05-23T12:27:48Z"` → `"2026-05-23T14:06:40Z"`. **NO `[budgets.*]` widening** — every cross-stack budget row preserved verbatim (closed_form 1e-5 / reaction-diffusion 1e-4 / sph 1e-4 / mpm 1e-4 / smoke 1e-4 / lbm 1e-5).

**Commit:** `81b14758…` — `chore(taichi-integration-stage0-tolerance-budget): sub-phase carryover from sub-phase-conventions-refactor-post-phase-1`. Diff: +2 / -2.

Task 0.1 verdict: **PASS**.

## 4. Task 0.2 — 9-sim Phase-1 RED evidence sha256 mass reverify

(FACT — `docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-red-evidence-reverify-2026-05-23T14-06-40Z.txt` sha256 `837a9242b77a30bd0ac08da1c32735865cf0c52f4bb36e941ef6abc2c017d79a`.)

Per-sim sha256 at HEAD vs MPM landing § 6.2 baseline:

| Sim | HEAD sha256 | MPM § 6.2 prefix-form | Match |
|---|---|---|---|
| strange-attractors | `c4f72e2595bfe0702ac1d1721371e65ea985661be89c114e100da783104cac63` | `c4f72e25…04cac63` | ✓ |
| mandelbulb-explorer | `d4a89d3e782e639c179238d7fc5f4c307a99cf0ec74d9ebb5d8db547b37e2ca0` | `d4a89d3e…b37e2ca0` | ✓ |
| boids-3d | `7d59ffdbd96d96ac3bb33439a00102a36fd29015acd564aef544850cf6e39b7b` | `7d59ffdb…f6e39b7b` | ✓ |
| physarum | `8ee52dc7cff8a207fb8bed468b2e72cd84ea5196fafbdf646481ed328c043855` | `8ee52dc7…8c043855` | ✓ |
| reaction-diffusion-3d | `b3165ab1cd0b69d816fce8ffcdb4436d619f01c5ecfa7942eb77c4aeb2514b96` | `b3165ab1…b2514b96` | ✓ |
| sph-water | `82fb91bcf19581cd9adc0eca4ba194de033d4a58aa9c5319d52dabc40cf12b1f` | `82fb91bc…40cf12b1f` | ✓ |
| eulerian-smoke | `c961dd22c1ca6117af6d9f187d2c0d3aa4d546972496b0f38d11aa14879f23a1` | `c961dd22…14879f23a1` | ✓ |
| lattice-boltzmann-d3q19 | `c78de8bee93a5cb06c0ccc78a843766b98c93685b344c63d772cf3374b6ef3cd` | `c78de8be…b4b6ef3cd` | ✓ |
| mpm-multimaterial | `a57251a19b28888e664402e9c92eb681fa17719be7e156154df3d681bb9edf94` | `a57251a1…81bb9edf94` | ✓ |

**All 9 ✓.** Mass gate-13 precondition CONFIRMED — every Phase-1 sim's RED-evidence anchor preserved byte-identically at HEAD.

Task 0.2 verdict: **PASS**.

## 5. Task 0.3 — Taichi-dep placement routing (PRE-ROUTED to option (a))

(FACT — operator dispatch ratification: option (a) at `common/common-py/pyproject.toml [project].dependencies`; promote `[taichi]` optional extra to required.)

**Probe-time workability verification** (Convention #8 — verified at HEAD before recording):

Read of `common/common-py/pyproject.toml` at HEAD:

- `[project].requires-python` = `">=3.12"`. Compatible with workspace's existing `python_requires` posture (Phase 1 sims target Python 3.12).
- `[project].dependencies` currently lists `bit-physics-testkit`, `h5py>=3.10`, `numpy>=2.0`, `watchfiles>=0.21` — no conflict; Stage 1 adds `taichi>=1.7,<2.0` (charter § 4.2 step 2; tightened upper bound per re-pin policy convention `H.4`).
- `[project.optional-dependencies].taichi` currently lists `taichi>=1.7` (single dep). Stage 1 promotion: copy into `[project].dependencies` with `<2.0` upper bound; remove from optional or keep as documented stub (Stage 1 routing).
- `[tool.uv.sources].bit-physics-testkit = { workspace = true }` — workspace-source dep on testkit. **This is the source of the Task 0.4 chicken-and-egg surface** (§ 6 below). Stage 1's workspace registration of common-py resolves it.
- `[tool.mypy.overrides]` already lists `taichi`/`taichi.*` under `ignore_missing_imports = true` — no mypy work needed at Stage 1 for the promotion.

**No conflicting transitive constraints surfaced.** Routing (a) is workable at HEAD; Stage 1 may proceed per charter § 4.2 step 2 without re-routing.

**Operator's three rationale points (recorded for audit chain):**

1. Taichi is genuinely Stack-D-only — gating common-py on it is semantically correct.
2. Stack-B/C developers can omit common-py from their workspace install when not needed (current behavior).
3. numba is a project-wide perf tool any sim category can adopt; Taichi is fundamentally a Stack-D-only DSL — symmetry with numba-integration § 2 routing would be miscategorisation.

Task 0.3 verdict: **PASS** (PRE-ROUTED; probe-time workability confirmed; no surfacing required).

## 6. Task 0.4 — common-py existing test suite baseline

### 6.1 Charter-prescribed invocation (FAIL at HEAD; SHIFTED N1)

(FACT — `docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-common-py-baseline-2026-05-23T14-06-40Z.txt` sha256 `6712cd5f8c5b8ba794ba43f32fdf40f9f57380f7bb2474120cd2f98ee9dbd4c8`.)

**Invocation per charter § 4.1 Task 0.4:**
```
(cd common/common-py && uv run --no-sync pytest -v)
```

**Result:** `4 errors in 0.15s` — `collected 0 items / 4 errors`. All 4 errors are import failures in the test modules, all chaining back to:

```
src/common_py/__init__.py:21: in <module>
    from . import alembic, capture, determinism, ggui, hotreload, plotting, vdb
src/common_py/capture.py:26: in <module>
    from capture import Capture as _CaptureRow
E   ModuleNotFoundError: No module named 'capture'
```

**Root cause** (verified by `uv sync` from repo root):

```
× Failed to build `bit-physics-common-py @
│ file:///home/otacon/Projects/Bit-Physics/common/common-py`
├─▶ Failed to parse entry: `bit-physics-testkit`
╰─▶ `bit-physics-testkit` references a workspace in `tool.uv.sources` (e.g.,
    `bit-physics-testkit = { workspace = true }`), but is not a workspace
    member
```

common-py's `[tool.uv.sources].bit-physics-testkit = { workspace = true }` declaration cannot resolve because common-py is NOT itself a workspace member at HEAD (FACT — root `pyproject.toml` `[tool.uv.workspace].members` enumerates 13 entries; `common/common-py` absent, per plan-drafting probe § 2.7). **This is the chicken-and-egg surface Stage 1 of the dispatched sub-phase fixes** by adding `"common/common-py"` to workspace members.

### 6.2 Alternative-invocation baseline (PASS at HEAD)

(FACT — `docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-common-py-altinvocation-baseline-2026-05-23T14-06-40Z.txt` sha256 `4c34738cd1ae02765e666963095aa0f82a0134cfaeb27ba09f1c4a36898f9ff2`.)

**Invocation** (probe-time alternative, bypassing uv's workspace-source resolution; runs against root `.venv` which already has `bit-physics-testkit` installed via Phase-1 workspace registration):
```
PYTHONPATH=common/common-py/src:tools/testkit/src .venv/bin/pytest common/common-py/tests/ -v
```

**Result:**

| Test file | Tests | Status |
|---|---:|---|
| `test_capture_roundtrip.py` | 3 | PASS |
| `test_determinism.py` | 5 | PASS |
| `test_module_surfaces.py` | 5 PASS + 3 SKIPPED (matplotlib unavailable; expected — `[plotting]` optional extra not installed) | PASS+SKIP |
| `test_smoke_advection.py` | 2 | PASS |
| **TOTAL** | **15 PASS, 3 SKIPPED, 0 FAIL** | **GREEN content baseline** |

### 6.3 Stage 0 baseline disposition

**Test content baseline: GREEN.** 15 passed + 3 expected-skipped via alternative invocation.

**Charter-prescribed-invocation baseline: 4-error chicken-and-egg.** Documented; Stage 1 workspace registration is the fix. Post-Stage-1 expectation: `(cd common/common-py && uv run --no-sync pytest -v)` becomes runnable and produces a result matching the alternative-invocation baseline (15 PASS + 3 SKIPPED, possibly all-PASS once Stage 1 installs `matplotlib` via the `[plotting]` extra or leaves it as-is).

Task 0.4 verdict: **PASS for content** (alternative invocation 15/3/0); **SHIFTED** for charter-prescribed-invocation form (§ 8.2 N1). Surface to operator at closing summary; not BLOCKER for Stage 1 dispatch because the surface IS Stage 1's deliverable.

## 7. Append-only check (Stage 0 step equivalent)

(FACT — `git diff 75fb99a..HEAD --stat`; HEAD will be the closing-commit of this checkpoint.)

This Stage 0's modified-or-added files:

- `tools/testkit/equivalence/tolerance-budget.toml` (Task 0.1 carryover — `[phase].phase` + `opened_at` edits)
- `docs/_audits/phase-2/sub-phase-taichi-integration/stage-0-*-2026-05-23T14-06-40Z.{md,txt}` (this audit + 4 evidence files; all new)

**Append-only protected set at Stage 0 close** = 14 sets (Phase 0 + Phase 1 + 12 prior sub-phase landings + plan-drafting sub-phase landing). No edit to any file present at any prior protected SHA within those protected paths.

CI semantics (`grep -E '\.ledger\.md$'`): no `*.ledger.md` files touched; CI trivially clean.

Strict-mode advisory: `tools/testkit/equivalence/tolerance-budget.toml` is the routine Task 0.1 phase carryover; precedent set by every per-sim sub-phase Stage 0 since closed-form.

## 8. SHIFTED register

### 8.1 Inherited

(FACT — plan-drafting landing § 8.3.) **92 cumulative shifts entering Stage 0** (89 inherited from Phase 1 + post-Phase-1 sub-phases + 3 from plan-drafting precedent-establishing).

### 8.2 New shifts surfaced during this Stage 0

| ID | Description |
|---|---|
| **N1** | **Charter-prescribed Task 0.4 invocation form not workable at HEAD; alternative invocation establishes content baseline GREEN.** Charter § 4.1 Task 0.4 prescribes `(cd common/common-py && uv run --no-sync pytest -v)`. At HEAD this fails with 4 collection errors because common-py's `[tool.uv.sources].bit-physics-testkit = { workspace = true }` declaration cannot resolve when common-py is itself not a workspace member (chicken-and-egg surface — uv refuses to build the package, so `--no-sync` against an empty common-py-local env never finds testkit's `capture` module). Alternative invocation from repo root (`PYTHONPATH=common/common-py/src:tools/testkit/src .venv/bin/pytest common/common-py/tests/ -v`) leverages Phase-1's root-`.venv` workspace registration of testkit and produces 15 passed + 3 matplotlib-skipped GREEN. **Charter-prescribed form becomes workable post-Stage-1 (when common-py joins workspace).** Plan-drafting probe § 2.7 had documented common-py as "infrastructure shipped, not yet wired"; this Stage 0 confirms the runtime consequence of that probe finding. **Implication for future spec-Phase-2 plan-drafting:** when charter prescribes a runtime check against a not-yet-wired surface, the check is the surface that the implementation lands; SHIFT the check expectation accordingly. |

### 8.3 Cumulative shift count entering Stage 1 dispatch

**92 + 1 = 93** cumulative shifts entering Stage 1 dispatch.

## 9. Banked items for follow-up

### 9.1 Resolved during Stage 0

- Task 0.0 cross-phase replay against `v0.1.0-phase-1` (17th invocation of bit-identity invariant) — establishes the spec-Phase-2 replay-anchor precedent per D3 ratification.
- Task 0.1 tolerance-budget carryover.
- Task 0.2 mass 9-sim RED evidence reverify — gate-13 precondition CONFIRMED.
- Task 0.3 Taichi-dep placement routing recorded (PRE-ROUTED to option (a); probe-time workability verified).
- Task 0.4 baseline content GREEN via alternative invocation; charter-prescribed-invocation drift documented as SHIFTED N1.

### 9.2 Open (carried into Stage 1 dispatch)

| Item | Owner |
|---|---|
| **Charter-prescribed Task 0.4 invocation fix** | Stage 1's workspace registration (charter § 4.2 step 1) converts the invocation form to runnable. Post-Stage-1 expectation: `(cd common/common-py && uv run --no-sync pytest -v)` produces 15+3+0 (or with `matplotlib` installed if Stage 1 routes it: 18+0+0). |
| **Taichi promotion at common-py pyproject** | Stage 1 charter § 4.2 step 2 — promote `[taichi]` extra to `[project].dependencies` with tightened upper bound `taichi>=1.7,<2.0`. |
| **Subsequent Stage 1 deliverables** | Charter § 2 deliverables 3–11 (convention doc / determinism wrapper extension / hello-physics smoke / taichi_harness regression tests / integrity + regression sweeps / equivalence / convergence files). |
| **D2 row 1 — testing-improvements sub-phase** | DEFER per D2 ratification. Operator separate routing. |
| **D2 row 4 — cross-stack verification methodology** | DEFER to first Stack-C↔Stack-D port sub-phase. |
| **D2 row 5 — evidence_paths strict-verify LFS remediation** | DEFER per § B.6 lean; separate focused infrastructure hotfix. |
| **D2 row 6 — mid-Phase-1 capture regeneration** | DEFER per-sim work. |
| **B-hotfix-1 / B-hotfix-2 / B2 / B3 / B4 / B5 / B6 / B11 / B16** | Carry forward per original Phase 1 audit § 13 owners. |

## 10. Closing-commit anchor re-check (Stage 0 step equivalent)

(FACT — `git log --oneline 75fb99a..HEAD`.)

| Anchor | Pre-Stage-0 | Post-Stage-0 | Status |
|---|---|---|---|
| Conventions doc sha256 | `3698d19b…2bd734` | (unchanged) | append-only protected per § B.1 |
| `tolerance-budget.toml [phase].phase` | `"sub-phase-conventions-refactor-post-phase-1"` | `"sub-phase-taichi-integration"` | Task 0.1 carryover at commit `81b14758` |
| All 9 sims' Phase 1 RED evidence sha256s | (MPM landing § 6.2 baseline) | (unchanged; mass reverify ✓) | Convention A append-only protected |
| Workspace members | (13 entries; common-py absent) | (unchanged) | Stage 1 owns the addition |
| Taichi declaration | (`[taichi]` optional extra at common-py only) | (unchanged) | Stage 1 owns the promotion |
| Bit-identity replay invariant | `9399fc33…909f34` (16 invocations) | (unchanged; 17th invocation matched) | Convention A append-only protected |
| LFS-tracked captures | (sealed at respective per-sim landings) | (unchanged) | LFS pointer-vs-content posture per § B.6 |

## 11. Tag posture (Stage 0 step equivalent)

**No `-phase-N` tag** is proposed by this Stage 0. Spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries; next phase tag per spec is `v0.2.0-phase-2`.

**No `v0.1.10` non-phase point-release tag** at Stage 0 close — operator routing for any non-phase tag deferred to Stage 2 landing per charter § 11.4.

**Forbidden either way:** any tag carrying `-phase-N` (single or multi-segment). The agent does NOT push tags per conventions doc § D.2.

## 12. Stage 0 coherence note

The Taichi-integration Stage 0 exercises the three-stage cadence's pre-flight discipline at the **first spec-Phase-2 implementation-shape Stage 0 surface**. Stage 0 surface accomplishments:

- **D1 / D2 / D3 ratifications applied without re-litigation.** Task 0.3 PRE-ROUTED to option (a); probe-time workability verified.
- **17th invocation of bit-identity replay invariant** confirms spec-Phase-2 sub-phases inherit the same structural-correctness anchor as Phase 1 sub-phases.
- **Mass 9-sim RED reverify** establishes gate-13 precondition across all of Phase 1, NOT just the immediately-prior sub-phase — necessary because Stage 1's workspace registration shifts every testkit-consumer's resolution path.
- **SHIFTED N1 surfaced honestly** per Hard Rule 2: charter-prescribed Task 0.4 invocation hits the chicken-and-egg that Stage 1 fixes; alternative invocation establishes content baseline GREEN; both baselines committed to the audit chain.
- **Plan-drafting probe § 2.7's "infrastructure shipped not yet wired" finding** is validated empirically by Task 0.4 chicken-and-egg.
- **First `docs/_audits/phase-2/` Stage-0 audit body** — establishes the audit-dir convention for subsequent spec-Phase-2 sub-phases.

Stage 0 verdict: **CONFIRMED — Stage 1 dispatchable.** SHIFTED N1 surfaced for operator at closing summary; not a Stage 0 blocker because the surface IS Stage 1's deliverable.

This audit lands at HEAD `0eed3d72081d53749382ffc472564f00bde4c57c` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(taichi-integration-stage0-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED**.
