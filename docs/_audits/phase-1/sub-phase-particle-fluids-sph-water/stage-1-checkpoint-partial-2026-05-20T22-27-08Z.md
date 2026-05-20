---
date: 2026-05-20
author: particle-fluids-sph-water-sub-phase-agent
artifact: stage
artifact_id: particle-fluids-sph-water-stage-1
stage: 1-implementation
subject: "Particle-fluids sph-water sub-phase Stage 1 partial-needs-continuation checkpoint (R12 STOP-AND-SURFACE on canonical-capture size)"
verdict-state: partial-needs-continuation
head_sha: PLACEHOLDER-BACKFILL-AT-CONVENTION-12-CLOSE
head_sha_at_checkpoint: PLACEHOLDER-BACKFILL-AT-CONVENTION-12-CLOSE
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-closed-form/landing-2026-05-20T16-48-00Z.md
  - docs/_audits/phase-1/sub-phase-agent-based/landing-2026-05-20T18-20-39Z.md
  - docs/_audits/phase-1/sub-phase-replay-tool-hotfix/repair-2026-05-20T19-06-35Z.md
  - docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-0-checkpoint-2026-05-20T22-10-19Z.md
evidence_paths:
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-gate13-replay-2026-05-20T22-27-08Z.txt
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-r12-surface-2026-05-20T22-27-08Z.txt
  - tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt
  - tools/testkit/failing-tests-evidence/sph-water-implemented-2026-05-20T22-27-08Z.txt
  - packages/sph-water/sph_water/__init__.py
  - packages/sph-water/sph_water/reference/__init__.py
  - packages/sph-water/sph_water/reference/dfsph.py
  - packages/sph-water/sph_water/sim.py
  - packages/sph-water/sph_water/invariants.py
evidence_hashes:
  docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-gate13-replay-2026-05-20T22-27-08Z.txt: sha256:a3d9512c29f8afe2cc8f59af9080b19c0a4db7941fdad6b19d51405b863da90e
  docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-r12-surface-2026-05-20T22-27-08Z.txt: sha256:3f0393098b6a24dc4c0ae45b0452aa304a4626f117e48d656eccd5aff3fe117a
  tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt: sha256:82fb91bcf19581cd9adc0eca4ba194de033d4a58aa9c5319d52dabc40cf12b1f
  tools/testkit/failing-tests-evidence/sph-water-implemented-2026-05-20T22-27-08Z.txt: sha256:5c3d9924c4713153376fbf42fbb729af48c229052fc4fe435e38f2ef0fcf7110
---

# Particle-fluids sph-water Sub-Phase — Stage 1 Partial-Needs-Continuation Checkpoint

## 1. Scope and cut-point

(FACT — `docs/phases/sub-phase-particle-fluids-sph-water.md` § 4.2 / § 7.2 / § 9 R12 / § 11.5 Item 5.)

Stage 1 reached a **clean cut-point at the operator-routable R12
boundary** (sub-phase plan § 4.2 step 5 — STOP-AND-SURFACE before
generating the canonical capture if estimate exceeds the 64-MB
pre-commit ceiling). Per the cadence-by-cadence size analysis at
`stage-1-r12-surface-2026-05-20T22-27-08Z.txt` (§ 3.6 below), every
sensible multi-frame cadence at the canonical descriptor
`dam-break-1M-particles-seed42-step1000` exceeds the ceiling; the
**operator routes the remediation path** before Stage 1 closes.

Verdict-state: **partial-needs-continuation**.

GREEN at HEAD (gates 4-9, 11, 12, 13-anchor); PENDING-R12-ROUTE
(gates 10, 13 perf-ledger). Sibling-regression sweep at HEAD is
clean (see § 4).

The six operator routings from Stage 0 dispatch remain
AUTHORITATIVE (per the Stage 0 checkpoint § 1 routing table).

## 2. Commits in this stage

| SHA | Commit message | Sub-deliverable | Notes |
|---|---|---|---|
| `85f178f` | `feat(particle-fluids-sph-water-stage1-partial): implementation through gate 9 + 11 + 12 + 13 anchor` | Implementation bundle (gates 4-9, 11, 12, 13-anchor) | Footer cites Phase 1 RED + GREEN evidence sha256, determinism-strategy declaration summary, vendored-discipline summary, gate-5 golden-pass summary, gate-13 worktree replay outcome, sibling regression results. |
| (this commit) | `chore(particle-fluids-sph-water-stage1-checkpoint-partial): Stage 1 partial-needs-continuation (R12)` | Closing — this audit | Convention #12 SHA back-fill follows in a separate commit per charter § 4.2 closing + inherited every-stage-close discipline. |
| (next commit) | `chore(particle-fluids-sph-water-stage1-sha-backfill): back-fill Stage 1 partial-checkpoint SHA per Convention #12` | SHA back-fill | New commit; never `--amend`. |

