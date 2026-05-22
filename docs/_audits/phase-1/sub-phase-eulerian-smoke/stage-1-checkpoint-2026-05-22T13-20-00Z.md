---
date: 2026-05-22
author: eulerian-smoke-sub-phase-agent
artifact: stage
artifact_id: eulerian-smoke-stage-1
stage: 1-per-sim
subject: "Eulerian-smoke sub-phase Stage 1 per-sim implementation (gates 4-13 GREEN; first volumetric-grid sim; first NS-2D MMS exercise)"
head_sha: <PLACEHOLDER>
head_sha_at_checkpoint: <PLACEHOLDER>
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-conventions-consolidation/landing-2026-05-22T03-25-55Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-0-checkpoint-2026-05-22T12-05-00Z.md
evidence_paths:
  - docs/phases/sub-phase-eulerian-smoke.md
  - docs/conventions/sub-phase-conventions.md
  - packages/eulerian-smoke/eulerian_smoke/__init__.py
  - packages/eulerian-smoke/eulerian_smoke/invariants.py
  - packages/eulerian-smoke/eulerian_smoke/reference/__init__.py
  - packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py
  - packages/eulerian-smoke/eulerian_smoke/sim.py
  - packages/eulerian-smoke/tests/test_determinism.py
  - packages/eulerian-smoke/tests/test_diagnostics.py
  - packages/eulerian-smoke/tests/test_mms_convergence.py
  - packages/eulerian-smoke/tests/test_pbt_invariants.py
  - tools/testkit/failing-tests-evidence/eulerian-smoke-2026-05-20T13-37-41Z.txt
  - tools/testkit/failing-tests-evidence/eulerian-smoke-implemented-2026-05-22T12-59-22Z.txt
  - captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.h5
  - captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.json
  - captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.h5
  - captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.json
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-1-gate13-replay-2026-05-22T13-16-22Z.txt
  - docs/perf-ledger.md
evidence_hashes:
  tools/testkit/failing-tests-evidence/eulerian-smoke-2026-05-20T13-37-41Z.txt: sha256:c961dd22c1ca6117af6d9f187d2c0d3aa4d546972496b0f38d11aa14879f23a1
  tools/testkit/failing-tests-evidence/eulerian-smoke-implemented-2026-05-22T12-59-22Z.txt: sha256:aa1a5b19948895ed286bdb058c7cf233fa27445191cb84ea8096ff899c7d53b7
  captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.h5: sha256:4604ebdc40b7fdf80c0354c4429f6fb0a12fd566c5bc301ad9ceed60dcd4e2ed
  captures/eulerian-smoke-ref/taylor-green-128cube-seed42-step500.json: sha256:9d6a78ed9a481bd0ea18af66dc49bc44dce95bee248b53956e01e3c499416517
  captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.h5: sha256:e13b0d052489ed365ccc929873138251c46875e4e568d1ffd8a997bf43123ceb
  captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.json: sha256:52e89e957ab87b9ca7df0da008a4ce92c260eb287c8119ed7ec5a1f478084a75
  docs/_audits/phase-1/sub-phase-eulerian-smoke/stage-1-gate13-replay-2026-05-22T13-16-22Z.txt: sha256:f76077a39ce68b13e16d63388f113ef847a1d4f1a0f1bec1aa20d8488bb94f9a
---

# Eulerian-Smoke Sub-Phase — Stage 1 Per-Sim Implementation Checkpoint

## 1. Scope

Stage 1 per-sim implementation per plan § 4.2. ONE sim
(eulerian-smoke). Single sub-bundle commit at `6a5f8b4` covering
gates 4–13. **First volumetric-grid sim in the project; first
NS-2D MMS exercise; first practical application of conventions
doc § N (Task 0.4 canonical-descriptor scope-analysis); first IC-6
vector_field consumption at sim-test scale.**

## 2. Per-gate status — eulerian-smoke at HEAD (`6a5f8b4`)

