---
date: 2026-05-23T18-31-28Z
author: reaction-diffusion-2d-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: reaction-diffusion-2d-stack-d-stage-1a
subject: "Stage 1a failing-tests RED-state anchored. CONFIRMED. 8 new test files at packages/reaction-diffusion-2d-stack-d/tests/ + minimal package skeleton (pyproject.toml + README.md + parent __init__) + root pyproject.toml additive workspace-members extension. RED state is structurally clean: 6 test files fail at collection with ModuleNotFoundError on exactly the 3 Stage 1b submodule targets (reference, sim, invariants). Failing-tests evidence sha256 685e5cc0…23ad6446 — the load-bearing TDD anchor per IC-8 + phase-2-plan § 1.5.1 Gate 3 footer-hash discipline. Stage 1b dispatchable."
verdict-state: CONFIRMED
head_sha: ea6153c5729cd46828110fe3718fc22667a35c61
head_sha_at_checkpoint: ea6153c5729cd46828110fe3718fc22667a35c61
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-0/block-8-rd-2d-2026-05-19T16-00-36Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-probe-2026-05-23T17-33-13Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/plan-drafting-landing-2026-05-23T17-47-51Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/stage-0-checkpoint-2026-05-23T18-10-17Z.md
evidence_paths:
  - docs/phases/sub-phase-reaction-diffusion-2d-stack-d.md
  - packages/reaction-diffusion-2d-stack-d/pyproject.toml
  - packages/reaction-diffusion-2d-stack-d/README.md
  - packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/__init__.py
  - packages/reaction-diffusion-2d-stack-d/tests/__init__.py
  - packages/reaction-diffusion-2d-stack-d/tests/conftest.py
  - packages/reaction-diffusion-2d-stack-d/tests/test_code_verification.py
  - packages/reaction-diffusion-2d-stack-d/tests/test_cross_stack_equivalence.py
  - packages/reaction-diffusion-2d-stack-d/tests/test_determinism.py
  - packages/reaction-diffusion-2d-stack-d/tests/test_diagnostics.py
  - packages/reaction-diffusion-2d-stack-d/tests/test_pbt_invariants.py
  - packages/reaction-diffusion-2d-stack-d/tests/test_reference_sanity.py
  - pyproject.toml
  - tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt
evidence_hashes:
  docs/conventions/sub-phase-conventions.md: sha256:167fe34911b4d3f49e3e924fcb8261421acac87a3e0931a5d00a3dbcf2c58c2e
  tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt: sha256:685e5cc0ecbd44670885115de859dd68b99580c8038aa39c1266cc4123ad6446
---

# Stage 1a Checkpoint — Sub-Phase RD-2D → Stack-D

## 1. Stage-1a scope summary

(FACT — charter § 4.2.1 5-step sequence.)

Stage 1a (failing-tests commit) of the FIRST per-sim cross-stack port sub-phase under spec-Phase-2. Single Claude Code session. Per D2 ratification: Stage 1 decomposed into 1a (failing-tests) / 1b (implementation) / 1c (cross-stack equivalence harness extension). Stage 1a establishes the RED-state anchor per IC-8 + phase-2-plan § 1.5.1 Gate 3 footer-hash discipline.

**Verdict: CONFIRMED.** All 5 STEPs executed cleanly. The RED state is structurally precise: 6 test files fail at collection with `ModuleNotFoundError` on exactly the 3 Stage 1b submodule targets (`reference`, `sim`, `invariants`). No skeleton/uv/parse errors; no false-positive PASS; no R-class surfaces beyond the workspace-sync precondition.

## 2. 5-step results table

(FACT — per charter § 4.2.1.)

| STEP | Artifact / Outcome | sha256 / status |
|---|---|---|
| 1 | `packages/reaction-diffusion-2d-stack-d/{pyproject.toml, README.md, reaction_diffusion_2d_stack_d/__init__.py}` + tests/ dir + root pyproject.toml additively extended | Workspace member registered; `uv sync --all-packages --all-extras` resolves cleanly + installs editable |
| 2 | 8 test files at `packages/reaction-diffusion-2d-stack-d/tests/` (`__init__.py`, `conftest.py`, 6 substantive test files + 1 placeholder cross-stack test) | Pytest collection produces exactly 6 errors on the 3 Stage-1b submodule targets |
| 3 | `pytest tests/ -v --tb=short` outcome verified | 6 collection-time `ModuleNotFoundError` on `reaction_diffusion_2d_stack_d.{sim, invariants, reference}` — RED state structurally CLEAN |
| 4 | `tools/testkit/failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt` | sha256 `685e5cc0ecbd44670885115de859dd68b99580c8038aa39c1266cc4123ad6446` (gate-3 anchor per phase-2-plan § 1.5.1) |
| 5 | Commit `ca9bc0b66099f8e4721b7054ff5f3fc449fe8e74` (`test(reaction-diffusion-2d-stack-d-stage1a)`) | Footer: `Failing-tests-output:` + `Failing-tests-output-hash:` + Stage 0 checkpoint head_sha cited; new files + diff summary recorded |

