---
date: 2026-05-24T03-40-08Z
author: lattice-boltzmann-d3q19-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-d-stage-1b
subject: "Stage 1b (implementation) CLOSE for the lattice-boltzmann-d3q19 -> Stack-D port (THIRD spec-Phase-2 cross-stack port). VERDICT CONFIRMED; gates 4-13 GREEN, gate-14 PENDING-1c. Taichi-DSL D3Q19 BGK reference (Qian-1992 equilibrium + Guo-2002 forcing) + dual sim runners + 2 PBT invariants + spec sheet + probe report. 14 tests pass, 2 skipped (cross_stack SKIP added). Gate-4a equilibrium golden reproduced bit-identically (max_abs=0.0 @ abs 1e-15). Gate-4b MMS observed OOA=2.39 over the UNMODIFIED incompressible_ns_2d solution (within +/-0.5 of formal p=2; FIRST port with BOTH gate-4 arms). f64 design choice: explicit ti.f64(0.0) accumulator seeds throughout the in-kernel 19-term reductions (Stage-0 banked; NO default_fp/IC-11 edit) -- LBM is the FIRST cross-stack port with genuine in-kernel f64 reductions (D9). TWO canonical captures (D4 dual-capture; FIRST port): poiseuille .h5 OID d7ace41e... / .json a395e30c..., couette .h5 OID 4d171c51... / .json aa6451ac.... TWO perf-ledger rows (FIRST port adding two): poiseuille 4.954s, couette 0.973s taichi-cpu (1.31x / 1.61x the NumPy baselines; within 2x band). Informal cross-stack sanity: poiseuille final-step vs NumPy ref max_abs ~1e-15 (gate-14 @ 1e-5 is Stage 1c). Gate-13 worktree replay at 2fe22f1 reproduced 7/7 ModuleNotFoundError (3-reference/3-sim/1-invariants). Main commit 3bdd6a8. GREEN-evidence sha256 d160ed17...da7be. 1 minor Stage-1b test-assertion correction (over-strict exact-equality on an FP sum relaxed to abs 1e-14); NOT a plan shift. Cumulative 136."
verdict-state: CONFIRMED
head_sha: 9a3bf3495884a7eb1851b55d6640b9ec4f00e23f
head_sha_at_checkpoint: 9a3bf3495884a7eb1851b55d6640b9ec4f00e23f
parent_audits:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-1a-checkpoint-2026-05-24T03-19-01Z.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-checkpoint-2026-05-24T02-51-32Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1b-checkpoint-2026-05-24T01-16-13Z.md
evidence_paths:
  - tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-implemented-2026-05-24T03-38-04Z.txt
  - captures/lattice-boltzmann-d3q19-stack-d/poiseuille-64x32-seed42-step1000.h5
  - captures/lattice-boltzmann-d3q19-stack-d/poiseuille-64x32-seed42-step1000.json
  - captures/lattice-boltzmann-d3q19-stack-d/couette-32x16-seed42-step500.h5
  - captures/lattice-boltzmann-d3q19-stack-d/couette-32x16-seed42-step500.json
  - packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/sim.py
  - packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/reference/d3q19_taichi.py
  - packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/invariants.py
  - docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-d.md