## 3. Stage 1 deliverable summary — sph-water gate-status (post-`85f178f`)

(FACT — `tools/testkit/failing-tests-evidence/sph-water-implemented-2026-05-20T22-27-08Z.txt`
sha256:`5c3d9924c4713153376fbf42fbb729af48c229052fc4fe435e38f2ef0fcf7110`.)

### 3.1 sph-water gates at HEAD (`85f178f`)

| # | Gate | State | Evidence |
|---|---|---|---|
| 4 | code verification reads through to gate-5 (golden) | N/A | sph-water spec-ref § 7 declares golden-table-based gate 5 (NOT MMS). |
| 5a | cubic-spline-kernel golden (Phase 0; 5 anchors + 4 non-anchor test points = 9 total; tolerance `abs=1e-12`) | **GREEN** | `tests/test_cubic_spline_kernel_golden.py::test_W_matches_phase0_pin` PASS. W + |∇W| reproduced at all 9 (q, h) fixture points. |
| 5b | DFSPH density-evolution golden (Phase 1; 1 test_point × 1 `independent_reference` block; tolerance `abs=1e-15`) | **GREEN** | `tests/test_dfsph_density_golden.py::test_{density,density_evolution}_at_two_particle_fixture` PASS. ρ₀ = `0.5470951168783902`, dρ/dt₀ = `-0.2984155182973038` reproduced. Cat-3 anchor-lift to ≥ 3 is Stage 2 § 4.3 Step 2.3 work per operator Item 3 routing. |
| 6 | Tier 1 NaN/Inf scan | **GREEN** | `test_tier1_health_no_nan_inf` PASS over the diagnostic trajectory (64 particles × 8 steps). |
| 7 | Tier 2 particle (IC-5; inherited from agent-based) | **GREEN** | `test_tier2_particle_{count_invariance, no_overlap_at_half_spacing, neighbor_list_integrity, momentum_conservation_advisory}` PASS; momentum_conservation as advisory (gravity is non-conservative; tolerance_rel=1.0 with finite-value-only assertion). |
| 8 | Cat 1 citations | **GREEN** | Bender & Koschier 2015 (DOI 10.1145/2786784.2786796), Monaghan 1992 (DOI 10.1146/annurev.aa.30.090192.002551), Monaghan 2005 (DOI 10.1088/0034-4885/68/8/R01) cited by name in `sph_water.reference.dfsph` module docstring + algorithmic function docstrings. SPlisHSPlasH manifest's `[upstream].sha = 6bff55a6…b62b54` referenced; `cat1.upstream-citation` consumed via Phase 0 derivation document. |
| 9 | Cat 2 public API | **GREEN** | `sph_water.{reference.dfsph, sim, invariants}` resolves per probe § 5: `reference.dfsph.{W, grad_W, grad_W_magnitude, kernel_q, neighbor_lists, density, density_evolution, divergence_free_solve, canonical_params, SIGMA_3D}`; `sim.{sim_runner_seeded, sim_runner_diagnostic, compute_diagnostic_trajectory, neighbor_lists_at, CANONICAL_DESCRIPTOR, CANONICAL_N_PARTICLES, CANONICAL_STEP_COUNT}`; `invariants.{density_nonneg, kernel_normalization_unit_volume}`. |
| 10 | canonical capture (1M particles × 1000 steps) | **PENDING-R12-ROUTE** | See § 3.6 below. Operator routes (a) raise ceiling / (b) downsample / (c) Appendix D amend. |
| 11 | determinism (`test_run_twice_epsilon_diff`) | **GREEN** | Via `sim_runner_diagnostic` (64 particles × 8 steps, capture every 2 steps). `verdict.bit_exact == True`; `verdict.detail == "captures match exactly"`. Python NumPy reference over-achieves epsilon (sub-phase plan § 1.5); over-achievement informational only. |
| 12 | PBT invariants (Hypothesis) | **GREEN** | `density_nonneg` (20 examples; random configurations N ∈ [1, 16], h ∈ [0.1, 2.0]) + `kernel_normalization_unit_volume` (10 examples; pins kernel peak σ₃/h³). `.hypothesis/` example DB committed. |
| 13 | perf-ledger first-landing row | **PENDING-R12-ROUTE** | Depends on canonical-capture wall-clock from gate 10. |
| 13 (anchor) | failing-tests replay verifiable | **GREEN** | Phase 1 RED sha256 `82fb91bc…cf12b1f` UNTOUCHED; HEAD GREEN sha256 `5c3d9924…cf7110`; worktree replay at `cd20faa` reproduces 5 `ModuleNotFoundError` (`sph_water.{reference,sim,invariants}` not yet present at the bootstrap). |