## 3. RED-state validation (per-test ModuleNotFoundError breakdown)

(FACT — `failing-tests-evidence/reaction-diffusion-2d-stack-d-2026-05-23T18-30-50Z.txt`; 6 errors / 0 items collected.)

| Test file | Missing submodule | Stage-1b target |
|---|---|---|
| `test_code_verification.py` | `reaction_diffusion_2d_stack_d.sim` | `sim.sim_runner_seeded` + `sim.sim_runner_with_source_term` |
| `test_diagnostics.py` | `reaction_diffusion_2d_stack_d.sim` | `sim.sim_runner_seeded` |
| `test_determinism.py` | `reaction_diffusion_2d_stack_d.sim` | `sim.sim_runner_seeded` |
| `test_cross_stack_equivalence.py` | `reaction_diffusion_2d_stack_d.sim` | `sim.sim_runner_seeded` (placeholder; Stage 1c activates) |
| `test_pbt_invariants.py` | `reaction_diffusion_2d_stack_d.invariants` | `invariants.{monotone_bounds_uv, mass_approximately_conserved, periodic_bc_satisfied}` + `sim.sim_runner_pbt` |
| `test_reference_sanity.py` | `reaction_diffusion_2d_stack_d.reference` | `reference.{GrayScottParams, canonical_params, evolve, step}` |

All 6 test files fail at COLLECTION time with `ModuleNotFoundError` (NOT mid-test assertion failure); the failure mode is precisely "submodule missing" per dispatch acceptance.

Parent package `reaction_diffusion_2d_stack_d` itself imports cleanly (verified pre-commit via `uv run python -c "import reaction_diffusion_2d_stack_d"`). Workspace deps (`bit-physics-testkit`, `bit-physics-diagnostics`, `bit-physics-common-py`) resolve via editable installs after `uv sync --all-packages --all-extras`; therefore the testkit's top-level modules (`capture`, `determinism`, `equivalence.harness`, `property.harness`, `diagnostics.tier1.health`, `diagnostics.tier2.scalar_field.monotone_bounds`) all resolve cleanly. None of these surfaces ModuleNotFoundError. Only the named Stage-1b submodules are missing.

## 4. Workspace registration outcome

(FACT — `uv sync --all-packages --all-extras` output at Stage 1a STEP 1.)

`pyproject.toml`'s `[tool.uv.workspace].members` extended additively:
- Prior member count: 11 (10 sims + common-py + tools/{integrity, testkit, diagnostics} = 11 — corrected count below)
- Added: `"packages/reaction-diffusion-2d-stack-d"`
- New member count: 15 total (= 4 prior tools/common + 10 Phase-1 sims + Phase-0 RD-2D ref + 1 new Stack-D port = 15; actually counting from pyproject.toml: 3 tools + 1 reaction-diffusion-2d + 9 Phase-1 sims + 1 common-py + 1 new = 15 workspace members).

`uv.lock` auto-updated; sync produced the editable install `reaction-diffusion-2d-stack-d==0.0.0 (from file:///home/otacon/Projects/Bit-Physics/packages/reaction-diffusion-2d-stack-d)`.