evidence_hashes:
  tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-implemented-2026-05-24T03-38-04Z.txt: sha256:d160ed175df96a61e8a58f5e8dc2b804167c3e3b0678fc254afa292bfdcda7be
  captures/lattice-boltzmann-d3q19-stack-d/poiseuille-64x32-seed42-step1000.h5: sha256:d7ace41e5454c08b25c375266b19bc5ad7d7db33bbefe5e55b03945f4fae1be7
  captures/lattice-boltzmann-d3q19-stack-d/poiseuille-64x32-seed42-step1000.json: sha256:a395e30c7bd36635159e6342185388dbaa760cd230d5dd55df693749df1c65b4
  captures/lattice-boltzmann-d3q19-stack-d/couette-32x16-seed42-step500.h5: sha256:4d171c516327612e2846158aafde75d96243f34014153824b58d608772ddb7f6
  captures/lattice-boltzmann-d3q19-stack-d/couette-32x16-seed42-step500.json: sha256:aa6451ac545516693498a0fca68d9c8415925d086e867400c9a7b02bda5e3dc9
  packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/sim.py: sha256:5e3be00a2f63bd8a22b598caae61a1bc2799300506940dccc02c735d520a24fc
  packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/reference/d3q19_taichi.py: sha256:23e9ef1f6871173c27627fe994ed32648805cc3cce4bf4fcbb93530565bbcd6b
  packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/invariants.py: sha256:869ba8959cb912617495bfe69291ff6373561ca7e91bdb648f98f83d5b29769e
  docs/sim-specs/lattice/lattice-boltzmann-d3q19/spec-ref-stack-d.md: sha256:94587e6479540066e9bb089c68d544c275e24dae1a4f0c5a8e38e9dd70328c2c
---

# Stage 1b Checkpoint — Sub-Phase lattice-boltzmann-d3q19 → Stack-D

