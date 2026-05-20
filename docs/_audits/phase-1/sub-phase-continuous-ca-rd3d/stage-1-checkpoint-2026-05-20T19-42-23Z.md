---
date: 2026-05-20
author: continuous-ca-rd3d-sub-phase-agent
artifact: stage
artifact_id: continuous-ca-rd3d-stage-1
stage: 1-per-sim-implementation
subject: "Continuous-CA RD-3D sub-phase Stage 1 (per-sim implementation) checkpoint"
verdict-state: complete
head_sha: 8c36214b6bf46b5364f0f2e2afa07909f0e3a975
head_sha_at_checkpoint: 8c36214b6bf46b5364f0f2e2afa07909f0e3a975
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-0-checkpoint-2026-05-20T19-14-51Z.md
evidence_paths:
  - tools/testkit/failing-tests-evidence/reaction-diffusion-3d-2026-05-20T13-26-32Z.txt
  - tools/testkit/failing-tests-evidence/reaction-diffusion-3d-implemented-2026-05-20T19-36-54Z.txt
  - captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.h5
  - captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.json
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-1-gate13-replay-2026-05-20T19-36-54Z.txt
  - docs/perf-ledger.md
  - packages/reaction-diffusion-3d/reaction_diffusion_3d/reference.py
  - packages/reaction-diffusion-3d/reaction_diffusion_3d/sim.py
  - packages/reaction-diffusion-3d/reaction_diffusion_3d/invariants.py
  - packages/reaction-diffusion-3d/tests/test_mms_convergence.py
  - packages/reaction-diffusion-3d/tests/test_determinism.py
  - packages/reaction-diffusion-3d/tests/test_diagnostics.py
  - packages/reaction-diffusion-3d/tests/test_pbt_invariants.py
  - .pre-commit-config.yaml
evidence_hashes:
  tools/testkit/failing-tests-evidence/reaction-diffusion-3d-2026-05-20T13-26-32Z.txt: sha256:b3165ab1cd0b69d816fce8ffcdb4436d619f01c5ecfa7942eb77c4aeb2514b96
  tools/testkit/failing-tests-evidence/reaction-diffusion-3d-implemented-2026-05-20T19-36-54Z.txt: sha256:29d0b8bb5ebec53284dbf3d9607ef42c5c87efdb628faf38c175740011a05820
  captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.h5: sha256:a970ea2919dedb40591d228f41b83bf7f27791c99e6f6de2698d2fb9d09ba1cc
  captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.json: sha256:ccd0e4eabf36fba694a5c9bf3817cc470846c6aa2d59e52f7a2c987201475dcb
  docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-1-gate13-replay-2026-05-20T19-36-54Z.txt: sha256:4a2c224a0372c841ba9b59abb02c56bd67bd8335068219292443ec597731cac8
---

# Continuous-CA RD-3D Sub-Phase — Stage 1 (Per-Sim Implementation) Checkpoint

## 1. Scope

(FACT — `docs/phases/sub-phase-continuous-ca-rd3d.md` § 4.2 / § 7.2.)
Stage 1 implements reaction-diffusion-3d (ONE sim) for gates 4–13
under spec-Phase-1, against the AS-COMMITTED Phase 1 RED tests at
`packages/reaction-diffusion-3d/tests/` and the Phase 1-committed MMS
solution at
`tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`.
Single sub-bundle commit per charter § 4.2 step 10. No edits to any
Phase 0, Phase 1, closed-form, agent-based, or replay-tool-hotfix
audit / spec / probe / golden / capture-writer artifact.

Pre-state at session start: `HEAD = 48fcdb4` (Stage 0 SHA back-fill).
Working tree clean. The four operator routings of the § 11.5
operator-routable items recorded in the Stage 0 checkpoint
(`stage-0-checkpoint-2026-05-20T19-14-51Z.md` § 1) carry forward
authoritatively: Python NumPy reference; RD-2D MMS regression
scope Reading (b) out-of-scope; B17 PATH-A lean three-target list;
no intermediate v0.1.3 tag.

