---
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-d-plan-drafting
stage: plan-drafting-probe
phase: phase-2
head_sha: PENDING-BACKFILL
head_sha_at_checkpoint: b027f6093685b4dd2b7d0fc9b0d7bc94d30ad3d1
date: 2026-05-24T11-45-06Z
verdict: probe-complete
---

# Plan-drafting probe — sub-phase-mpm-multimaterial-stack-d

> FOURTH per-sim cross-stack port under spec-Phase-2. Ports `mpm-multimaterial`
> from its Phase-1 implemented reference (`stack.name="numpy-numba-reference"`) to
> Stack-D (Python / Taichi-DSL / CPU). FOURTH cross-stack pair; load-bearing for the
> IC-15 partial-vs-full formalization disposition (D5); the canonical candidate to
> stress-test the deferred **atomic-scatter** aspect (#3).
>
> Probe authored per the **S6 banked methodology-precedent** (read Phase-1 `sim.py`
> at HEAD — not just the spec sheets — to characterize what behaviour the cross-stack
> port actually validates). Every path / SHA / sha256 / spec-section / classification
> below is HEAD-verified at `b027f60`; dispatch-referenced values are treated as
> "believed-true; verify at HEAD" per the coordinator-side Convention #8 discipline
> banked across the prior four sub-phases. **Two dispatch claims are FALSIFIED at
> HEAD** (see § 0 + § 9): the D7 "MPM seed-propagation defect" does not exist, and
> "multimaterial" is single-material neo-Hookean at Phase-1.

---

## § 0. Anchor verification (Convention M re-anchor)

HEAD at probe = `b027f6093685b4dd2b7d0fc9b0d7bc94d30ad3d1` (branch `main`, working tree clean except untracked `.claude/`). `b027f60` is the post-LBM-Stage-2 CI hotfix (`lfs: true` checkout); NOT part of any sub-phase per the dispatch.

| Anchor | Dispatch-referenced | HEAD-verified (sha256sum) | Match? |
|---|---|---|---|
| `docs/conventions/sub-phase-conventions.md` | `69aa39fc…4602bf45` | `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` | **FACT — identical** |
| `docs/architecture.md` | `e82b7b8e…9292d267` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **FACT — identical** |
| `docs/conventions/cross-stack-equivalence-methodology.md` | `~3c2149f6…` | `3c2149f625c1f666613d2eda95c6c22a1bb7910d72ec076a58af560ec16189cc` | **FACT — identical** |

All three load-bearing anchors match the dispatch verbatim. **No conventions/architecture/methodology drift this dispatch.** This sub-phase's plan-drafting does NOT amend the conventions doc; the methodology doc is consumed AS-IS (post-LBM-Stage-2 baseline = 5 codified components + § 4 LBM subsections + 5 deferred aspects).

**Cumulative shift count entering:** **137** (FACT — LBM Stack-D landing § 9: 131 post-sph-water + 5 plan-drafting [S-P1..S-P5] + 1 Stage-1c N1 [resolved at Stage 2]; "Cumulative at sub-phase close: 137"). Carried by reference; not re-litigated.

**Spec § 11.3 cross-stack port enumeration (HEAD-verified — `docs/architecture.md` lines 1988-2000):**
```
2.1 RD-2d to Stack C, Stack D.
2.2 SPH to Stack D (Taichi reference port).
2.3 MPM to Stack E (Warp port).
2.4 Smoke to Stack D and Stack E.
2.5 LBM to Stack D and Stack E.
```
**MPM = item 2.3 = "MPM to Stack E (Warp port)" — the Stack-D arm is NOT enumerated** (unlike LBM's item 2.5 "Stack D and Stack E", whose Stack-D arm gave the LBM probe its `2.5.D` citation). The LBM probe § 0 already recorded "MPM = item 2.3 (2.3.E)". This sub-phase ports MPM → **Stack-D** anyway, as the systematic Phase-2 Taichi-reference replication consistent with RD-2D/sph-water/LBM (LBM landing § 14 names "MPM-multimaterial" as the remaining Phase-2 cross-stack port), **deferring the literal item-2.3 Stack-E Warp port** to a later sub-phase (cf. § 11.5 item 3.5 PhysGaussian MPM-3DGS at Stack E; common-warp matures at § 11.4 item 3.8). This is the first SHIFT this probe surfaces (**S-M1**) — a *stronger* drift than LBM's S-P1 because the Stack-D arm is wholly absent from item 2.3, not merely sub-lettered.

---

## § 1. Phase-1 MPM baseline inventory (S6 banked precedent — THE load-bearing read)

Read at HEAD: `packages/mpm-multimaterial/mpm_multimaterial/{sim.py, invariants.py, reference/{__init__,mls_mpm,shape_functions}.py}`, `tests/*.py`, `pyproject.toml`; `docs/sim-specs/hybrid-pg/mpm-multimaterial/{spec-ref,algebraic,determinism,equivalence}.md`; `tools/testkit/probes/reports/mpm-multimaterial.md`; Phase-1 landing audit `landing-2026-05-23T02-53-11Z.md` (landed; verdict **CONFIRMED**; LAST per-sim Phase-1 sub-phase). The MPM `sim.py` was created at `9bd770e` (`feat(mpm-multimaterial-stage1)`) and **never modified since** — the HEAD code IS the code that existed when capture-determinism-contract surfaced the banked seed defect.

### § 1.1 Implemented stack + variant + material model (FACT)

- **`stack.name = "numpy-numba-reference"`** (sim.py `_build_manifest`, both runners). `sim.category = "hybrid-pg"`; `sim.variant = "mls-mpm-hu-2018-multimaterial"`. The cross-stack pair is **NumPy+numba-reference ↔ Stack-D Taichi** — the sph-water/LBM pattern (frozen CPU reference as the gate-14 diff-partner), NOT the RD-2D pattern (real WGSL capture). MPM is the **SECOND numba-using sim** (sph-water first; numba consumption affects the B17 mutation lean — § 8 D-adjacent).
- **Variant: MLS-MPM (Hu et al. 2018), APIC affine-velocity.** `reference/mls_mpm.py` ships the full MLS-MPM transfer kernels; the G2P reconstructs the affine matrix `C` with the analytic `4/dx²` quadratic-B-spline coefficient (APIC). **NOT** PIC/FLIP/standard-MPM/implicit-MPM. (D9)
- **Material model: neo-Hookean SINGLE material.** `compute_particle_stresses` computes Cauchy stress `σ = μ(FFᵀ − I) + λ log(J) I` (volume-weighted) for ONE material. `material_id` is initialised all-`0` and **NEVER mutated** (sim.py docstring clause 6 + `_sample_blob_particles`). **Despite the sub-phase name "mpm-MULTImaterial", the Phase-1 reference is single-material** — the multi-material constitutive table is **declared-only** (`algebraic.md` § 3: "Phase 2+ implementation phase populates the constitutive-model table; Phase 1 declares the surface only"). This is the **sph-water pattern** (spec describes a richer method; the Phase-1 reference implements a simplified variant). Second SHIFT surfaced (**S-M5**).
- **Shape functions: quadratic B-spline, 3-node**, base convention `base = floor(p/dx + 0.5) − 1` (golden-table-pinned at `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`). Particle touches nodes `base, base+1, base+2`; offset `fp ∈ [0.5, 1.5)`; weights `w0=0.5(1.5−fp)²`, `w1=0.75−(fp−1)²`, `w2=0.5(fp−0.5)²`. (NB: a Stage-1 SHIFT S1 in the Phase-1 sub-phase corrected an earlier `int(fx−0.5)` off-by-one — R-MPM-3; the corrected convention is what HEAD ships.)

### § 1.2 sim_runner trajectory — atomic-scatter? iterative? material-discontinuity? (FACT — the load-bearing S6 questions)

The canonical-capture trajectory (`sim_runner_seeded` → `_evolve_to_step_states`) executes, per step, the classic MLS-MPM single-pass explicit cycle (sim.py lines 369-393):
`compute_particle_stresses` → zero grid → `p2g_with_stress` → `grid_update` (gravity + sticky-floor + axis-clamp walls) → `g2p` → swap vel/affine_c → `deformation_update` (F ← (I+dt·C)F) → `advect_particles` (symplectic Euler + interior clamp).

| S6 question | HEAD finding |
|---|---|
| **Atomic-scatter at P2G / G2P?** | **The Phase-1 reference has NONE.** `p2g_with_stress` scatters into `grid_mass`/`grid_mom` with plain `+=` under `@njit(fastmath=False, cache=True)` (parallel=False default) — single-thread, sorted-particle lex iteration (P24), fixed 27-cell `(di,dj,dk)` lex stencil → bit-exact, no `ti.atomic_add`/`np.add.at`. G2P **gathers** (no scatter). **BUT** the reference docstring + `determinism.md` EXPLICITLY anticipate that a faithful **Stack-D Taichi** MLS-MPM port uses `ti.atomic_add` at the P2G scatter (the canonical Taichi-MPM idiom), which is why the spec declares `epsilon-same-stack-same-hw` and the reference "OVER-ACHIEVES to bit-exact". **→ MPM is the FIRST cross-stack pair where the deferred IC-15 aspect #3 (atomic-scatter) is in play — on the Stack-D side.** (§ 6 / R-M1) |
| **Iterative components in the trajectory?** | **NONE.** Single-pass explicit per step; symplectic-Euler advection; no Newton solve, no implicit relaxation, no substep refinement. Deferred IC-15 aspect #5 (iterative-solver amplification) is **NOT exercised.** (The PBT `mass_conservation_p2g_g2p` round-trip is gate-12-only, not trajectory.) |
| **Material discontinuities / plastic flow?** | **NONE** (elastic neo-Hookean only; single material). The trajectory IS a **drop-impact** (0.15-radius 1M-particle blob, initial `vz=−2.0`, gravity `−9.81`, onto a sticky floor at z-index 4) — genuine contact + elastic rebound dynamics over 500 steps, *richer than* RD-2D's smooth stencil / sph-water's rigid free-fall / LBM's laminar relaxation, but **NOT formally chaotic** and NOT plastic. The `j_det ≤ 0 → log_j = −30.0` clamp in the stress kernel is a non-smooth branch that *could* amplify divergence if a particle inverts. → deferred IC-15 aspect #1 (R-P2 chaotic) is a **mild/weak** candidate (R-M2), not a strong one. |
| **Trajectory matches spec or simplified?** | **SIMPLIFIED** (sph-water pattern; see § 1.1 — single-material neo-Hookean vs the spec's "multimaterial" surface). |

### § 1.3 Gate surface (FACT — canonical Appendix D.6 numbering)

Phase-1 MPM test docstrings use the +1-offset internal numbering (e.g. "gates 6+7" for diagnostics, "gate 11" determinism, "gate 12" PBT, "gate 5" golden). **The charter uses canonical Appendix D.6 numbering** (same convention LBM adopted): gate-4 = code-verification, gate-5 = Tier-1, gate-6 = Tier-2, gate-7 = Cat-1 citations, gate-8 = Cat-2 API, gate-9 = captures+corpus, gate-10 = determinism (IC-13/14), gate-11 = PBT, gate-12 = perf, gate-13 = replay, gate-14 = cross-stack.

- **gate-4 — code-verification: GOLDEN ONLY** (`test_quadratic_bspline_golden.py` → MLS-MPM quadratic B-spline shape functions; `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`; `abs=1e-15`; **4 discrete independent-reference anchors** per spec § 2.4, lifted at `4724284`). **NO MMS arm.** This is the **opposite** of LBM (dual-arm 4a+4b); it matches sph-water (golden-only). (S-M6)
- **gate-6 — Tier-2: FIRST sub-phase to consume BOTH IC-5 (particle) AND IC-6 (vector_field).** `test_diagnostics.py`: `check_health` (Tier-1), `check_count_invariance` + `check_momentum_conservation_drift` (IC-5 particle), `check_circulation_grid_mom_l1` (IC-6 vector_field surrogate on the grid-momentum field).
- **gate-11 — PBT: 2 invariants** (`mass_conservation_p2g_g2p` round-trips total mass through P2G; `partition_of_unity_b_spline` sums the 3 B-spline weights to 1). Hypothesis 50 examples each.
- **gate-10 — determinism:** `test_determinism.py` → IC-14 `run_twice_and_diff(sim_runner_diagnostic, seed=42)` (content-equivalent) + an R-D2 synthetic `drifting_runner` failure-mode witness.

### § 1.4 Canonical descriptor + perf baseline (FACT — informs R-M wall-clock)

- **ONE canonical capture** (RD-2D/sph-water pattern; NOT LBM's two). Descriptor `drop-impact-128cube-seed42-step500`: 128³ grid, **1,000,000 particles**, 500 steps, cadence-50 → **11 frames committed**. State fields: `particle_pos` (f64), `particle_vel` (f64), `particle_material_id` (i32), `grid_mom` (f64). Physical params: `dt=1e-4`, gravity `−9.81`, E=4000, ν=0.3, blob center (0.5,0.5,0.65) r=0.15 vz=−2.0, sticky floor z-index 4.
- **Diagnostic tier:** `drop-impact-16cube-seed42-step50` (16³, 5000 particles, 50 steps, cadence-10). Used by the determinism / diagnostics / PBT-adjacent tests at fast scale.
- **Perf baseline = 158.052 s** (Phase-1 landing; `numpy-numba-reference`; 1M particles × 128³ × 500 steps). Between RD-2D-trivial (0.568 s / 4.954 s) and sph-water-heavy (252.346 s Stack-D). → **R-M wall-clock is non-trivial** (a few minutes per canonical-capture generation at Stage 1b); instrument per the sph-water R-S3 precedent, but it is NOT a structural alarm. The determinism gate runs at the diagnostic tier (fast).

### § 1.5 Phase-1 R-MPM risk surfaces inherited (FACT — Phase-1 landing + sim.py docstring)

- **R-MPM-1** — P2G/G2P stencil-ordering mismatch (numba-jit vs pure-Python). Mitigated by identical lex 27-cell order at both call sites + matched 1D weight formula.
- **R-MPM-2** — multimaterial volume-fraction drift. Mitigated by fixed never-mutated `material_id` (single material at this scope).
- **R-MPM-3** — silent off-by-one base-node convention (no NaN/Inf signal). Caught in-the-wild at Phase-1 Stage-1 (SHIFT S1); golden-table-pinned `base = floor(p/dx+0.5)−1`.
- **R15 (Phase-1 Stage-2)** — STOP-AND-SURFACE on `mls_mpm.py` mutation: pathological mutants caused infinite loops (rejection-sampler) / 29 GB allocations + orphan-pytest reaping past `timeout`'s reach. Mutation was scope-restricted to the 3 while-loop-free source files (kill-rate 0.5591 on 127 of 1510 mutants); **`mls_mpm.py` completion banked to post-Phase-1 testing-improvements**. → Informs the B17 mutation-artifact lean (PATH-B re-bank) for this Stack-D port.

---

## § 2. Infrastructure inventory (consumers — FACT)

| Deliverable | State at HEAD | Consumed how |
|---|---|---|
| **IC-11/12 Taichi-integration** | `set_taichi_deterministic` + `docs/common/taichi.md` (R-T1..R-T5) + `tools/testkit/taichi_harness/`; Taichi `>=1.7,<2.0`; common-py workspace member | Stack-D sim-runner entry `set_taichi_deterministic(Config(seed=42,deterministic=True), arch="cpu")` before any `@ti.kernel` |
| **IC-13/14 capture-determinism-contract** | content-equivalence contract (spec § 2.5) + `run_twice_and_diff` first-class | gate-10 |
| **IC-15 PARTIAL methodology** | `3c2149f6…` (5 codified + § 4 LBM subsections + 5 deferred) | gates 14 + D5 (§ 3) |
| **IC-16 audit-chain-correctness** | `verify_evidence` LFS-content-OID resolution; §B.6 Mode-2 annotations retired | gate-5/Stage-2 evidence verify resolves the `.h5` LFS OIDs |
| **RD-2D / sph-water / LBM Stack-D ports** | three landed per-sim Stack-D ports; structural + methodology templates | LBM charter = structural inheritance template |
| **`.gitattributes`** | `captures/**/*.h5 filter=lfs` + `tests/fixtures/legacy-captures/**/*.h5 filter=lfs` (LBM Stage-2) | MPM canonical + schema-corpus auto-route through LFS (D10) |
| **`.github/workflows/python-strict.yml`** | checkout `lfs: true` (b027f60 hotfix) | CI smudges LFS `.h5` for the corpus round-trip (S-CI1) |

No edits to any of the above are in scope (IC-consumed verbatim).

---

## § 3. IC-15 PARTIAL-FORMALIZATION document state (FACT — consumed AS-IS; `3c2149f6…`)

The post-LBM-Stage-2 methodology doc declares **PARTIAL formalization** (3 physics families validated: continuous-ca + particle-fluids + lattice), at the algebraically-identical-trajectory + FP-round-off-scale regime. **5 CODIFIED components** (§ 1): per-cell/per-particle position-exact compare; category-default tolerance; MANDATORY per-sim override; per-frame diff witness; per-sim `equivalence.md` authoring. **§ 4 = LBM additive subsections** (collision-step f64-accumulator-seed; dual-arm gate-4; 1e-5-vs-1e-4 routing; dual-canonical-capture+two-seeded-runner; near-zero-field relative-error artifact). **5 DEFERRED aspects** (§ 2):
1. **R-P2 chaotic-regime escape-hatch** — unexercised across all 3 pairs.
3. **Atomic-scatter handling** — "a Stack-C (Vulkan) forward concern … Out of scope for Stack-D-only CPU ports." **← MPM puts this in play on the Stack-D Taichi side** (§ 6).
5. **Iterative-solver chaotic amplification** — unexercised.
(2 = D8 comparison-projection axis, deferred; 4 = lattice-velocity quantization, *now data-backed* by LBM and reframed as collision-step FP-accumulation — § 4.)

**This sub-phase is the FOURTH validation pair.** It either (a) promotes partial→full, (b) additively amends, (c) holds unchanged, or (d) substantively expands — D5, routed at Stage 2 on Stage-1c empirics. The probe lean is **(b)** (§ 6 / § 8 D5).

---

## § 4. HEAD-verified tolerance.toml + budget (FACT)

- **`[defaults.mpm]` = `relative = 1e-4, absolute = 0.0`** (D3). SAME as `reaction-diffusion`/`sph` (1e-4); LOOSER than `lbm` (1e-5) → **more gate-14 headroom than LBM** (S-M2).
- **`[budgets.mpm.cross_stack]` = `relative = 1e-4, absolute = 0.0`** present (at-budget; no amendment needed).
- **`[overrides.mpm-multimaterial]` does NOT exist at HEAD.** Stage 1c adds it as the **FOURTH per-sim override** (D6): `[overrides.mpm-multimaterial] category = "mpm"` (maps physics-family `sim.category="hybrid-pg"` → numerical-method category `mpm`). Existing overrides present (cross-reference): `[overrides.reaction-diffusion-2d]` (→reaction-diffusion), `[overrides.sph-water]` (→sph), `[overrides.lattice-boltzmann-d3q19]` (→lbm).
- `tolerance-budget.toml` `[phase].phase` currently = `"sub-phase-lattice-boltzmann-d3q19-stack-d"` → Stage 0 Task 0.1 bumps it to `"sub-phase-mpm-multimaterial-stack-d"` (carryover, NO budget widening).

---

## § 5. HEAD-verified canonical capture sha256s (FACT — commit-first authoritative)

`captures/mpm-ref/` (the gate-14 LEFT partner):

| File | Bytes | sha256 (HEAD blob / LFS-smudged content) | LFS? |
|---|---|---|---|
| `drop-impact-128cube-seed42-step500.h5` | 1,125,718,712 (~1.05 GiB) | `73e00d0976a663a8e9c1de87334cba701a385ae9b044ead929eac8b540b5ebae` | **YES** (`filter=lfs`; smudged locally — real HDF5 content present) |
| `drop-impact-128cube-seed42-step500.json` | 1,425 | `ea3531e032c4658bd5c06a7bf5c0b76e18b50515d67bd932efaa4a5cd28d1a2f` | no |

**Count = ONE canonical capture.** The `.h5` is ~1.05 GiB — **~5× LBM's poiseuille (~202 MB)**; LFS-tracked, so it bypasses the W1 1 GB in-tree pre-commit ceiling. The Stack-D capture will be similar size; a schema-corpus COPY (D10) is a second ~1 GiB LFS object — **a sizing concern to surface** (§ 8 D10).

---

## § 6. Cross-stack framing (S6 application) + expected gate-14 shape

**The MPM cross-stack-sensitive surface is the P2G SCATTER, not a gather/reduction.** This is structurally NEW relative to the three prior pairs (RD-2D explicit stencil, sph-water rigid free-fall, LBM per-cell collision reduction): a faithful Stack-D Taichi MLS-MPM port scatters per-particle contributions into shared grid nodes, the canonical use being `ti.atomic_add`. The Phase-1 *reference* avoids this (single-thread sequential `+=` in fixed particle×stencil order); the *Stack-D port* must decide its scatter posture at **Stage 1b** (NOT pre-committed — a charter R-class + D-class surface):

- **(i) Serialised scatter** (`cpu_max_num_threads=1`, the LBM precedent of "atomic_add serialised to 1 thread"): if the Taichi struct-for iterates particles in index order and uses the same fixed 27-cell stencil order, the grid-node accumulation order *can* match the numba reference → bit-exact or FP-round-off-scale. **Expected gate-14: `within_tolerance=True` at 1e-4 with comfortable margin → methodology-validation-at-FOURTH-regime, partial #3 (present-but-serialised).** Most likely outcome given the faithful-port-to-pass incentive + 1e-4 headroom.
- **(ii) Parallel atomic-scatter** (accept the spec's `epsilon-same-stack`): grid-node accumulation order differs from numba's → genuine atomic-scatter FP-ordering divergence. **Expected gate-14: non-trivial diff scale (possibly approaching 1e-4); methodology-STRESS-TEST of #3; may activate D8 comparison-projection** (per-grid-node aggregate state not position-exact-comparable) **and route D5 toward (d) substantive expansion.**

**Even posture (i) makes MPM the first pair to put deferred aspect #3 in play** — analogous to how LBM was the first to exercise aspect #4 (collision-step FP-accumulation, partial). The cross-stack delta arises at the *scatter-accumulation* order (which particles hit a given grid node, in what order), a different FP surface than LBM's per-cell reduction order. **Most-likely overall shape: methodology-validation-at-fourth-regime exercising #3 partially → D5 (b) additive amendment** (a "particle-scatter FP-accumulation" subsection analogous to LBM's § 4.1). Aspects **#1 (chaotic)** — at most weakly via drop-impact contact, R-M2 — and **#5 (iterative)** remain unexercised → **full formalization (a) stays premature** (R-M6).

Expected step-horizon: drop-impact contact dynamics MAY grow the diff over the 500-step horizon more than the prior pairs' flat-FP-round-off (R-M2) → Stage 1c step-horizon roll-up is load-bearing (does the diff approach 1e-4 by step 500?).

---

## § 7. Convention-M anchor-sketch verification (dispatch vs HEAD)

| Dispatch claim | HEAD verification | Verdict |
|---|---|---|
| canonical name likely `sub-phase-mpm-multimaterial-stack-d` | Phase-1 dir `packages/mpm-multimaterial/`; § C.1 full-name precedent (RD-2D/sph-water/LBM) | **CONFIRMED** (D1) |
| spec-item "RD=2.1, sph=2.2, LBM=2.5.D; MPM NOT extrapolation" | MPM = item **2.3 = Stack E only**; Stack-D arm absent | **SHIFTED (S-M1)** — systematic-program extension |
| methodology `~3c2149f6…` | `3c2149f625…6189cc` | **CONFIRMED** |
| `[defaults.mpm]` "could be 1e-4/1e-5/1e-6/other" | `1e-4` | **CONFIRMED = 1e-4** (D3) |
| canonical may be ONE (RD/sph) or MULTIPLE (LBM) | **ONE** (`drop-impact-128cube-seed42-step500`) | **resolved = ONE** |
| perf baseline "MPM unknown" | **158.052 s** | **resolved** |
| Phase-1 MPM "may exercise atomic-scatter OR simplified variant (sph-water pattern)" | **simplified single-material neo-Hookean; reference has NO atomic-scatter; spec anticipates Stack-D atomic-scatter** | **resolved (S-M5 + § 6)** |
| D7: "Phase-1 MPM sim.py has the seed-propagation defect; MPM seed is substantive" | **FALSIFIED** — MPM threads seed correctly (§ 9) | **SHIFTED (S-M4)** |
| `.gitattributes` LFS rule + CI `lfs:true` present | both present (`captures/**/*.h5` + `legacy-captures/**/*.h5`; checkout `lfs:true`) | **CONFIRMED** |

---

## § 8. Decision surface preview — D1…D10 (surfaced, NOT pre-committed)

- **D1 — Naming.** Lean **`sub-phase-mpm-multimaterial-stack-d`** (package `packages/mpm-multimaterial-stack-d/`; audit dir + commit scope to match; capture dir `captures/mpm-multimaterial-stack-d/` per LBM precedent — NB Phase-1 ref dir is the abbreviated `captures/mpm-ref/`). Full-name § C.1 precedent. CONFIRMS dispatch lean (recorded as S-M3).
- **D2 — Stage decomposition.** Lean **1a/1b/1c**. Stage 1b is structurally RICHER than LBM (7 transfer/update kernels: stress, P2G-with-stress scatter, grid-update, G2P+APIC, deformation-update, advect, + shape functions; 3×3 F and C per particle) but **single-material, single-pass, golden-only (no MMS), ONE capture** → est. ~1300–1700 lines; **no further sub-split** (confirm at Stage 0). The P2G atomic-scatter + APIC-reconstruction kernel is the single most complex unit.
- **D3 — Tolerance.** HEAD `relative = 1e-4, absolute = 0.0` (`[defaults.mpm]`). NOT pre-committed beyond HEAD. More headroom than LBM's 1e-5.
- **D4 — Step-horizon.** Lean **full canonical horizon** (500 steps, cadence-50, 11 frames). NOT pre-committed shorter; R-M2 may motivate a step-horizon roll-up emphasis (drop-impact amplification).
- **D5 — IC-15 disposition (MOST CONSEQUENTIAL).** Lean **(b) PARTIAL HOLDS + REFINEMENT**, contingent on Stage-1c empirics + the Stage-1b scatter posture. Reasoning: FOURTH pair; first to put deferred aspect **#3 (atomic-scatter)** in play (Stack-D side) → additive subsection on particle-scatter FP-accumulation (analogous to LBM § 4.1); **but #1 (chaotic) and #5 (iterative) stay unexercised**, so **(a) FULL is premature** (R-M6). **(d) SUBSTANTIVE EXPANSION** becomes the lean *iff* Stage-1b runs parallel atomic-scatter AND gate-14 surfaces non-trivial divergence requiring D8 comparison-projection. **(c) UNCHANGED** is too weak (there is new scatter-surface data). Surface at Stage 2.
- **D6 — Per-sim override.** **MANDATORY.** Lean `[overrides.mpm-multimaterial] category = "mpm"` (FOURTH override; at-budget; `hybrid-pg`→`mpm`). HEAD-verified: `[defaults.mpm]`=1e-4 exists, no override pre-exists, `[budgets.mpm.cross_stack]`=1e-4.
- **D7 — sim_runner_diagnostic defect.** Lean **(b) STAY BANKED / close-as-non-defect for MPM** — **SHIFT from the dispatch's (a) FOLD-IN lean** (§ 9). HEAD + empirically: MPM does NOT ignore its seed. There is no substantive defect to fold in. The dispatch's "MPM substantive unlike LBM cosmetic" premise is **inverted**: MPM's seed is already correctly threaded; only a cosmetic descriptor-string hardcode remains (equal in character to LBM, never problematic since tests use seed=42). NO substantive-value justification for a Phase-1-sealed-code edit. The NEW Stack-D diagnostic runner follows a clean contract at Stage 1b regardless. (Alternatives (a)/(c) deliver zero functional gain and would still touch sealed code.)
- **D8 — comparison-projection axis (inherited).** Probe cannot pre-decide (no Stack-D capture). Activates IF Stage-1b parallel scatter + gate-14 aggregate-grid-state divergence not captured by per-particle position-exact compare → per-grid-node mass histogram / Σ-mass / Σ-momentum conservation / energy projections. Resolves with D5 at Stage 2.
- **D9 (NEW for MPM) — variant + material model posture.** HEAD: **MLS-MPM (Hu 2018) + APIC + neo-Hookean SINGLE material**; quadratic-B-spline 3-node `base=floor(p/dx+0.5)−1`. Charter codifies: cross-stack-sensitive surface = P2G scatter (Stack-D atomic-scatter) + G2P/APIC reconstruction + neo-Hookean stress det/log branch. No MRT/multi-material/plastic/implicit (Phase-2+ out of scope). The MPM analog of LBM's D9.
- **D10 (NEW) — schema-corpus sizing + LFS routing.** `.gitattributes` auto-routes the MPM canonical + corpus copy through LFS; CI `lfs:true` configured (S-CI1). **BUT the canonical `.h5` is ~1.05 GiB** → a corpus COPY doubles LFS storage to ~2 GiB for MPM alone. Surface: keep the LBM precedent (canonical capture in corpus) at ~1 GiB, OR route the small diagnostic-tier capture (16³×5K×50) to the corpus instead. Verify corpus round-trip in **CI (via `gh`)** before declaring Stage-2 GREEN (S-CI1 banked).

---

## § 9. D7 — MPM sim_runner_diagnostic defect: HEAD characterization (FALSIFICATION)

**Banked defect (FACT — capture-determinism-contract Stage-1 N1, verbatim via LBM probe § quote):** *"The canonical `sim_runner_diagnostic` runners at both `packages/lattice-boltzmann-d3q19` and `packages/mpm-multimaterial` ignore their `seed` parameter."* LBM Stack-D D7 routed STAY BANKED (LBM ICs are analytic; seed cosmetic). The dispatch leans **(a) FOLD-IN** for MPM on the premise that "MPM-side seed propagation IS substantive (matters for stochastic IC variants)."

**HEAD finding — the MPM-side claim is INACCURATE (S-M4):**
- `sim.py` `sim_runner_diagnostic(seed, out_dir)` → `_write_canonical(seed=seed)` → `_evolve_to_step_states(seed=seed)` → `_sample_blob_particles(seed=seed)` → `rng = np.random.default_rng(int(seed))`. **The seed flows correctly into the blob rejection-sampler.** (Same for `sim_runner_seeded`.)
- **Empirical confirmation** (`uv run --package mpm-multimaterial`): `sim_runner_diagnostic(seed=42)` vs `(seed=99)` produce DIFFERENT step-0 `particle_pos` (`np.array_equal` → `False`; `max_abs_diff = 0.2833523784747534`). **The seed is NOT ignored.**
- **The only residue is cosmetic:** `DIAGNOSTIC_DESCRIPTOR`/`CANONICAL_DESCRIPTOR` hardcode the literal string `"…seed42…"`, so the output *filename* always reads `seed42` regardless of the actual seed. This NEVER causes a problem in practice — every test invokes with `seed=42`, so filename and content agree; the determinism gate runs `seed=42` twice (content-equivalent).
- `sim.py` was created at `9bd770e` and **never modified since** → this is the exact code that existed when the banked defect was first asserted. The banked item conflated LBM (genuinely seed-independent analytic ICs) with MPM (correctly-seeded stochastic blob IC) — a coordinator-side Convention #8 lapse carried forward unverified; the LBM probe re-verified only the LBM side.

**D7 verdict: (b) STAY BANKED, re-characterized — there is no substantive MPM seed-propagation defect at HEAD; close the MPM-side bank as "not-a-defect (cosmetic descriptor-hardcode only)".** The dispatch's substantive-value justification for a seal-exception does not hold. (This is a clean Hard-Rule-2-class surfacing of dispatch-premise falsification, NOT a structural blocker — drafting proceeds.)

---

## § 10. Plan-drafting shifts surfaced at this probe

Entering: **137** (LBM close). New plan-drafting shifts (6 — the dispatch expected 3–6 given MPM has more variables to characterize than LBM):

| Shift | Description | Disposition |
|---|---|---|
| **S-M1** | Spec § 11.3 item 2.3 = "MPM to Stack **E** (Warp port)" — Stack-D arm NOT enumerated (stronger drift than LBM's 2.5.D). This sub-phase ports MPM→Stack-D as the systematic Phase-2 Taichi-reference replication; defers the literal Stack-E Warp port. | recorded |
| **S-M2** | Cross-stack tolerance = `1e-4` (`[defaults.mpm]`), LOOSER than LBM's 1e-5; same as RD-2D/sph → more gate-14 headroom. | recorded |
| **S-M3** | D1 full-name canonical `sub-phase-mpm-multimaterial-stack-d` (confirms dispatch lean; § C.1 precedent). | recorded |
| **S-M4** | **D7 FALSIFIED** — MPM `sim_runner_diagnostic` does NOT have a seed-propagation defect at HEAD (threads seed correctly; empirically verified). SHIFT from dispatch's (a) FOLD-IN → (b) STAY BANKED / close-non-defect. | recorded |
| **S-M5** | **S6** — Phase-1 MPM is SINGLE-material neo-Hookean MLS-MPM (APIC), not multi-material; multi-material constitutive table declared-only/Phase-2+. Simplified-variant per sph-water pattern. | recorded |
| **S-M6** | Scope shape — gate-4 GOLDEN-only (quadratic B-spline; no MMS arm, unlike LBM); ONE canonical capture (not LBM's two); FIRST sim consuming BOTH IC-5 + IC-6 at Tier-2; **atomic-scatter (deferred IC-15 aspect #3) is the cross-stack-sensitive surface on the Stack-D side** (Phase-1 ref is bit-exact/no-atomics; spec `determinism.md` anticipates Stack-D `ti.atomic_add` at P2G). | recorded |

**Cumulative at plan-drafting close (after charter + landing): 143** (137 + 6).

---

*End of probe. Charter drafted next; D1–D10 surfaced for operator routing at the plan-drafting landing.*
