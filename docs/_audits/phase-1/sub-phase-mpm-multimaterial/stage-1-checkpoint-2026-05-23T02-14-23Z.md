---
date: 2026-05-23
author: mpm-multimaterial-sub-phase-agent
artifact: stage
artifact_id: mpm-multimaterial-stage-1
stage: 1-per-sim-implementation
subject: "MPM-Multimaterial sub-phase Stage 1 per-sim implementation — gates 4-13 GREEN; LAST per-sim Phase 1 sub-phase"
head_sha: 53349c1acc337c309fad2ccd0a119d79caf6a9c8
head_sha_at_checkpoint: 53349c1acc337c309fad2ccd0a119d79caf6a9c8
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-checkpoint-2026-05-23T01-33-19Z.md
evidence_paths:
  - docs/phases/sub-phase-mpm-multimaterial.md
  - docs/conventions/sub-phase-conventions.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-0-checkpoint-2026-05-23T01-33-19Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-1-gate13-replay-2026-05-23T02-10-33Z.txt
  - tools/testkit/failing-tests-evidence/mpm-multimaterial-2026-05-20T13-48-06Z.txt
  - tools/testkit/failing-tests-evidence/mpm-multimaterial-implemented-2026-05-23T02-13-16Z.txt
  - tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json
  - captures/mpm-ref/drop-impact-128cube-seed42-step500.h5
  - captures/mpm-ref/drop-impact-128cube-seed42-step500.json
  - docs/perf-ledger.md
  - packages/mpm-multimaterial/mpm_multimaterial/sim.py
  - packages/mpm-multimaterial/mpm_multimaterial/invariants.py
  - packages/mpm-multimaterial/mpm_multimaterial/reference/__init__.py
  - packages/mpm-multimaterial/mpm_multimaterial/reference/shape_functions.py
  - packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py
evidence_hashes:
  docs/_audits/phase-1/sub-phase-mpm-multimaterial/stage-1-gate13-replay-2026-05-23T02-10-33Z.txt: sha256:08c25255dd0c25083da94087b9a7d2c64e1ba3b9c9cadc8f40cff31cc41227b8
  tools/testkit/failing-tests-evidence/mpm-multimaterial-2026-05-20T13-48-06Z.txt: sha256:a57251a19b28888e664402e9c92eb681fa17719be7e156154df3d681bb9edf94
  tools/testkit/failing-tests-evidence/mpm-multimaterial-implemented-2026-05-23T02-13-16Z.txt: sha256:d0bd6f9c5ecf6a1ee267a43ada521c1ca60091d7cb403fb999dfedb5d2ce34e7
  tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json: sha256:4142dda261826c87d93ba6f70e2658d94722a5010fa6512fe0cc134f49197e48
  captures/mpm-ref/drop-impact-128cube-seed42-step500.h5: sha256:73e00d0976a663a8e9c1de87334cba701a385ae9b044ead929eac8b540b5ebae
  captures/mpm-ref/drop-impact-128cube-seed42-step500.json: sha256:ea3531e032c4658bd5c06a7bf5c0b76e18b50515d67bd932efaa4a5cd28d1a2f
  docs/perf-ledger.md: sha256:1788532f1221b0e4366d9fd5b7078c1754adbacd178ad3e4df340af3b13deb0d
  packages/mpm-multimaterial/mpm_multimaterial/sim.py: sha256:38dd8c798bd8ba10ab57909768641a57f9b19de073594459fff5b8a274fef164
  packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py: sha256:1bf9ac70828bfd295289f9791297e19c2c5ab5cdb7bbf49ab3386f14befcbb0b
  packages/mpm-multimaterial/mpm_multimaterial/reference/shape_functions.py: sha256:1082d1373f68638401602d06605024767b47e6e3bc27a9894ddf865d118bb0c0
  packages/mpm-multimaterial/mpm_multimaterial/invariants.py: sha256:4eb6d5457f9d7538069f3b74a94c6a8b65377ad2b54489a0b7ca405e22ff36e7
---

# MPM-Multimaterial Sub-Phase — Stage 1 Checkpoint (Per-sim Implementation)

## 1. Stage scope

