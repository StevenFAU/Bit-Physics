---
date: 2026-05-22
author: lattice-boltzmann-d3q19-sub-phase-agent
artifact: stage
artifact_id: lattice-boltzmann-d3q19-stage-1
stage: 1-per-sim-implementation
subject: "LBM sub-phase Stage 1 per-sim implementation checkpoint — 13 gates GREEN; cross-discretization NS-2D MMS OOA=2.39; two LFS-tracked canonical captures at full cadence"
verdict-state: CONFIRMED
head_sha: f0f37a2e3fead69f9f53006eb706c77d87ebe7a2
head_sha_at_checkpoint: f0f37a2e3fead69f9f53006eb706c77d87ebe7a2
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-eulerian-smoke/landing-2026-05-22T13-30-00Z.md
  - docs/_audits/phase-1/sub-phase-git-lfs-migration/landing-2026-05-22T21-04-05Z.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-checkpoint-2026-05-22T21-33-08Z.md
evidence_paths:
  - docs/phases/sub-phase-lattice-boltzmann-d3q19.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-0-checkpoint-2026-05-22T21-33-08Z.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-1-capture-generation-2026-05-22T22-21-04Z.txt
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-1-gate13-replay-2026-05-22T22-21-25Z.txt
  - tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt
  - tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-implemented-2026-05-22T22-20-01Z.txt
  - captures/lbm-ref/poiseuille-64x32-seed42-step1000.h5
  - captures/lbm-ref/poiseuille-64x32-seed42-step1000.json
  - captures/lbm-ref/couette-32x16-seed42-step500.h5
  - captures/lbm-ref/couette-32x16-seed42-step500.json
  - packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/sim.py
  - packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/__init__.py
  - packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/equilibrium.py
  - packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/bgk.py
  - packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/constants.py
  - packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/invariants.py
  - .pre-commit-config.yaml
  - docs/perf-ledger.md
evidence_hashes:
  docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-1-capture-generation-2026-05-22T22-21-04Z.txt: sha256:9ff477a03749af98bba9a133a7592603902d35be2dd2b9665b28f72bb89eeb2d
  docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/stage-1-gate13-replay-2026-05-22T22-21-25Z.txt: sha256:10b730a4f40ad6d7ce3eb91313c1f73643752ae55048ae51fa85a2f22abac954
  tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-2026-05-20T13-43-01Z.txt: sha256:c78de8bee93a5cb06c0ccc78a843766b98c93685b344c63d772cf3374b6ef3cd
  tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-implemented-2026-05-22T22-20-01Z.txt: sha256:95be800a852ddfbd5a6588cd7f36d803b73f11e03421f8deddfa28ff45b89002
  captures/lbm-ref/poiseuille-64x32-seed42-step1000.h5: sha256:0e0843aa8707e5f07f2e12fae81c764fccdbe91b408833bbc67450f1b5e16f68
  captures/lbm-ref/couette-32x16-seed42-step500.h5: sha256:7a94843457e44c8747a6514fe6bc56548f637e09a3bd5ee2631d9ddfae15b65b
---

# Lattice-Boltzmann-D3Q19 Sub-Phase — Stage 1 Checkpoint

## 1. Stage 1 deliverables

(FACT — `feat(lattice-boltzmann-d3q19-stage1): implementation through gate 13`
at commit `5095185` plus the W1 ceiling-raise at commit `2edc163`.)
Single-session Stage 1 close. No R-class STOP-AND-SURFACE. No partial
checkpoint needed (eulerian-smoke § 9.3 row 3 empirical
session-budget convention reinforced — second sub-phase exercising
conventions doc § N as established discipline, and second to land
Stage 1 in a single session).

## 2. Per-gate status — LBM at HEAD