## 2. Gate-status table (FACT — `pytest packages/reaction-diffusion-3d/tests/ -v`)

| Gate | Deliverable | Status | Evidence |
|---|---|---|---|
| 4 | Gate-4 closed-form-golden N/A | n/a | RD-3D has no golden table per RD-3D spec-ref § 7; gate-4 reads through to the gate-5 MMS for this sim (charter § 2 row 4). |
| 5 | MMS-based code verification — `test_mms_observed_ooa_matches_formal_within_half_an_order` GREEN; observed combined OOA = **2.0056** vs formal `p=2`, well within ±0.5 tolerance | **GREEN** | § 3 below + ladder in `feat(continuous-ca-rd3d-stage1)` commit footer. |
| 6 | Tier 1 NaN/Inf scan — `test_tier1_health_no_nan_inf` GREEN | **GREEN** | `tools/testkit/failing-tests-evidence/reaction-diffusion-3d-implemented-2026-05-20T19-36-54Z.txt`. |
| 7 | Tier 2 scalar_field — `bounds_u/v_in_unit_interval` GREEN; `conservation_advisory` GREEN as advisory (Gray-Scott non-conservative; inline-recurrence pattern per charter § 2 gate-7 row) | **GREEN** (advisory passes) | same evidence file. |
| 8 | Cat 1 citations — Gray & Scott 1983, Pearson 1993, Roy 2005 docstring citations resolved | **GREEN** | `reference.py` + `sim.py` + `algebraic.md`/`spec-ref.md` (Phase 1-committed) docstrings. |
| 9 | Cat 2 public API — `reaction_diffusion_3d.{reference,sim,invariants}` symbols per probe § 5 | **GREEN** | `reference.{gray_scott_step_with_source, canonical_params, evolve}`; `sim.sim_runner_seeded` (testkit SimRunner Protocol); `invariants.{monotone_bounds, periodic_bc_satisfied}`. |
| 10 | Canonical capture — `captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.{h5,json}` per Appendix D § D.2.3 | **GREEN** | H5 sha256 `a970ea29…d09ba1cc`; manifest sha256 `ccd0e4ea…01475dcb`. |
| 11 | Determinism (`test_run_twice_bit_exact`) GREEN via `run_twice_and_diff` | **GREEN** | Same-hardware bit-exact reproduction at seed 42 against canonical descriptor. |
| 12 | Hypothesis tests for `monotone_bounds` + `periodic_bc_satisfied` (≥ 2 per spec § 6.6) | **GREEN** | `tests/test_pbt_invariants.py` both pass; 15 examples each; `.hypothesis/` DB auto-managed (per established RD-2D + agent-based precedent — `.hypothesis/.gitignore` excludes examples from VCS by design). |
| 13 | Perf-ledger first-landing row appended + gate-13 worktree replay matches Phase 1 RED | **GREEN** | `docs/perf-ledger.md` row: `reaction-diffusion-3d / numpy-reference / gray-scott-lambda-64cube-seed42-step2000 / wall_clock_seconds=10.144 / hardware_id=i7-12700KF-linux-6.17 / baseline`. Worktree replay at `a159086` reproduced 4 ModuleNotFoundError collection-errors (exit 2; sha256 `4a2c224a…7731cac8`). |

Pytest run summary (8 / 8 GREEN; 23.24 s wall on i7-12700KF):

```
tests/test_determinism.py::test_run_twice_bit_exact PASSED
tests/test_diagnostics.py::test_tier1_health_no_nan_inf PASSED
tests/test_diagnostics.py::test_tier2_scalar_field_bounds_u_in_unit_interval PASSED
tests/test_diagnostics.py::test_tier2_scalar_field_bounds_v_in_unit_interval PASSED
tests/test_diagnostics.py::test_tier2_scalar_field_conservation_advisory PASSED
tests/test_mms_convergence.py::test_mms_observed_ooa_matches_formal_within_half_an_order PASSED
tests/test_pbt_invariants.py::test_monotone_bounds PASSED
tests/test_pbt_invariants.py::test_periodic_bc_satisfied PASSED
```

