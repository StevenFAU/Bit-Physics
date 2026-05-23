# MPM-Multimaterial Implementation — Sub-Phase of Spec-Phase-1

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — gates 4–13 implementation for `mpm-multimaterial`, scoped under spec-Phase-1.
> **Sub-phase identity:** Seventh and **LAST** per-sim implementation sub-phase under spec-Phase-1; **first in the hybrid-pg category** (spec § 5.5); **first sub-phase to consume BOTH IC-5 particle AND IC-6 vector_field Tier 2 diagnostics**; **first sub-phase whose spec declares Stack D Taichi (not Python NumPy reference)** — re-anchor decision surfaced as operator-routable Item 1 (default lean: pivot to Python NumPy + numba per established 9-sim precedent; Taichi port deferred to Phase-2+ per the same role-model pattern). NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.4 (MMS / OOA), 2.5 (determinism), 2.7 (capture), 2.13 (mutation), 2.14 (PBT), 3.5 (the 13 gates), 4.4 (Taichi limitations), 5.5 (hybrid-pg / MPM family), 7.10, 7.12, 7.13 + Appendix D § D.2.3.
> **Reads-first:** `docs/conventions/sub-phase-conventions.md` (sections A–F, I–N — universally load-bearing; § H vendored-upstream NOT applicable — Hu 2018 + 88-line reference are citation-only, no vendored code per spec § 9.2; § N PROPOSED Task 0.4 is **treated as established discipline** for this plan per the LBM landing § 9.3 row 1 + § 9.4 row 8 graduation recommendation — the conventions doc itself still says PROPOSED; graduation banked for operator at MPM landing per the strong cumulative-evidence trail). THEN this plan.
> **Parent audits (pre-conditions):**
> - Phase 1 landing — `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md`, CONFIRMED at `v0.1.0-phase-1`.
> - sub-phase-closed-form landed at `2cc0f21`.
> - sub-phase-agent-based landed at `739c93f`.
> - sub-phase-replay-tool-hotfix landed at `1f5fa0c`.
> - sub-phase-continuous-ca-rd3d landed at `0df358d`.
> - sub-phase-numba-integration landed at `569c883`.
> - sub-phase-particle-fluids-sph-water landed at `281c74f` (post-LFS: `17850e2`).
> - sub-phase-mutation-script-hotfix landed at `27304d0`.
> - sub-phase-conventions-consolidation CONFIRMED at `34c7d34`.
> - sub-phase-eulerian-smoke CONFIRMED at `cf13d1c`.
> - sub-phase-git-lfs-migration CONFIRMED at `0672554`.
> - **sub-phase-lattice-boltzmann-d3q19 CONFIRMED at `4f79e19`** (back-filled; original landing-audit-body SHA `215983fd`).
> **Inherited shifts:** **82 cumulative going into this sub-phase** (per LBM landing § 8.3 final tally; hotfix shifts not counted per conventions doc § O). Inherited by reference; not re-litigated.
> **Bit-identity invariant:** held byte-identically at 14 invocations to date (7 sub-phase Stage 0s + 4 hotfix V validations + 3 LFS-migration replay verifications); Stage 0 Task 0.0 here is the **15th invocation** (load-bearing per conventions doc § D.3).
> **Phase-closure framing:** This sub-phase closes the 9-sim Phase 1 per-sim implementation arc. After MPM lands, spec-Phase-2 (cross-stack replication) becomes dispatchable at `v0.2.0-phase-2`; the accumulated bank of testing-improvements observations (§ 11.2 below) consolidates for post-Phase-1 owner.
> **Date drafted:** 2026-05-22.
> **Status:** dispatch-ready.

---

## § 1. Scoping

### § 1.1 What this sub-phase is

This sub-phase takes **mpm-multimaterial** from spec-Phase-1's gates 1–3 (5 spec docs + MLS-MPM quadratic-B-spline golden + 4 failing test files; committed at SHA `9de8048` per Phase 1 Stage 2) through gates 4–13 of spec § 3.5. MPM is the **seventh and LAST per-sim implementation surface** and the **first in the `hybrid-pg` category** (spec § 5.5). The sim is a hybrid particle-grid method: Lagrangian particles carry mass/velocity/affine-velocity/deformation-gradient state, while an Eulerian background grid handles force interactions via P2G → grid-update → G2P → deformation-update.

Implementation stack: **Python NumPy reference at Stack-D** per the established 9-sim language-pivot re-anchor pattern (closed-form / agent-based / RD-3D / sph-water / eulerian-smoke / LBM all shipped Python NumPy at sub-phase scope; conventions doc § A role model). **Note:** spec § 5.5 + sim-spec-ref § 1 nominally declare Stack-D Taichi for MPM (not Python NumPy). Surfaced as operator Item 1 (default lean: pivot to Python NumPy + numba). The Taichi port is deferred to Phase-2+ per the language-pivot precedent.

### § 1.2 What's different from prior sub-phases

1. **First hybrid particle-grid sim in the project.** All prior sims belonged to a single discretization family (closed-form / agent-based grid / continuous-CA / particle-only / volumetric-grid / lattice). MPM is **simultaneously** particle (Lagrangian P2G/G2P) AND grid (Eulerian momentum/force update). Determinism story has hybrid concerns from both lineages: sorted particle iteration (P24 inheritance) + deterministic grid stencil ordering for the 3×3×3 = 27-cell P2G stencil + matching G2P interpolation ordering.
2. **LAST per-sim Phase 1 sub-phase.** Closes the 9-sim arc through gates 4–13 in Stack-D Python NumPy reference; spec-Phase-2 (cross-stack replication) becomes dispatchable at `v0.2.0-phase-2`. Phase-closure observations (§ 11.2) consolidate the accumulated bank of testing-improvements + conventions-doc-refactor candidates for post-Phase-1 work.
3. **First sub-phase to consume BOTH IC-5 (particle) AND IC-6 (vector_field) Tier 2 diagnostics.** sph-water consumed IC-5 only; eulerian-smoke and LBM consumed IC-6 only. MPM exercises the hybrid surface: IC-5 `check_count_invariance` + `check_momentum_conservation` on particles, AND IC-6 on the grid momentum field. Probe § 2 enumerates this surface.
4. **Verification path is golden-only at Phase 1 sub-phase scope.** Per sim-spec-ref § 6.1, MPM ships the MLS-MPM quadratic-B-spline golden (`tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`); the linear-elasticity MMS is **declared, deferred to Phase-2+** (§ 6.2 "grid convergence on cantilever-bending; declared, deferred"). MPM is the **third golden-only sim** (closed-form, agent-based, sph-water — golden + invariants; RD-3D, eulerian-smoke, LBM — MMS-based or MMS+golden). **No new MMS surface at this sub-phase.** The MMS-runner-generalization question (banked as load-bearing for the next MMS-using sub-phase) is **NOT exercised here** — banked forward to spec-Phase-2+ Stack-C verification work per LBM § 9.3 row 1.
5. **First sub-phase whose spec target Stack is Taichi, not Python NumPy reference.** Operator Item 1 routes the language pivot. Default lean: ship Python NumPy + numba reference at this sub-phase mirroring the 9-sim precedent; Phase-2+ Stack-D Taichi port deferred. The mismatch surfaces an extra operator-routable consideration vs prior sub-phases where Python-NumPy was a strictly-additive interim before the spec-mandated Stack-C.
6. **First sub-phase to apply Task 0.4 with a sim-specific ~2-3× production-correction factor** (Python-loop-heavy due to per-particle P2G/G2P transfer; eulerian-smoke 1.45× and LBM 2.6× empirical floor were both NumPy-vectorized whole-array kernels; MPM particle loops are not naturally NumPy-vectorizable without numba or vectorized scatter-add tricks). The factor's empirical rule of thumb (LBM landing § 9.4 row 8) is sim-shape dependent; MPM sits at the higher end of that range.
7. **Spec declares `epsilon-same-stack-same-hw` determinism**, NOT bit-exact (sim-spec-ref § 8 + determinism.md: "P2G atomic scatter-add breaks bit-exactness even on identical hardware"). Sorted-particle-iteration is the principal mitigation; Python NumPy reference may over-achieve to bit-exact at sub-phase scope per conventions doc § F.4 (similar to sph-water bit-exact over-achievement). Stage 1 step 7 verifies which posture holds.
8. **Cumulative shift count enters at 82.** § N graduation, audit-template refactor for `evidence_paths` strict-verify drift (3/6 per-sim sub-phases recurring per LBM N2), cadence-routing-as-default, anchor-density-predicts-kill-rate observation, sim.py low-kill-rate pattern — all consolidate for post-Phase-1 conventions-doc refactor (§ 11.2).

### § 1.3 Stage 0 canonical-descriptor scope-analysis — load-bearing for this plan

Per conventions doc § N (treated as established here per LBM § 9.3 row 1 + § 9.4 row 8 graduation recommendation) + LBM landing § 9.4 row 8 ~1.5×-to-2.6× empirical correction range, Task 0.4 estimates feasibility against the Python NumPy reference stack BEFORE Stage 1 dispatch, applying the **~2-3× production-correction factor** appropriate for MPM's Python-loop-heavy particle-grid transfer surface.