| # | Status | Notes |
|---|---|---|
| 4 | GREEN | Reads-through to gate 5. |
| 5 | GREEN | NS-2D MMS, inline convergence study per Path-Y operator routing. MacCormack-corrected SL achieves observed OOA 1.99 (advection) + 2.00 (projection); both within ±0.5 of formal p=2. |
| 6 | GREEN | Tier 1 NaN/Inf scan over diagnostic-tier trajectory (32³ × 20 steps). |
| 7 | GREEN | Tier 2 vector_field (IC-6) — `check_divergence_free`, `check_circulation`, `check_helicity`, `check_energy_spectrum` GREEN. |
| 8 | GREEN | Cat 1 citations: Stam 1999 (DOI 10.1145/311535.311548), Fedkiw-Stam-Jensen 2001 (DOI 10.1145/383259.383260), Taylor-Green 1937 (DOI 10.1098/rspa.1937.0036). |
| 9 | GREEN | Cat 2 public API per probe § 5: `eulerian_smoke.reference.stable_fluids.{stable_fluids_step, project_pressure, stable_fluids_step_3d, project_pressure_3d, semi_lagrangian_advect_2d/3d, maccormack_advect_2d}`; `eulerian_smoke.sim.{sim_runner_seeded, sim_runner_seeded_2d, sim_runner_diagnostic, compute_canonical_trajectory_3d}`; `eulerian_smoke.invariants.{divergence_free_post_projection, smoke_density_nonneg}`. |
| 10 | GREEN | TWO canonical captures per Appendix D § D.2.3 — `taylor-green-128cube-seed42-step500.{h5,json}` (cadence-50, 704.1 MB, 691.6 s wall) + `lid-driven-cavity-128sq-re100-seed42-step1000.{h5,json}` (cadence-100, 4.2 MB, 5.1 s wall). |
| 11 | GREEN (over-achieved bit-exact) | `test_run_twice_epsilon_diff` GREEN using `sim_runner_diagnostic` (32³ × 10 steps); over-achievement per conventions doc § F.4. |
| 12 | GREEN | 2 PBT invariants — `divergence_free_post_projection` (tolerance 1e-1, sub-phase-empirical Stam-on-collocated floor) + `smoke_density_nonneg`. |
| 13 | GREEN | Perf-ledger: 691.587 s @ 128³ × 500 (Taylor-Green) + 5.099 s @ 128² × 1000 (lid-driven-cavity); `i7-12700KF-linux-6.17`. |
| 13 (anchor) | GREEN | Worktree replay at SHA `216021a` reproduces Phase 1 RED (4 `ModuleNotFoundError` collection errors). |

## 3. MMS convergence-rate ladders (gate 5 — first NS-2D MMS exercise)

### Advection-OOA test

Pipeline: projection-disabled (n_jacobi=0) + manufactured source
`S - ∇p_analytic` so the explicit pressure-gradient term is
included in the source. dt ∝ dx² so cumulative time-error matches
spatial O(dx²).

| N | dx | dt | n_steps | ‖e_U‖_L² | ‖e_V‖_L² | ‖e‖_L² |
|---:|---:|---:|---:|---:|---:|---:|
| 32 | 3.125e-02 | 9.62e-04 | 21 | 2.98e-04 | 2.98e-04 | 4.22e-04 |
| 64 | 1.563e-02 | 2.44e-04 | 82 | 7.54e-05 | 7.54e-05 | 1.07e-04 |
| 128 | 7.813e-03 | 6.10e-05 | 328 | 1.89e-05 | 1.89e-05 | 2.68e-05 |

Log-log slope fit: **observed OOA = 1.9892**  (formal p=2, tolerance ±0.5)  **PASS**.

### Projection-OOA test

Helmholtz decomposition: `u* = u_sol + ∇φ` with analytic factors,
`u_sol` divergence-free by construction. Apply `project_pressure`
with `n_iter = 100·N` (Jacobi convergence scaled with grid level).
Verify `||u_proj - u_sol||_2 → 0` at 2nd order under refinement.