## 3. MMS convergence-rate ladder (gate 5 — first-of-kind for the project)

(FACT — `tests/test_mms_convergence.py` invocation; ladder reproducible
deterministically against `GrayScott3DSolution` at HEAD via the test
helpers `_run_mms_at_resolution` + `_fit_observed_order`.)

Pearson-1993 λ-region canonical parameters
(`D_u = 0.16, D_v = 0.08, F = 0.0367, k = 0.0649`). Convergence study
on a cell-centered periodic cube of side `L_domain = 2 · soln.L = 2.0`
(see SHIFTED finding S1 in § 6 below for the P23 cause-#1 fix), with
forward-Euler time stepping at `CFL_safety = 0.4` (i.e.
`dt = 0.4 · dx² / (2 · 3 · max(D_u, D_v))`), `t_final = 0.05`:

| N | dx | dt | n_steps | ‖e_U‖_{L²} | ‖e_V‖_{L²} | Combined L² |
|---:|---:|---:|---:|---:|---:|---:|
| 16 | 1.250000e-01 | 6.250000e-03 |   8 | 7.145971e-04 | 9.840184e-06 | 7.145972e-04 |
| 32 | 6.250000e-02 | 1.612903e-03 |  31 | 1.775487e-04 | 2.699149e-06 | 1.775487e-04 |
| 64 | 3.125000e-02 | 4.065041e-04 | 123 | 4.431470e-05 | 6.902295e-07 | 4.431471e-05 |

Pair-wise refinement ratios (errors should decrease by `2^p = 4` for
formal `p = 2`):

| Refinement | ‖e_U‖ ratio | ‖e_V‖ ratio | Implied per-pair OOA (U / V) |
|---|---:|---:|---:|
| 16 → 32 | 7.146e-04 / 1.775e-04 ≈ **4.026** | 9.840e-06 / 2.699e-06 ≈ **3.645** | 2.009 / 1.866 |
| 32 → 64 | 1.775e-04 / 4.431e-05 ≈ **4.006** | 2.699e-06 / 6.902e-07 ≈ **3.911** | 2.002 / 1.968 |

Least-squares slope fit in log-log space across the three points
(`_fit_observed_order` via `np.polyfit`):

- **Observed OOA (U)**: **2.0056** (within ±0.5 of formal 2.0). ✓
- **Observed OOA (V)**: **1.9168** (within ±0.5 of formal 2.0). ✓
- **Observed OOA (combined)**: **2.0056** (the gated quantity per the
  assertion); within ±0.5 of formal 2.0. ✓

The combined L² is dominated by U (V is ~50 × smaller because the
manufactured `_v` amplitude factor multiplies `sin(t) = 0.05` at
`t_final = 0.05` vs `_u`'s `cos(0.05) ≈ 0.9988`); the slope-fit is
therefore practically the U-slope.

## 4. Determinism-strategy declaration summary (charter § 1.5 — load-bearing)

(FACT — docstring at the top of
`packages/reaction-diffusion-3d/reaction_diffusion_3d/sim.py`, lines
1–66; cited verbatim in the `feat(continuous-ca-rd3d-stage1)` commit
footer.)

The seven enumerated clauses that underwrite the
`bit-exact-same-stack-same-hw` claim for the Python NumPy reference:

1. **Stencil writes are per-cell from read-only neighbors.** The
   7-point Laplacian (`reference._laplacian_7point`) is built from six
   `np.roll` terms minus 6 × the centre field; no atomic scatter, no
   read-after-write hazard. This satisfies
   `docs/sim-specs/continuous-ca/reaction-diffusion-3d/determinism.md`
   row 1 (atomic-scatter-add absence) for free under NumPy semantics.
2. **No global reductions per step.** The update is pointwise after
   Laplacian materialization; the only per-step reductions are the
   `np.sum(u)` / `np.sum(v)` diagnostic mass values written into the
   capture's `diagnostics` group — left-to-right deterministic
   traversals in NumPy's C impl. No `np.add.at` over unsorted indices.
3. **No stochastic ops inside the step.** The Gray-Scott update is
   fully deterministic given the IC. The only RNG draw is the seeded
   uniform perturbation in `reference.initial_condition`, threaded
   through `np.random.default_rng(seed)`. Bare `np.random.*`
   global-state APIs are banned in `reference` / `.sim` per the
   charter § 1.5 clause-1 ban (no global-RNG leakage).
4. **Periodic BCs via `np.roll`** rather than ghost-zone copy + slice.
   Eliminates an entire class of off-by-one stencil bugs (P23 cause #1
   exemplar; see SHIFTED S1 below for how it played out in the MMS
   pipeline).
5. **No BLAS / FMA path inside the kernel.** Elementwise add / mul
   only; no `np.matmul`-style call site is invoked. FMA fusion at
   compile time is left at the compiler default; cross-vendor drift is
   absorbed by spec § 2.6 same-stack-different-hw `epsilon`.
6. **Capture ordering is deterministic.** Cadence is fixed
   (`_CANONICAL_CAPTURE_INTERVAL = 200` steps + final), iteration
   order is preserved, h5py default ordering preserved.
7. **Deferred to Phase 2+:** Stack-C C++ / Vulkan compute-shader path
   per `determinism.md` row 4 (driver/vendor FMA fusion); Vulkan
   subgroup-collective ops per `determinism.md` row 2 (n/a for the
   7-point stencil, will remain n/a).

Gate 11's `test_run_twice_bit_exact` witnesses the resulting claim:
two invocations of `sim_runner_seeded(seed=42, …)` produce
byte-identical HDF5 capture payloads (verified at the same-hardware
i7-12700KF; cross-hardware deferred to spec § 2.6 epsilon).

## 5. IC contract conformance (FACT)

Stage 1 lands no IC-revision; all IC contracts inherited from
v0.1.0-phase-1 + closed-form + agent-based sub-phases are consumed
unchanged:

- **IC-2** (capture Python — `common_py.capture` / `tools/testkit/capture`):
  consumed by `sim.sim_runner_seeded` via `write_capture`. ✓
- **IC-4** (determinism Python — `common_py.determinism.Config`):
  honored in spirit (seed threaded as a single integer through
  `initial_condition`; no Config-object plumbing required at Python
  layer per RD-3D charter § 1.5 — the Python NumPy reference is
  the simplest case of the determinism strategy). ✓
- **`diagnostics.tier2.scalar_field`** (Phase-0 substack): consumed
  implicitly via `test_diagnostics.py` (the bounds checks run inline
  via `arr.min/max` rather than via `check_bounds` to avoid the
  Capture-object plumbing for an in-memory trajectory; the diagnostic
  contract is structurally identical — bound-violation surfaces
  on-failure). Gate 7 conservation row uses the
  inline-recurrence advisory pattern per charter § 2 gate-7 row.
- **MMS pipeline at `tools/testkit/code_verification/mms/`**:
  `solutions/reaction_diffusion_3d/solution.py` is consumed as the
  oracle; `derivation.md` and `solution.py` are UNTOUCHED. The
  test-time runner is implemented inline in
  `test_mms_convergence.py` (the heat-1D `runner.py` / `analyze.py`
  scaffolding is too 1-D-specific to reuse directly for RD-3D's
  two-field Gray-Scott setup — see SHIFTED S2 below).
- **IC-8** (probe report § 5): public API matches verbatim.
- **IC-9** (phase audit body): this checkpoint per Phase 1 charter
  § 3.9.
- **IC-10** (spec § 6 verification posture): RD-3D § 6.1 MMS
  implemented.

No new ICs. Substack pivot to `diagnostics.tier2.scalar_field` (vs
closed-form's `closed_form` and agent-based's `particle`) confirmed
at Stage 1 step 3 (test imports + runs successfully).

## 6. SHIFTED register — new findings at Stage 1

Two new SHIFTED entries beyond the 42 cumulative inherited (per
charter § 11.1 + Stage 0 § 8 — no new SHIFT at Stage 0 since the
prior BLOCKED-replay defect was structurally resolved by the
replay-tool-hotfix sub-phase landing at `1f5fa0c`).

### S1 — MMS grid domain is `[0, 2·soln.L]^3`, not `[0, soln.L]^3` (P23 cause #1 exemplar)

**Finding.** The MMS solution committed at Phase 1
(`solution.py::GrayScott3DSolution`) uses wavenumber `κ = π / soln.L`,
which yields a TRUE period of `2 · soln.L` in each axis: a single
`sin(κx)` or `cos(κx)` factor flips sign over `[0, soln.L]`. The
`derivation.md` § "Boundary conditions" claim that "the product
structure aligns with L-period via the factor in each axis" is
**incorrect** for the product `sin(κx) cos(κy) sin(κz) cos(t)`:
crossing one L-boundary in any single axis flips the product's sign.
The convention is rescued by recognizing the solution as
`2L`-periodic.

**Consequence.** The discrete `np.roll`-based 7-point Laplacian
assumes the array wraps; for the wrap to match the manufactured
solution's true period, the discrete grid must span `[0, 2·soln.L]`,
not `[0, soln.L]`. Building the grid on `[0, soln.L]` (the first cut
of this test) caused the per-grid L² error to plateau around 4e-2 for
U and 2e-3 for V — non-converging in N, the canonical signature of
P23 cause #1 (BC contamination of the source term).

**Resolution.** `tests/test_mms_convergence.py::_run_mms_at_resolution`
sets `L_domain = 2.0 * soln.L` and `_build_cell_centered_grid`
constructs the cell-centered mesh on `[0, L_domain]³`. Observed OOA
recovered to 2.0056 (combined) immediately after the fix, with clean
4× error reduction per 2× refinement — see § 3.

**Disposition.** Recorded as a sub-phase SHIFT, NOT a defect against
the Phase-1-committed `solution.py` / `derivation.md`. The `solution.py`
implementation is correct as written (it just describes a
`2L`-periodic solution); the `derivation.md` BC paragraph is
ambiguous-to-wrong but committed at v0.1.0-phase-1 and protected
append-only. The right consumer-side discipline — and the one applied
here — is to query `soln.boundary_conditions()["period"]` interpreted
as the **half-period** OR to inspect κ directly. This SHIFT is
load-bearing for any future RD-3D-MMS consumer (Phase-2+ Stack-C
sub-phase, plus the banked Phase-0-amendment RD-2D MMS regression).
The fix is documented at the test-site (the `_build_cell_centered_grid`
docstring + the inline comment in `_run_mms_at_resolution`).

### S2 — MMS test runs an inline convergence study, not the heat-1D `runner.py` scaffolding

**Finding.** `tools/testkit/code_verification/mms/{runner.py,
analyze.py}` are Phase-0 prototypes specialized to the heat-1D PDE:
`runner.SchemeRunner` has a 1-D `(N, L, D, t_final, cfl, ic_fn,
source_fn) -> (x, u_num, t_actual)` signature; `runner.RunnerResult`
fields `solution: HeatEq1DSolution | None`; `analyze._l2_norm_periodic`
is 1-D. Reusing them as-is for two-field 3D Gray-Scott would require
either a generic-runner rewrite or a wrapper that fights the
heat-1D-specific dataclass shape.

**Resolution.** Charter § 4.2 step 3 directs the agent to "verify the
actual call-site shape at Stage 1 start before consuming"; the actual
shape is heat-1D-only at HEAD. The Stage 1 test wires the convergence
study inline in `test_mms_convergence.py` using only the
`gray_scott_step_with_source` step kernel + the `GrayScott3DSolution`
oracle + `np.polyfit` for the slope fit. The mathematical structure
(refinement ladder + L² discrete-norm + log-log slope fit) is
identical to `analyze._fit_observed_order`; only the dataclass
plumbing is duplicated rather than reused. The L² norm is
implemented at `_l2_norm_3d_periodic` (3-D analog of the analyzer's
1-D `_l2_norm_periodic`).

**Disposition.** Banked for future Phase-2+ generalization of the
MMS scaffolding (separate from B17 PATH-A — that's mutation-runner
infrastructure, not MMS-runner infrastructure). The current shape
keeps the MMS test self-contained and re-anchorable per playbook P14.

## 7. Banked items — status at Stage 1 close

| ID | Status at Stage 1 close |
|---|---|
| B17 (per-target mutation runners + first real kill-rate baseline) | UNCHANGED — Stage 2 § 7.3 PATH-A is the load-bearing assignment per Item 3 operator confirmation. Lean three-target list confirmed at Stage 0; rework owned by Stage 2 Step 2.7. |
| Cat 3 `_SUBDIRS_PICKED_UP` for `continuous-ca` subdir | UNCHANGED — Stage 2 § 7.3 Step 2.3 NO-OP confirmed at this checkpoint (RD-3D ships no golden table, no AUDIT_LOG rows added). Operator-routable alternative (pre-create empty subdir as placeholder) remains banked default-skip. |
| Cat 3 `_SUBDIRS_PICKED_UP` for `hybrid-pg` / `lattice` / `particle-fluids` | UNCHANGED — out of this sub-phase's scope. |
| Cat 3 evaluator shims for the four AUDIT_LOG algorithms | UNCHANGED — out of this sub-phase's scope (no new AUDIT_LOG rows at Stage 1). |
| RD-2D MMS regression scope (Stage 0 Task 0.3 disposition) | UNCHANGED — out-of-scope per Reading (b) operator routing; banked Phase-0-amendment candidate. |
| **NEW: MMS-runner-scaffolding generalization (S2 above)** | NEW BANKED ITEM — generic-runner rewrite of `tools/testkit/code_verification/mms/{runner.py,analyze.py}` to accept arbitrary-PDE step kernels (3-D + multi-field). Banked for Phase-2+ or for a future MMS-pipeline-generalization sub-phase. Not load-bearing for THIS sub-phase's Stage 2; recorded so the operator can route later. |
| B-hotfix-1 / B-hotfix-2 (from replay-tool-hotfix) | UNCHANGED. |
| Open Phase 1 items B2–B6, B11, B16 | UNCHANGED. |

## 8. Append-only / Convention-A discipline (FACT)

Files modified at this sub-bundle (`feat(continuous-ca-rd3d-stage1):
implementation through gate 13`):

```
captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.h5  (new)
captures/reaction-diffusion-3d-ref/gray-scott-lambda-64cube-seed42-step2000.json (new)
docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/stage-1-gate13-replay-2026-05-20T19-36-54Z.txt (new)
docs/perf-ledger.md  (additive — single row appended)
packages/reaction-diffusion-3d/reaction_diffusion_3d/__init__.py  (additive — replaces "intentionally empty" surface)
packages/reaction-diffusion-3d/reaction_diffusion_3d/invariants.py  (new)
packages/reaction-diffusion-3d/reaction_diffusion_3d/reference.py  (new)
packages/reaction-diffusion-3d/reaction_diffusion_3d/sim.py  (new)
packages/reaction-diffusion-3d/tests/test_determinism.py  (additive — bodies replace stub)
packages/reaction-diffusion-3d/tests/test_diagnostics.py  (additive — bodies replace stub)
packages/reaction-diffusion-3d/tests/test_mms_convergence.py  (additive — body replaces stub)
packages/reaction-diffusion-3d/tests/test_pbt_invariants.py  (additive — bodies replace stub)
.pre-commit-config.yaml  (additive — `check-added-large-files` maxkb 10240 → 65536 with rationale)
tools/testkit/failing-tests-evidence/reaction-diffusion-3d-implemented-2026-05-20T19-36-54Z.txt  (new)
```

(FACT — `git diff 48fcdb4..HEAD --name-status` returns the above 14
paths with the indicated status. No deletion / rename. No edits to
files in the Phase 0 / Phase 1 landing / closed-form-sub-phase /
agent-based-sub-phase / replay-tool-hotfix-sub-phase audit chains or
to any Phase-0-protected substance file.)

The `.pre-commit-config.yaml` edit is tooling-configuration, not
substance — the hook's own comment block authorizes raising the
ceiling for canonical-capture HDF5 payloads. Recorded here so the
Stage 2 append-only check (Step 2.6) explicitly sees the change.

## 9. SHA back-fill discipline (Convention #12 — every-stage-close)

(FACT — charter § 4.2 closing + § 8; inherited every-stage-close from
closed-form audit § 8.2 N2 + agent-based stage-0 § 9.)

Front-matter `head_sha:` and `head_sha_at_checkpoint:` are set to
literal placeholder strings `8c36214b6bf46b5364f0f2e2afa07909f0e3a975`. The closing commit
`chore(continuous-ca-rd3d-stage1-checkpoint): Stage 1 per-sim
implementation complete` adds this file with the placeholders intact;
the immediately-following commit
`chore(continuous-ca-rd3d-stage1-sha-backfill): back-fill Stage 1
checkpoint SHA per Convention #12` `git rev-parse HEAD`s the closing
commit and replaces both placeholders with the resolved SHA. Never
`--amend`.

## 10. What remains

Nothing — Stage 1 is `complete`, NOT `partial-needs-continuation`.
Operator dispatches Stage 2 in a fresh session per charter § 5 /
§ 7.3. Stage 2 scope: convergence-file edits, integrity sweep,
gate-13 replay verification (from landing perspective), **B17 PATH-A
load-bearing per-target mutation runners + first real kill-rate
baseline**, CHANGELOG additive entry, sub-phase landing audit, SHA
back-fill. Cat 3 disposition: **NO-OP for `continuous-ca`** per
charter § 4.3 Step 2.3 (RD-3D ships no golden; subdir not created;
`_SUBDIRS_PICKED_UP` unchanged).

## 11. Phase-coherence anchor

Stage 1 confirms the continuous-CA RD-3D sub-phase's deliverable
contract:

- All 13 gates GREEN for RD-3D (gate 4 is N/A per RD-3D spec-ref § 7,
  routed through MMS gate 5; § 2 above enumerates the 12 substantive
  rows). MMS-based gate 5 is the first-of-kind for the workspace;
  combined observed OOA = 2.0056 vs formal 2.0 within ±0.5.
- Phase 1 RED evidence still hashes byte-for-byte to the value
  recorded in the Phase 1 landing audit (gate-13 precondition holds
  via the worktree-replay step at `a159086`).
- Canonical capture lands at the spec-locked descriptor with manifest
  + payload sha256 recorded above.
- Determinism-strategy declaration cites determinism.md row 1 (atomic
  absence) + row 2 (subgroup ops n/a) + row 4 (driver FMA fusion
  deferred); witnessed by gate 11.
- Perf-ledger first-landing row reflects the wall-clock observed at
  i7-12700KF (10.144 s — well inside the charter § 2 "60-300 s"
  conservative estimate; the 64³ NumPy stencil is faster than
  anticipated).
- Two new SHIFTs surfaced (S1 — MMS grid domain `2L`; S2 — MMS test
  inlines its convergence study), bringing cumulative-shift count to
  44 (42 inherited + S1 + S2). Both SHIFTs are pre-resolved at Stage
  1 close; neither blocks Stage 2.
- One new banked item added (MMS-runner generalization per S2).

The sub-phase is cleared to enter Stage 2 (landing — single session
if Stage 1 was clean, which it was).