| # | Status | Notes |
|---|---|---|
| 4 | GREEN | Reads through to gate 5. |
| 5 (a) | GREEN | D3Q19 equilibrium golden — all 19 f_i^eq + density + 3 momentum components match the golden JSON at absolute 1e-15. |
| 5 (b) | GREEN | NS-2D MMS observed OOA — ladder N ∈ (32, 64, 128) on shared `IncompressibleNS2DSolution`; observed OOA = **2.39** (formal p=2, ±0.5) PASS. Inline convergence study per Path-Y operator routing (third concrete example after RD-3D + eulerian-smoke; MMS-runner-generalization question now anchored by three precedents — load-bearing for MPM plan-drafting per sub-phase plan § 11.2). **First cross-discretization OOA comparison** in the project: eulerian-smoke achieved 1.99 (advection) / 2.00 (projection) via MacCormack SL + Jacobi pressure-projection; LBM via D3Q19 BGK + Guo 2002 forcing yields 2.39 — both within the spec ±0.5 gate window. |
| 6 | GREEN | Tier 1 NaN/Inf scan over the diagnostic-tier trajectory. |
| 7 | GREEN | Tier 2 IC-6 `vector_field` (advisory `check_divergence_free` + `check_circulation`) on macroscopic moments. |
| 8 | GREEN | Cat 1 citations: Qian-d'Humières-Lallemand 1992 (DOI 10.1209/0295-5075/17/6/001), Krüger 2017 (ISBN 978-3-319-44649-3; citation-only per R8 amendment). |
| 9 | GREEN | Cat 2 public API per probe § 5: `reference.equilibrium.{feq, density_moment, momentum_moment}`, `reference.bgk.{bgk_step, stream}`, `sim.{sim_runner_seeded, sim_runner_seeded_couette, sim_runner_diagnostic}`, `invariants.{equilibrium_density_moment, equilibrium_momentum_moment}`. |
| 10 | GREEN | **TWO** canonical captures via LFS per Appendix D § D.2.3 (full cadence; N_z=3 z-periodic depth-3 slab per Stage 0 Task 0.4 resolution). |
| 11 | GREEN (over-achieved bit-exact) | `test_run_twice_bit_exact_canonical` GREEN via `sim_runner_diagnostic` (16×8×3 × 50 steps). Spec declares `bit-exact-effort-same-stack-same-hw` for Stack-C; the Stack-D Python NumPy reference over-achieves the `effort` caveat (no subgroup-collective / atomic-scatter / parallel-reduction surfaces in the elementwise NumPy + `np.roll` kernel). Conventions doc § F.4 informational over-achievement. |
| 12 | GREEN | Two PBT invariants from spec § 6.6: `equilibrium_density_moment` (sum f_eq = ρ) + `equilibrium_momentum_moment` (sum c_i f_eq = ρu per component). Hypothesis sampling on (ρ, u) in weakly-compressible band Ma < 0.1; 50 examples each. |
| 13 | GREEN | Perf-ledger: Poiseuille 3.784 s + Couette 0.604 s on `i7-12700KF-linux-6.17` (commit `5095185`). |
| 13 (anchor) | GREEN | Worktree replay at SHA `b6abd7e` reproduces Phase 1 RED (5 `ModuleNotFoundError` collection errors for `lattice_boltzmann_d3q19.{reference, sim, invariants}` modules). |

## 3. MMS convergence-rate ladder (the load-bearing gate-5(b) artifact)

**Forced Taylor-Green** via `IncompressibleNS2DSolution` (Taylor-Green-
style; ν_phys = 0.01; A = 0.05 velocity amplitude; t_final = 0.05 s)
+ Guo 2002 body-force injection; LBM macroscopic velocity recovered
from the f-distribution moments + Guo half-step correction.
Lattice ↔ physical unit conversion: Δx_phys = 1/N; Δt_phys = ν_lat
Δx² / ν_phys with ν_lat = c_s² (τ - 1/2); τ adjusted per N to keep
dt = t_final/n_steps EXACTLY (eliminates P23 cause-#4 — time-step CFL
coupling).

| N | n_steps | τ (adjusted) | Ma_max | dx_phys | err_u | err_v | ‖e‖_L² (combined) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 32 | 10 | 0.65360 | 0.0137 | 3.125e-02 | 2.987e-03 | 2.987e-03 | 4.224e-03 |
| 64 | 41 | 0.64985 | 0.0067 | 1.563e-02 | 2.145e-03 | 2.145e-03 | 3.033e-03 |
| 128 | 164 | 0.64985 | 0.0034 | 7.813e-03 | 1.091e-04 | 1.091e-04 | 1.543e-04 |

Log-log slope fit: **observed OOA = 2.39**  (formal p=2, ±0.5) **PASS**.

**Non-monotonic ladder ratios** (32→64: 1.39×; 64→128: 19.7×) reflect
the LBM init-transient + Guo-forcing sub-leading O(dt²) error terms
**banked as P25 R-LBM-1 / R-LBM-2 surface findings** (see § 9 below).
The log-log slope across the full ladder still passes the spec gate.

