---
date: 2026-05-24T03-19-01Z
author: lattice-boltzmann-d3q19-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-d-stage-1a
subject: "Stage 1a (failing-tests RED-state anchor) CLOSE for the lattice-boltzmann-d3q19 -> Stack-D port (THIRD spec-Phase-2 cross-stack port). VERDICT CONFIRMED. NEW package skeleton packages/lattice-boltzmann-d3q19-stack-d/ (pyproject + README + lattice_boltzmann_d3q19_stack_d/__init__.py) + 9-file test surface per charter 4.2.1 (DUAL-ARM gate-4: test_d3q19_equilibrium_golden.py [gate-4a] + test_mms_convergence.py [gate-4b]; plus test_diagnostics, test_pbt_invariants, test_determinism, test_reference_sanity, test_cross_stack_equivalence [both Poiseuille+Couette descriptors]). Root pyproject.toml additively extended (workspace members 16 -> 17 at HEAD; matches probe estimate). uv sync --all-packages --all-extras clean (built+installed lattice-boltzmann-d3q19-stack-d==0.0.0; uv.lock +39). RED-state: pytest fails at collection with 7 clean ModuleNotFoundError on the Stage-1b targets lattice_boltzmann_d3q19_stack_d.{reference (3 tests), sim (3), invariants (1)}; zero skeleton/uv/parse errors (Hard Rule 2 satisfied). Failing-tests-evidence committed-blob sha256 df1f1c9a...992070 (commit-first-then-sha256; verified stable post-commit; load-bearing TDD anchor). Main commit 2fe22f1. 0 new SHIFTs (clean RED-anchor); 2 Convention #8 dispatch-vs-HEAD reconciliations recorded (cross_stack module-import RED over dispatch pytest.mark.skip; test_mms_convergence over dispatch test_mms_bgk_convergence) -- coordinator-side catches, not shifts. Cumulative 136."
verdict-state: CONFIRMED
head_sha: PENDING-STAGE1A-SHA-BACKFILL
head_sha_at_checkpoint: PENDING-STAGE1A-SHA-BACKFILL
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-checkpoint-2026-05-24T02-51-32Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1a-checkpoint-2026-05-24T00-06-11Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/plan-drafting-probe-2026-05-24T02-30-12Z.md
evidence_paths:
  - tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-2026-05-24T03-17-35Z.txt
  - packages/lattice-boltzmann-d3q19-stack-d/pyproject.toml
  - packages/lattice-boltzmann-d3q19-stack-d/tests/conftest.py
  - packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/__init__.py
evidence_hashes:
  tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-2026-05-24T03-17-35Z.txt: sha256:df1f1c9a68e8fc4929ab3384ca6a0ea4dddcbede441e279d7462d1d235992070
  packages/lattice-boltzmann-d3q19-stack-d/pyproject.toml: sha256:bff2bb037e13bb5f38b359476d896525e3b7607d63a78309343a5f7069b5050a
  packages/lattice-boltzmann-d3q19-stack-d/tests/conftest.py: sha256:d46690491261241675a43b2c7bab77e08f61e12879c3952ca1716da10a500e37
  packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/__init__.py: sha256:44176f584f28fe559c33a44caa5d11525302df15303d9aca8023cc6f73d17e76
---

# Stage 1a Checkpoint — Sub-Phase lattice-boltzmann-d3q19 → Stack-D