> IC-9 abbreviated structure. All anchors HEAD-verified (Convention M / #8); no
> value inherited from the dispatch without verification. FACT / INFERENCE /
> SHIFTED tagging throughout. D1-D9 operator-ratified; not re-litigated.

## § 1. Scope summary

Stage 1b is the **gates-4-through-13 GREEN** stage of the THIRD per-sim cross-stack
port (lattice-boltzmann-d3q19 → Stack-D Taichi-DSL D3Q19 BGK). It ships the
`reference` (Taichi kernels + NumPy wrappers), `sim` (3 runners), and `invariants`
modules, the spec sheet, the probe report, the two canonical captures, and two
perf-ledger rows. It is the FIRST cross-stack port with: **dual canonical captures**
(Poiseuille + Couette; D4), **dual-arm gate-4** (golden 4a + MMS 4b), the tighter
**1e-5** cross-stack budget, and **genuine in-kernel f64 reductions** (D9). Main
commit **3bdd6a8**.

## § 2. Gate-status table (14 gates)

| Gate | Scope | Status |
|---|---|---|
| 1 | Spec sheet (`spec-ref-stack-d.md`, 13-section) | **GREEN** (this stage) |
| 2 | Probe report (`...-stack-d-probe.md`) | **GREEN** (this stage) |
| 3 | Failing-tests RED anchor | **GREEN** (Stage 1a `2fe22f1`) |
| 4a | Equilibrium golden (`d3q19-equilibrium.json`, abs 1e-15) | **GREEN** — Taichi `feq` max_abs=0.0 |
| 4b | MMS observed OOA (shared `incompressible_ns_2d`, UNMODIFIED) | **GREEN** — slope 2.39 (within +/-0.5 of p=2) |
| 5 | Reference-sanity (constants + rest-state) | **GREEN** |
| 6 | Tier-1 diagnostics (NaN/Inf health) | **GREEN** |
| 7 | Tier-2 vector_field diagnostics (IC-6) | **GREEN** |
| 8 | Citations / API surface (integrity Cat 1/2) | **GREEN** (pre-commit Cat-4 + integrity) |
| 9 | Canonical captures (TWO; D4) | **GREEN** — poiseuille + couette written |
| 10 | Determinism (IC-14 `run_twice_and_diff`) | **GREEN** — `content_equivalent` |
| 11 | PBT invariants (x2) | **GREEN** |
| 12 | Perf-ledger rows (TWO) | **GREEN** — 4.954s / 0.973s |
| 13 | Worktree replay @ Stage-1a SHA | **GREEN** — 7/7 ModuleNotFoundError reproduced |
| 14 | Cross-stack equivalence (x2 captures @ 1e-5) | **PENDING-1c** (cross_stack SKIP) |

`pytest packages/lattice-boltzmann-d3q19-stack-d/tests/ -v` → **14 passed, 2 skipped**.

## § 3. Per-step results (charter § 4.2.2; 12 steps)

| Step | Scope | Result |
|---|---|---|
| 1 | Package skeleton + `reference/__init__.py` (Stage 1a did pyproject/__init__/tests) | **PASS** — `uv sync` clean (no new deps; uv.lock unchanged) |
| 2 | Reference module (`constants.py` + `d3q19_taichi.py` + `__init__.py`) | **PASS** — Taichi feq/feq_field/bgk_step/stream/moments + NumPy bounce-back; f64-seeded reductions |
| 3 | Sim wrapper (`sim.py`; determinism docstring + 3 runners) | **PASS** — Poiseuille/Couette/diagnostic; `_ensure_taichi` idempotent |
| 4 | Invariants (`invariants.py`; 2 Hypothesis invariants) | **PASS** |
| 5 | Spec sheet | **PASS** — `94587e64…` |
| 6 | Probe report | **PASS** |
| 7 | Test bodies → GREEN (+ cross_stack SKIP) | **PASS** — 14 pass / 2 skip; GREEN evidence `d160ed17…` |
| 8 | TWO canonical captures | **PASS** — § 4 |
| 9 | TWO perf-ledger rows | **PASS** — § 8 |
| 10 | Workspace member registration | **PASS** — done at Stage 1a (17 members; verified HEAD) |
| 11 | Gate-13 worktree replay @ `2fe22f1` | **PASS** — § 6 |
| 12 | Commit `feat(...stage1b)` | **PASS** — `3bdd6a8`; footer cites all anchors |

## § 4. Canonical captures (gate 9; D4 dual-capture)

(FACT — `git cat-file -p HEAD:<.h5>` LFS pointer OIDs + `<.json>` committed blobs.)

- `poiseuille-64x32-seed42-step1000.h5` LFS-OID `sha256:d7ace41e5454c08b25c375266b19bc5ad7d7db33bbefe5e55b03945f4fae1be7`; `.json` `sha256:a395e30c7bd36635159e6342185388dbaa760cd230d5dd55df693749df1c65b4`.
- `couette-32x16-seed42-step500.h5` LFS-OID `sha256:4d171c516327612e2846158aafde75d96243f34014153824b58d608772ddb7f6`; `.json` `sha256:aa6451ac545516693498a0fca68d9c8415925d086e867400c9a7b02bda5e3dc9`.

Both at `captures/lattice-boltzmann-d3q19-stack-d/` (D1 full-name dir; matches the
Stage-1a conftest fixtures). FIRST cross-stack port with TWO canonical captures.

## § 5. GREEN evidence

`tools/testkit/failing-tests-evidence/lattice-boltzmann-d3q19-stack-d-implemented-2026-05-24T03-38-04Z.txt`
committed-blob `sha256:d160ed175df96a61e8a58f5e8dc2b804167c3e3b0678fc254afa292bfdcda7be`
(commit-first-then-sha256; verified stable post-commit == footer). 14 passed, 2 skipped.

## § 6. Gate-13 replay outcome (Step 11)

(FACT — worktree at `2fe22f1`, `uv sync --all-packages --all-extras`, pytest.)
Structural reproduction CONFIRMED: 7 collection-time `ModuleNotFoundError`,
breakdown **3 `reference` / 3 `sim` / 1 `invariants`** — bit-for-bit matching the
Stage-1a RED anchor's per-submodule mapping. (Byte-identical sha256 is NOT asserted
— absolute-path embedding differs across worktrees; structural reproduction is the
gate-13 contract per the RD-2D/sph-water N1 precedent.) Worktree removed + pruned.

## § 7. Determinism-strategy declaration

(FACT — `sim.py` module docstring, committed `5e3be00a…`.) Nine-clause § F.1
declaration at the TOP of `sim.py`: (1) fixed `ti.static(range(19))` lex-order
in-kernel moment reductions; (2) **f64 accumulator seeds** (load-bearing, § 8);
(3) integer-streaming bit-exactness; (4) fixed-precision BGK + Guo; (5)
fixed-precision bounce-back; (6) N_z=3 slab; (7) NO RNG / analytic ICs / seed
cosmetic (D7); (8) `bit-exact-same-hw` arch=cpu; (9) Phase-2+ deferred (GPU/FMA/
subgroup). Path: `packages/lattice-boltzmann-d3q19-stack-d/lattice_boltzmann_d3q19_stack_d/sim.py`.