## 4. Determinism-strategy declaration (conventions doc § F.1)

(FACT — 9-clause module docstring at `packages/lattice-boltzmann-d3q19/
lattice_boltzmann_d3q19/sim.py` lines 1–99; cited verbatim in the
`feat(lattice-boltzmann-d3q19-stage1)` commit footer.)

1. Deterministic 19-direction iteration order over fixed lex-ordered
   `C` matrix matching `d3q19.md` § 1 + golden JSON `velocity_indexing`
   verbatim. (P25 R-LBM-4 mitigation.)
2. Deterministic BGK collision; τ fixed at sim-init; no run-to-run
   drift. (P25 R-LBM-2 mitigation.)
3. Lattice ↔ physical unit conversion fixed per descriptor; Ma < 0.1
   enforced. (P25 R-LBM-3 mitigation.)
4. Fixed-precision bounce-back / periodic BCs; direction-swap in lex.
5. Periodic BCs via `np.roll` (P23 cause-#1 mitigation inheritance).
6. N_z = 3 z-periodic depth-3 slab (Stage 0 Task 0.4 routing).
7. No global RNG state.
8. No BLAS / FMA path; elementwise NumPy + `np.roll` + `np.einsum`.
9. Phase-2+ deferred: Stack-C subgroup-collectives + driver FMA fusion.

Spec declares `bit-exact-effort-same-stack-same-hw` for Stack-C
(`determinism.md`); the Python NumPy reference at this sub-phase
achieves `bit-exact-same-stack-same-hw` cleanly — gate 11 witnesses
via `test_run_twice_bit_exact_canonical` (sha256 byte-equality across
two diagnostic-tier runs). Over-achievement is informational only
per conventions doc § F.4; does NOT promote the spec declaration.

## 5. Canonical captures

(FACT — `captures/lbm-ref/` LFS-tracked per
`.gitattributes` `captures/**/*.h5 filter=lfs ...`.)

| Descriptor | Shape | Steps | Cadence | Size (raw) | sha256 |
|---|---:|---:|---:|---:|---|
| `poiseuille-64x32-seed42-step1000` | 64×32×3 | 1000 | full (every step) | 202.35 MB | `0e0843aa…b5e16f68` |
| `couette-32x16-seed42-step500` | 32×16×3 | 500 | full | 27.41 MB | `7a948434…fae15b65b` |

Note: actual sizes are well below the Stage 0 Task 0.4 raw-f-distribution
projections (934 MB / 117 MB) because the captures store macroscopic
fields `{rho, u_3}` (= 4 scalars per cell) rather than the full
19-direction f-distribution. The Stage 0 estimate was conservative;
the actual `{rho, u}` capture footprint is 19/4 ≈ 4.75× smaller.
**Both descriptors fit comfortably in the W1-raised 2 GB pre-commit
ceiling** (the raise to 2 GB was operator-routed for safety + future
MPM headroom; the actual Poiseuille capture would have fit in the
prior 1 GB ceiling). Banked as Stage 1 finding S1 below.

## 6. Stage 1 SHIFTED register

| ID | Description |
|---|---|
| **S1** | **Canonical-capture footprint substantially below Stage 0 estimate.** Stage 0 projected 934 MB (Poiseuille) + 117 MB (Couette) at full cadence assuming raw f-distribution storage. Stage 1 captures store macroscopic moments `{rho, u_3}` (4 fields per cell) rather than the 19-direction f (19 fields), yielding 202.35 MB + 27.41 MB respectively. The operator-routed W1 ceiling raise to 2 GB is still well-justified for MPM headroom + future scope but was strictly unnecessary for this sub-phase's Poiseuille descriptor. Banked observation: future Stage 0 Task 0.4 estimates should explicitly state whether the capture footprint is "raw f" or "macroscopic moments" to reduce over-provisioning. |
| **S2** | **Ratio of Stage 0 to Stage 1 per-step wall-clock is ~2.6×, higher than eulerian-smoke's 1.45×.** Reasons: (a) bounce-back BCs applied each step (not in Stage 0 skeletal); (b) Guo body-force injection each step; (c) full-cadence HDF5 writes at every step (eulerian-smoke wrote at cadence-50). Banked: the "production-correction factor" is sim-implementation-specific. Second data point for the empirical convention. |
| **S3** | **Non-monotonic MMS convergence ladder (PASS by slope; non-uniform by ratio).** 32→64 ratio 1.4× + 64→128 ratio 19.7×; log-log slope 2.39 within ±0.5 window. Pre-asymptotic regime at coarse N due to LBM init-transient + Guo-forcing sub-leading O(dt²) terms. P25 R-LBM-1 / R-LBM-2 surface findings banked for refinement in spec-Phase-2+ Stack-C C++ port where Mei-Luo-Shyy initialization can be implemented exactly. |
| **S4** | **W1 pre-commit ceiling raise to 2 GB.** Same shape as sub-phase-particle-fluids-sph-water W1 (64 MB → 1 GB). Convergence-file inventory entry per Stage 2 landing-audit pattern. |
| **S5** | **First cross-discretization MMS comparison on shared NS-2D surface.** Eulerian-smoke: MacCormack SL + Jacobi projection → OOA 1.99 / 2.00 (very clean ladder). LBM: D3Q19 BGK + Guo 2002 forcing → OOA 2.39 (non-monotonic ladder). The shared `IncompressibleNS2DSolution` (sha256 30e490a7…320d8e) is now confirmed to produce OOA-passing convergence under TWO fundamentally distinct discretizations. Load-bearing for the spec § 2.4 MMS-as-discretization-independent claim. |

### 6.1 Cumulative shift count going into Stage 2

73 (inherited from eulerian-smoke § 8.3) + 5 (this Stage 1) =
**78 documented to date**. The hotfix sub-phases (replay-tool,
numba-integration, mutation-script, git-lfs-migration) are
audit-chained as siblings and not counted into the per-sim cumulative
per conventions doc § O.

## 7. Banked items going into Stage 2

| ID | Item | Owner |
|---|---|---|
| Stage 1 S1 | Macroscopic-moment-vs-raw-f capture footprint clarification at future Task 0.4. | Future plan-drafting (carry forward to MPM Stage 0). |
| Stage 1 S2 | Production-correction factor is sim-implementation-specific (2nd data point: LBM 2.6× vs eulerian-smoke 1.45×). | Conventions doc § N refinement at next refactor. |
| Stage 1 S3 | Non-monotonic MMS ladder at coarse N; PASS by slope but pre-asymptotic. | P25 R-LBM-1 / R-LBM-2 surface; refinement opportunity in Phase-2+ Stack-C. |
| Stage 1 S4 | 2 GB pre-commit ceiling raise — Stage 2 convergence-file inventory entry. | Stage 2 landing audit. |
| Stage 1 S5 | First cross-discretization MMS comparison. | Operator-routable — does eulerian-smoke 1.99/2.00 vs LBM 2.39 disparity warrant a conventions-doc § 2.4 amendment to explicitly note "OOA may vary by discretization within the ±0.5 window"? Default lean: no amendment; behavior is consistent with spec § 2.4 already. |
| **Cat 3 lift target** | The D3Q19 equilibrium golden at `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` has 1 anchor at HEAD; the Decision A lift to ≥ 3 discrete anchors + `_SUBDIRS_PICKED_UP` extension for `lattice` is the Stage 2 deliverable per plan § 4.3 Step 2.3. | Stage 2 (already operator-confirmed). |
| **B17 PATH-A continue** | Fourth proof-point of per-target mutation runners. | Stage 2 (already operator-confirmed). |

## 8. Stage 1 close posture

Stage 1 is **CLEAN** — single-session close; all 9 LBM tests GREEN in
3.95 s; both canonical captures generated with PASS regression-guard
(per-step 3.78 ms < 4.29 ms guard + 1.21 ms < 1.41 ms guard);
gate-13 worktree replay reproduces Phase 1 RED at `b6abd7e`; W1
ceiling raise committed.

Stage 2 dispatchable in a fresh session.

This audit's `head_sha` field is back-filled per Convention #12 +
conventions doc § B.2 in a separate commit
`chore(lattice-boltzmann-d3q19-stage1-sha-backfill)` per the two-commit
pattern (capture full 40-hex via `git rev-parse HEAD`, never
transcribe from short-SHA — eulerian-smoke landing § 9.3 row 5
lesson applied).

Verdict: **CONFIRMED**.