### 3.2 Determinism-strategy declaration (sub-phase plan § 1.5)

(FACT — module-level docstring at
`packages/sph-water/sph_water/sim.py` lines 1–70; cited verbatim in
the `feat(particle-fluids-sph-water-stage1-partial)` commit footer.)
Seven clauses mapped to P24 SPH-determinism playbook priority order:

1. **Stable particle iteration order** (P24 cause #4 mitigation) —
   `_particles_to_arrays` preserves submission order; no Morton /
   spatial-hash sort at this scope.
2. **Sorted neighbor-iteration order** (P24 cause #1 mitigation) —
   `neighbor_lists` returns lists sorted-ascending-by-id via
   `np.where` over a 1-D boolean mask.
3. **Sorted per-pair force-accumulation order** (P24 cause #2
   mitigation) — `density` and `density_evolution` iterate each
   particle's neighbor list in sorted order with a single
   per-particle Python-`float` accumulator; no `numpy.add.at` over
   unsorted pair indices; FP non-associativity sequenced.
4. **DFSPH inner-iteration determinism** (P24 cause #3 mitigation)
   — `divergence_free_solve` uses fixed `max_iter` cap + `<=`
   tolerance check; iteration count cannot vary across runs.
5. **No stochastic ops inside the step.** RNG via
   `numpy.random.default_rng(seed)` only at IC synthesis; bare
   `numpy.random.*` banned.
6. **No BLAS / FMA path inside the kernel.** Elementwise NumPy +
   `np.einsum("ijk,ijk->ij", ...)` for pairwise sq-dist only.
7. **Phase-2+ deferred:** Stack-C atomic scatter-add / FMA fusion /
   Vulkan subgroup-collective ops — all declared in
   `docs/sim-specs/particle-fluids/sph-water/determinism.md`.

Gate-11 `test_run_twice_epsilon_diff` witnesses the resulting claim
**bit-exact-same-stack-same-hw** (over-achieves epsilon; not a spec
declaration promotion per § 1.5).

### 3.3 Vendored-upstream consumption discipline (sub-phase plan § 1.6)

(FACT — `sph_water.reference.dfsph` module docstring; no imports of
`references.SPlisHSPlasH.*` anywhere in the new code; verified
post-commit via grep.)

First practical exercise of spec § 9.2 at sim-test scale. Citations
by NAME in module + function docstrings:

- Bender, J. & Koschier, D. (2015), DOI `10.1145/2786784.2786796`
  (DFSPH continuity equation).
- Monaghan, J. J. (1992), DOI `10.1146/annurev.aa.30.090192.002551`
  (SPH baseline + compact support).
- Monaghan, J. J. (2005), DOI `10.1088/0034-4885/68/8/R01`,
  eq. (2.7) (3D cubic-spline + normalization σ₃ = 1/π).

The Python kernel is derived independently of `references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.{h,cpp}`;
NO `from references.SPlisHSPlasH ...` import statement exists in
the new code; the vendored manifest scope statement at
`references/SPlisHSPlasH/MANIFEST.toml` ("the Python reference
implementation is derived independently from Monaghan 1992/2005 to
guard against symmetric upstream bugs (spec § 2.4)") is honored
in implementation.

### 3.4 Gate-5 golden-pass summary

(FACT — pytest output captured to
`tools/testkit/failing-tests-evidence/sph-water-implemented-2026-05-20T22-27-08Z.txt`.)

| Golden | Anchor file | Tolerance | Fixture | Result |
|---|---|---|---|---|
| Phase 0 cubic-spline-kernel | `tools/testkit/golden/tables/cubic-spline-kernel.json` | `abs=1e-12, rel=1e-12` | 9 (q, h) test points at h=1; q ∈ {0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2} | PASS — `dfsph.W(q, h)` + `dfsph.grad_W_magnitude(q, h)` reproduce all 9 expected pairs within tolerance |
| Phase 1 DFSPH density-evolution | `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json` | `abs=1e-15, rel=0.0` | Two-particle fixture (h=1, p₀=(0,0,0)/v₀=0; p₁=(0.5,0,0)/v₁=(1,0,0); m=1) | PASS — `dfsph.density(...)`[0] = 0.5470951168783902; `dfsph.density_evolution(...)`[0] = -0.2984155182973038 |

### 3.5 Gate-13 worktree replay outcome

(FACT — `…/stage-1-gate13-replay-2026-05-20T22-27-08Z.txt`
sha256:`a3d9512c29f8afe2cc8f59af9080b19c0a4db7941fdad6b19d51405b863da90e`.)

```
git worktree add /tmp/bp-replay-cd20faa-sph-water cd20faa
PYTHONPATH=. uv run pytest packages/sph-water/tests/ -v
```

Outcome at `cd20faa`:

```
=========================== short test summary info ============================
ERROR packages/sph-water/tests/test_cubic_spline_kernel_golden.py
ERROR packages/sph-water/tests/test_determinism.py
ERROR packages/sph-water/tests/test_dfsph_density_golden.py
ERROR packages/sph-water/tests/test_diagnostics.py
ERROR packages/sph-water/tests/test_pbt_invariants.py
!!!!!!!!!!!!!!!!!!! Interrupted: 5 errors during collection !!!!!!!!!!!!!!!!!!!!
============================== 5 errors in 0.05s ===============================
```

All 5 collection errors are `ModuleNotFoundError` against
`sph_water.{reference, sim, invariants}` at the bootstrap commit —
the Phase 1 RED failure-mode matches verbatim. The Phase 1 RED
evidence at `tools/testkit/failing-tests-evidence/sph-water-2026-05-20T13-32-02Z.txt`
(sha256 `82fb91bc…cf12b1f`) is UNTOUCHED at HEAD. Gate-13 anchor
intact.

Worktree removed cleanly post-replay (`git worktree remove --force`).

### 3.6 R12 STOP-AND-SURFACE: canonical-capture size estimate

(FACT — `…/stage-1-r12-surface-2026-05-20T22-27-08Z.txt`
sha256:`3f0393098b6a24dc4c0ae45b0452aa304a4626f117e48d656eccd5aff3fe117a`.)

Per operator Item 5 routing (Stage 0 checkpoint § 1 routing table)
+ sub-phase plan § 4.2 step 5 / § 9 R12 / § 11.5 Item 5: estimate
capture size BEFORE generating; if estimate exceeds 64 MB pre-commit
ceiling, STOP and surface with three remediation paths.

Per-particle per-frame state at the sim_runner_seeded canonical
descriptor: position (3 × f64 = 24 B) + velocity (3 × f64 = 24 B) +
density (1 × f64 = 8 B) = **56 B/particle/frame**.

Size analysis (1M particles × N frames; payload only, ~5% H5 overhead
estimated separately):

| Cadence | Frames | Payload | Verdict |
|---|---:|---:|---|
| `capture_interval=1` (every step) | 1001 | ~52.2 GiB | **EXCEEDS** by ~810× |
| `capture_interval=100` | 11 | ~587 MB | **EXCEEDS** by ~9× |
| `capture_interval=500` | 3 | ~160 MB | **EXCEEDS** by ~2.5× |
| `capture_interval=1000` (IC + final) | 2 | ~107 MB | **EXCEEDS** by ~1.7× |
| 1-frame (final only, no IC) | 1 | ~53 MB | fits (~56 MB total, no margin) |

Maximum frames at 1M particles to stay under 64 MB: **1.141**. Only a
single-frame snapshot fits, and marginally.

R12 STOP-AND-SURFACE triggered. Three remediation paths (per
sub-phase plan § 9 R12; full rationale at the surface evidence file):

- **(a) Raise `.pre-commit-config.yaml` `maxkb`** (e.g., 256 MB).
  Consistent with RD-3D Stage 1 N4 precedent (10 MB → 64 MB).
  Lean recommendation per the surface evidence.
- **(b) Downsample canonical descriptor's capture cadence** (e.g.,
  1-frame final-only at ~56 MB, or fewer per-particle fields per
  frame). Trade-off: per-frame fidelity reduced.
- **(c) Amend Appendix D § D.2.3 for smaller canonical N** (e.g.,
  100k or 200k particles). Most invasive; Phase-1-retroactive.

The plan **does NOT pre-decide**; operator routes at the
continuation-session dispatch.

## 4. Sibling-regression sweep at HEAD

(FACT — captured during Stage 1 verification, post-`85f178f`.)

| Package / tool | Tests | Result |
|---|---|---|
| `packages/sph-water/tests/` | 11 | PASS (0.26 s) |
| `packages/reaction-diffusion-3d/tests/` | 8 | PASS (23.44 s) |
| `packages/boids-3d/tests/` | 10 | PASS (37.89 s) |
| `packages/physarum/tests/` | 10 | PASS (10.40 s) |
| `packages/strange-attractors/tests/` | 11 | PASS (0.78 s) |
| `packages/mandelbulb-explorer/tests/` | 10 | PASS (0.25 s) |
| `packages/reaction-diffusion-2d/tests/` | 14 | PASS (2.40 s) |
| `tools/integrity/tests/` | 48 | PASS (0.81 s) |
| `tools/diagnostics/...` | 22 | PASS (0.16 s) |
| `tools/testkit/...` | 47 | PASS (1.94 s) |

No regressions. The four other Phase 1 sims (eulerian-smoke,
lattice-boltzmann-d3q19, mpm-multimaterial — three remaining after
sph-water's gate-flip) still RED with the same `ModuleNotFoundError`
failure mode (NOT re-tested at this partial checkpoint; the negative
sweep is Stage 2's load-bearing work per sub-phase plan § 4.3 Step 2.2).

## 5. SHIFTED register

### 5.1 Inherited verbatim from Stage 0 checkpoint § 7 (1 shift N1)

| # | Shift | Source bundle |
|---|---|---|
| N1 | SPlisHSPlasH manifest `[scope].used_by_sims` uses bare slug `"sph-water"` rather than spec § 9.2 worked-example prefixed form `"particle-fluid/sph-water"`. PASS-with-DRIFT per operator Item 2 routing; NOT amended. | Stage 0 Task 0.3 |

### 5.2 New shifts surfaced during Stage 1

| # | Shift | Rationale |
|---|---|---|
| S1 | **Stage 1 test-file stub-body fill-in** (inherited from closed-form / agent-based / RD-3D Stage 1 S1 pattern). Phase 1 shipped `packages/sph-water/tests/test_{cubic_spline_kernel_golden, determinism, diagnostics, pbt_invariants}.py` with `raise NotImplementedError("Phase 2+ contract.")` stub bodies; Stage 1 fills in real test bodies, preserving function signatures + imported contract surface (`sim_runner_seeded` retained as noqa-tagged contract import in `test_diagnostics.py` + `test_determinism.py`). `test_dfsph_density_golden.py` was the only Phase 1 test file that already shipped with a real body. | RD-3D Stage 1 S1 precedent; sub-phase plan § 4.2 step 4 implicit. |
| S2 | **Determinism test uses `sim_runner_diagnostic` rather than `sim_runner_seeded`** (the canonical 1M-particle descriptor). The probe report § 6 contract names `test_run_twice_epsilon_diff` with `sim_runner_seeded` as the noqa-tagged contract import; Stage 1 honors the import surface (noqa-tagged) but invokes `sim_runner_diagnostic` (64 particles × 8 steps) for the actual diff. Reasoning: invoking `sim_runner_seeded` twice would produce two canonical captures totaling ~107 MB × 2 = ~214 MB (or ~56 MB × 2 = ~112 MB at the marginal 1-frame cadence), neither of which fits the 64-MB pre-commit ceiling, AND the canonical capture is itself R12-STOP-AND-SURFACE-routed. Diagnostic-tier captures are sufficient witnesses for the bit-exact determinism contract end-to-end. Parallels the agent-based / RD-3D diagnostic-trajectory pattern. | R12 boundary + agent-based S6 inline-recurrence precedent. |
| S3 | **Single SimRunner Protocol implementation + diagnostic helper, not two canonical descriptors.** sph-water's Appendix D § D.2.3 / probe § 4 declares ONE canonical descriptor (`dam-break-1M-particles-seed42-step1000`); the package ships `sim_runner_seeded` (canonical, R12-routed) + `sim_runner_diagnostic` (diagnostic-tier, exercised by gate 11). The agent-based S3 two-callable pattern (`sim_runner_seeded` + `sim_runner_seeded_3agent`, both Appendix-D-declared) does NOT apply — only `sim_runner_seeded` is Appendix-D-declared for sph-water; `sim_runner_diagnostic` is a SHIFT-noted additional helper for tractability at test scope. Recorded so future readers don't expect a second Appendix-D-declared descriptor. | Tractability at test scope; documented for posterity. |
| S4 | **R12 STOP-AND-SURFACE triggered at Stage 1 step 5.** Canonical capture at any sensible multi-frame cadence exceeds the 64-MB pre-commit ceiling raised at RD-3D Stage 1 N4. Stage 1 closes at the operator-routable R12 boundary as a partial-needs-continuation; operator routes one of three remediation paths (raise ceiling / downsample / Appendix D amend) and dispatches a Stage 1 continuation session. See § 3.6 + the surface evidence file for the cadence-by-cadence analysis. | Sub-phase plan § 4.2 step 5 / § 9 R12 explicit STOP-AND-SURFACE precondition; operator Item 5 routing. |
| S5 | **Diagnostic step is explicit-Euler with gravity, not the full DFSPH solver.** The Phase-1 Python reference at diagnostic scale ships an explicit-Euler integrator (`_diagnostic_step`) that exercises the deterministic kernel + neighbor-list + continuity-equation surface end-to-end without committing to the full constant-density + divergence-free DFSPH solver pair. The full DFSPH `divergence_free_solve` is implemented at module scope (per sub-phase plan § 4.2 step 2) but not invoked by the canonical or diagnostic captures at this sub-phase; it's available for downstream Phase-2+ Stack-C consumption + can be exercised by future PBT additions. Reasoning: the two-particle golden (gate 5) does NOT exercise the DFSPH solver pair (the test target is the SPH continuity equation, not the pressure projection); the gate 11 epsilon-diff witnessing bit-exact does NOT require the solver pair; and the diagnostic-tier capture's primary purpose is to exercise the deterministic kernel + neighbor-list surface for gates 6, 7, 11. Phase-2+ Stack-C replaces this with the full DFSPH integrator per spec-ref § 5. Documented for the continuation session + Phase-2+ scope clarity. | Phase-1-scope discipline; sub-phase plan § 4.2 step 2 inline note. |

### 5.3 Cumulative inherited shift count going into Stage 1 continuation

48 (continuous-CA-RD-3D landing total) + 1 (Stage 0 N1) + 5 (this Stage 1 S1–S5) = **54 cumulative shifts** going into Stage 1 continuation.

## 6. Banked items posture

The five operator routings from Stage 0 (Items 1, 2, 3, 4, 6) remain
AUTHORITATIVE; Item 5 (R12 routing) is the load-bearing question for
the continuation session.

Inherited banked items unchanged (MMS-runner generalization,
RD-3D test-augmentation, Cat 3 sibling subdirs, evaluator shims,
B-hotfix items, B2/B3/B4/B5/B6/B11/B16). No new bankings at Stage 1.

## 7. Outputs to Stage 1 continuation

When the operator routes R12 (selects (a) raise ceiling / (b)
downsample / (c) Appendix D amend), the continuation session will:

1. Apply the routed remediation (additive `.pre-commit-config.yaml`
   maxkb raise OR additive capture-cadence amendment in
   `sph_water.sim.sim_runner_seeded` OR Appendix D amendment per
   route).
2. Generate the canonical capture at the routed configuration.
3. Verify the capture sidecar + sha256.
4. (Optionally) re-run gate-11 against the canonical runner as a
   bonus bit-exact confirmation (NOT gate-load-bearing; the
   diagnostic-tier gate-11 already GREEN).
5. Append perf-ledger first-landing row with the canonical-capture
   wall-clock.
6. Commit the Stage 1 continuation bundle as
   `feat(particle-fluids-sph-water-stage1-continuation): canonical capture + perf-ledger row`.
7. Write the Stage 1 final checkpoint (verdict-state: complete) at
   `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/stage-1-checkpoint-final-<UTC>.md`.
8. Convention #12 SHA back-fill.

Stage 2 is then dispatchable per sub-phase plan § 7.3.

## 8. Closing

Stage 1 partial-needs-continuation. Operator routes R12 + dispatches
continuation session.

Convention #12 SHA back-fill at close per sub-phase plan § 4.2
closing / § 10 discipline: a NEW commit (never `--amend`) will
replace the `PLACEHOLDER-BACKFILL-AT-CONVENTION-12-CLOSE`
placeholders in this audit's front-matter after the closing commit
lands.