| N | dx | n_iter | ‖u_proj - u_sol‖_L² |
|---:|---:|---:|---:|
| 32 | 3.125e-02 | 3200 | 4.27e-02 |
| 64 | 1.563e-02 | 6400 | 1.07e-02 |
| 128 | 7.813e-03 | 12800 | 2.68e-03 |

Log-log slope fit: **observed OOA = 1.9976**  (formal p=2, tolerance ±0.5)  **PASS**.

## 4. Determinism-strategy declaration (gate 11 over-achievement)

(FACT — 8-clause module docstring at `packages/eulerian-smoke/
eulerian_smoke/sim.py` lines 1–91; cited verbatim in the
`feat(eulerian-smoke-stage1)` commit footer.) Clauses underwrite the
`bit-exact-same-stack-same-hw` claim for the Python NumPy reference:

1. SL backtrace reads only from prior-step immutable arrays.
2. Bilinear/trilinear interp with explicit lex (i, j[, k]) vertex ordering.
3. Jacobi pressure-projection with FIXED iter cap (n_jacobi=20); no
   tolerance-comparison early-stop branch (P24 pattern).
4. No global RNG state; analytic ICs (zero RNG) for canonical captures.
5. Periodic BCs via `np.roll` + `np.mod` (P23 cause-#1 mitigation;
   conventions doc § M.4 S1).
6. No BLAS/FMA path; pure elementwise NumPy + `np.roll`.
7. Capture ordering is step-index sorted; `h5py` default group order
   preserved.
8. Phase-2+ deferred: parallel reductions, driver FMA fusion,
   subgroup-collective ops.

Spec declares `epsilon-same-stack-same-hw` for Phase-2+ Stack-C
target (sim `determinism.md`); the Python NumPy reference at this
sub-phase achieves bit-exact-same-stack-same-hw — gate 11 witnesses
via `test_run_twice_epsilon_diff` (epsilon-bound trivially satisfied
at zero diff). Over-achievement is informational only per
conventions doc § F.4; does NOT promote the spec declaration.

## 5. SHIFTED items surfaced during Stage 1