Appendix D § D.2.3 enumerates ONE canonical descriptor:

- `drop-impact-128cube-seed42-step500`

**No probe-vs-Appendix-D drift.** Probe report § 4 references `drop-impact-128cube-seed42-step500` matching Appendix D verbatim (unlike LBM/eulerian-smoke probe drift inheritance per conventions doc § M.1 row 17). Re-verify at Stage 0.

**Pre-flight feasibility estimates** (subject to measured-floor refinement at Stage 0 per conventions doc § K.3):

| Quantity | Naive Python NumPy reference at 128³ × 500 steps | Risk surface |
|---|---|---|
| Particle count | MLS-MPM typical density 4-8 particles per active cell; 128³ = 2.10M cells; active fraction for drop-impact ~10-20%; particles ≈ **1-3M** | sph-water R20 precedent — 1M-particle scale is at the edge of the Python NumPy reference budget. |
| Per-step P2G cost (Python loops) | Per particle: 27-node stencil; 27 weight evals + 27 momentum accumulations; ~5-10 μs per particle in unaccelerated Python; 1M particles → **5-10 s/step** | **Wall-clock STRUCTURAL ALARM** at full N. |
| Per-step G2P cost | Same scale as P2G | Same. |
| Grid-update + deformation cost | NumPy-vectorizable; ~50-100 ms / step | Tractable. |
| Per-step floor naive | **5-20 s/step × 500 steps × ~3× production-correction = ~2-8 hours** | EXCEEDS 1-hour operator-routable threshold by 2-8× even after correction. |
| Memory peak | 1-3M particles × ~10 fields × 8 B + 128³ × ~7 grid fields × 8 B = ~150 MB + ~120 MB = **<500 MB** | Tractable. |
| Per-frame storage (grid momentum 3-comp + particle pos+vel 6-comp) | 128³ × 3 × 8 B + 1M × 6 × 8 B ≈ 50 MB + 48 MB = **~100 MB/frame** | Full cadence × 500 frames = ~50 GB; needs cadence-N OR contracted-descriptor. |

**Wall-clock projection at canonical N is structurally alarmed** even after the ~3× production-correction factor. Two routing paths surface pre-Stage-1:

- **Path A — `numba @njit(fastmath=False, cache=True)` on the P2G/G2P particle kernels** (conventions doc § G). Numba shifted SPH-water's bottleneck from 14 h projected to ~3 min measured (sph-water R17 → R18 → numba-integration sub-phase precedent). Expected MPM speed-up: ~50-200× on the inner-loop kernels; per-step floor drops from 5-20 s to 25-400 ms; **canonical N becomes feasible at ~10 min – 3 hours wall-clock**. Numba is the load-bearing optimisation for MPM Python-NumPy reference; pre-apply at Stage 1 step 2 (do not wait for R-class surfaces). NO new hotfix sub-phase needed — numba infrastructure landed at `sub-phase-numba-integration` (`569c883`).
- **Path B — per-sub-phase descriptor override** (sph-water R20 / conventions doc § K.4 precedent). Override `drop-impact-128cube-seed42-step500` to a contracted descriptor (e.g., `drop-impact-32cube-seed42-step500` or `drop-impact-64cube-seed42-step100`) at sub-phase scope; full canonical N contracted forward to Stack-C/E Phase-2+ port. **Per-sub-phase override sidecar metadata** records the contraction per sph-water precedent.

**Default lean (recommended):** Path A (numba) FIRST — exercises the existing numba infrastructure on a third sim (after sph-water + numba-integration), validates the @njit cache-propagation discipline carries to MPM; if Path A wall-clock projects > 1 hour even with numba, additionally apply Path B (contracted descriptor at sub-phase scope). Decision recorded in Stage 0 Task 0.4 + cited in Stage 1 commit footer.