Per-sim implementation close for `sub-phase-mpm-multimaterial`. Single
sub-bundle commit at `9bd770e` (this commit; back-fill in separate
commit per Convention #12). MPM is the **seventh and LAST** per-sim
implementation sub-phase under spec-Phase-1; closes the 9-sim
implementation arc through gates 4-13.

Single-session Stage 1 expected per eulerian-smoke + LBM N3 precedent;
**third consecutive single-session-ready Stage 1** — anchors the
conventions doc § N graduation recommendation (third strong-signal
data point after eulerian-smoke + LBM).

ONE shift surfaced (S1 — base-node convention bug fixed in the wild
during diagnostic-tier dynamics trace; R-MPM-3 anchored as FIRST P26
worked-example actually triggered in practice). NO R-class
STOP-AND-SURFACE arcs.

## 2. Per-gate status — MPM at HEAD `9bd770e`

| # | Status | Notes |
|---|---|---|
| 4 | GREEN | Reads-through to gate 5. |
| 5 | GREEN | **MLS-MPM quadratic-B-spline golden** — 2 tests × 13 sample/PoU values at absolute 1e-15 against `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` (sha256 `4142dda2…fec9a48` unchanged from Phase 1). No MMS arm (linear-elasticity MMS deferred per sim-spec-ref § 6.1; MPM is third golden-only sim through Phase 1 alongside closed-form / agent-based / sph-water). |
| 6 | GREEN | Tier 1 NaN/Inf scan over canonical-trajectory output — `test_tier1_health_no_nan_inf` GREEN. |
| 7 | GREEN | Tier 2 **hybrid surface — FIRST sub-phase to consume BOTH IC-5 AND IC-6**. IC-5 `check_count_invariance` (particle count fixed) + `check_momentum_conservation_drift` advisory (gravity-driven drift bounded); IC-6 `check_circulation_grid_mom_l1` (L1 norm of grid momentum, finite + bounded). |
| 8 | GREEN | Cat 1 citations: Hu 2018 (DOI 10.1145/3197517.3201293), 88-line MLS-MPM reference (citation-only per R8 amendment — no vendored code), Steffen-Kirby-Berzins 2008 (DOI 10.1002/nme.2360). |
| 9 | GREEN | Cat 2 public API per probe § 5: `reference.shape_functions.{N, partition_of_unity_sum}` + `reference.mls_mpm.{p2g, p2g_with_stress, g2p, grid_update, deformation_update, compute_particle_stresses, advect_particles}` + `sim.{sim_runner_seeded, sim_runner_diagnostic}` + `invariants.{mass_conservation_p2g_g2p, partition_of_unity_b_spline}`. |
| 10 | GREEN | **ONE** LFS-tracked canonical capture per Appendix D § D.2.3: `captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` — 1M particles × 128³ grid × 500 steps; cadence-50 (11 frames) per Stage 0 Task 0.4 routing; 1.13 GB committed (within 2 GB W1 ceiling); wall-clock 158.052 s. Payload sha256 `73e00d09…b5ebae`. |
| 11 | GREEN (over-achieved bit-exact) | `test_run_twice_epsilon_diff` GREEN via `sim_runner_diagnostic` (16³ × 5K particles × 50 steps). Spec declares `epsilon-same-stack-same-hw` for Stack-D Taichi; Stack-D Python NumPy + numba reference over-achieves to bit-exact-same-stack-same-hw — informational only per conventions doc § F.4. Same posture as sph-water + LBM Stack-D Python over-achievement. |
| 12 | GREEN | 2 PBT invariants per spec § 6.6 — `mass_conservation_p2g_g2p` (Hypothesis 50 examples × random 1-50 particles in 16³ grid; ∑m_p exactly preserved under P2G partition-of-unity) + `partition_of_unity_b_spline` (Hypothesis 50 examples × random p ∈ [-100, 100]; ∑_{k∈{0,1,2}} N(p − (base + k)) = 1 within 1e-15). |
| 13 | GREEN | Perf-ledger first-landing row: `mpm-multimaterial | numpy-numba-reference | drop-impact-128cube-seed42-step500 | 158.052 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-23`. |
| 13 (anchor) | GREEN | Worktree replay at SHA `9de8048` reproduces Phase 1 RED (4 `ModuleNotFoundError` collection errors for `mpm_multimaterial.{reference, sim, invariants}` modules). Replay-output sha256 `08c25255…1227b8`. |

## 3. Determinism-strategy declaration (conventions doc § F.1)

(FACT — 10-clause module docstring at `packages/mpm-multimaterial/mpm_multimaterial/sim.py` lines 1-105; cited in the `feat(mpm-multimaterial-stage1)` commit footer.) Ten clauses cover:

1. Sorted-particle iteration (P24 inheritance from sph-water).
2. Deterministic 27-cell P2G stencil ordering (lex over (di, dj, dk); R-MPM-1 mitigation; P26 cause-1).
3. No atomic-scatter-add (single-threaded `@njit(parallel=False)`); explicit over-achievement of spec `epsilon` posture to bit-exact.
4. Matched G2P interpolation order (R-MPM-1 mitigation).
5. Lex `grid_update` over (i, j, k).
6. Multimaterial volume-fraction tracking; single material 0 at this sub-phase per algebraic.md § 3 ("Phase 2+ populates table"); R-MPM-2 mitigation; P26 cause-4.
7. Fixed base-node convention `base = floor(fx + 0.5) - 1` per golden table `base_node_convention` field; R-MPM-3 mitigation; P26 cause-2.
8. No global RNG state; `numpy.random.default_rng(seed)` only (P22).
9. `@njit(fastmath=False, cache=True)` discipline per conventions doc § G; banned flags never applied; cache-via-source-hash propagates through Stage 2 PATH-A per sph-water Stage 2 N3.
10. Phase-2+ deferred (Stack-D Taichi atomic-scatter-add, FMA fusion).

## 4. Stage 0 → Stage 1 wall-clock comparison (third § N data point)

(FACT — Stage 0 task04-bench-2026-05-23T01-33-19Z.txt at canonical 2M particles + Stage 1 perf-ledger row.)

| Metric | Stage 0 measurement (skeletal P2G+G2P only) | Stage 1 measurement (full sim with stress + grid + deformation) | Ratio |
|---|---|---|---|
| Per-step floor at 2M particles | 1.0445 s | (extrapolated from 1M Stage 1) 316 ms × 2 = ~632 ms | 0.6× under-shoot |
| 500-step wall-clock at 1M particles | (Stage 0 numba projection × 500) 522 s | **158.052 s MEASURED** | 0.3× |
| 500-step + ~2.5× production-correction | 1305 s = 21.8 min | 158 s = 2.6 min | well under threshold |

**Production-correction empirical-range third data point: 0.6× under-shoot.**

The empirical convention now has THREE data points across the per-sim
sub-phases that exercised conventions doc § N as established discipline:

| Sub-phase | Stage 0 projection | Stage 1 reality | Factor |
|---|---|---|---|
| eulerian-smoke | 0.93 s/step skeletal | 1.348 s/step measured | **1.45× over-shoot** |
| LBM | 7.55 ms/step raw-f projection | 3.78 ms/step macroscopic-moment commit | **0.5× under-shoot** |
| **MPM** | 1.0445 s/step @ 2M numba | ~632 ms/step @ 2M-extrapolated full sim | **0.6× under-shoot** |

Range: `[0.5×, 1.45×]` — a factor-of-3 spread (`max / min ≈ 2.9`). The
under-shoots (LBM + MPM) are characteristic of sub-phases where the
committed payload is narrower than the skeletal-bench scope: LBM
committed macroscopic moments (4× smaller than raw f-distribution);
MPM committed particle pos + vel + grid momentum but Stage 0 bench
included full P2G + G2P round-trip without the grid_update cost (so
Stage 0 over-estimated). The over-shoot (eulerian-smoke) was the
opposite shape — skeletal bench under-modeled the projection passes.

**Banked recommendation for post-Phase-1 conventions-doc refactor:**
the rule of thumb formalizes as **"production-correction factor ∈
[0.5×, 3×] sim-shape-dependent; the convention's main load is
order-of-magnitude correctness pre-Stage-1, refined to within ~3× at
Stage 1 measurement"**. The exact factor depends on Stage 0 scope vs
Stage 1 committed scope — when Stage 0 measures a narrower set of ops
than Stage 1 ships, under-shoot; when wider, over-shoot.

## 5. Stage 1 commit footer summary (conventions doc § C.3)

Commit `9bd770e` (`feat(mpm-multimaterial-stage1)`) footer cites:

- Phase 1 RED evidence sha256 `a57251a1…81bb9edf94` (unchanged).
- New Stage 1 GREEN evidence sha256 `d0bd6f9c…d2ce34e7`.
- Capture path + .h5 sha256 `73e00d09…b5ebae`; wall-clock 158.052 s.
- Perf-ledger first-landing row appended.
- Determinism docstring (10 clauses) cited.
- MLS-MPM golden re-verification at 1e-15 (2 tests × 13 values).
- Stage 0 Task 0.4 citation (cadence-50; numba decision; production-correction third data point 0.6× under-shoot).
- SHIFT S1 detailed (base-node convention bug; R-MPM-3 surfaced in
  the wild; first P26 worked-example actually triggered).

## 6. SHIFTED register (Stage 1)

| ID | Description |
|---|---|
| **S1** | **Base-node convention bug surfaced in the wild + fixed at Stage 1** (R-MPM-3 / P26 cause-2 in practice). Initial implementation used `ix = int(fx - 0.5)` with corresponding `ox` formulation, which mis-mapped the 3-node stencil per the golden's `base = floor(fx + 0.5) - 1` convention. **Diagnostic-tier dynamics blew up at step 30-45 with NaN/Inf in `grid_mom`** during the first end-to-end pytest sweep — the APIC affine velocity matrix amplified the bug exponentially as particles received forces from wrong cells. Gate-5 golden test, gate-12 partition-of-unity invariant, and gate-12 mass-conservation invariant ALL PASSED with the wrong base mapping because the 3 weights closed-form sum to 1 regardless of cell mapping — masked the bug at the gate-5 + gate-12 invariant surface (this is the "silent off-by-one with no NaN/Inf signal" plan § 9 R-MPM-3 anticipated). Resolution: rewrote base/weight in `p2g`, `p2g_with_stress`, `g2p` to use `base = int(math.floor(fx + 0.5)) - 1` + corresponding weight formulas `w0 = 0.5*(1.5-fp)²`, `w1 = 0.75-(fp-1)²`, `w2 = 0.5*(fp-0.5)²` per the golden's convention. All 9 pytest tests GREEN post-fix; diagnostic dynamics now track free-fall vz cleanly. **First P26 worked-example triggered in the wild — confirms P26 ADD decision (operator Item 4 lean).** |

No new R-MPM risks beyond the plan's P26 framework. R-MPM-3 caught
in the wild + R-MPM-1 / R-MPM-2 / R-MPM-4 / R-MPM-5 mitigated by the
determinism docstring + numba @njit discipline.

## 7. Cumulative shift count entering Stage 2

(FACT — 82 inherited from LBM landing § 8.3 + 1 Stage 1 shift S1 + 0
Stage 0 deltas.) **83 cumulative shifts entering Stage 2.**

- 21 from Phase 1 baseline (conventions doc § M.1).
- 11 from closed-form (conventions doc § M.2).
- 10 from agent-based (conventions doc § M.3).
- 6 from continuous-CA-rd3d (conventions doc § M.4).
- 13 from particle-fluids-sph-water (conventions doc § M.5).
- 5 + 3 from eulerian-smoke Stage 1 + Stage 2.
- 5 + 4 from lattice-boltzmann-d3q19 Stage 1 + Stage 2.
- **1 from mpm-multimaterial Stage 1 (S1 — base-node bug).**

## 8. Banked items for Stage 2

| Item | Notes |
|---|---|
| Cat 3 Decision A lift on `mls-mpm-shape-functions.json` | 1 anchor at HEAD (4 packed citations) → 3-4 discrete entries; mirrors LBM `lattice` lift verbatim. Operator Item 6 confirmed at dispatch. Pre-lift baseline sha256 `4142dda2…fec9a48`. Two-commit shape: `chore(mpm-multimaterial-stage2-cat3-anchors)` + `chore(mpm-multimaterial-stage2-cat3-subdirs)`. Final `_SUBDIRS_PICKED_UP` will read `(closed-form, agent-based, particle-fluids, lattice, hybrid-pg)` — five entries closing the per-sim Phase 1 Cat 3 additive-pickup arc. |
| B17 PATH-A fifth-and-final proof-point | Operator Item 3 confirmed: PATH-A continue. Additively extend `tools/testkit/mutation/mutmut-config.toml` with `[tool.mutmut.targets.mpm_multimaterial]`. Second numba-using PATH-A target after sph-water (LBM did NOT use numba); cache-via-source-hash propagation per sph-water Stage 2 N3. |
| CHANGELOG additive entry | `### sub-phase-mpm-multimaterial` under `[Unreleased]`; mark **LAST per-sim Phase 1 sub-phase + spec-Phase-2 dispatchable at v0.2.0-phase-2**. |
| Production-correction factor empirical-range refinement | Banked for post-Phase-1 conventions-doc refactor: § N graduation should formalize the [0.5×, 3×] sim-shape-dependent range rather than a single multiplier. |
| § N graduation PROPOSED → established | Third consecutive single-session-ready Stage 1 (eulerian-smoke + LBM + MPM); banked for post-MPM-landing conventions-doc edit. |
| Operator-pushed `v0.1.9` tag at Stage 2 close | Operator Item 5 confirmed; no `-phase-N` suffix; documented in landing audit; agent does NOT push the tag. |
| P26 cause-2 (R-MPM-3) anchored by Stage 1 S1 | First P26 worked-example actually triggered in the wild; plan § 9 P26 cause-2 description matches the actual failure mode exactly; no refinement needed. Banked observation for landing audit § 9 P26 retrospective. |

## 9. Stage 2 dispatch readiness

(FACT — gates 4-13 GREEN; canonical capture LFS-tracked + sha256-pinned; perf-ledger first-landing row appended; determinism docstring cited; SHIFT S1 documented; no R-class arcs.)

Stage 2 dispatch is READY. Stage 2 prompt at `docs/phases/sub-phase-mpm-multimaterial.md` § 7.3.

This Stage 1 checkpoint lands at HEAD `53349c1acc337c309fad2ccd0a119d79caf6a9c8`
(this commit; closing-commit SHA back-fills per Convention #12 in a
separate commit captured via `git rev-parse HEAD` per LBM landing
§ 9.3 row 5 lesson — NEVER transcribe short-SHA, NEVER `--amend`).
