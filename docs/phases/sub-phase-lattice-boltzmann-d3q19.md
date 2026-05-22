# Lattice-Boltzmann-D3Q19 Implementation — Sub-Phase of Spec-Phase-1

> **Document type:** Sub-phase plan (spec § 7.13 artifact type `sub-phase`) — gates 4–13 implementation for `lattice-boltzmann-d3q19`, scoped under spec-Phase-1.
> **Sub-phase identity:** Sixth per-sim implementation sub-phase under spec-Phase-1, **first in the lattice category** (spec § 5.7), **third MMS-using sub-phase** (after `continuous-ca-rd3d` + `eulerian-smoke`), and the **first cross-discretization exercise of the shared NS-2D MMS** (D3Q19 kinetic-equation discretization recovering macroscopic NS via Chapman-Enskog; contrasts eulerian-smoke's MacCormack-corrected SL + Jacobi-projection on the same MMS surface). NOT a new spec-phase; spec § 7.12 reserves `v0.<N>.0-phase-<N>` for spec-phase boundaries.
> **Repository:** `git@github.com:StevenFAU/Bit-Physics.git` (owner: Steven Cohen).
> **Spec anchor:** `docs/architecture.md` (v2.4) §§ 2.4 (MMS / OOA), 2.5 (determinism), 2.7 (capture), 2.13 (mutation), 2.14 (PBT), 3.5 (the 13 gates), 5.7 (lattice reference category), 7.12, 7.13 + Appendix D § D.2.3.
> **Reads-first:** `docs/conventions/sub-phase-conventions.md` (sections A–F, I–N — universally load-bearing; § H vendored-upstream NOT applicable per R8 amendment — Krüger 2017 is citation-only, no vendored code; § N PROPOSED Task 0.4 is **treated as established discipline** for this plan per the eulerian-smoke landing § 9.3 row 1 graduation recommendation — note that the conventions doc itself still says PROPOSED; operator decision pending at LBM landing to graduate). THEN this plan.
> **Parent audits (pre-conditions):**
> - Phase 1 landing — `docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md`, CONFIRMED at `v0.1.0-phase-1`.
> - sub-phase-closed-form landed at `2cc0f21`.
> - sub-phase-agent-based landed at `739c93f`.
> - sub-phase-replay-tool-hotfix landed at `1f5fa0c`.
> - sub-phase-continuous-ca-rd3d landed at `0df358d` (**first MMS gate-5 + P23 + B17 PATH-A**).
> - sub-phase-numba-integration landed at `569c883`.
> - sub-phase-particle-fluids-sph-water landed at `281c74f` (post-LFS: `17850e2`).
> - sub-phase-mutation-script-hotfix landed at `27304d0`.
> - sub-phase-conventions-consolidation CONFIRMED at `34c7d34`.
> - **sub-phase-eulerian-smoke CONFIRMED at `cf13d1c`** (post-LFS-migration SHA; original local Stage 2 close was `64ef8f1`; landing-audit body intact via Convention #12 fast-forward per git-lfs-migration § 2).
> - **sub-phase-git-lfs-migration CONFIRMED at `0672554`** (HEAD; `captures/**/*.h5` now LFS-tracked transparently per the augmented `.gitattributes`).
> **Inherited shifts:** 73 cumulative going into this sub-phase (per conventions doc § M tally + eulerian-smoke landing § 8.3; git-lfs-migration is a hotfix sibling and its shifts are not counted in the per-sim cumulative per conventions doc § O). Inherited by reference; not re-litigated.
> **Bit-identity invariant:** held byte-identically at 13 invocations to date (6 sub-phase Stage 0s + 4 hotfix V validations + 3 LFS-migration replay verifications); Stage 0 Task 0.0 here is the **14th invocation** (load-bearing per conventions doc § D.3).
> **Date drafted:** 2026-05-22.
> **Status:** dispatch-ready.

---

## § 1. Scoping

### § 1.1 What this sub-phase is

This sub-phase takes **lattice-boltzmann-d3q19** from spec-Phase-1's gates 1–3 (5 spec docs + D3Q19 equilibrium golden + shared NS-2D MMS reference + probe + 5 failing test files; committed at SHA `b6abd7e` per Phase 1 Stage 2 commit `feat(phase1-stage2-lattice-boltzmann-d3q19): TDD bootstrap`) through gates 4–13 of spec § 3.5. LBM is the **sixth per-sim implementation surface** and the **first in the `lattice` category**.

Implementation stack: **Python NumPy reference at Stack-D** (`packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/{reference,sim,invariants}`). Stack-C C++/Vulkan port — the spec's nominal target per § 5.7 + sim spec-ref § 5 — is Phase-2+ scope per the established language-pivot re-anchor pattern (closed-form / agent-based / RD-3D / sph-water / eulerian-smoke all shipped Python at sub-phase scope; see conventions doc § A for role model).

### § 1.2 What's different from prior sub-phases

1. **First lattice sim in the project.** closed-form / agent-based / continuous-ca / particle-fluid / volumetric-grid all covered; LBM is the first sim in the `lattice` category per spec § 5.7. The reference algorithm is **D3Q19 BGK** (Qian-d'Humières-Lallemand 1992, citation-only Krüger 2017 — no vendored code per Phase 1 R8 amendment).
2. **Third MMS sub-phase.** Reuses the same `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` solution as eulerian-smoke (Phase 1 Stage 2 shift #18, conventions doc § M.1 row 18). **First cross-discretization exercise:** eulerian-smoke achieved observed OOA 1.99 (advection) / 2.00 (projection) via MacCormack-corrected SL + Jacobi-projection on this MMS surface (landing audit § 3.2); LBM exercises whether the algorithmically-distinct **D3Q19 streaming + BGK collision** reproduces the expected p=2 OOA on the macroscopic moments (BGK is space-2nd-order, time-1st-order per sim spec-ref § 6.1 — the formal target is p=2 for the macroscopic-velocity moment under dt ∝ dx scaling). This is the scientific novelty of the sub-phase: same MMS surface, different discretization.
3. **Inline-MMS pattern continued (Path Y).** Per RD-3D Stage 1 SHIFT S2 + eulerian-smoke Stage 1 (two prior precedents): the MMS test inlines its convergence study against `IncompressibleNS2DSolution` rather than reusing `tools/testkit/code_verification/mms/runner.py` (heat-1D-specialized). With **three** concrete inline examples after LBM lands (RD-3D + eulerian-smoke + LBM), the MMS-runner-generalization question becomes load-bearing for the **next** plan-drafting (MPM) — interpolate a focused MMS-runner-generalization sub-phase, OR defer to spec-Phase-2+. **This plan does NOT propose generalizing the runner.**
4. **First sub-phase to ship BOTH a golden table AND an MMS gate.** Gate-5 has two arms: (a) D3Q19 equilibrium golden at `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` (the 19 weights and equilibrium f_i^eq values at fixed (ρ, u); absolute tolerance 1e-15 per the file); (b) NS-2D MMS OOA on macroscopic moments. Closed-form / agent-based / sph-water shipped only goldens; RD-3D / eulerian-smoke shipped only MMS; LBM is the first to ship both. **This drives Cat 3 disposition deviation from RD-3D + eulerian-smoke precedent — see § 4.3 Step 2.3.**
5. **First sub-phase to apply Task 0.4 as established discipline.** Eulerian-smoke was the first practical exercise of conventions doc § N PROPOSED; its retrospective recommended graduation PROPOSED → established (banked § 9.3 row 1, awaiting operator decision at the next conventions-doc refactor). LBM treats Task 0.4 as established, applies the **~1.5× production-correction factor** rule of thumb (eulerian-smoke retrospective § 9.3 row 2: Stage 0 0.93 s skeletal → Stage 1 1.348 s measured) when projecting Stage 0 estimates to full implementation.
6. **First sub-phase under LFS infrastructure.** `captures/**/*.h5` is transparently LFS-tracked per the `.gitattributes` committed by sub-phase-git-lfs-migration. The 1 GB pre-commit `maxkb=1048576` ceiling stays as belt-and-suspenders per sph-water R12; the GitHub 100 MB hard limit is no longer a sub-phase concern. Captures land in `captures/lbm-ref/` per the project-wide `<sim>-ref/` convention.
7. **First lattice-units conversion surface.** LBM operates in lattice units (Δx = Δt = 1; viscosity ν_lattice = c_s² (τ - 1/2)); the MMS solution is expressed in physical units. Lattice ↔ physical unit conversion is a discretization-specific source of OOA-test error not present in eulerian-smoke (which discretized the same physical-unit MMS directly). Document the conversion convention in the determinism declaration; surface as P25 candidate (§ 9.2).

### § 1.3 Stage 0 canonical-descriptor scope-analysis — load-bearing for this plan

Per conventions doc § N (treated as established here) + eulerian-smoke landing § 9.3 row 2, Task 0.4 estimates feasibility of each canonical descriptor against the Python NumPy reference stack BEFORE Stage 1 dispatch, applying the ~1.5× production-correction factor when projecting Stage 0 skeletal-probe measurements to full implementation.

Appendix D § D.2.3 enumerates TWO LBM canonical descriptors:

- `poiseuille-64x32-seed42-step1000`
- `couette-32x16-seed42-step500`

**Note probe-vs-Appendix-D drift** (mirrors eulerian-smoke's drift inheritance per conventions doc § M.1 row 17 + eulerian-smoke landing § 7.5): the LBM probe report § 4 references the legacy-capture placeholder `poiseuille-channel-32cube-seed42-step5000` (32³ × 5000 steps, single descriptor). Appendix D § D.2.3 — load-bearing per Phase 1 Stage 2 shift #17 + eulerian-smoke precedent — gives two distinct 2D-shape descriptors. Re-anchor at Stage 1 step 5; Stage 0 Task 0.4 documents the drift and Stage 1 captures land under Appendix D names.

Pre-flight feasibility estimates (subject to measured-floor refinement at Stage 0 per conventions doc § K.3):

| Descriptor | Interpretation | Per-frame storage (f-distribution, float64) | Memory peak | Wall-clock floor |
|---|---|---|---|---|
| `poiseuille-64x32-seed42-step1000` | 64 × 32 × N_z (z-periodic; N_z≈32 to exercise D3Q19 directionality non-trivially) → 65,536 cells × 19 dirs × 8 B ≈ **9.96 MB** | ~50 MB (f + f_post-collision + macroscopic ρ, **u** + boundary scratch) | per-step NumPy `np.roll`+BGK ≈ 5–10 ms; **1000 steps → 5–10 s × ~1.5 = 8–15 s** |
| `couette-32x16-seed42-step500` | 32 × 16 × N_z (N_z≈16) → 8,192 cells × 19 × 8 ≈ **1.25 MB** | <10 MB | per-step ~1 ms; 500 steps → ~0.5–1 s × ~1.5 = 1–2 s |

**At full cadence, Poiseuille is ~10 GB raw; cadence ≥ 10 keeps it under 1 GB.** Couette fits trivially at full cadence. The Stage 0 Task 0.4 fingerprint will resolve actual cadence + grid-depth interpretation (the `64x32` label is ambiguous on the third dimension; sim spec-ref § 1 commits to D3Q19 3D lattice, so a non-trivial z-extent is needed to exercise the 19-direction equilibrium). Decision tree:

- **Fits at cadence-N ≥ K + depth-D resolved** (default lean): proceed to Stage 1 with documented cadence + depth interpretation in sidecar metadata per spec § 2.7.
- **Exceeds wall-clock or memory ceiling**: STOP and surface to operator with at least three routing options (cadence override; depth-reduction override; per-sub-phase descriptor override mirroring sph-water R20 / conventions doc § K.4; @njit consumption per conventions doc § G — though for LBM the per-step floor at this scale projects well under any reasonable threshold so @njit is unlikely to be load-bearing here).

The Stage 1 commit footer cites the Stage 0 Task 0.4 finding (cadence + depth interpretation + measured per-step floor) as load-bearing artifact per eulerian-smoke precedent.

---

## § 2. Deliverables (gates 4–13)

The 13-gate per-sim acceptance contract and cross-cutting discipline are inherited from conventions doc §§ A–F + I–J. Sim-specific deltas:

| Gate | Deliverable |
|---|---|
| 4 | Reads through to gate 5. |
| 5 | **TWO arms.** (a) **D3Q19 equilibrium golden** — `test_d3q19_equilibrium_golden.py::{test_19_f_eq_values_match_golden, test_density_moment_recovers_rho, test_momentum_moment_recovers_rho_u}` GREEN against `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` (absolute 1e-15). (b) **NS-2D MMS OOA on macroscopic moments** — `test_mms_convergence.py::test_mms_observed_ooa_macroscopic_moments_match_formal` GREEN. Inline convergence study per Path Y (RD-3D S2 + eulerian-smoke § 7.2 precedents). Default grid ladder N ∈ {32, 64, 128}; L² norm on recovered macroscopic velocity field; assert observed OOA matches formal p=2 within ±0.5 per spec § 2.4 + sim spec-ref § 6.1. **Lattice-units conversion**: the MMS solution evaluates in physical units; the LBM simulator operates in lattice units; the convergence test must document the conversion (Δx_lattice = L_physical / N; Δt_lattice via the τ-viscosity relation ν_lattice = c_s² (τ - 1/2) with τ chosen to maintain Ma < 0.1 weakly-compressible regime). Apply P23 (conventions doc § M.4) + new P25 (§ 9.2) if OOA fails. Record both ladders (advection-direction + diffusion-direction or single combined per implementation) in Stage 1 commit footer per conventions doc § C.3. |
| 6 | Tier 1 NaN/Inf scan over canonical-trajectory output — `test_tier1_health_no_nan_inf` GREEN. |
| 7 | Tier 2 **`vector_field`** substack (IC-6) on macroscopic moments. Per probe § 2: `check_divergence_free` (**advisory** — LBM is weakly compressible, so ∇·u ≈ 0 only at O(Ma²); not a hard pass) + `check_circulation` + Tier 1 `check_health`. Fewer checks than eulerian-smoke's 4 because LBM weak-compressibility makes `helicity` + `energy_spectrum` less load-bearing on a Poiseuille/Couette flow. |
| 8 | Cat 1 citations: Qian-d'Humières-Lallemand 1992 (DOI 10.1209/0295-5075/17/6/001), Krüger 2017 (ISBN 978-3-319-44649-3, citation-only). |
| 9 | Cat 2 public API per probe § 5: `lattice_boltzmann_d3q19.reference.{equilibrium.feq, equilibrium.density_moment, equilibrium.momentum_moment, bgk.bgk_step, bgk.stream}` + `lattice_boltzmann_d3q19.sim.sim_runner_seeded` + `lattice_boltzmann_d3q19.invariants.{equilibrium_density_moment, equilibrium_momentum_moment}`. |
| 10 | **TWO canonical captures** per Appendix D § D.2.3: `captures/lbm-ref/poiseuille-64x32-seed42-step1000.{h5,json}` and `captures/lbm-ref/couette-32x16-seed42-step500.{h5,json}`. Capture cadence + grid-depth interpretation per Stage 0 Task 0.4 finding; record cadence + depth in sidecar metadata. LFS-tracked transparently. Capture-writer surface: `tools/testkit/capture` (inherited). |
| 11 | Determinism (`test_run_twice_bit_exact_canonical` per probe § 6). Spec declares `bit-exact-effort-same-stack-same-hw` (sim `determinism.md`); the Python NumPy reference is expected to achieve bit-exact (effort caveat is subgroup-collective ops in Stack-C Phase-2+ paths, not applicable at Stack-D). See § 4.2 step 1 for determinism-strategy declaration. |
| 12 | Hypothesis tests for the 2 invariants declared in spec § 6.6 (`equilibrium_density_moment` — ∑f_i^eq = ρ identically; `equilibrium_momentum_moment` — ∑c_i f_i^eq = ρu identically). Plus a positivity advisory (`f_i ≥ 0`): equilibrium distributions are analytically non-negative under Ma < 1; PBT verifies numerically under random (ρ, u) within the Ma < 0.1 weakly-compressible band. Commit `.hypothesis/` example DB per spec § 2.14. |
| 13 | Perf-ledger first-landing row per descriptor. Mirror `hardware_id = i7-12700KF-linux-6.17` format from prior sub-phases; re-anchor at Stage 1. |
| 13 (anchor) | Phase 1 RED evidence `tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt` (sha256 `c78de8be…b4b6ef3cd`, verified pre-flight) still matches; worktree replay at SHA `b6abd7e` reproduces `ModuleNotFoundError` collection-errors (5 test files; `lattice_boltzmann_d3q19.{reference,sim,invariants}` missing). |

Acceptance for "sub-phase complete": all 13 gates GREEN for lattice-boltzmann-d3q19; Cat 1/2/3/4/5/X GREEN at HEAD; B17 routing decision documented; Cat 3 disposition documented; landing audit CONFIRMED. No `-phase-N` tag (conventions doc § D.2).

---

## § 3. IC contracts inherited

Conventions doc § F-class discipline. Sim-specific consumption at HEAD:

- **IC-1** (capture I/O Python) — gates 9, 10.
- **IC-3** (determinism config Python) — gate 11.
- **IC-6** (Tier 2 `vector_field`) — gate 7. Macroscopic velocity field recovered from D3Q19 f-distribution moments; same diagnostic surface as eulerian-smoke, but the field is derived (moment-recovery) rather than primitively-stored.
- **IC-8** (probe report) — `tools/testkit/probes/reports/lattice-boltzmann-d3q19.md` § 5.
- **IC-9** (phase audit body) — applied per conventions doc § B.

No new ICs. Stack-C `common-cpp` ICs are Phase-2+ per § 1.1.

---

## § 4. Stages — three-stage cadence (conventions doc § A.2)

### § 4.1 Stage 0 — Pre-flight

Standard 4-task pattern per conventions doc § A.2 + sub-phase precedents, plus Task 0.4 (now established per § 1.2 ➍ ➎):

- **Task 0.0** — Cross-phase replay against `v0.1.0-phase-1` with the 8-gate canonical set. Bit-identity invariant `9399fc33…909f34` per conventions doc § D.3 (**14th invocation**). Divergence → BLOCKED-with-surface.
- **Task 0.1** — Tolerance-budget carryover (`[phase].phase = "sub-phase-lattice-boltzmann-d3q19"`). NO `[budgets.*]` widening.
- **Task 0.2** — Re-verify Phase 1 LBM failing-tests evidence sha256 (`c78de8be…b4b6ef3cd`).
- **Task 0.3 (sim-specific)** — Re-anchor the SHARED NS-2D MMS solution: re-verify `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py` + `derivation.md` sha256s match Phase 1 Stage 2 baseline + eulerian-smoke Stage 0 / landing confirmations (expected `30e490a7…320d8e` + `30dfc294…ac86e76`; verified at HEAD by this plan's drafting agent and at eulerian-smoke § 7.5 anchor recheck). Drift in either sha256 → BLOCKED-with-surface (affects two sims). Plus re-anchor the D3Q19 equilibrium golden `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` (sha256 to be captured at Task 0.3 execution) — Stage 1 gate-5 (a) consumes this file at absolute 1e-15.
- **Task 0.4 (established per § N — first sub-phase exercising it as such)** — Canonical-descriptor scope-analysis. See § 7.1 prompt for the concrete checklist. Apply the ~1.5× production-correction factor when projecting skeletal-probe measurements to full implementation. Output recorded in Stage 0 checkpoint.

Closing: `stage-0-checkpoint-<UTC>.md` per conventions doc § B.3. Apply Convention #12 SHA back-fill (conventions doc § B.2; capture full 40-hex via `git rev-parse HEAD`, never transcribe short-SHA — per eulerian-smoke landing § 9.3 row 5).

### § 4.2 Stage 1 — Per-sim implementation (one session — single-session lean per eulerian-smoke § 9.3 row 3 empirical convention)

One sim (lattice-boltzmann-d3q19). Single sub-bundle commit covering gates 4–13. 10-step sequence:

1. **Determinism-strategy declaration first** (conventions doc § F.1). Docstring at top of `lattice_boltzmann_d3q19/sim.py` enumerating: (i) deterministic streaming order — fixed lexicographic iteration over the 19 velocity vectors c_i; (ii) BGK collision is per-cell pure-function (no atomics, no reductions per step) — deterministic by construction; (iii) fixed-precision relaxation time τ (chosen once at sim-init from physical ν via ν_lattice = c_s² (τ - 1/2)); (iv) bounce-back / periodic BCs implemented via `np.roll` with explicit axis ordering (P23 cause-#1 inheritance); (v) **lattice ↔ physical unit conversion convention** documented (Δx_lattice = L_physical/N; Δt via ν-relation; Ma = U_physical / c_s_physical < 0.1); (vi) no global RNG state — analytic ICs for canonical captures; (vii) no BLAS/FMA path — pure NumPy + `np.roll`; (viii) Phase-2+ deferred — Stack-C subgroup-collective ops (per sim determinism.md "effort" caveat), driver FMA fusion. Cite the docstring in the Stage 1 commit footer per conventions doc § C.3.
2. **Implement.** `lattice_boltzmann_d3q19.reference.equilibrium.{feq, density_moment, momentum_moment}` + `lattice_boltzmann_d3q19.reference.bgk.{bgk_step, stream}` + `lattice_boltzmann_d3q19.sim.sim_runner_seeded` + `lattice_boltzmann_d3q19.invariants.{equilibrium_density_moment, equilibrium_momentum_moment}`. Streaming via `np.roll` per direction; BGK via vectorized f - (f - f^eq)/τ.
3. **Gate-5 (a) golden — D3Q19 equilibrium.** Wire `test_d3q19_equilibrium_golden.py` against the at-rest test point in the golden JSON (ρ=1, u=(0.1, 0, 0)); assert all 19 f_i^eq within absolute 1e-15; assert density_moment recovers ρ; assert momentum_x recovers ρ·u_x within FP-eps.
4. **Gate-5 (b) MMS — inline convergence study.** Wire `test_mms_convergence.py::test_mms_observed_ooa_macroscopic_moments_match_formal` against `IncompressibleNS2DSolution`. 3-grid ladder N ∈ {32, 64, 128} on the unit square (z-extent kept minimal to isolate the 2D MMS surface on the macroscopic moment); L² norm on recovered macroscopic **u** field (and ρ if separately convergent). Refresh SymPy ≡ NumPy spot-check at canonical test point per solution.py docstring (P23 cause-#2 — translation drift). If OOA fails → apply P23 (conventions doc § M.4) + new P25 (§ 9.2). Record ladder + observed OOA in commit footer.
5. **pytest** packages/lattice-boltzmann-d3q19/tests/ -v → all 5 test files GREEN; capture verbatim to `tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-implemented-<UTC>.txt`; sha256. Phase 1 RED evidence UNTOUCHED.
6. **Produce TWO canonical captures** per § 2 gate 10 + Stage 0 Task 0.4 cadence + depth findings. Write `captures/lbm-ref/<descriptor>.{h5,json}`. LFS-auto. STOP-and-surface if measured per-step floor at runtime exceeds Stage 0 estimate by > 3× (conventions doc § K.3).
7. **Determinism (gate 11).** `test_run_twice_bit_exact_canonical` GREEN. Record bit-exact posture in commit footer per conventions doc § F.4.
8. **PBT (gate 12).** Hypothesis tests for the 2 equilibrium-moment invariants (under random (ρ ∈ [0.5, 1.5], u within Ma < 0.1 band)). Commit `.hypothesis/` DB.
9. **Perf-ledger.** ONE row PER descriptor.
10. **Gate-13 worktree replay.** Worktree at SHA `b6abd7e` (conventions doc § E) — NOT partial checkout. Assert 5 `ModuleNotFoundError` collection errors match Phase 1 RED.
11. **Commit.** `feat(lattice-boltzmann-d3q19-stage1): implementation through gate 13`. Footer per conventions doc § C.3: Phase 1 RED + new GREEN evidence sha256, capture sidecar paths + per-descriptor .h5 sha256, per-descriptor perf-ledger wall_clock_seconds, determinism-strategy docstring summary, **MMS convergence-rate ladder summary**, D3Q19 equilibrium golden re-verification (3 tests × 19 values absolute 1e-15), Stage 0 Task 0.4 finding citation (cadence + depth + ~1.5× correction observed-vs-projected ratio).

(The above is an 11-step sequence — one step longer than eulerian-smoke's 10 — to separate gate-5 (a) golden from gate-5 (b) MMS. Single-session feasibility expectation per § 1.3 wall-clock estimate; both descriptors project to <30 s total simulation time, ample budget for the full 11-step arc in one session per eulerian-smoke landing § 9.3 row 3 empirical convention.)

Closing: `stage-1-checkpoint-<UTC>.md` per conventions doc § B.3. Apply Convention #12 SHA back-fill (full 40-hex via `git rev-parse HEAD`).

### § 4.3 Stage 2 — Landing

Inherits Steps 2.1 → 2.11 structure from prior sub-phases via conventions doc § A.2 + § B-class discipline. Sim-specific items:

- **Step 2.3 — Cat 3 `lattice` subdir disposition (conventions doc § I) — DECISION A (lift + pickup), NOT NO-OP.** LBM ships a golden table at `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` (gate-5 (a) per § 2). At HEAD the file has ONE `test_points` entry with ONE `independent_reference` block containing four packed citations (hand-derivation + Qian 1992 + Krüger 2017 + Python re-derivation). Per conventions doc § I.3 anchor-count semantics, this counts as **1 anchor** — below the spec § 2.4 R9 floor of ≥ 3. Disposition: **mirror closed-form / agent-based / sph-water lift precedent** (conventions doc § I.2 Decision A): restructure the packed block into ≥ 3 discrete `test_points` entries (target: 3 or 4 discrete entries, one per citation, preserving each verbatim per § I.3 "mechanical restructuring, not new evidence"), THEN extend `_SUBDIRS_PICKED_UP` additively for `lattice`. Two-commit shape per conventions doc § I.2:
  - `chore(lattice-boltzmann-d3q19-stage2-cat3-anchors): lift d3q19-equilibrium golden to ≥ 3 discrete anchors`
  - `chore(lattice-boltzmann-d3q19-stage2-cat3-subdirs): extend _SUBDIRS_PICKED_UP for lattice subdir`

  Note: this is a deviation from RD-3D / eulerian-smoke NO-OP precedent (those are MMS-only sims with no golden); LBM ships both. The lift restores parity with closed-form / agent-based / sph-water Decision A precedent. Pre-flight at Stage 2 verifies `_SUBDIRS_PICKED_UP` at HEAD is still `(Path("closed-form"), Path("agent-based"), Path("particle-fluids"))` — unchanged since sph-water landing.
- **Step 2.5 — Gate-13 worktree replay** at SHA `b6abd7e` (conventions doc § E).
- **Step 2.6 — Append-only check.** Protected set includes Phase 0 + Phase 1 Stage 3 + closed-form (`2cc0f21`) + agent-based (`739c93f`) + replay-tool-hotfix (`1f5fa0c`) + RD-3D (`0df358d`) + numba-integration (`569c883`) + sph-water (`281c74f` then `17850e2`) + mutation-script-hotfix (`27304d0`) + conventions-consolidation (`34c7d34`) + eulerian-smoke (`cf13d1c` post-LFS) + git-lfs-migration (`0672554`) SHAs.
- **Step 2.7 — B17 mutation-score artifact (OPERATOR-ROUTABLE; lean PATH-A continue — fourth proof-point).** Conventions doc § J. The per-target runner has now been exercised at three distinct sim categories (RD-3D continuous-ca, sph-water particle-fluids, eulerian-smoke volumetric-grid) with sim-source kill-rate trend **0.5927 → 0.5581 → 0.4879**. LBM is the first lattice-category sim, materially different algorithmic surface from prior PATH-A proof-points. Two options:
  - **PATH-A continue (LEAN — fourth proof-point)**: additively extend `tools/testkit/mutation/mutmut-config.toml` with `[tool.mutmut.targets.lattice_boltzmann_d3q19]` block (paths-to-mutate: `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/`; tests-dir: `packages/lattice-boltzmann-d3q19/tests/`). Existing testkit/integrity/closed-form/agent-based/RD-3D/sph-water/eulerian-smoke/incompressible_ns_2d_mms targets UNCHANGED. Use `--disable-mutation-types string,fstring` per conventions doc § J.3. Artifact: `tools/testkit/mutation/sub-phase-lattice-boltzmann-d3q19-<UTC>.json`. Commit slug: `chore(lattice-boltzmann-d3q19-stage2-mutation-pathA): per-target extension + lattice-boltzmann-d3q19 baseline`. The NS-2D MMS solution target (`incompressible_ns_2d_mms`) was already mutated at eulerian-smoke Stage 2 (0.6962 kill rate, sub-phase-eulerian-smoke-2026-05-22T13-28-30Z.json artifact) — re-mutating would be redundant; skip per eulerian-smoke landing § 7.6 "Optional third target SKIPPED" precedent.
  - **PATH-A rebank (ALT)**: if the operator judges the 0.5927 → 0.5581 → 0.4879 trend signals diminishing returns from further proof-points (vs. the load-bearing follow-up being a focused test-augmentation sub-phase against accumulated surviving-mutant IDs per sph-water landing § 9.2), skip eulerian-smoke at this sub-phase. Commit slug: `chore(lattice-boltzmann-d3q19-stage2-mutation-rebank): lattice-boltzmann-d3q19 mutation banked`.

  STOP-and-surface precondition (conventions doc § J.5 / sph-water R15 inheritance): if PATH-A is dispatched but mutmut runtime against the canonical-capture generation tests explodes (LBM's Poiseuille per-step is small, so this is low-risk vs sph-water's 1M-particle scale; document but unlikely to trigger). The per-target runner can also exclude gate-10 capture-generation tests per conventions doc § J.4 if needed.
- **Step 2.8 — CHANGELOG additive entry.** Append `### sub-phase-lattice-boltzmann-d3q19` under [Unreleased]. Itemize: gate-13 GREEN-flip; first lattice sim; first cross-discretization NS-2D MMS exercise (D3Q19 BGK vs eulerian-smoke MacCormack-SL); inline-MMS convention third precedent; D3Q19 equilibrium golden GREEN; Cat 3 Decision A lift + `lattice` subdir pickup; two canonical captures via LFS; Stage 0 Task 0.4 first-as-established-discipline; perf-ledger first-landing rows; B17 routing outcome; new P25 entry (if added per § 9.2).
- **Step 2.9 — Sub-phase landing audit** per conventions doc § B.3. Include § 12 retrospective on Task 0.4 ~1.5× factor: was eulerian-smoke's ~1.5× rule of thumb the right factor for LBM as well? Second data point for the empirical convention — load-bearing for future conventions-doc refactor.
- **Step 2.10 — Convention #12 SHA back-fill.** NEVER `--amend`. Capture full 40-hex via `git rev-parse HEAD`.
- **Step 2.11 — Tag posture per conventions doc § D.2.** No `-phase-N`. Default lean: no intermediate tag. Banked alternative: optional non-phase point-release tag `v0.1.6` (no `-phase-N` suffix), operator-pushed only.

---

## § 5. Dispatch workflow

Per conventions doc § A.3 (role model — one Claude Code agent per stage, one coordinator chat, one operator). Identity reads "lattice-boltzmann-d3q19 sub-phase coordinator chat". § 7 prompts are the dispatchable units.

---

## § 6. Coordinator prompt

Inherits per conventions doc § A.3 + prior-sub-phase template; identity "lattice-boltzmann-d3q19 sub-phase coordinator chat"; running-log table:

| Stage | Sub-deliverable | Status | Commit SHA | Date | Notes |
|---|---|---|---|---|---|
| 0 | replay + tolerance carryover + NS-2D MMS reverify + D3Q19 golden reverify + Task 0.4 scope-analysis | pending | — | — | — |
| 1 | LBM implementation (gates 4–13; D3Q19 golden + inline MMS; two canonical captures via LFS) | pending | — | — | — |
| 2 | integrity + replay sweep + **Cat 3 Decision A lift + `lattice` pickup** + B17 routing | pending | — | — | — |
| 2 | CHANGELOG + landing audit + SHA back-fill | pending | — | — | — |

---

## § 7. Agent prompts

All three prompts share these standing orders (inherited from conventions doc § C + sub-phase precedents):

- Commit slug `chore` / `feat` / `docs` with `lattice-boltzmann-d3q19-stage<N>-<scope>` form per conventions doc § C.1.
- Stack is pytest (Python NumPy reference). NO CMake/ctest at this sub-phase.
- Audit front-matter MUST include both `head_sha:` AND `head_sha_at_checkpoint:` per conventions doc § B.3.
- Convention #8 — never assert from memory; grep- or web-verify every path / signature / sha256. FACT/INFERENCE tagging.
- Convention A — additive edits only; never edit any audit / golden / spec / probe committed at `v0.1.0-phase-1` or within prior sub-phase audit chains (closed-form / agent-based / replay-tool-hotfix / RD-3D / numba-integration / sph-water / mutation-script-hotfix / conventions-consolidation / eulerian-smoke / git-lfs-migration).
- Convention #12 — never `--amend`. SHA back-fill at EVERY stage close per conventions doc § B.2. Capture full 40-hex via `git rev-parse HEAD`; never transcribe short-SHA (per eulerian-smoke § 9.3 row 5).
- Operator-only tag-pushing.
- LFS infrastructure transparent — `git add captures/lbm-ref/*.h5` invokes LFS automatically per `.gitattributes`.
- When stuck → conventions doc § K (R-class STOP-AND-SURFACE) + § 9 below (P23 inherited applies directly; P25 lattice-units + kinetic-equation MMS debugging applies if added per § 9.2).

### § 7.1 Stage 0 — Pre-flight

```
You are the lattice-boltzmann-d3q19 sub-phase Claude Code agent, Stage 0 (pre-flight) for Bit-Physics (git@github.com:StevenFAU/Bit-Physics.git, owner Steven Cohen).

Read:
  1. docs/conventions/sub-phase-conventions.md — read FIRST. Sections A, B, C, D, E, F, I, J, K, L, M, N. Treat § N as ESTABLISHED discipline for this plan (per eulerian-smoke landing § 9.3 row 1 graduation recommendation — note conventions doc itself still says PROPOSED; banked for operator at this sub-phase's landing).
  2. docs/phases/sub-phase-lattice-boltzmann-d3q19.md (this charter; § 7 standing orders).
  3. docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md (most-recent per-sim sub-phase landing; § 9.3 banked observations; § 6 NS-2D MMS verification path; § 7.6 B17 PATH-A third proof-point).
  4. docs/_audits/phase-1/sub-phase-git-lfs-migration/landing-2026-05-22T21-04-05Z.md (LFS infrastructure now in place; captures/**/*.h5 LFS-tracked transparently).
  5. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md (first MMS sub-phase; § 3.2 convergence-rate ladder format; Stage 1 S2 inline-MMS precedent).
  6. docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md (Phase 1 landing — Stage 2 shifts #17 + #18: probe-vs-Appendix-D drift + shared NS-2D MMS).
  7. docs/sim-specs/lattice/lattice-boltzmann-d3q19/{README,spec-ref,algebraic,determinism,equivalence}.md (spec source of truth).
  8. tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/{solution.py, derivation.md} (shared NS-2D MMS — re-anchor target; eulerian-smoke also consumes).
  9. tools/testkit/golden/tables/lattice/d3q19-equilibrium.json (D3Q19 equilibrium golden — re-anchor target).
  10. tools/testkit/probes/reports/lattice-boltzmann-d3q19.md (probe report; note § 4 drift vs Appendix D § D.2.3).

Stage 0 is pre-flight only; you do NOT implement LBM. Execute Tasks 0.0 → 0.4 → closing per charter § 4.1:

  Task 0.0 — Cross-phase replay against phase-1 with the 8-gate canonical set per conventions doc § D.5 invocation. BIT-IDENTITY INVARIANT 9399fc33…909f34 (conventions doc § D.3) — this is the 14th invocation. Divergence → BLOCKED-with-surface (write stage-0-blocked-replay-<UTC>.md).

  Task 0.1 — Tolerance-budget carryover. [phase].phase = "sub-phase-lattice-boltzmann-d3q19"; bump opened_at. NO [budgets.*] widening. Commit: chore(lattice-boltzmann-d3q19-stage0-tolerance-budget): sub-phase carryover from phase-1.

  Task 0.2 — sha256 tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt; compare to Phase 1 landing audit's evidence_hashes: value c78de8bee93a5cb06c0ccc78a843766b98c93685b344c63d772cf3374b6ef3cd. Mismatch → BLOCKED.

  Task 0.3 — Re-anchor the shared NS-2D MMS solution AND the D3Q19 equilibrium golden.
    (a) sha256 tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py — expected 30e490a736cbfac26a549180f97219388549465d9d9557de9061106561320d8e (Phase 1 Stage 2 baseline; eulerian-smoke Stage 0 + landing § 7.5 confirmations). DO NOT modify.
    (b) sha256 tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/derivation.md — expected 30dfc29483435361881214581f53e026ffd0d856a3ac0657ece9587f4ac86e76. DO NOT modify.
    (c) Re-verify SymPy ≡ NumPy spot-check at canonical test point per solution.py docstring; record max-diff.
    (d) sha256 tools/testkit/golden/tables/lattice/d3q19-equilibrium.json — record (will be re-verified at Stage 1 step 3 with absolute 1e-15 tolerance against the at-rest test point). DO NOT modify.
    Drift in either MMS sha256 → BLOCKED-with-surface (affects two sims: LBM + eulerian-smoke). Drift in golden → SHIFTED for landing audit only (LBM is the sole consumer).

  Task 0.4 — Canonical-descriptor scope-analysis (per conventions doc § N treated as ESTABLISHED; second sub-phase exercising it after eulerian-smoke).
    Read:
      - Appendix D § D.2.3 entries for lattice-boltzmann-d3q19 `ref`: TWO descriptors
        `poiseuille-64x32-seed42-step1000` + `couette-32x16-seed42-step500`.
      - probe report § 4: documents `poiseuille-channel-32cube-seed42-step5000` (probe-vs-Appendix-D drift; Appendix D wins per Phase 1 Stage 2 shift #17 + eulerian-smoke landing § 7.5).
      - sim spec-ref § 5 (this sub-phase ships Python NumPy reference at Stack-D scope).
      - sim spec-ref § 6.6 (PBT invariants — 2 declared).
      - charter § 1.3 (pre-flight feasibility estimates).
    Resolve the descriptor-shape ambiguity: "64x32" / "32x16" are 2D-style labels; D3Q19 is a 3D lattice. Document the depth interpretation chosen (default lean: N_z ≈ N_y to keep cells cubic-ish; e.g. 64×32×32 + 32×16×16) or surface as routing question if alternative interpretations are equally defensible.
    For EACH descriptor, estimate against the Python NumPy stack:
      (a) STORAGE: per-frame f-distribution payload (cells × 19 × 8 B) × frame count, vs 1 GB pre-commit ceiling (conventions doc § M.5 R12 baseline; LFS handles GitHub 100 MB transparently). Report at FULL cadence + cadence-N decimation (try N ∈ {1, 10, 50, 100}).
      (b) MEMORY: f + f_post-collision + macroscopic ρ, **u** + boundary scratch + 19-direction scratch. vs host RAM headroom.
      (c) WALL-CLOCK: per-step floor — MEASURED, not projected. Execute a one-shot micro-bench at HEAD:
            uv run python -c "import numpy as np; import time; … one stream + bgk step at canonical shape …"
        Multiply by step count. Apply ~1.5× production-correction factor (eulerian-smoke § 9.3 row 2 rule of thumb: Stage 0 skeletal 0.93 s → Stage 1 measured 1.348 s, +45%). Compare against operator-routable threshold of 1 hour per descriptor; for LBM this should fit very comfortably (Stage 0 skeletal floor projected at single-second scale per charter § 1.3 — but verify).
    Decision tree:
      - If estimates fit ceilings: proceed to Stage 1; record "fits within ceilings" finding with explicit cadence + depth values for each descriptor.
      - If a ceiling is breached: surface ≥ 3 routing options (cadence override, depth-reduction, per-sub-phase descriptor override per sph-water R20 / conventions doc § K.4, numba @njit per conventions doc § G — though LBM is unlikely to need numba given the projected per-step floor). HALT and wait for operator routing.
    Record both descriptors' findings in the Stage 0 checkpoint § 4 + cite at closing surface. Document the ~1.5×-factor verification as a second data point for the empirical convention.

  Closing — Commit docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-checkpoint-<UTC>.md per conventions doc § B.3. Body includes bit-identity replay sha256 + Task 0.3 NS-2D MMS reverify + D3Q19 golden reverify + Task 0.4 scope-analysis findings per descriptor. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit + Convention #12 SHA back-fill (NEW commit, NEVER --amend; capture full 40-hex via `git rev-parse HEAD`). Then stop. Surface to operator.

Out of scope: any sim implementation; any edit outside tolerance-budget.toml + new audit files; any edit to the shared NS-2D MMS solution (eulerian-smoke also consumes) or the D3Q19 equilibrium golden (Stage 2 owns the anchor lift, NOT Stage 0); any tag.
```

### § 7.2 Stage 1 — Per-sim implementation

```
You are the lattice-boltzmann-d3q19 sub-phase Claude Code agent, Stage 1 (per-sim implementation) for Bit-Physics.

Read:
  1. docs/conventions/sub-phase-conventions.md — reads-first. § F (determinism), § C.3 (commit footer), § E (gate-13 worktree).
  2. docs/phases/sub-phase-lattice-boltzmann-d3q19.md §§ 1.2, 1.3, 2 (per-gate deliverables), 3 (IC contracts), 4.2 (Stage 1 11-step sequence), 7 (standing orders), 9 (playbook + P25 if added).
  3. docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-checkpoint-<UTC>.md (Stage 0 close — replay PASS bit-identity, NS-2D MMS + D3Q19 golden reverify, Task 0.4 cadence + depth + ~1.5×-corrected wall-clock finding — LOAD-BEARING for steps 2 and 6).
  4. docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md § 3.2 (convergence-rate ladder format you mirror at gate 5 (b); contrast for cross-discretization OOA comparison — both sub-phases share the NS-2D MMS).
  5. docs/_audits/phase-1/sub-phase-continuous-ca-rd3d/landing-2026-05-20T19-49-51Z.md § 3.2 (first MMS-on-Path-Y precedent).
  6. docs/sim-specs/lattice/lattice-boltzmann-d3q19/{README,spec-ref,algebraic,determinism,equivalence}.md (algorithm + invariants + tolerance source of truth).
  7. tools/testkit/probes/reports/lattice-boltzmann-d3q19.md (§ 5 public-API contract; § 2 diagnostics surface — IC-6 vector_field).
  8. tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/{solution.py, derivation.md} (DO NOT MODIFY — eulerian-smoke consumed first).
  9. tools/testkit/golden/tables/lattice/d3q19-equilibrium.json (DO NOT MODIFY at Stage 1 — Stage 2 owns the anchor lift).
  10. packages/lattice-boltzmann-d3q19/tests/test_{d3q19_equilibrium_golden,determinism,diagnostics,mms_convergence,pbt_invariants}.py (the GREEN target; DO NOT modify Phase 1 test contracts).

Scope — ONE sim. TWO canonical captures per Appendix D § D.2.3:
  poiseuille-64x32-seed42-step1000
  couette-32x16-seed42-step500
Cadence + depth per Stage 0 Task 0.4. INLINE MMS convergence study per RD-3D + eulerian-smoke precedents; do NOT generalize the MMS runner.

**Determinism-strategy declaration FIRST** (conventions doc § F.1). Docstring at top of lattice_boltzmann_d3q19/sim.py covering 8 clauses per charter § 4.2 step 1, including the LBM-specific lattice ↔ physical unit conversion convention (Δx_lattice, Δt_lattice, τ-viscosity, Ma < 0.1). Cite in commit footer.

Deliver gates 4–13 in one sub-bundle commit per the 11-step sequence in charter § 4.2:
  1. Determinism docstring.
  2. Implement lattice_boltzmann_d3q19.reference.equilibrium (feq, density_moment, momentum_moment) + .reference.bgk (bgk_step, stream) + .sim (sim_runner_seeded) + .invariants per algebraic.md.
  3. Gate-5 (a) D3Q19 equilibrium golden: wire test_d3q19_equilibrium_golden.py against the JSON at-rest test point (ρ=1, u=(0.1, 0, 0)); assert all 19 f_i^eq within absolute 1e-15; assert density_moment recovers ρ; assert momentum_x recovers ρ·u_x within FP-eps.
  4. **Gate-5 (b) MMS verification — INLINE convergence study.** Wire test_mms_convergence.py::test_mms_observed_ooa_macroscopic_moments_match_formal. Grid ladder default lean N ∈ {32, 64, 128} on [0,1]² (z-extent minimal to isolate the 2D MMS on macroscopic moments). L² norm on recovered macroscopic **u**. Document the lattice ↔ physical unit conversion at the test point (Δx, Δt, τ, Ma). Refresh SymPy ≡ NumPy spot-check (P23 cause-#2 — translation drift). If OOA fails → apply P23 (conventions doc § M.4) + P25 (charter § 9.2 if added: lattice-units conversion drift; BGK τ-numerical sensitivity; Ma-bound violation) BEFORE mutating thresholds. Record ladder + observed OOA in commit footer. **Cross-discretization comparison:** the same MMS surface yielded observed OOA 1.99 (advection) / 2.00 (projection) at eulerian-smoke via MacCormack-corrected SL + Jacobi-projection — surface in commit footer / Stage 1 checkpoint § 3.2 whether LBM's D3Q19 BGK matches (load-bearing for the conventions-doc-graduation question on MMS surfaces being discretization-independent).
  5. pytest packages/lattice-boltzmann-d3q19/tests/ -v → all 5 test files GREEN; capture verbatim to tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-implemented-<UTC>.txt + sha256. Phase 1 RED evidence UNTOUCHED.
  6. Produce TWO canonical captures per § 2 gate 10 + Stage 0 Task 0.4 cadence + depth. Write captures/lbm-ref/<descriptor>.{h5,json}. LFS-auto. STOP-and-surface if measured per-step floor at runtime exceeds Stage 0 estimate by > 3× (gate the Stage 0 scope-analysis with measured-on-implementation reality per conventions doc § K.3 + § N).
  7. Determinism: capture-twice-and-diff per descriptor (test_run_twice_bit_exact_canonical GREEN). Record bit-exact posture in commit footer per conventions doc § F.4.
  8. PBT: 2 invariants — equilibrium_density_moment (random (ρ, u) within Ma<0.1 → ∑f_i^eq = ρ within FP tolerance); equilibrium_momentum_moment (random (ρ, u) within Ma<0.1 → ∑c_i f_i^eq = ρu within FP tolerance per component). Commit .hypothesis/ DB.
  9. Perf-ledger: ONE row PER descriptor. Mirror hardware_id from prior sub-phases; re-anchor against actual hardware.
  10. Gate-13 worktree replay (conventions doc § E): git worktree add /tmp/bp-replay-b6abd7e-lbm b6abd7e; PYTHONPATH=. uv run pytest packages/lattice-boltzmann-d3q19/tests/ -v in the worktree; sha256 the output; assert failure-mode matches Phase 1 RED (5 ModuleNotFoundError collection errors); remove the worktree.
  11. Commit: feat(lattice-boltzmann-d3q19-stage1): implementation through gate 13. Footer cites: Phase 1 RED evidence sha256, new GREEN evidence sha256, capture sidecar paths + per-descriptor .h5 sha256, per-descriptor perf-ledger wall_clock_seconds, determinism-strategy docstring summary, **MMS convergence-rate ladder summary** (observed OOA + cross-discretization comparison against eulerian-smoke's 1.99/2.00 baseline), D3Q19 equilibrium golden re-verification (3 tests × 19 values absolute 1e-15), Stage 0 Task 0.4 finding citation (cadence + depth + ~1.5×-corrected vs measured ratio — second data point for the empirical convention).

If Stage 1 runs long: stop at a clean cut-point per conventions doc § A.2 (after step 5 OR after step 7) and commit a partial checkpoint per conventions doc § B.3 (supersedes:-chain at the final checkpoint). Single-session lean expected per eulerian-smoke § 9.3 row 3 + charter § 4.2.

Closing — Commit docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-1-checkpoint-<UTC>.md per conventions doc § B.3. Body: 13-row gate-status table + per-descriptor capture sha256 + GREEN evidence sha256 + gate-13 replay outcome + determinism summary + convergence-rate ladder (with cross-discretization OOA comparison vs eulerian-smoke) + SHIFTED / banked items. Front-matter: both head_sha: AND head_sha_at_checkpoint:. Commit + Convention #12 SHA back-fill (full 40-hex). Then stop.

Out of scope: modifying any Phase 1 / prior-sub-phase artifact; the shared NS-2D MMS solution (eulerian-smoke consumed; LBM is second consumer); the D3Q19 equilibrium golden (Stage 2 owns the anchor lift); generalizing tools/testkit/code_verification/mms/runner.py (deferred to MPM plan-drafting); implementing any other Phase 1 sim; touching convergence files (Stage 2 owns); Stack-C C++ / CMake / Vulkan implementation (Phase-2+ per charter § 1.1).

Stuck → conventions doc § K (R-class STOP-AND-SURFACE) + charter § 9 (P23 inherited applies directly; P25 if added — lattice-units + kinetic-equation MMS) + RD-3D § 9 (P23) + Phase 1 charter § 9.
```

### § 7.3 Stage 2 — Landing

```
You are the lattice-boltzmann-d3q19 sub-phase Claude Code agent, Stage 2 (landing) for Bit-Physics.

Read:
  1. docs/conventions/sub-phase-conventions.md (§§ A.2, B, C, D, I, J load-bearing at Stage 2).
  2. docs/phases/sub-phase-lattice-boltzmann-d3q19.md §§ 4.3, 7.
  3. docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/{stage-0-checkpoint-<UTC>.md, stage-1-checkpoint-<UTC>.md}.
  4. docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md (most-recent per-sim landing; § 7 Stage 2 step structure precedent; § 7.6 B17 PATH-A third proof-point; § 9.3 banked observations).
  5. docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md (§ 7.1 Cat 3 Decision A lift precedent — the closest precedent for this sub-phase's Cat 3 disposition).
  6. tools/testkit/golden/tables/lattice/d3q19-equilibrium.json (Cat 3 anchor lift target — Stage 2 owns).
  7. tools/integrity/integrity/cat3_numerical/golden_values.py (the _SUBDIRS_PICKED_UP module-level tuple to extend additively).

You are the only stage that touches convergence files. All edits to pre-existing files are ADDITIVE (Convention A). Read the file first; append.

Execute Steps 2.1–2.11 per charter § 4.3 + conventions doc § A.2. Load-bearing items:

  Step 2.3 — Cat 3 `lattice` subdir disposition — **DECISION A (lift + pickup)**, NOT NO-OP.
    Pre-flight state: _SUBDIRS_PICKED_UP at HEAD = (Path("closed-form"), Path("agent-based"), Path("particle-fluids")). LBM ships D3Q19 equilibrium golden at tools/testkit/golden/tables/lattice/d3q19-equilibrium.json with 1 test_points entry + 1 independent_reference block + 4 packed citations (= 1 anchor per conventions doc § I.3). Spec § 2.4 R9 floor is ≥ 3 anchors. Lift required.
    Two-commit shape:
      (i) chore(lattice-boltzmann-d3q19-stage2-cat3-anchors): lift d3q19-equilibrium golden to ≥ 3 discrete anchors. Restructure the existing test_points[0].independent_reference packed-citation block into 3-4 discrete test_points entries, one per citation: (1) hand-derivation from Gauss-Hermite quadrature § 1-5 of derivations/d3q19.md, (2) Qian-d'Humières-Lallemand 1992 § 2 eq. (3a) Table 1, (3) Krüger 2017 Ch. 3 Table 3.4, (4) Python re-derivation by tools/testkit/golden/generator/d3q19_equilibrium.py. Each test_points entry has identical inputs (the at-rest ρ=1, u=(0.1,0,0) probe point) and identical expected f_eq array but a distinct independent_reference.source citation. Mechanical restructuring per § I.3 — preserve every citation verbatim; no new evidence introduced. Re-verify the generator's --verify path still GREEN against the lifted JSON.
      (ii) chore(lattice-boltzmann-d3q19-stage2-cat3-subdirs): extend _SUBDIRS_PICKED_UP for lattice subdir. Edit tools/integrity/integrity/cat3_numerical/golden_values.py to append Path("lattice") to the _SUBDIRS_PICKED_UP tuple. Verify Cat 3 anchor-count now picks up the d3q19-equilibrium.json file at ≥ 3 anchors.
    Verify pre-flight at Stage 2 that no incidental golden was added under tools/testkit/golden/tables/lattice/ during Stage 1 (only d3q19-equilibrium.json expected, unchanged from Phase 1).

  Step 2.5 — Gate-13 replay (conventions doc § E). Worktree at b6abd7e. Record both RED-replay outcome and HEAD-GREEN outcome.

  Step 2.7 — B17 mutation-score artifact (OPERATOR-ROUTABLE — LEAN PATH-A continue, fourth proof-point).
    Coordinator's prior leans: closed-form / agent-based PATH-B; RD-3D / sph-water / eulerian-smoke PATH-A continue (proof-points 1, 2, 3). Sim-source kill-rate trend: 0.5927 → 0.5581 → 0.4879.
    LEAN PATH-A-continue: additively extend tools/testkit/mutation/mutmut-config.toml with [tool.mutmut.targets.lattice_boltzmann_d3q19] block (paths-to-mutate: packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/; tests-dir: packages/lattice-boltzmann-d3q19/tests/). Existing testkit/integrity/closed-form/agent-based/RD-3D/sph-water/eulerian_smoke/incompressible_ns_2d_mms targets UNCHANGED. Use --disable-mutation-types string,fstring per conventions doc § J.3. Artifact: tools/testkit/mutation/sub-phase-lattice-boltzmann-d3q19-<UTC>.json. Commit slug: chore(lattice-boltzmann-d3q19-stage2-mutation-pathA): per-target extension + lattice-boltzmann-d3q19 baseline.
    SKIP the NS-2D MMS solution target (incompressible_ns_2d_mms) — already mutated at eulerian-smoke Stage 2 (0.6962 kill rate); re-mutation would be redundant per eulerian-smoke § 7.6 "Optional third target SKIPPED" precedent.
    ALT PATH-A-rebank: if operator judges the 0.5927 → 0.5581 → 0.4879 kill-rate trend signals diminishing returns from further proof-points (consideration: focused test-augmentation sub-phase against accumulated surviving-mutant IDs per sph-water § 9.2 may be more load-bearing), skip LBM mutation at this sub-phase. Commit slug: chore(lattice-boltzmann-d3q19-stage2-mutation-rebank): lattice-boltzmann-d3q19 mutation banked.
    STOP-and-surface precondition (conventions doc § J.5 / sph-water R15 inheritance): if PATH-A is dispatched and mutmut runtime explodes against canonical-capture tests, STOP. Likely low-risk for LBM (Poiseuille is small scale per Stage 0 Task 0.4 finding).
    Do NOT pre-decide; operator routes at Stage 2 dispatch.

  Step 2.8 — CHANGELOG additive entry per charter § 4.3 list.

  Step 2.9 — Sub-phase landing audit per conventions doc § B.3. Front-matter: artifact: sub-phase, artifact_id: sub-phase-lattice-boltzmann-d3q19, both head_sha: AND head_sha_at_checkpoint:. Include § 12 retrospective on Task 0.4 ~1.5× factor (second data point — eulerian-smoke was first); § 13 retrospective on cross-discretization MMS comparison (LBM observed OOA vs eulerian-smoke's 1.99/2.00 on same MMS surface — load-bearing for spec § 2.4 MMS-as-discretization-independent claim). Verdict-state CONFIRMED.

  Step 2.10 — Convention #12 SHA back-fill. NEVER --amend. Capture full 40-hex via `git rev-parse HEAD`.

  Step 2.11 — Final summary. No -phase-N tag. Optional v0.1.6 non-phase point-release banked for operator (default lean: no tag per conventions doc § D.2). Surface to operator: "lattice-boltzmann-d3q19 sub-phase landed at SHA <final>. LBM ships all 13 gates GREEN — FIRST lattice sim in the project; SECOND consumer of the shared NS-2D MMS (FIRST cross-discretization exercise — observed OOA <ladder> vs eulerian-smoke's 1.99/2.00); D3Q19 equilibrium golden GREEN at absolute 1e-15. Phase 0 + Phase 1 + six prior sub-phases unaffected; MPM still RED with ModuleNotFoundError pending its own sub-phase. Cat 3 lattice subdir: Decision A lift (1 → ≥3 anchors) + pickup landed. B17 routing: <PATH-A-continue with kill-rates / PATH-A-rebank with rationale>. Task 0.4 ~1.5× rule of thumb confirmed/refuted as second data point. MMS-runner generalization: STILL banked, now anchored by THREE inline examples (RD-3D + eulerian-smoke + LBM) — becomes load-bearing for MPM plan-drafting (interpolate focused generalization sub-phase, OR defer to spec-Phase-2+). § N graduation PROPOSED→established: banked for operator at conventions-doc refactor. No -phase-N tag pushed; optional v0.1.6 banked. Next sub-phase: mpm-multimaterial (last Phase 1 sim before spec-Phase-2 dispatchability)."

Stuck → conventions doc § K + charter § 9 + Phase 1 charter § 9.
```

---

## § 8. Checkpoint and continuation discipline

Inherits conventions doc § A.2 + § B.3 + § B.4. Paths:

- Stage 0 / Stage 1 checkpoints: `docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-<N>-checkpoint-<UTC>.md`.
- Stage 2: the sub-phase landing audit itself.
- Continuation prompt with `lattice-boltzmann-d3q19-stage<N>-...` slug.

Convention #12 SHA back-fill at EVERY stage close (conventions doc § B.2). Capture full 40-hex via `git rev-parse HEAD`; never transcribe short-SHA (eulerian-smoke § 9.3 row 5).

---

## § 9. Risk surface and playbook

Risks inherited via conventions doc § K. Sim-specific:

- **R-LBM-1 (lattice ↔ physical unit conversion drift at the MMS surface).** The MMS solution evaluates in physical units; LBM simulates in lattice units. Conversion: Δx_lattice = L_physical/N; ν_lattice = c_s²(τ-1/2); Ma_lattice = U_physical/c_s_physical. A single inconsistency (e.g., conflating Δt_physical with Δt_lattice in the OOA ladder time-step refinement) corrupts OOA without producing visible NaN/Inf. Mitigation: document the conversion convention in the determinism docstring (§ 4.2 step 1 clause v); spot-check at the canonical test point. P25 candidate.
- **R-LBM-2 (BGK τ choice near τ = 1/2 produces unstable or numerically degenerate viscosity).** τ → 1/2 gives ν → 0; τ < 1/2 gives negative viscosity (unstable). Pick τ ∈ [0.6, 1.0] for both canonical descriptors; document in sim-init. P25 candidate.
- **R-LBM-3 (Ma-bound violation invalidates Chapman-Enskog macroscopic recovery).** D3Q19 BGK recovers incompressible NS only at Ma ≪ 1. If the canonical descriptor's physical velocity drives Ma > 0.1, observed OOA on the macroscopic moments will deviate from p=2 systematically. Mitigation: derive Ma at descriptor setup; assert Ma < 0.1; document in capture sidecar.
- **R-LBM-4 (Streaming-direction order ambiguity).** The 19 c_i vectors have a canonical ordering (rest, 6 face neighbors, 12 edge neighbors per derivations/d3q19.md § 1); a different ordering at sim-init vs golden-table produces an apparent golden-mismatch without a bug. Mitigation: cite the velocity_indexing string from the golden JSON ("0=rest; 1..6=face neighbors …") in the determinism docstring.

### § 9.1 Inherited playbook

P21 (closed-form) + P22 (agent-based) + **P23 (RD-3D MMS-OOA debugging — applies directly to gate-5 (b) MMS work; conventions doc § M.4)** + P24 (sph-water determinism) all apply via conventions doc.

### § 9.2 New playbook entry — DECISION (LEAN ADD)

**P25 — LBM lattice-units + kinetic-equation MMS debugging — ADDED at this sub-phase (operator-confirmable).**

Reasoning: LBM has substantively new failure surfaces not covered by P22/P23/P24 — specifically the **kinetic-equation discretization** (D3Q19 streaming + BGK collision recovers macroscopic NS via Chapman-Enskog, NOT direct PDE discretization like RD-3D heat or eulerian-smoke SL+projection) and the **lattice ↔ physical unit conversion** (R-LBM-1) + Ma-bound (R-LBM-3) + τ-choice (R-LBM-2) + velocity-ordering (R-LBM-4) failure modes.

P25 worked example (skeletal — Stage 1 retrospective will refine with the actual failure mode if one surfaces):
1. **Cause: lattice ↔ physical conversion mismatch.** If observed OOA on the macroscopic-velocity field stalls at p ≈ 1 instead of p = 2, check (a) Δt refinement scheme (dt_physical ∝ dx² for diffusive OOA, vs dt ∝ dx for advective; LBM via Chapman-Enskog is dt ∝ dx² for the kinematic-viscosity term but dt ∝ dx for the inertial term — pick refinement to match the dominant term at the test point); (b) τ held constant across the ladder (varying τ changes ν_lattice, contaminates OOA); (c) Ma < 0.1 at all ladder points.
2. **Cause: Ma-bound violation.** Diagnose by computing Ma at each ladder point. If Ma exceeds 0.1 even at the coarsest N, the descriptor's physical U is too high — reduce U or shift to a different canonical test point in the MMS.
3. **Cause: velocity-direction ordering mismatch.** Diagnose by spot-checking f_i^eq against the golden JSON at multiple (ρ, u) points; a wrong c_i ordering yields a permutation, not a tolerance violation.
4. **Cause: BGK τ near the stability boundary.** τ ∈ {0.55, 0.6, 0.7, 1.0} OOA-ladder sweep at fixed N: if OOA degrades as τ → 0.5, the floor is τ-stability not algorithmic correctness.
5. **Cause: bounce-back BC error contaminating the MMS interior.** Use periodic BCs for the MMS-OOA test (the manufactured solution has compatible periodic BCs by construction); reserve bounce-back for canonical-capture descriptors (Poiseuille, Couette).

Skip rationale (alternative — to record if operator routes SKIP): inherited P23 + P24 cover BC stencil ordering + iter-cap discipline; the lattice-units conversion + Ma-bound + τ choice are properly **configuration** risks rather than determinism risks, and could be captured as sub-phase-specific notes rather than a project-wide playbook entry. **The Stage 1 dispatch confirms or refutes the lean ADD; if Stage 1 surfaces no failures requiring P25 (analogous to eulerian-smoke § 9.2 SKIP rationale), the operator may route P25 to bank rather than land.**

---

## § 10. Audit-trail discipline

Inherits conventions doc § B. Sub-phase audits live under `docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/`. Append-only check at Stage 2 Step 2.6 forbids edits to any file present at `v0.1.0-phase-1` OR within any prior sub-phase audit chain (conventions doc § B.1 protected-set growth; eleven protected sets at Stage 2 close per § 4.3). The shared NS-2D MMS solution + the D3Q19 equilibrium golden (pre-Stage-2-lift) are append-only-protected; the Stage 2 lift restructures the golden additively per conventions doc § I.3.

---

## § 11. Sub-phase coherence

### § 11.1 Inputs

- LBM TDD bundle (5 spec docs + D3Q19 equilibrium golden + 5 failing test files) at SHA `b6abd7e`.
- Shared NS-2D MMS solution (second consumer after eulerian-smoke).
- IC-1 / IC-3 / IC-6 (`vector_field` Tier 2) infrastructure (Phase-1-shipped; eulerian-smoke exercised first at sim scale).
- LFS infrastructure (git-lfs-migration sub-phase) — captures land transparently.
- 73 cumulative shifts (conventions doc § M tally + eulerian-smoke § 8.3) — inherited, not re-litigated.

### § 11.2 Outputs to subsequent sub-phases

- LBM 13 gates GREEN; first lattice sim; first cross-discretization NS-2D MMS exercise.
- **Two new canonical captures** in `captures/lbm-ref/` via LFS per Appendix D § D.2.3 (cadence + depth per Stage 0 Task 0.4).
- **Cat 3 `lattice` subdir picked up** (sibling additive after `closed-form`, `agent-based`, `particle-fluids`); `_SUBDIRS_PICKED_UP` grows to 4 entries. Remaining sibling: `hybrid-pg` (banked to MPM sub-phase).
- **Second exercise of Task 0.4 as established discipline** — landing-audit retrospective records the second data point on the ~1.5× production-correction factor.
- **Cross-discretization MMS comparison data** — load-bearing for spec § 2.4 MMS-as-discretization-independent claim; informs MPM plan-drafting (MPM does not consume NS-2D MMS but the cross-discretization principle generalizes).
- **MMS-runner generalization now anchored by THREE inline examples** (RD-3D + eulerian-smoke + LBM); becomes load-bearing for MPM plan-drafting: interpolate a focused MMS-pipeline-generalization sub-phase, OR defer to spec-Phase-2+, OR (less likely given three precedents) inline once more for MPM.
- B17 routing outcome (fourth proof-point of PATH-A continue, OR rebank precedent).
- P25 playbook entry (if added per § 9.2) — inherited by future MMS-using or lattice-class sub-phases.

After LBM lands, **mpm-multimaterial is the LAST Phase 1 sim**; once MPM lands, spec-Phase-2 (cross-stack replication) becomes dispatchable at `v0.2.0-phase-2`.

### § 11.3 Inherited banked items still open going out

By reference to conventions doc § L.2 + § L.3 + eulerian-smoke landing § 9.2 (RD-3D / sph-water / eulerian-smoke test-augmentation candidates; common-py adoption; MAC-staggered refactor; Cat 5 audit-links on evidence files; B2–B6/B11/B16; B-hotfix-1 / B-hotfix-2; etc.).

### § 11.4 Replay-chain non-participation + tag posture

Per conventions doc § D.2 + § D.4. This sub-phase does NOT participate in the cross-phase replay chain; next spec-phase pre-flight replays against `v0.1.0-phase-1`. Tag posture: **default lean no tag**; banked alternative `v0.1.6` (no `-phase-N`), operator-pushed only. Forbidden either way: any tag carrying `-phase-N`.

### § 11.5 Operator-routable items surfaced by this plan

For explicit operator confirmation at dispatch time:

1. **§ 1.1 language-pivot re-anchor** — confirm Python NumPy reference at Stack-D (default lean). Alternative would be a Stack-C C++/Vulkan port, materially different scope (Phase-2+ per spec § 5.7).
2. **§ 1.3 / Task 0.4 dispatch** — Task 0.4 now treated as established per § N graduation recommendation (conventions doc itself still says PROPOSED; this is a banked inconsistency for operator to resolve at LBM landing — graduate the conventions doc, or revert the plan's framing). Default lean: dispatch as established discipline + second data point.
3. **§ 4.3 Step 2.7 B17 routing** — LEAN PATH-A continue (fourth proof-point). Alternative: PATH-A rebank if the kill-rate trend (0.5927 → 0.5581 → 0.4879) signals diminishing returns from further proof-points and test-augmentation sub-phase is the more load-bearing follow-up.
4. **§ 9.2 P25 decision** — LEAN ADD P25 (LBM lattice-units + kinetic-equation MMS debugging) at this sub-phase. Alternative: SKIP if Stage 1 retrospective surfaces no LBM-specific failure mode requiring playbook codification (eulerian-smoke § 9.2 SKIP precedent).
5. **§ 11.4 v0.1.6 tag** — confirm no-tag default vs push-v0.1.6.

Additional banked observation for operator at LBM landing: **conventions doc § N PROPOSED-vs-established framing inconsistency** — this plan treats § N as established per eulerian-smoke § 9.3 row 1 recommendation; the conventions doc itself still says PROPOSED. Resolve at LBM landing by either (a) graduating § N in a conventions-doc additive edit, or (b) reverting this plan's framing.

---

*End of lattice-boltzmann-d3q19 sub-phase charter. Inherits 73 cumulative shifts via conventions doc § M + eulerian-smoke § 8.3. Treats Task 0.4 as established discipline per § N graduation recommendation (banked operator decision). First lattice sim + first cross-discretization NS-2D MMS exercise + first sub-phase to ship both a golden table AND an MMS gate. Cat 3 disposition is Decision A (lift + pickup), NOT NO-OP — deviation from RD-3D + eulerian-smoke precedent justified by the D3Q19 equilibrium golden. Bit-identity invariant at 13 invocations going in; Stage 0 Task 0.0 is the 14th. LFS infrastructure transparent. MMS-runner generalization remains banked, will be anchored by three inline examples for MPM plan-drafting load-bearing.*