> IC-9 abbreviated structure. All anchors HEAD-verified (Convention M / #8); no
> value inherited from the dispatch without verification. FACT / INFERENCE /
> SHIFTED tagging throughout. D1-D9 operator-ratified; not re-litigated.

## § 1. Scope summary

Stage 1a is the **RED-state anchor** stage of the THIRD per-sim cross-stack port
under spec-Phase-2 (lattice-boltzmann-d3q19 → Stack-D Taichi D3Q19 BGK). It ships
ONLY the failing-tests surface + package skeleton + workspace registration; the
`reference` / `sim` / `invariants` modules are Stage 1b deliverables. Mirrors the
sph-water + RD-2D Stack-D Stage 1a 5-step sequence, with the **dual-arm gate-4
delta**: this is the first cross-stack port carrying BOTH a golden-table arm
(`test_d3q19_equilibrium_golden.py`, gate-4a) AND an MMS arm
(`test_mms_convergence.py`, gate-4b) — RD-2D had only MMS, sph-water had only
golden. The cross-stack test also carries TWO capture descriptors (Poiseuille +
Couette; D4).

## § 2. 5-step results

| Step | Artifact | sha256 (committed-blob) | Status |
|---|---|---|---|
| 1 | Package skeleton (`pyproject.toml`, `README.md`, `lattice_boltzmann_d3q19_stack_d/__init__.py`) + root-pyproject workspace edit + `uv sync` | pyproject `bff2bb03…`; `__init__.py` `44176f58…` | **PASS** — `uv sync --all-packages --all-extras` clean; member built + installed |
| 2 | 9-file test surface at `tests/` (charter § 4.2.1) | conftest `d4669049…` | **PASS** — 7 `test_*.py` + `conftest.py` + `__init__.py`; ruff `RUF`/`I` + format clean |
| 3 | `pytest tests/ -v` | — | **PASS (RED as designed)** — 7 collection errors, all clean `ModuleNotFoundError` on the 3 Stage-1b targets; zero skeleton/uv/parse errors (Hard Rule 2 satisfied) |
| 4 | `failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-2026-05-24T03-17-35Z.txt` | **`df1f1c9a68e8fc4929ab3384ca6a0ea4dddcbede441e279d7462d1d235992070`** | **PASS** — committed-blob sha256 (commit-first-then-sha256; verified stable post-commit == footer value; THE load-bearing TDD anchor) |
| 5 | Commit `test(lattice-boltzmann-d3q19-stack-d-stage1a): failing tests for Stack-D port` | commit `2fe22f1f9345ca5975edcd3ecec87260a8d999ce` | **PASS** — footer cites evidence sha + Stage-0 head_sha `ec438fd` + `Implements-failing-tests-target` + member-count delta |

## § 3. RED-state validation (for gate-13 / Stage-2 worktree replay)

(FACT — `failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-2026-05-24T03-17-35Z.txt`.)

7 test files fail at **collection** with `ModuleNotFoundError`, mapped to the
three Stage-1b target submodules:

| Missing submodule | Count | Tests |
|---|---|---|
| `lattice_boltzmann_d3q19_stack_d.reference` | 3 | `test_d3q19_equilibrium_golden`, `test_mms_convergence`, `test_reference_sanity` |
| `lattice_boltzmann_d3q19_stack_d.sim` | 3 | `test_diagnostics`, `test_determinism`, `test_cross_stack_equivalence` |
| `lattice_boltzmann_d3q19_stack_d.invariants` | 1 | `test_pbt_invariants` |

`pytest` exit code 2 (collection errors). Parent package
`lattice_boltzmann_d3q19_stack_d` imports cleanly; `code_verification` /
`determinism` / `equivalence` / `capture` / `h5py` / `hypothesis` all resolve via
the workspace editable install. The RED points **exactly** at the three Stage-1b
targets — structurally correct.

Per RD-2D / sph-water Stack-D Stage 1b N1: Stage-2 gate-13 replay verifies
**structural reproduction** (7 `ModuleNotFoundError` on the same 3 submodules),
NOT byte-identical sha256 (absolute-path embedding in pytest output makes
byte-identity impossible across worktrees); the footer + this checkpoint cite the
committed-state sha256.

## § 4. Workspace registration outcome

(FACT — `uv sync` output; root `pyproject.toml` at HEAD.)

`uv sync --all-packages --all-extras` resolved 72 packages; built + installed
`lattice-boltzmann-d3q19-stack-d==0.0.0` as a new workspace member; `uv.lock`
auto-updated (+39 lines, committed). Root `[tool.uv.workspace].members` extended
additively (Convention A). **HEAD-verified member count: 16 → 17 total** (13
`packages/` + `tools/{testkit,integrity,diagnostics}` + `common/common-py` + this)
— **matches the probe estimate 16 → 17** (no dispatch discrepancy this stage,
unlike the sph-water Stage-1a member-count carryover error).

## § 5. New SHIFTs surfaced at Stage 1a

**0 new shifts.** Stage 1a was clean RED-anchor work (the dispatch predicted
"likely 0"). Cumulative shift count holds at **136**.

Two **Convention #8 dispatch-vs-HEAD reconciliations** were surfaced — coordinator-
side verification catches (analogous to the Stage-0 drift items + plan-drafting
F1/F2/F3; NOT counted as shifts, NOT plan deviations):

1. **`test_cross_stack_equivalence.py` mechanism: module-import RED over dispatch's
   `pytest.mark.skip`.** The dispatch STEP 2 + charter § 4.2.1 describe the gate-14
   file as "SKIP until 1c". The HEAD precedent (rd-2d + sph-water
   `test_cross_stack_equivalence.py` at HEAD) uses a **module-level import** from
   `<pkg>.sim` that fails with `ModuleNotFoundError` at Stage 1a — NOT a
   `pytest.mark.skip` (a skip-marked test would collect cleanly and report SKIPPED,
   contradicting the dispatch's own "ALL test failures are clean
   ModuleNotFoundError" RED criterion). Followed HEAD: the SKIP is added at Stage 1b
   (charter § 4.2.2 step 7), and Stage 1c activates the file. Both Poiseuille +
   Couette descriptors carried (D4).
2. **Test name `test_mms_convergence.py` (charter) over `test_mms_bgk_convergence`
   (dispatch "OR similar").** Charter § 4.2.1 (source of truth) + the Phase-1 LBM
   surface name the gate-4b file `test_mms_convergence.py`. Followed charter.

Surfacing these IS the mandated Convention #8 discipline; the dispatch's
capture-path / tag-SHA / task-numbering drift was already reconciled at Stage 0.

## § 6. Stage 1b dispatch readiness

Stage 1b is dispatchable. Inherited Stage-0 banked observations:

1. **f64 accumulator-seed requirement (LOAD-BEARING):** the Taichi kernel module
   MUST seed every in-kernel reduction accumulator as `ti.f64(0.0)` (or pin
   `ti.init(default_fp=ti.f64)`) — `set_taichi_deterministic` does NOT set
   `default_fp`, and bare-literal f32 locals leaked ~3.4e-6 in the per-cell 19-term
   moment reduction at Stage 0 (vs 7e-15 with f64 seeds). LBM is the first sim with
   genuine in-kernel f64 reductions. Port-local config; NOT an IC-11 edit.
2. **R-L4 wall-clock TRIVIAL:** Phase-1 baselines poiseuille 3.784 s + couette
   0.604 s (RD-2D-scale); no escape-hatch pre-routing. Full canonical horizons for
   BOTH captures (D4).
3. **Public-API contract pinned by this RED surface** — Stage 1b must satisfy the
   imports this test surface targets:
   - `lattice_boltzmann_d3q19_stack_d.reference.{feq(rho,u)->list[float],
     density_moment(f)->float, momentum_moment(f)->list[float], feq_field(rho,u),
     bgk_step(f, tau, force_lattice=None), macroscopic_velocity(f,
     force_lattice=None), CS2, VELOCITIES, WEIGHTS, CANONICAL_DESCRIPTOR_POISEUILLE,
     CANONICAL_DESCRIPTOR_COUETTE, CANONICAL_NZ, CANONICAL_SEED}` (+ the
     `density_field` / `momentum_field` / `stream` / `apply_bounce_back_y_walls` /
     `C` / `W` re-exports per the Phase-1 reference surface).
   - `lattice_boltzmann_d3q19_stack_d.sim.{sim_runner_seeded(seed,out_dir)->Path,
     sim_runner_seeded_couette(seed,out_dir)->Path,
     sim_runner_diagnostic(seed,out_dir)->Path}`.
   - `lattice_boltzmann_d3q19_stack_d.invariants.{equilibrium_density_moment(),
     equilibrium_momentum_moment()}` (Hypothesis-decorated, no-arg callables).
4. **`test_reference_sanity` pins** `CANONICAL_DESCRIPTOR_POISEUILLE=
   "poiseuille-64x32-seed42-step1000"`, `CANONICAL_DESCRIPTOR_COUETTE=
   "couette-32x16-seed42-step500"`, `CANONICAL_NZ=3`, `CANONICAL_SEED=42`,
   `len(VELOCITIES)==19`, `sum(WEIGHTS)==1.0`, `CS2==1/3`, `feq(1,(0,0,0))==WEIGHTS`.
5. **Dual-arm gate-4 + D9:** gate-4a golden reproduced bit-identically at Stage 0
   (Taichi feq); gate-4b MMS exercises BGK + Guo forcing (the cross-stack-non-trivial
   collision-step FP-accumulation surface). Gate-14 (Stage 1c) budget is `1e-5`
   (10x tighter than prior pairs) with TWO independent capture verdicts.

## § 7. Cumulative shifts

Entering: **136** (FACT — Stage-0 checkpoint § 8). Stage 1a added **0**.
**Cumulative at Stage-1a close: 136.**