## § 8. Stage-0 banked-requirement outcomes

(FACT — implementation + measured wall-clocks.)

- **f64 precision — SATISFIED via explicit `ti.f64(0.0)` accumulator seeds**
  (design path 1; port-local; NO `default_fp`/IC-11 edit). Every in-kernel reduction
  (`_k_density_moment_point`, `_k_momentum_moment_point`, `_k_density_field`,
  `_k_momentum_field`, `_k_collide_guo`) seeds accumulators `ti.f64(0.0)`. Empirical:
  gate-4a golden max_abs=0.0; gate-4b MMS OOA 2.39; informal cross-stack vs NumPy ref
  ~1e-15 (would be ~3.4e-6 under the f32-default trap). Choice rationale: explicit
  seeds keep the f64 contract local + auditable per accumulator vs a module-wide
  `default_fp` flag (sph-water Stack-D banked-pattern preference).
- **R-L4 wall-clock — MEASURED:** poiseuille **4.954 s** (Stage-0 NumPy floor 3.784 s;
  1.31x), couette **0.973 s** (floor 0.604 s; 1.61x); combined ~5.9 s. Taichi-cpu
  per-step kernel-launch overhead on small grids sits modestly above the NumPy floor
  (Stage-0 probe predicted this); far below any structural alarm + the 4x-sum Hard-
  Rule-2 trigger (~17.6 s). Both within the 2x perf-ledger regression band.

## § 9. New SHIFTs surfaced at Stage 1b

**0 plan shifts.** Cumulative holds at **136**.

One **minor test-assertion correction** (NOT a shift; intra-Stage-1b GREEN work per
charter § 4.2.2 step 7): `test_reference_sanity::test_rest_equilibrium_recovers_weights`
asserted `density_moment(feq(1,(0,0,0))) == 1.0` exactly; the f64 19-term reduction
recovers `1.0000000000000002` (the invariant is exact only in real arithmetic).
Relaxed to `abs(... - 1.0) <= 1e-14` (matching the gate-4a golden test's density
tolerance). The over-strict exact-equality was a Stage-1a authoring choice; the
implementation is correct (FP-accumulation residual ~2e-16).

Empirical observation (informational, not a shift): the Stack-D Taichi capture
matches the NumPy reference at ~1e-15 absolute (rho 3.8e-15, u 6.2e-15 at the
poiseuille final step), so gate-14 @ 1e-5 (Stage 1c) carries an ~8-order margin
comparable to the prior pairs — the tighter 1e-5 budget is NOT stressed by this
laminar single-pass dissipative regime (consistent with the probe S6 characterization).

## § 10. Stage 1c dispatch readiness

Stage 1c is dispatchable. It owns (all out-of-scope at 1b):
1. `[overrides.lattice-boltzmann-d3q19] category="lbm"` in `tolerance.toml` (D6;
   MANDATORY — without it `compare_captures` raises KeyError on `lattice`, Stage-0
   Task 0.5). At-budget → `relative=1e-5`.
2. Run gate-14 `compare_captures` for BOTH captures (poiseuille primary + couette
   secondary); TWO independent verdicts (D4). Expected GREEN at 1e-5 with ~8-order
   margin (§ 9 informal). If either exceeds 1e-5 → STOP + surface (R-L1; no silent
   widening).
3. Extend `equivalence.md` additively (5 IC-15 sections; both verdicts + per-field
   per-frame witnesses + step-horizons).
4. Un-skip `test_cross_stack_equivalence.py` (remove the `pytestmark`).
5. Schema-corpus entries at `tests/fixtures/legacy-captures/` (note the banked
   LFS-rule observation; record non-LFS fixture sizes).
6. Stage-1c checkpoint + SHA back-fill.

## § 11. Cumulative shifts

Entering: **136** (FACT — Stage-1a checkpoint § 7). Stage 1b added **0**.
**Cumulative at Stage-1b close: 136.**