**Storage decision:** even with Path A, raw full-cadence captures of grid+particle state at 128³ × 1M particles × 500 frames overshoots the 2 GB W1 pre-commit ceiling (raised by LBM `2edc163`). **Default cadence-N for MPM** (cadence-routing-as-default-when-feasible per LBM § 9.4 row 7 — MPM's projection breaches the W1 ceiling at full cadence, so route to cadence-N or contracted-descriptor). Stage 0 Task 0.4 records the chosen cadence + descriptor-contraction (if any) + measured per-step floor.

**STOP-AND-SURFACE pre-Stage-1** (conventions doc § K + § N): if Stage 0 Task 0.4 measured per-step floor with numba projects > 1 hour wall-clock at canonical N (i.e., Path A insufficient), surface to operator with ≥ 3 routing options (Path B contracted descriptor; Path A + cadence-N; Path A + per-sub-phase descriptor partition). HALT and wait for operator routing.

---

## § 2. Deliverables (gates 4–13)

The 13-gate per-sim acceptance contract and cross-cutting discipline are inherited from conventions doc §§ A–F + I–J. Sim-specific deltas:

| Gate | Deliverable |
|---|---|
| 4 | Reads through to gate 5. |
| 5 | **MLS-MPM quadratic-B-spline golden** — `test_quadratic_bspline_golden.py::{test_sample_values_match_golden, test_partition_of_unity_match_golden}` GREEN against `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` (absolute 1e-15). Implementation: `mpm_multimaterial.reference.shape_functions.{N, partition_of_unity_sum}`. No MMS arm at Phase 1 sub-phase scope (linear-elasticity MMS declared deferred to Phase-2+ per sim-spec-ref § 6.1). |
| 6 | Tier 1 NaN/Inf + perf + determinism scans over canonical-trajectory output — `test_tier1_health_no_nan_inf` GREEN. |
| 7 | **Tier 2 hybrid surface — FIRST sub-phase to consume BOTH IC-5 AND IC-6.** Per probe § 2: IC-5 particle `check_count_invariance` + `check_momentum_conservation` (advisory — momentum exchanges between particles and grid; conservation should hold up to floating-point in absence of forcing and BC sinks); IC-6 vector_field `check_circulation` on grid momentum field (per probe § 2; `check_divergence_free` NOT applicable — MPM grid momentum is not divergence-free); Tier 1 `check_health`. |
| 8 | Cat 1 citations: Hu 2018 (DOI 10.1145/3197517.3201293), 88-line MLS-MPM reference (citation-only — no vendored code per spec § 9.2 / R8 amendment), Steffen-Kirby-Berzins 2008 (DOI 10.1002/nme.2360). |
| 9 | Cat 2 public API per probe § 5: `mpm_multimaterial.reference.{shape_functions.N, shape_functions.partition_of_unity_sum, mls_mpm.p2g, mls_mpm.g2p, mls_mpm.deformation_update}` + `mpm_multimaterial.sim.sim_runner_seeded` + `mpm_multimaterial.invariants.{mass_conservation_p2g_g2p, partition_of_unity_b_spline}`. |
| 10 | **ONE canonical capture** per Appendix D § D.2.3: `captures/mpm-ref/<descriptor>.{h5,json}` — descriptor pinned to `drop-impact-128cube-seed42-step500` OR a Stage 0 Task 0.4 operator-routed sub-phase override (e.g., `drop-impact-32cube-seed42-step500`) per § 1.3 Path B if needed. Cadence + descriptor-contraction recorded in sidecar metadata per spec § 2.7 + sph-water R20 precedent. LFS-tracked transparently. Capture-writer surface: `tools/testkit/capture` (inherited). |
| 11 | Determinism (`test_run_twice_epsilon_diff` per probe § 6). Spec declares `epsilon-same-stack-same-hw` (sim determinism.md; P2G atomic scatter-add). Python NumPy reference at this sub-phase MAY over-achieve to bit-exact (no atomics — sorted-particle iteration + deterministic stencil sum order). Per conventions doc § F.4, record over-achievement informationally; the Phase-2+ Stack-D Taichi target remains the declared `epsilon` posture. See § 4.2 step 1 for determinism-strategy declaration. |
| 12 | Hypothesis tests for the 2 invariants declared in spec § 6.6: `mass_conservation_p2g_g2p` (random particle positions/masses; P2G → grid-identity → G2P round-trip preserves ∑m_p within FP tolerance) + `partition_of_unity_b_spline` (random particle p; ∑_{k∈{-1,0,1}} N(p − (i+k)) = 1 over the 3 neighboring grid nodes). Commit `.hypothesis/` example DB per spec § 2.14. |
| 13 | Perf-ledger first-landing row per descriptor. Mirror `hardware_id = i7-12700KF-linux-6.17` format from prior sub-phases; re-anchor at Stage 1. |
| 13 (anchor) | Phase 1 RED evidence `tools/testkit/failing-tests-evidence/mpm-multimaterial-2026-05-20T13-48-06Z.txt` (sha256 `a57251a1…81bb9edf94`, verified pre-flight) still matches; worktree replay at SHA `9de8048` reproduces `ModuleNotFoundError` collection-errors (4 test files; `mpm_multimaterial.{reference, sim, invariants}` missing). |

Acceptance for "sub-phase complete": all 13 gates GREEN for mpm-multimaterial; Cat 1/2/3/4/5/X GREEN at HEAD; B17 routing decision documented; Cat 3 disposition documented; landing audit CONFIRMED. No `-phase-N` tag (conventions doc § D.2).

---

## § 3. IC contracts inherited

Conventions doc § F-class discipline. Sim-specific consumption at HEAD:

- **IC-1** (capture I/O Python) — gates 9, 10.
- **IC-3** (determinism config Python) — gate 11.
- **IC-5** (Tier 2 `particle`) — gate 7 (particle count + momentum conservation).
- **IC-6** (Tier 2 `vector_field`) — gate 7 (grid momentum field circulation).
- **IC-8** (probe report) — `tools/testkit/probes/reports/mpm-multimaterial.md` § 5.
- **IC-9** (phase audit body) — applied per conventions doc § B.

**First sub-phase to consume IC-5 AND IC-6 together.** No new ICs. Stack-D Taichi-target ICs (Taichi GGUI / hotreload — spec § 4.4 + probe § 1) are referenced by name only; the Python NumPy reference does not consume them. Phase-2+ Stack-D Taichi port owns the GGUI + hotreload surfaces.

---

## § 4. Stages — three-stage cadence (conventions doc § A.2)

### § 4.1 Stage 0 — Pre-flight

Standard 4-task pattern per conventions doc § A.2 + sub-phase precedents, plus Task 0.4 (established per LBM § 9.3 row 1 + § 9.4 row 8 graduation lean):

- **Task 0.0** — Cross-phase replay against `v0.1.0-phase-1` with the 8-gate canonical set. Bit-identity invariant `9399fc33…909f34` per conventions doc § D.3 (**15th invocation**). Divergence → BLOCKED-with-surface.
- **Task 0.1** — Tolerance-budget carryover (`[phase].phase = "sub-phase-mpm-multimaterial"`). NO `[budgets.*]` widening.
- **Task 0.2** — Re-verify Phase 1 MPM failing-tests evidence sha256 (`a57251a1…81bb9edf94`).
- **Task 0.3 (sim-specific)** — Re-anchor the MLS-MPM quadratic-B-spline golden + derivation: sha256 `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` + `tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md` + `tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py`; re-verify `mls_mpm_quadratic_bspline.py --verify` GREEN against the table at 1e-15. Drift in any sha256 → BLOCKED-with-surface (MPM is the sole consumer). **No MMS solution to re-anchor** (linear-elasticity MMS deferred to Phase-2+).
- **Task 0.4 (established per § N — third sub-phase exercising it as such, after eulerian-smoke + LBM)** — Canonical-descriptor scope-analysis. See § 7.1 prompt for concrete checklist. Apply the **~2-3× production-correction factor** for MPM's Python-loop-heavy particle-grid transfer surface (vs the ~1.5×–2.6× empirical range from eulerian-smoke + LBM, the higher end appropriate to particle-loop sims). Output: cadence + descriptor-contraction (if any) + numba @njit decision (default lean: APPLY pre-emptively per § 1.3 Path A) + measured per-step floor. Recorded in Stage 0 checkpoint.

Closing: `stage-0-checkpoint-<UTC>.md` per conventions doc § B.3. Apply Convention #12 SHA back-fill (conventions doc § B.2; capture full 40-hex via `git rev-parse HEAD`).

### § 4.2 Stage 1 — Per-sim implementation (one session — single-session lean per eulerian-smoke + LBM N3 precedent)

One sim (mpm-multimaterial). Single sub-bundle commit covering gates 4–13. 10-step sequence:

1. **Determinism-strategy declaration first** (conventions doc § F.1). Docstring at top of `mpm_multimaterial/sim.py` enumerating: (i) sorted-particle iteration order (lexicographic by initial particle index — P24 inheritance from sph-water); (ii) deterministic 27-cell P2G stencil ordering (fixed lexicographic over the 3×3×3 grid-offset cube); (iii) matching G2P interpolation ordering (same stencil order, same precision arithmetic); (iv) no atomics in Python NumPy reference (scatter-add via sorted-index `np.add.at` OR direct iteration — both deterministic); (v) fixed-precision arithmetic; particle masses/velocities/F float64; grid momentum float64; (vi) RNG threading through `common_py.determinism.Config` for any randomised IC (drop-impact ICs analytic OR seeded-RNG sampled); (vii) no BLAS/FMA path — pure NumPy + numba `@njit(fastmath=False, cache=True)` per conventions doc § G; (viii) multimaterial volume/density tracking — each material's volume-fraction tracked separately to avoid cross-material drift; (ix) Phase-2+ deferred — Stack-D Taichi atomic-scatter-add (yields `epsilon` posture per sim determinism.md), driver FMA fusion, GPU subgroup-collective ops. Cite the docstring in the Stage 1 commit footer per conventions doc § C.3.
2. **Implement.** `mpm_multimaterial.reference.shape_functions.{N, partition_of_unity_sum}` (Python — small enough to skip numba) + `mpm_multimaterial.reference.mls_mpm.{p2g, g2p, deformation_update}` (numba `@njit(fastmath=False, cache=True)` per Stage 0 Task 0.4 finding) + `mpm_multimaterial.sim.sim_runner_seeded` + `mpm_multimaterial.invariants.{mass_conservation_p2g_g2p, partition_of_unity_b_spline}`. Multi-material constitutive table per algebraic.md § 3: viscoelastic neo-Hookean + plastic von-Mises + granular Drucker-Prager (declare surfaces; populate per the drop-impact descriptor's material spec).
3. **Gate-5 golden — MLS-MPM quadratic B-spline.** Wire `test_quadratic_bspline_golden.py` against the 10 sample points + 3 partition-of-unity points in the golden JSON; assert each value within absolute 1e-15.
4. **pytest** packages/mpm-multimaterial/tests/ -v → all 4 test files GREEN; capture verbatim to `tools/testkit/failing-tests-evidence/mpm-multimaterial-implemented-<UTC>.txt`; sha256. Phase 1 RED evidence UNTOUCHED.
5. **Produce ONE canonical capture** per § 2 gate 10 + Stage 0 Task 0.4 descriptor + cadence + (if applicable) per-sub-phase contraction. Write `captures/mpm-ref/<descriptor>.{h5,json}`. LFS-auto. STOP-and-surface if measured per-step floor at runtime exceeds Stage 0 estimate by > 3× (conventions doc § K.3 + § N second-line guard).
6. **Determinism (gate 11).** `test_run_twice_epsilon_diff` GREEN. Stage 0 Task 0.4 may indicate the Python NumPy reference over-achieves to bit-exact (no atomics; sorted iteration). Record posture (bit-exact OR epsilon) in commit footer per conventions doc § F.4; the spec-declared `epsilon-same-stack-same-hw` remains the Phase-2+ Stack-D Taichi target.
7. **PBT (gate 12).** Hypothesis tests for the 2 invariants — `mass_conservation_p2g_g2p` (random small-N particle clouds; P2G → grid-identity → G2P round-trip; assert ∑m_p preserved within FP) + `partition_of_unity_b_spline` (random p ∈ ℝ; ∑_{k∈{-1,0,1}} N(p − (i+k)) = 1 within FP). Commit `.hypothesis/` DB.
8. **Perf-ledger.** ONE row PER descriptor (one capture descriptor at MPM; mirror hardware_id; cite Stage 0 Task 0.4 measured-vs-projected ratio).
9. **Gate-13 worktree replay.** Worktree at SHA `9de8048` (conventions doc § E) — NOT partial checkout. Assert 4 `ModuleNotFoundError` collection errors match Phase 1 RED.
10. **Commit.** `feat(mpm-multimaterial-stage1): implementation through gate 13`. Footer per conventions doc § C.3: Phase 1 RED + new GREEN evidence sha256, capture sidecar path + descriptor .h5 sha256, perf-ledger wall_clock_seconds, determinism-strategy docstring summary, MLS-MPM quadratic-B-spline golden re-verification (2 tests × 13 values absolute 1e-15), Stage 0 Task 0.4 finding citation (descriptor + cadence + numba decision + ~2-3×-corrected vs measured ratio — **third data point** for the empirical convention after eulerian-smoke 1.45× + LBM 2.6×).

Closing: `stage-1-checkpoint-<UTC>.md` per conventions doc § B.3. Apply Convention #12 SHA back-fill (full 40-hex via `git rev-parse HEAD`).

### § 4.3 Stage 2 — Landing

Inherits Steps 2.1 → 2.11 structure from prior sub-phases via conventions doc § A.2 + § B-class discipline. Sim-specific items:

- **Step 2.3 — Cat 3 `hybrid-pg` subdir disposition (conventions doc § I) — DECISION A (lift + pickup), NOT NO-OP.** MPM ships a golden table at `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` (gate-5). At HEAD the file has ONE `test_points` entry with ONE `independent_reference` block containing four packed citations (hand-derivation + Hu 2018 + Steffen-Kirby-Berzins 2008 + Python re-derivation). Per conventions doc § I.3 anchor-count semantics, this counts as **1 anchor** — below the spec § 2.4 R9 floor of ≥ 3. Mirrors LBM `lattice/d3q19-equilibrium.json` precedent verbatim. Disposition: Decision A (lift + pickup). Two-commit shape per conventions doc § I.2 + LBM precedent:
  - `chore(mpm-multimaterial-stage2-cat3-anchors): lift mls-mpm-shape-functions golden to ≥ 3 discrete anchors`
  - `chore(mpm-multimaterial-stage2-cat3-subdirs): extend _SUBDIRS_PICKED_UP for hybrid-pg subdir`

  Pre-flight at Stage 2 verifies `_SUBDIRS_PICKED_UP` at HEAD is `(Path("closed-form"), Path("agent-based"), Path("particle-fluids"), Path("lattice"))` — unchanged since LBM landing.
- **Step 2.5 — Gate-13 worktree replay** at SHA `9de8048` (conventions doc § E).
- **Step 2.6 — Append-only check.** Protected set includes Phase 0 + Phase 1 Stage 3 + closed-form + agent-based + replay-tool-hotfix + RD-3D + numba-integration + sph-water + mutation-script-hotfix + conventions-consolidation + eulerian-smoke + git-lfs-migration + **LBM (`4f79e19`)** SHAs (13 protected sets at Stage 2 close).
- **Step 2.7 — B17 mutation-score artifact (OPERATOR-ROUTABLE; lean PATH-A continue — fifth-and-FINAL proof-point).** Conventions doc § J. PATH-A has now been exercised across 4 sim categories (continuous-ca / particle-fluids / volumetric-grid / lattice); MPM as hybrid-pg is the natural fifth-and-final proof-point closing the per-sim Phase 1 PATH-A arc. Sim-source kill-rate trend across four landed proof-points: **0.5927 → 0.5581 → 0.4879 → 0.5354** (mean 0.5435; range [0.4879, 0.5927]). Two options:
  - **PATH-A continue (LEAN — fifth-and-final proof-point closing the per-sim Phase 1 mutation arc)**: additively extend `tools/testkit/mutation/mutmut-config.toml` with `[tool.mutmut.targets.mpm_multimaterial]` block. Existing targets UNCHANGED. Use `--disable-mutation-types string,fstring` per conventions doc § J.3. Artifact: `tools/testkit/mutation/sub-phase-mpm-multimaterial-<UTC>.json`. Commit slug: `chore(mpm-multimaterial-stage2-mutation-pathA): per-target extension + mpm-multimaterial baseline`.
  - **PATH-A rebank (ALT)**: if operator judges the trend signals diminishing returns (vs the more load-bearing follow-up being a focused test-augmentation sub-phase against accumulated surviving-mutant IDs), skip MPM mutation at this sub-phase. Commit slug: `chore(mpm-multimaterial-stage2-mutation-rebank): mpm-multimaterial mutation banked`.

  **Numba-mutation note**: MPM uses `@njit(fastmath=False, cache=True)` on P2G/G2P per § 4.2 step 2. Sph-water Stage 2 N3 confirmed numba cache-propagation through source mutation. MPM is the **second** numba-using PATH-A proof-point (after sph-water `dfsph.py`).

  STOP-and-surface precondition (conventions doc § J.5 / sph-water R15 inheritance): if PATH-A is dispatched and mutmut runtime against the canonical-capture generation tests explodes (MPM's per-step floor with numba is small per Stage 0 Task 0.4; risk lower than sph-water 1M-scale R15). Per-target runner can exclude gate-10 capture-generation tests per conventions doc § J.4 if needed.
- **Step 2.8 — CHANGELOG additive entry.** Append `### sub-phase-mpm-multimaterial` under [Unreleased]. Itemize: gate-13 GREEN-flip; first hybrid-pg sim; **9-sim Phase 1 arc closure**; MLS-MPM quadratic-B-spline golden GREEN; Cat 3 Decision A lift + `hybrid-pg` subdir pickup; one canonical capture via LFS (cadence + descriptor per Stage 0 Task 0.4); Stage 0 Task 0.4 third practical application; per-sub-phase canonical-descriptor override (if applied per § 1.3 Path B); first IC-5+IC-6 dual-Tier-2 consumer; perf-ledger first-landing row; B17 routing outcome (fifth-and-final proof-point or rebank).
- **Step 2.9 — Sub-phase landing audit** per conventions doc § B.3. Include § 12 retrospective on Task 0.4 ~2-3× factor (third data point — eulerian-smoke 1.45×, LBM 2.6×, MPM TBD — load-bearing for the empirical convention's stabilization). Also a § 13 phase-closure retrospective: spec-Phase-2 dispatchability + accumulated bank of post-Phase-1 work consolidation (§ 11.2).
- **Step 2.10 — Convention #12 SHA back-fill.** NEVER `--amend`. Capture full 40-hex via `git rev-parse HEAD`.
- **Step 2.11 — Tag posture per conventions doc § D.2.** No `-phase-N` (the next phase tag `v0.2.0-phase-2` is operator-only at spec-Phase-2 close). **Special phase-closure consideration:** this is the LAST per-sim Phase 1 sub-phase. Optional intermediate point-release `v0.1.7` (no `-phase-N` suffix; banked default lean — no tag), OR a `v0.1.x` final-pre-Phase-2 marker (no `-phase-N`). Surfaced as operator Item 5; default lean: NO tag per consistent 6-sub-phase precedent.

---

## § 5. Dispatch workflow

Per conventions doc § A.3 (role model — one Claude Code agent per stage, one coordinator chat, one operator). Identity reads "mpm-multimaterial sub-phase coordinator chat". § 7 prompts are the dispatchable units.

---

## § 6. Coordinator prompt

Inherits per conventions doc § A.3 + prior-sub-phase template; identity "mpm-multimaterial sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + MLS-MPM golden reverify + Task 0.4 scope-analysis (descriptor + cadence + numba decision) | pending | — | — | — |
| 1 | MPM implementation (gates 4–13; MLS-MPM golden + Tier 2 hybrid; one canonical capture via LFS) | pending | — | — | — |
| 2 | integrity + replay sweep + **Cat 3 Decision A lift + `hybrid-pg` pickup** + B17 routing | pending | — | — | — |
| 2 | CHANGELOG + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these standing orders (inherited from conventions doc § C + sub-phase precedents):

- Commit slug `chore` / `feat` / `docs` with `mpm-multimaterial-stage<N>-<scope>` form per conventions doc § C.1.
- Stack is pytest (Python NumPy reference + numba). NO Taichi at this sub-phase (Phase-2+ Stack-D port).
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` per conventions doc § B.3.
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256. FACT/INFERENCE tagging.
- Convention A — additive edits only; never edit any audit / golden / spec / probe committed at `v0.1.0-phase-1` or within prior sub-phase audit chains (12 prior protected sets at Stage 2 close per § 4.3 Step 2.6).
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close per conventions doc § B.2. Capture full 40-hex via `git rev-parse HEAD`; never transcribe short-SHA (eulerian-smoke § 9.3 row 5).
- Operator-only tag-pushing.
- LFS infrastructure transparent — `git add captures/mpm-ref/*.h5` invokes LFS automatically per `.gitattributes`.
- When stuck → conventions doc § K (R-class STOP-AND-SURFACE) + § 9 below (P22 + P24 inherited apply directly to particle-iteration determinism; P26 added if particle-grid hybrid transfer surfaces a genuinely novel failure mode per § 9.2).

### § 7.1 Stage 0 — Pre-flight

```
You are the mpm-multimaterial sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/conventions/sub-phase-conventions.md — read FIRST. Sections A, B, C, D, E, F, G (numba — load-bearing for MPM Stage 1), I, J, K, L, M, N. Treat § N as ESTABLISHED discipline per the LBM landing § 9.3 row 1 + § 9.4 row 8 graduation recommendation (the conventions doc itself still says PROPOSED; graduation banked for operator at MPM landing).
  2. docs/phases/sub-phase-mpm-multimaterial.md (this charter; § 7 standing orders).
  3. docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md (most-recent per-sim sub-phase landing; § 9.3 / § 9.4 banked observations; § 7.6 B17 PATH-A fourth proof-point trend).
  4. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md (R12-R20 arc — load-bearing for MPM Task 0.4 sim-shape parallels; canonical-descriptor override precedent).
  5. docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md (numba project infrastructure; @njit(fastmath=False, cache=True) discipline; load-bearing for MPM Stage 1 step 2).
  6. docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md (Phase 1 landing — MPM TDD bootstrap at 9de8048; Phase 1 RED evidence sha256 a57251a1…81bb9edf94).
  7. docs/sim-specs/hybrid-pg/mpm-multimaterial/{README,spec-ref,algebraic,determinism,equivalence}.md (spec source of truth).
  8. tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json + tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md + tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py (re-anchor targets).
  9. tools/testkit/probes/reports/mpm-multimaterial.md (probe report; § 4 descriptor matches Appendix D verbatim — no probe-vs-Appendix-D drift).
  10. docs/common/numba.md (numba convention; load-bearing for Stage 1 — Stage 0 Task 0.4 surfaces numba decision).

Stage 0 is pre-flight only; you do NOT implement MPM. Execute Tasks 0.0 → 0.4 → closing per charter § 4.1:

  Task 0.0 — Cross-phase replay against phase-1 with the 8-gate canonical set per conventions doc § D.5 invocation. BIT-IDENTITY INVARIANT 9399fc33…909f34 (conventions doc § D.3) — this is the 15th invocation. Divergence → BLOCKED-with-surface.

  Task 0.1 — Tolerance-budget carryover. [phase].phase = "sub-phase-mpm-multimaterial"; bump opened_at. NO [budgets.*] widening. Commit: chore(mpm-multimaterial-stage0-tolerance-budget): sub-phase carryover from phase-1.

  Task 0.2 — sha256 tools/testkit/failing-tests-evidence/mpm-multimaterial-2026-05-20T13-48-06Z.txt; compare to Phase 1 landing audit's value a57251a19b28888e664402e9c92eb681fa17719be7e156154df3d681bb9edf94. Mismatch → BLOCKED.

  Task 0.3 — Re-anchor the MLS-MPM quadratic-B-spline golden + derivation.
    (a) sha256 tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json — record (will be re-verified at Stage 1 step 3 with absolute 1e-15 against 10 sample points + 3 partition-of-unity points). DO NOT modify.
    (b) sha256 tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md — record. DO NOT modify.
    (c) sha256 tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py — record. DO NOT modify.
    (d) Execute `uv run python tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py --verify` — assert GREEN at 1e-15 against the table. Drift → BLOCKED-with-surface.
    No MMS solution to re-anchor (linear-elasticity MMS deferred per spec-ref § 6.1).

  Task 0.4 — Canonical-descriptor scope-analysis (per conventions doc § N treated as ESTABLISHED; third sub-phase exercising it after eulerian-smoke + LBM).
    Read:
      - Appendix D § D.2.3 entry for mpm-multimaterial `ref`: SINGLE descriptor `drop-impact-128cube-seed42-step500`.
      - probe report § 4: documents `drop-impact-128cube-seed42-step500` (NO drift — matches Appendix D verbatim).
      - sim spec-ref § 5 (Phase 1 deliverable: package scaffold + failing tests; Phase 2+ contract: Python Taichi reference — pivot to Python NumPy at this sub-phase per Item 1 default lean).
      - sim spec-ref § 6.6 (PBT invariants — 2 declared).
      - charter § 1.3 (pre-flight feasibility estimates — wall-clock STRUCTURAL ALARM at naive Python; numba expected mitigation).
    For the descriptor, estimate against the Python NumPy + numba @njit reference stack:
      (a) STORAGE: per-frame payload (grid momentum 128³ × 3 × 8 B ≈ 50 MB + particle pos+vel ~1-3M × 6 × 8 B ≈ 50-150 MB) × frame count. At full cadence × 500 frames → ~50 GB — overshoots W1 2 GB ceiling. Report at cadence-N decimation N ∈ {1, 10, 50, 100} and per-sub-phase descriptor contraction options (32³, 64³).
      (b) MEMORY: particle storage (10 fields × 1-3M × 8 B) + grid storage (7 fields × 128³ × 8 B) + 27-stencil scratch. vs host RAM headroom.
      (c) WALL-CLOCK: per-step floor — MEASURED, not projected. Execute a one-shot micro-bench at HEAD:
            uv run python -c "import numpy as np; from numba import njit; import time;
            @njit(fastmath=False, cache=True)
            def p2g_stencil_step(particles, grid): …  # skeletal P2G into 3³ cube
            … bench at N_particles=10K and grid 32³; extrapolate to canonical N via linear-in-particles scaling …"
        Apply ~2-3× production-correction factor (Python-loop-heavy particle-grid transfer surface; LBM 2.6× was upper-bound for NumPy-vectorized; MPM particle loops are at the higher end). Compare against operator-routable threshold of 1 hour per descriptor; surface routing if exceeded.
      (d) NUMBA DECISION: default lean APPLY @njit(fastmath=False, cache=True) pre-emptively on P2G/G2P kernels per § 1.3 Path A. Numba infrastructure already landed at sub-phase-numba-integration (569c883); MPM is the second sim consumer (after sph-water). Record decision.
    Decision tree:
      - If estimates fit ceilings WITH numba + cadence-N: proceed to Stage 1; record cadence + descriptor (canonical OR contracted) + measured per-step floor.
      - If estimates exceed ceilings even with numba: surface ≥ 3 routing options (per-sub-phase descriptor contraction per sph-water R20; cadence-N + contracted descriptor combination; descriptor partition forward to Stack-D Taichi Phase-2+). HALT and wait for operator routing.
    Record descriptor + cadence + numba decision + measured wall-clock floor in Stage 0 checkpoint § 4 + cite at closing surface. Document the ~2-3×-factor verification as a third data point for the empirical convention (eulerian-smoke 1.45× + LBM 2.6× + MPM TBD).

  Closing — Commit docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-checkpoint-<UTC>.md per conventions doc § B.3. Body includes bit-identity replay sha256 + Task 0.3 MLS-MPM golden reverify + Task 0.4 scope-analysis findings (descriptor + cadence + numba decision + wall-clock floor). Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit + Convention #12 SHA back-fill (NEW commit, NEVER --amend; capture full 40-hex via `git rev-parse HEAD`). Then stop. Surface to operator.

Out of scope: any sim implementation; any edit outside tolerance-budget.toml + new audit files; any edit to the MLS-MPM golden / derivation / generator (Stage 2 owns the anchor lift); Stack-D Taichi port (Phase-2+); any tag.
```

### § 7.2 Stage 1 — Per-sim implementation

```
You are the mpm-multimaterial sub-phase Claude Code agent, Stage 1 (per-sim implementation) for Bit-Physics.

Read:
  1. docs/conventions/sub-phase-conventions.md — reads-first. § F (determinism), § G (numba — LOAD-BEARING), § C.3 (commit footer), § E (gate-13 worktree).
  2. docs/phases/sub-phase-mpm-multimaterial.md §§ 1.2, 1.3, 2 (per-gate deliverables), 3 (IC contracts), 4.2 (Stage 1 10-step sequence), 7 (standing orders), 9 (playbook + P26 if added).
  3. docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-checkpoint-<UTC>.md (Stage 0 close — replay PASS bit-identity, MLS-MPM golden reverify, Task 0.4 descriptor + cadence + numba decision + wall-clock floor — LOAD-BEARING for steps 2, 5).
  4. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md (sorted-particle iteration P24; per-sub-phase descriptor override precedent; numba R18 → R20).
  5. docs/_audits/phase-1/sub-phase-numba-integration/landing-2026-05-21T11-22-24Z.md + docs/common/numba.md (numba convention — @njit(fastmath=False, cache=True), banned flags).
  6. docs/sim-specs/hybrid-pg/mpm-multimaterial/{README,spec-ref,algebraic,determinism,equivalence}.md (algorithm + invariants + tolerance source of truth).
  7. tools/testkit/probes/reports/mpm-multimaterial.md (§ 5 public-API contract; § 2 diagnostics surface — IC-5 particle AND IC-6 vector_field).
  8. tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json + tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md (DO NOT MODIFY at Stage 1 — Stage 2 owns the anchor lift).
  9. packages/mpm-multimaterial/tests/test_{quadratic_bspline_golden,determinism,diagnostics,pbt_invariants}.py (the GREEN target; DO NOT modify Phase 1 test contracts).

Scope — ONE sim. ONE canonical capture per Appendix D § D.2.3:
  drop-impact-128cube-seed42-step500   (OR per-sub-phase contraction per Stage 0 Task 0.4)
Cadence + descriptor per Stage 0 Task 0.4 finding. NO MMS — golden-only gate-5.

**Determinism-strategy declaration FIRST** (conventions doc § F.1). Docstring at top of mpm_multimaterial/sim.py covering 9 clauses per charter § 4.2 step 1, including sorted-particle iteration (P24 inheritance), deterministic 27-cell P2G stencil ordering, matching G2P interpolation, no-atomics-in-Python-reference, multimaterial volume tracking, and Phase-2+ Stack-D Taichi atomic-scatter-add deferred. Cite in commit footer.

Deliver gates 4–13 in one sub-bundle commit per the 10-step sequence in charter § 4.2:
  1. Determinism docstring.
  2. Implement mpm_multimaterial.reference.shape_functions (N, partition_of_unity_sum) — Python, no numba (small kernel; sub-microsecond per call). Implement mpm_multimaterial.reference.mls_mpm (p2g, g2p, deformation_update) — numba @njit(fastmath=False, cache=True) per Stage 0 Task 0.4 decision + conventions doc § G. Implement mpm_multimaterial.sim.sim_runner_seeded + mpm_multimaterial.invariants per spec-ref + algebraic.md.
  3. Gate-5 golden: wire test_quadratic_bspline_golden.py against the JSON's 10 sample points + 3 partition-of-unity points; assert each within absolute 1e-15.
  4. pytest packages/mpm-multimaterial/tests/ -v → all 4 test files GREEN; capture verbatim to tools/testkit/failing-tests-evidence/mpm-multimaterial-implemented-<UTC>.txt + sha256. Phase 1 RED evidence UNTOUCHED.
  5. Produce ONE canonical capture per § 2 gate 10 + Stage 0 Task 0.4 descriptor + cadence + (if applicable) per-sub-phase contraction. Write captures/mpm-ref/<descriptor>.{h5,json}. LFS-auto. STOP-and-surface if measured per-step floor at runtime exceeds Stage 0 estimate by > 3× (conventions doc § K.3 + § N second-line guard).
  6. Determinism: capture-twice-and-diff (test_run_twice_epsilon_diff GREEN). Stage 0 Task 0.4 may indicate the Python NumPy reference over-achieves to bit-exact (no atomics; sorted iteration + deterministic stencil sum). Record posture (bit-exact OR epsilon) in commit footer per conventions doc § F.4.
  7. PBT: 2 invariants — mass_conservation_p2g_g2p (random small-N particle cloud; P2G → grid-identity → G2P round-trip; ∑m_p preserved within FP tolerance); partition_of_unity_b_spline (random p ∈ ℝ; ∑_{k∈{-1,0,1}} N(p − (i+k)) = 1 within FP). Commit .hypothesis/ DB.
  8. Perf-ledger: ONE row PER descriptor. Mirror hardware_id from prior sub-phases; re-anchor against actual hardware.
  9. Gate-13 worktree replay (conventions doc § E): git worktree add /tmp/bp-replay-9de8048-mpm 9de8048; PYTHONPATH=. uv run pytest packages/mpm-multimaterial/tests/ -v in the worktree; sha256 the output; assert failure-mode matches Phase 1 RED (4 ModuleNotFoundError collection errors for mpm_multimaterial.{reference, sim, invariants}); remove the worktree.
  10. Commit: feat(mpm-multimaterial-stage1): implementation through gate 13. Footer cites: Phase 1 RED evidence sha256, new GREEN evidence sha256, capture sidecar path + descriptor .h5 sha256, perf-ledger wall_clock_seconds, determinism-strategy docstring summary (9 clauses), MLS-MPM quadratic-B-spline golden re-verification (2 tests × 13 values absolute 1e-15), Stage 0 Task 0.4 finding citation (descriptor + cadence + numba decision + ~2-3×-corrected vs measured ratio — third data point for the empirical convention).

If Stage 1 runs long: stop at a clean cut-point per conventions doc § A.2 (after step 4 OR after step 6) and commit a partial checkpoint per conventions doc § B.3 (supersedes:-chain at the final checkpoint). Single-session lean expected per eulerian-smoke + LBM N3 precedent.

Closing — Commit docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-1-checkpoint-<UTC>.md per conventions doc § B.3. Body: 13-row gate-status table + per-descriptor capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + determinism summary (bit-exact OR epsilon posture) + SHIFTED / banked items. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit + Convention #12 SHA back-fill (full 40-hex). Then stop.

Out of scope: modifying any Phase 1 / prior-sub-phase artifact; the MLS-MPM golden / derivation / generator (Stage 2 owns the anchor lift); generalizing tools/testkit/code_verification/mms/runner.py (banked to Phase-2+ Stack-C); implementing any other Phase 1 sim; touching convergence files (Stage 2 owns); Stack-D Taichi port (Phase-2+).

Stuck → conventions doc § K (R-class STOP-AND-SURFACE) + charter § 9 (P22 + P24 inherited apply directly to particle-iteration determinism; P26 if added — particle-grid hybrid transfer debugging).
```

### § 7.3 Stage 2 — Landing

```
You are the mpm-multimaterial sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/conventions/sub-phase-conventions.md (§§ A.2, B, C, D, I, J load-bearing at Stage 2).
  2. docs/phases/sub-phase-mpm-multimaterial.md §§ 4.3, 7.
  3. docs/_audits/phase-1/sub-phase-mpm-multimaterial/{stage-0-checkpoint-<UTC>.md, stage-1-checkpoint-<UTC>.md}.
  4. docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md (most-recent per-sim landing; § 7 Stage 2 step structure precedent; § 7.1 Cat 3 Decision A two-commit lift PRECEDENT MIRRORED VERBATIM; § 7.6 B17 PATH-A fourth proof-point; § 9.3 + § 9.4 banked observations).
  5. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md (§ 7.1 Cat 3 Decision A first-of-three precedent; numba-mutation propagation N3 — load-bearing for MPM PATH-A continue against @njit code).
  6. tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json (Cat 3 anchor lift target — Stage 2 owns).
  7. tools/integrity/integrity/cat3_numerical/golden_values.py (the _SUBDIRS_PICKED_UP module-level tuple to extend additively).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A). Read the file first; append.

Execute Steps 2.1–2.11 per charter § 4.3 + conventions doc § A.2. Load-bearing items:

  Step 2.3 — Cat 3 `hybrid-pg` subdir disposition — **DECISION A (lift + pickup)**, NOT NO-OP.
    Pre-flight state: _SUBDIRS_PICKED_UP at HEAD = (Path("closed-form"), Path("agent-based"), Path("particle-fluids"), Path("lattice")). MPM ships MLS-MPM quadratic-B-spline golden at tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json with 1 test_points entry + 1 independent_reference block + 4 packed citations (= 1 anchor per conventions doc § I.3). Spec § 2.4 R9 floor is ≥ 3 anchors. Lift required (mirrors LBM lift verbatim).
    Two-commit shape:
      (i) chore(mpm-multimaterial-stage2-cat3-anchors): lift mls-mpm-shape-functions golden to ≥ 3 discrete anchors. Restructure the existing test_points[0].independent_reference packed-citation block into 3-4 discrete test_points entries, one per citation: (1) hand-derivation from § 2 of derivations/mls-mpm-quadratic-bspline.md; (2) Hu et al. 2018 § 3 + 88-line reference mls-mpm88.cpp; (3) Steffen-Kirby-Berzins 2008 § 3 Eq. (15); (4) Python re-derivation by tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py. Each test_points entry has identical inputs (the quadratic-B-spline sample + partition-of-unity points) and identical expected values but a distinct independent_reference.source citation. Mechanical restructuring per § I.3 — preserve every citation verbatim. Re-verify the generator's --verify path still GREEN against the lifted JSON.
      (ii) chore(mpm-multimaterial-stage2-cat3-subdirs): extend _SUBDIRS_PICKED_UP for hybrid-pg subdir. Edit tools/integrity/integrity/cat3_numerical/golden_values.py to append Path("hybrid-pg") to the _SUBDIRS_PICKED_UP tuple. Verify Cat 3 anchor-count now picks up the mls-mpm-shape-functions.json file at ≥ 3 anchors.
    Verify pre-flight at Stage 2 that no incidental golden was added under tools/testkit/golden/tables/hybrid-pg/ during Stage 1 (only mls-mpm-shape-functions.json expected, unchanged from Phase 1).

  Step 2.5 — Gate-13 replay (conventions doc § E). Worktree at 9de8048. Record both RED-replay outcome and HEAD-GREEN outcome.

  Step 2.7 — B17 mutation-score artifact (OPERATOR-ROUTABLE — LEAN PATH-A continue, fifth-and-FINAL proof-point closing the per-sim Phase 1 mutation arc).
    Coordinator's prior leans: closed-form / agent-based PATH-B; RD-3D / sph-water / eulerian-smoke / LBM PATH-A continue (proof-points 1, 2, 3, 4). Sim-source kill-rate trend: 0.5927 → 0.5581 → 0.4879 → 0.5354 (mean 0.5435; range [0.4879, 0.5927]).
    LEAN PATH-A-continue: additively extend tools/testkit/mutation/mutmut-config.toml with [tool.mutmut.targets.mpm_multimaterial] block (paths-to-mutate: packages/mpm-multimaterial/mpm_multimaterial/; tests-dir: packages/mpm-multimaterial/tests/). Existing testkit/integrity/RD-3D/sph-water/eulerian_smoke/lattice_boltzmann_d3q19/incompressible_ns_2d_mms targets UNCHANGED. Use --disable-mutation-types string,fstring per conventions doc § J.3. Artifact: tools/testkit/mutation/sub-phase-mpm-multimaterial-<UTC>.json. Commit slug: chore(mpm-multimaterial-stage2-mutation-pathA): per-target extension + mpm-multimaterial baseline.
    SECOND numba-using PATH-A target (sph-water dfsph.py was the first). The numba cache-propagation discipline from sph-water Stage 2 N3 carries forward; mutmut mutates the source, numba's cache=True keys off source-hash and invalidates per-mutant.
    ALT PATH-A-rebank: if operator judges the four-data-point trend signals diminishing returns from a fifth proof-point (alternative: dispatch a focused test-augmentation sub-phase post-Phase-1 against accumulated surviving-mutant IDs per sph-water § 9.2 / LBM § 9.3 row 2 banked items), skip MPM mutation at this sub-phase. Commit slug: chore(mpm-multimaterial-stage2-mutation-rebank): mpm-multimaterial mutation banked.
    STOP-and-surface precondition (conventions doc § J.5 / sph-water R15 inheritance): if PATH-A is dispatched and mutmut runtime against canonical-capture tests explodes, STOP. Likely low-risk for MPM at numba speeds + Stage 0 Task 0.4-bounded descriptor.
    Do NOT pre-decide; operator routes at Stage 2 dispatch.

  Step 2.8 — CHANGELOG additive entry per charter § 4.3 list. Special phase-closure note: this is the LAST per-sim Phase 1 sub-phase; spec-Phase-2 dispatchable at v0.2.0-phase-2.

  Step 2.9 — Sub-phase landing audit per conventions doc § B.3. Front-matter: artifact: sub-phase, artifact_id: sub-phase-mpm-multimaterial, both head_sha: AND head_sha_at_checkpoint:. Include § 12 retrospective on Task 0.4 ~2-3× factor (third data point — eulerian-smoke 1.45×, LBM 2.6×, MPM TBD; load-bearing for empirical-convention stabilization); § 13 phase-closure retrospective (9 sims GREEN at gates 4-13; accumulated bank of testing-improvements + § N graduation + audit-template refactor consolidates for post-Phase-1 conventions-doc refactor). Verdict-state CONFIRMED.

  Step 2.10 — Convention #12 SHA back-fill. NEVER --amend. Capture full 40-hex via `git rev-parse HEAD`.

  Step 2.11 — Final summary. No -phase-N tag. Optional v0.1.7 non-phase point-release banked for operator (default lean: no tag per consistent 6-sub-phase precedent; phase-closure special framing surfaced — operator may want to consider). Surface to operator: "mpm-multimaterial sub-phase landed at SHA <final>. MPM ships all 13 gates GREEN — FIRST hybrid-pg sim; FIRST IC-5+IC-6 dual-Tier-2 consumer; SECOND numba-using sub-phase; MLS-MPM quadratic-B-spline golden GREEN at absolute 1e-15. **Phase 1 per-sim implementation arc CLOSED — all 9 sims GREEN through gates 4-13; spec-Phase-2 (cross-stack replication) DISPATCHABLE at v0.2.0-phase-2.** Phase 0 + Phase 1 + seven prior sub-phases unaffected. Cat 3 hybrid-pg subdir: Decision A lift (1 → ≥3 anchors) + pickup landed. B17 routing: <PATH-A-continue with kill-rates / PATH-A-rebank with rationale>. Task 0.4 ~2-3× rule of thumb confirmed/refined as third data point. § N graduation PROPOSED→established + audit-template refactor + cadence-routing-as-default + anchor-density-predicts-kill-rate observation: all banked for post-Phase-1 conventions-doc refactor. MMS-runner generalization remains banked, three inline examples — now load-bearing for spec-Phase-2+ Stack-C verification work. No -phase-N tag pushed; optional v0.1.7 banked. Next: post-Phase-1 conventions-doc refactor + spec-Phase-2 dispatch."

Stuck → conventions doc § K + charter § 9 + Phase 1 charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits conventions doc § A.2 + § B.3 + § B.4. Paths:

- Stage 0 / Stage 1 checkpoints: `docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-<N>-checkpoint-<UTC>.md`.
- Stage 2: the sub-phase landing audit itself.
- Continuation prompt with `mpm-multimaterial-stage<N>-...` slug.

Convention #12 SHA back-fill at EVERY stage close (conventions doc § B.2). Capture full 40-hex via `git rev-parse HEAD`; never transcribe short-SHA.

---

## § 9. Risk surface and playbook

Risks inherited via conventions doc § K. Sim-specific:

- **R-MPM-1 (P2G stencil ordering mismatch between numba-jitted kernel and Python reference).** The 27-cell P2G stencil must iterate in deterministic order; a different ordering in the numba-jitted hot kernel vs the Python reference shape-functions produces FP-equivalent-but-not-bit-identical output. Mitigation: enforce identical lexicographic iteration order at both call sites; cite the ordering convention in the determinism docstring.
- **R-MPM-2 (Multimaterial volume-fraction drift).** Multi-material constitutive models (viscoelastic, plastic, granular) update deformation gradient per-particle per-material; cross-material volume tracking can drift if material indices are not stable across P2G/G2P round-trips. Mitigation: pin material indices at particle init; volume-fraction PBT spot-check at gate 12.
- **R-MPM-3 (Quadratic B-spline base-node convention).** Spec algebraic.md § 1 and golden's `base_node_convention` field both specify `base = floor(p + 0.5) - 1`; particle interacts with base, base+1, base+2. A different base-node convention (e.g., `floor(p) - 1`) yields a permuted weight set at the same particle position, breaking partition-of-unity by ±dx — silent off-by-one with no NaN/Inf signal. Mitigation: cite the base-node convention verbatim in determinism docstring; partition-of-unity PBT covers this surface at gate 12.
- **R-MPM-4 (Numba @njit cache invalidation on multi-arg signatures).** P2G and G2P pass multiple ndarray arguments; numba's cache=True must observe ALL arg dtype/shape signatures for invalidation. A new dtype combination at canonical capture time vs Stage 1 dev time can silently miss the cache and produce stale output. Mitigation: warm the numba cache at module-load with the canonical-capture signatures; pin dtypes in the @njit signatures explicitly per docs/common/numba.md § 2.
- **R-MPM-5 (Particle count interpretation at canonical descriptor).** `drop-impact-128cube-seed42-step500` does not enumerate particle count explicitly; MLS-MPM typical density 4-8 particles per active cell × 128³ × 10-20% active fraction → 1-3M particles. Stage 0 Task 0.4 resolves the interpretation; per-sub-phase contraction (if applied per § 1.3 Path B) reduces particle count proportionally.

### § 9.1 Inherited playbook

P21 (closed-form) + P22 (agent-based) + P23 (RD-3D MMS) + **P24 (sph-water sorted-particle iteration — applies directly to gate 11 determinism)** + P25 (LBM lattice-units; NOT applicable at MPM since no MMS arm) all apply via conventions doc.

### § 9.2 New playbook entry — DECISION (LEAN ADD)

**P26 — MPM particle-grid hybrid transfer debugging — ADDED at this sub-phase (operator-confirmable).**

Reasoning: MPM has substantively new failure surfaces not covered by P22 (agent-based RNG) / P23 (MMS) / P24 (sph-water sorted-particle iteration alone) / P25 (lattice-units kinetic equation). Specifically, the **hybrid particle-grid transfer surface** has failure modes that emerge from the INTERACTION of particle-iteration discipline + grid-stencil-iteration discipline + multimaterial volume tracking — none of which the prior playbook entries cover end-to-end.

P26 worked example (skeletal — Stage 1 retrospective will refine with the actual failure mode if one surfaces):
1. **Cause: P2G/G2P stencil-ordering mismatch (R-MPM-1).** Symptom: partition-of-unity PBT GREEN, golden GREEN, but `test_run_twice_epsilon_diff` shows non-deterministic divergence at ~1e-12. Diagnose: assert identical 27-cell iteration order at both call sites; reduce to single-particle bisection.
2. **Cause: base-node off-by-one (R-MPM-3).** Symptom: golden GREEN at sample points but partition-of-unity PBT FAILS at random p. Diagnose: spot-check `base = floor(p + 0.5) - 1` matches the JSON's `base_node_convention` field verbatim.
3. **Cause: numba @njit cache-staleness (R-MPM-4).** Symptom: Stage 1 dev pytest GREEN, canonical-capture run produces non-deterministic or stale output. Diagnose: clear numba cache (`__pycache__/*.nbi`), re-run capture; pin @njit signatures.
4. **Cause: multimaterial volume-fraction drift (R-MPM-2).** Symptom: total-mass invariant holds (gate 12 GREEN), but per-material volume sums drift across steps. Diagnose: pin material indices at particle init; assert per-material ∑V invariant per step via debug instrumentation.
5. **Cause: G2P momentum-conservation advisory miss.** Symptom: Tier 2 particle `check_momentum_conservation` reports advisory drift. Diagnose: this is expected if external forces (gravity, BC sinks) act on particles within the capture window; advisory only — verify the drift magnitude matches the expected force-times-step product.

Skip rationale (alternative — to record if operator routes SKIP): inherited P22 (RNG) + P24 (sorted-particle iteration) cover the particle-side concerns; grid-side concerns could be banked as a sub-phase-specific note rather than a project-wide playbook entry given that MPM is the only hybrid-pg sim through Phase 1. **The Stage 1 dispatch confirms or refutes the lean ADD; if Stage 1 surfaces no failures requiring P26 (analogous to eulerian-smoke § 9.2 SKIP rationale OR LBM P25 retrospective-add pattern), the operator may route P26 to bank rather than land.**

---

## § 10. Audit-trail discipline

Inherits conventions doc § B. Sub-phase audits live under `docs/_audits/phase-1/sub-phase-mpm-multimaterial/`. Append-only check at Stage 2 Step 2.6 forbids edits to any file present at `v0.1.0-phase-1` OR within any prior sub-phase audit chain (conventions doc § B.1 protected-set growth; 13 protected sets at Stage 2 close per § 4.3). The MLS-MPM golden + derivation + generator (pre-Stage-2-lift) are append-only-protected; the Stage 2 lift restructures the golden additively per conventions doc § I.3.

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

- MPM TDD bundle (5 spec docs + MLS-MPM quadratic-B-spline golden + derivation + generator + 4 failing test files) at SHA `9de8048`.
- Phase-1-shipped IC infrastructure (IC-1 / IC-3 / IC-5 particle / IC-6 vector_field).
- Numba project infrastructure (`sub-phase-numba-integration` at `569c883`; `@njit(fastmath=False, cache=True)` discipline).
- LFS infrastructure (`sub-phase-git-lfs-migration` at `0672554`) — captures land transparently.
- 82 cumulative shifts (conventions doc § M tally + LBM § 8.3) — inherited, not re-litigated.

### § 11.2 Outputs to subsequent sub-phases AND phase-closure consolidation

- MPM 13 gates GREEN; first hybrid-pg sim; **9-sim Phase 1 per-sim implementation arc CLOSED**.
- **One new canonical capture** in `captures/mpm-ref/` via LFS per Appendix D § D.2.3 (cadence + descriptor-contraction per Stage 0 Task 0.4).
- **Cat 3 `hybrid-pg` subdir picked up** (sibling additive after `closed-form`, `agent-based`, `particle-fluids`, `lattice`); `_SUBDIRS_PICKED_UP` grows to 5 entries. Remaining sibling: `volumetric-grid` (NO-OP per eulerian-smoke MMS-only precedent), `continuous-ca` (NO-OP per RD-3D MMS-only precedent).
- **Third exercise of Task 0.4 as established discipline** — landing-audit retrospective records third data point on the ~2-3× production-correction factor (eulerian-smoke 1.45× + LBM 2.6× + MPM TBD). After three data points the empirical convention is stable enough to land formally in conventions doc § N graduation.
- **B17 PATH-A fifth-and-final proof-point (if PATH-A continue)** — the per-sim Phase 1 mutation arc closes; per-target mutation-runner infrastructure anchored across 5 sim categories.

**Phase-closure consolidation for post-Phase-1 owner.** The following items have accumulated across 9 sub-phases and consolidate at MPM landing for post-Phase-1 conventions-doc refactor + spec-Phase-2 dispatch:

- **Conventions doc § N graduation PROPOSED → established.** Three single-session Stage 1s under § N Task 0.4 (eulerian-smoke + LBM + MPM); strong recommendation.
- **Audit-template refactor for `evidence_paths` strict-verify drift.** LBM N2 / eulerian-smoke N1 / RD-3D N1 — 3 of 6 per-sim sub-phases recurring; either split `evidence_paths` into audit-time-snapshot vs live-pointer lists, or document acceptance.
- **Cadence-routing-as-default-when-feasible discipline** (LBM § 9.4 row 7) → conventions doc § D.2.3 addition.
- **Anchor-density-predicts-kill-rate observation** (LBM § 9.4 row 3) → conventions doc § I.3 empirical note.
- **sim.py low-kill-rate recurring pattern** (eulerian-smoke 0.1707 + LBM 0.2287 + sph-water; LBM § 9.4 row 4) → manifest-field-equality test pattern formalization.
- **Cross-sub-phase B17 PATH-A trend stable** (mean 0.5435; range [0.4879, 0.5927]) → mutation-gate threshold remains 0.80 advisory; empirical floor banked.
- **Cumulative-shift count enters at 82 + MPM Stage 1/2 deltas.** If count crosses 100, a third conventions-doc consolidation refactor warranted.
- **MMS-runner generalization** — banked by THREE inline examples (RD-3D + eulerian-smoke + LBM); MPM does not exercise MMS, so the inline-count stays at 3. Decision becomes load-bearing at **spec-Phase-2 entry**: interpolate a focused MMS-runner-generalization sub-phase before cross-stack work, OR defer until cross-stack MMS verification surfaces the need.
- **Stack-C C++/Vulkan + Stack-D Taichi + Stack-E Warp ports** for all 9 sims become dispatchable at `v0.2.0-phase-2` per Phase 2 plan.
- **Common-py adoption** (numba-integration banked observation) — banked for explicit operator decision: focused infrastructure sub-phase OR Phase-2+ deliverable.

### § 11.3 Inherited banked items still open going out

By reference to conventions doc § L.2 + § L.3 + LBM landing § 9.3 (RD-3D / sph-water / eulerian-smoke / LBM test-augmentation candidates; common-py adoption; Cat 5 audit-links on evidence files; B2-B6 / B11 / B16; B-hotfix-1 / B-hotfix-2; etc.).

### § 11.4 Replay-chain non-participation + tag posture

Per conventions doc § D.2 + § D.4. This sub-phase does NOT participate in the cross-phase replay chain; next spec-phase pre-flight replays against `v0.1.0-phase-1`. Tag posture: **default lean no tag**; banked alternatives (operator-routable Item 5): `v0.1.7` (consistent with 6-sub-phase precedent — operator-pushed only) OR no tag (default lean). **Forbidden either way:** any tag carrying `-phase-N` (reserved for spec-phase boundaries; the next phase tag `v0.2.0-phase-2` is operator-only at spec-Phase-2 close).

### § 11.5 Operator-routable items surfaced by this plan

For explicit operator confirmation at dispatch time:

1. **§ 1.1 language-pivot re-anchor** — confirm Python NumPy + numba reference at Stack-D (default lean). Alternative would be a Stack-D Taichi port (the SPEC-DECLARED stack for MPM per sim-spec-ref § 1 + § 5), materially different scope (Phase-2+).
2. **§ 1.3 / Task 0.4 dispatch + numba decision** — Task 0.4 treated as established per § N graduation recommendation; sim-shape ~2-3× production-correction factor applied; numba @njit pre-applied per default lean Path A; per-sub-phase descriptor contraction (Path B) routing-on-demand if Path A insufficient.
3. **§ 4.3 Step 2.7 B17 routing** — LEAN PATH-A continue (fifth-and-final proof-point closing the per-sim Phase 1 mutation arc). Alternative: PATH-A rebank if operator judges the four-data-point trend signals diminishing returns; focused test-augmentation sub-phase as more load-bearing follow-up.
4. **§ 9.2 P26 decision** — LEAN ADD P26 (MPM particle-grid hybrid transfer debugging) at this sub-phase. Alternative: SKIP if Stage 1 retrospective surfaces no MPM-specific failure mode requiring playbook codification.
5. **§ 11.4 tag posture** — special phase-closure consideration since this is the LAST per-sim Phase 1 sub-phase. Default lean: no tag (consistent with 6 prior sub-phases). Alternative: `v0.1.7` non-phase point-release as a meaningful phase-closure marker (no `-phase-N` suffix — that's reserved for `v0.2.0-phase-2`).
6. **§ 4.3 Step 2.3 Cat 3 routing** — LEAN Decision A lift + pickup (mirrors LBM precedent verbatim). Alternative NO-OP only if Stage 1 ships no golden table, which is not the case here.

Additional banked items for operator at MPM landing (phase-closure consolidation per § 11.2):

- **Conventions doc § N graduation PROPOSED → established** (third consecutive single-session Stage 1 strong-signal).
- **Audit-template refactor** for `evidence_paths` strict-verify drift (3/6 per-sim sub-phases recurring).
- **Cadence-routing-as-default-when-feasible** addition to conventions doc § D.2.3.
- **Anchor-density-predicts-kill-rate** empirical note in conventions doc § I.3.
- **Spec-Phase-2 dispatchability** at `v0.2.0-phase-2` per Phase 2 plan.

---

*End of mpm-multimaterial sub-phase charter. Inherits 82 cumulative shifts via conventions doc § M + LBM § 8.3. Treats Task 0.4 as established discipline per § N graduation recommendation (banked operator decision). First hybrid-pg sim + first IC-5+IC-6 dual-Tier-2 consumer + LAST per-sim Phase 1 sub-phase. Cat 3 disposition is Decision A (lift + pickup) mirroring LBM precedent verbatim. Bit-identity invariant at 14 invocations going in; Stage 0 Task 0.0 is the 15th. LFS + numba infrastructure transparent. MMS-runner generalization remains banked, now load-bearing for spec-Phase-2+ Stack-C entry. After MPM lands, spec-Phase-2 (cross-stack replication) becomes dispatchable at `v0.2.0-phase-2`.*