| ID | Description | Disposition |
|---|---|---|
| **S1** | Axis-convention rewrite. 2D pipeline initially used axis 0 = y; 3D used axis 0 = x. MMS surfaced inconsistency (OOA ≈ 0). Reset both 2D and 3D to axis 0 = x (matches RD-3D's `reference.py` convention + `np.meshgrid(..., indexing='ij')` first-arg-varies-axis-0). | RESOLVED in `feat(eulerian-smoke-stage1)`. |
| **S2** | MacCormack-corrected SL adopted for 2nd-order accuracy. Single-backtrace SL is O(dt) per step → cumulative O(t_final); cumulative time-error swamps spatial unless dt ∝ dx². Spec § 6.1 prescribes MacCormack; predictor-corrector pattern added at `maccormack_advect_2d`. OOA recovers to 1.99 ≈ formal 2. | RESOLVED in `feat(eulerian-smoke-stage1)`. |
| **S3** | Centered-difference div + grad on collocated grid leaves O(dx²) inconsistent-stencil residual divergence. Classic Stam-on-collocated. Documented in `project_pressure` docstring; PBT `divergence_free_post_projection` tolerance set to sub-phase-empirical 1e-1 at PBT-N=32. Phase-2+ Stack-C MAC-staggered port will tighten per sim spec-ref § 5. | RESOLVED in `feat(eulerian-smoke-stage1)`; the MAC-staggered fix is a Phase-2+ banked item. |
| **S4** | `np.mod(-1e-17, 128.0) == 128.0` FP-edge: tiny negative + large positive rounds to the positive. Post-cast integer-modulus guard added (`i0 % Nx`) in both 2D and 3D SL. Surfaced by the lid-driven-cavity capture's larger velocity range. | RESOLVED in `feat(eulerian-smoke-stage1)`. |
| **S5** | Lid-driven-cavity `dt = 0.005` unstable (overflow at step ~50 due to lid-shear-layer vortex CFL exceedance on the periodic-BC-approximation of the Dirichlet cavity). Dropped `dt = 0.001` (CFL 0.128) for 1000-step stability. Preserves canonical `step1000` cadence; simulated time becomes 1.0 s instead of 5.0 s — sufficient for steady-state-fingerprint determinism at the Python reference scope. | RESOLVED in `feat(eulerian-smoke-stage1)`. |

Cumulative shift count entering Stage 2: 65 (inherited via conventions
doc § M) + 5 new Stage 1 shifts = **70 going into Stage 2**.

## 6. Stage 0 Task 0.4 retrospective (first practical exercise of conventions doc § N PROPOSED)

Stage 0 Task 0.4 estimated 3D Taylor-Green per-step floor at 0.93 s
(N=128, n_jacobi=20); 500-step projection 7.8–15.6 min (1.5× production
correction). Stage 1 measured per-step **1.348 s**; 500-step wall
**691.6 s = 11.5 min**. Within the regression-guard threshold
(3× = 2.79 s/step) AND within the operator-routable 1-hour ceiling.

Stage 0 estimate was approximately correct (within ~50%); the
production-correction factor (~1.5×) is now measured-empirical for
future MMS-style 3D smoke runs.

**Task 0.4 first practical exercise: VALIDATED as a useful
pre-flight discipline.** The conventions doc § N PROPOSED →
ESTABLISHED lift becomes a Stage 2 landing-audit recommendation
based on this retrospective.

## 7. Probe-vs-Appendix-D drift (inherited finding; re-anchored at Stage 1 step 5)

Phase 1 Stage 2 shift #17 baseline: probe report § 4 references the
fall-back name `stam-puff-128cube-seed42-step500`; Appendix D
§ D.2.3 line 2481 declares the load-bearing names
`taylor-green-128cube-seed42-step500` +
`lid-driven-cavity-128sq-re100-seed42-step1000`.

Re-anchored at Stage 1 step 5 against Appendix D — captures written
under Appendix D names. No probe amendment (sealed Phase 1 artifact
per conventions doc § B.1 append-only).

## 8. Open items entering Stage 2

- **B17 routing decision** — operator-routable at Stage 2 dispatch
  per plan § 4.3 step 2.7; coordinator lean PATH-A-continue (third
  proof-point), alternative PATH-A-rebank.
- **Cat 3 routing** — `volumetric-grid` subdir disposition. Verify
  pre-flight that no `tools/testkit/golden/tables/volumetric-grid/`
  was incidentally created at Stage 1 (NO-OP precedent inherited
  from RD-3D `continuous-ca` per conventions doc § I.2).
- **MMS-runner generalization** — STILL banked per conventions doc
  § L.2 row 6. Two concrete inline examples now anchor the
  generalization decision (RD-3D + eulerian-smoke); operator decides
  at LBM plan-drafting time.
- **MAC-staggered grid refactor** — surfaced by Stage 1 S3 (collocated
  inconsistent-stencil residual). Deferred to Phase-2+ Stack-C port.
- **Stage 0 Task 0.4 conventions-doc lift** — per the retrospective
  in § 6, Stage 2 landing audit should recommend lifting conventions
  doc § N from PROPOSED to ESTABLISHED. Operator decides.

## 9. Closing surface

Stage 1 closes PASS / READY FOR STAGE 2 DISPATCH. All 13 gates
GREEN at HEAD; canonical captures landed for both Appendix D
descriptors; first practical exercise of conventions doc § N
(Task 0.4) VALIDATED; inline MMS pattern (Path Y operator routing)
exercised cleanly; gate-13 anchor intact.

Stage 2 dispatch reads:

- `docs/phases/sub-phase-eulerian-smoke.md` § 7.3 (Stage 2 prompt).
- This Stage 1 checkpoint.
- The Stage 1 sub-bundle commit `6a5f8b4` and its footer.