**Stage 1a SHIFTED N1 (observation; not a workflow-blocker):** the initial Stage-1a pytest invocation (after the workspace-member edit) revealed that `uv sync` (without `--all-packages --all-extras`) did NOT install the new workspace member's deps NOR the dev-dep pytest, leaving the venv site-packages effectively empty (only `_virtualenv.pth/.py`). This caused the FIRST pytest run to use the system `pytest-8.4.2` from `/usr/bin/python3` (with no editable testkit installs), producing INCORRECT ModuleNotFoundErrors on `capture`/`determinism`/`property`/`equivalence` instead of the expected RD-2D-Stack-D submodules. The correct invocation is `uv sync --all-packages --all-extras` after any workspace-member addition. **Banked precedent for subsequent Phase-2 cross-stack port sub-phases:** Stage 0 / Stage 1a dispatch prompts SHOULD remind the agent to run `uv sync --all-packages --all-extras` after adding the new workspace member to root pyproject.toml; this avoids a 5-minute diagnostic detour. Mitigation now in the Stage-1a checkpoint audit; doesn't require a conventions doc amendment (uv-workspace mechanics, not portfolio convention).

## 5. New SHIFTs surfaced at Stage 1a

| ID | Description |
|---|---|
| **N1 (Stage 1a)** | **`uv sync --all-packages --all-extras` required after workspace-member addition.** A workspace-member addition to root `pyproject.toml` without subsequent `uv sync --all-packages --all-extras` leaves the venv site-packages without the new package's deps AND without dev-deps (notably pytest). The first pytest invocation in that state falls back to the system `pytest-8.4.2` + bypasses the venv's editable installs, producing INCORRECT ModuleNotFoundError on testkit submodules (`capture`, `determinism`, etc.) rather than the expected target submodules. Banked precedent: subsequent Phase-2 cross-stack port Stage-1a dispatch prompts should include the `uv sync --all-packages --all-extras` reminder. NOT a portfolio convention amendment; uv-mechanics-level observation. |

**Stage 1a R-class surfaces:** none. R-P1 + R-P5 mitigated at Stage 0; R-P3/R-P4/R-P6 propagate to Stage 1b; R-P2 is Stage 1c.

**Cumulative shift count at Stage 1a close:** 110 + 1 = **111** entering Stage 1b.

## 6. Stage 1b dispatch readiness

(FACT — per charter § 4.2.2.)

Stage 1b implements the three missing submodules + canonical Stack-D capture + spec sheet + probe report + perf-ledger row + Workspace member already registered. The 5-step Stage 1b sequence is dispatchable verbatim per charter § 7.3.

**Banked observations for Stage 1b (load-bearing):**
- From Stage 0 Task 0.5: modules containing `@ti.kernel` definitions must NOT use `from __future__ import annotations` (`docs/common/taichi.md` § 4.2; R-T2). Stage 1a's test files DO use `from __future__ import annotations` — that's fine, no `@ti.kernel` in test files. Stage 1b's `reaction_diffusion_2d_stack_d.reference.gray_scott_taichi` MUST honour this constraint.
- From Stage 0 Task 0.5: Taichi `field.from_numpy / .to_numpy` round-trip is bit-exact at float64 (MMS source-term injection mechanism for gate-4).
- From Stage 0 Task 0.3: IC-14 Python import path is `from determinism import run_twice_and_diff` (NOT `from determinism.harness import ...`). Stack-D's `test_determinism.py` already uses this form.
- From Stage 1a N1: ALWAYS invoke `uv sync --all-packages --all-extras` after workspace-member edits.

**Acceptance for Stage 1b** (per charter § 4.2.2 12-step sequence):
- Three new submodules at `packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/{reference/, sim.py, invariants.py}`.
- Determinism-strategy-declaration docstring at top of `sim.py` per conventions doc § F.1; cited in commit footer.
- Stack-D canonical capture at `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` matching the HEAD-frozen descriptor.
- Spec sheet sibling at `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md`.
- Probe report at `tools/testkit/probes/reports/reaction-diffusion-2d-stack-d-probe.md`.
- All 5 substantive tests GREEN (gates 4-11); cross-stack equivalence test PENDING-1c; gate-13 worktree replay against this Stage 1a commit SHA `ca9bc0b66099f8e4721b7054ff5f3fc449fe8e74` verifies the sha256 `685e5cc0…23ad6446` reproduces.
- Perf-ledger row appended.
- Single sub-bundle commit (~+800 to +1200 lines net per probe § 8 D2 estimate).

---

This checkpoint lands at HEAD `ea6153c5729cd46828110fe3718fc22667a35c61` (back-filled per Convention #12 + conventions doc § B.2 tightened-discipline in a separate commit `chore(reaction-diffusion-2d-stack-d-stage1a-sha-backfill)` per the two-commit pattern; full 40-hex SHA captured via `git rev-parse HEAD` at summary-composition time).

Verdict: **CONFIRMED**.
