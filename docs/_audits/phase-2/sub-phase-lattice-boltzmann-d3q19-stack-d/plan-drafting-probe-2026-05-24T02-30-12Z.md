---
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-d-plan-drafting
stage: plan-drafting-probe
phase: phase-2
head_sha: 19a5d8e1b7295d1688ce60c58d459c991e66286b
head_sha_at_checkpoint: b8b9bcac70823ceb29bd82a9c2d18d0921646de7
date: 2026-05-24T02-30-12Z
verdict: probe-complete
---

# Plan-drafting probe — sub-phase-lattice-boltzmann-d3q19-stack-d

> THIRD per-sim cross-stack port under spec-Phase-2. Ports `lattice-boltzmann-d3q19`
> from its Phase-1 implemented reference (`stack.name="numpy-reference"`) to Stack-D
> (Python / Taichi-DSL / CPU). THIRD cross-stack pair; load-bearing for the IC-15
> partial-vs-full formalization disposition (D5).
>
> Probe authored per the **S6 banked methodology-precedent** (read Phase-1 `sim.py`
> at HEAD — not just the spec sheets — to characterize what behaviour the cross-stack
> port actually validates). Every path / SHA / sha256 / spec-section / classification
> below is HEAD-verified at `b8b9bca`; dispatch-referenced values are treated as
> "believed-true; verify at HEAD" per the coordinator-side Convention #8 discipline
> banked across the prior three sub-phases.

---

## § 0. Anchor verification (Convention M re-anchor)

HEAD at probe = `b8b9bcac70823ceb29bd82a9c2d18d0921646de7` (branch `main`, working tree clean except untracked `.claude/`).

| Anchor | Dispatch-referenced | HEAD-verified (sha256sum) | Match? |
|---|---|---|---|
| `docs/conventions/sub-phase-conventions.md` | `69aa39fc…4602bf45` | `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` | **FACT — identical** |
| `docs/architecture.md` | `e82b7b8e…9292d267` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **FACT — identical** |
| `docs/conventions/cross-stack-equivalence-methodology.md` | `~326fd94f…` | `326fd94f6ddcbc084d9a9e3005b3cb88ca01948cd3543d68e65f684a630c6bc6` | **FACT — identical** |

All three load-bearing anchor docs match the dispatch verbatim. **No conventions/architecture/methodology drift this dispatch.** This sub-phase's plan-drafting does NOT amend the conventions doc.

**Cumulative shift count entering:** **131** (FACT — sph-water Stack-D landing § 9: 130 inherited + N1 byte-identical-streak-break at the seventh integrity data point → 131 at Stage-2 close). Carried by reference; not re-litigated.

**Spec § 11.3 cross-stack port enumeration (HEAD-verified — NOT extrapolated):** RD-2D = item **2.1** (2.1.C/2.1.D); SPH = item **2.2** (2.2.D); MPM = item **2.3** (2.3.E); Smoke = item **2.4** (2.4.D/2.4.E); **LBM = item 2.5** ("LBM to Stack D and Stack E"; work items **2.5.D**, 2.5.E). The dispatch's "could be 2.<N>; HEAD wins" caveat resolves to **2.5.D** — NOT 2.3 as a naïve RD-2D=2.1+sph-water=2.2+1 extrapolation would give. This is the first SHIFT this probe surfaces (S-P1).

---

## § 1. Phase-1 LBM baseline inventory (S6 banked precedent — THE load-bearing read)

Read at HEAD: `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/{sim.py, reference/{constants,equilibrium,bgk}.py, invariants.py}`, `tests/*.py`, `pyproject.toml`; `docs/sim-specs/lattice/lattice-boltzmann-d3q19/{spec-ref,algebraic,determinism,equivalence}.md`; Phase-1 landing audit `landing-2026-05-23T00-41-15Z.md` (landed `215983fd`, back-fill `4f79e19`; verdict **CONFIRMED**).

### § 1.1 Implemented stack + lattice + scheme (FACT)

- **`stack.name = "numpy-reference"`** (sim.py manifest builders, both canonical runners + diagnostic). The spec-DESIGNATED primary stack is **Stack-C Vulkan** (spec-ref § 1) but it is **unimplemented** at Phase-1. → The cross-stack pair is **NumPy-reference ↔ Stack-D Taichi** — *exactly the sph-water pattern* (spec-designated GPU primary unimplemented; the frozen diff-partner is the Phase-1 CPU NumPy reference). NOT the RD-2D pattern (whose gate-14 partner was a real Stack-B WGSL capture).
- **Lattice-velocity set: D3Q19** (19 directions: 1 rest + 6 face @ speed 1 + 12 edge @ speed √2). Integer velocity components `{-1, 0, 1}` (`constants.VELOCITIES`).
- **Relaxation scheme: BGK single-relaxation-time** (`reference/bgk.py::bgk_step`), Qian-d'Humières-Lallemand 1992. `variant = "bgk-d3q19-qian-1992"`. **No MRT** (Phase 4+ out-of-scope per spec-ref § 1). Canonical `τ = 0.7` (fixed, well inside the `>0.5` stability bound).
- **Body force: Guo et al. 2002** half-step forcing (used by Poiseuille canonical + the MMS gate-4b arm). Couette uses no body force (moving-wall momentum injection only).

### § 1.2 sim_runner trajectory — does it exercise genuine collision FP arithmetic? (FACT — the load-bearing S6 question)

**YES.** The canonical-capture trajectory (`sim_runner_seeded` → Poiseuille; `sim_runner_seeded_couette` → Couette) invokes the FULL per-step LBM update via `bgk_step` → `apply_bounce_back_y_walls`, NOT a degenerate / precomputed / constants-only form. Per-step FP arithmetic:

- **Macroscopic moments (per-cell reduction over 19 directions):** `density_field(f) = f.sum(axis=0)` (19-term sum); `momentum_field(f) = np.einsum("id,iabc->dabc", C, f)` (direction-weighted 19-term contraction). These are **local per-cell 19-term accumulations** whose FP round-off is **iteration-order-sensitive across backends** (NumPy pairwise `.sum`/einsum vs a Taichi sequential `for i in range(19)` loop). This is the cross-stack-relevant accumulation surface.
- **Equilibrium polynomial (`feq_field`):** per direction, `W[i]·ρ·(1 + cu·inv_cs2 + cu²·inv_two_cs4 − u_sq·inv_two_cs2)` — genuine multi-term FP arithmetic on real `u` values recovered from the moments (NOT constants-only).
- **BGK relaxation:** `f_post = f − (f − f_eq)/τ` (elementwise).
- **Guo forcing (Poiseuille / MMS):** a second per-direction `for i in range(19)` loop assembling the body-force term.
- **Streaming:** `np.roll(f[i], shift=tuple(C[i]), axis=(0,1,2))` per direction — **integer-offset memory shuffle; bit-exact across backends** (no FP arithmetic; the integer velocity set means streaming quantization is exact).
- **Bounce-back:** direction-swap via `OPP` map + moving-wall momentum injection `−2 w_i ρ_wall (c_i·u_wall)/c_s²` (FP, but localized to wall cells).

**Determinism posture (FACT — sim.py docstring + determinism.md):** `bit-exact-effort-same-stack-same-hw` declared (spec § 2.5; the "effort" caveat is GPU subgroup ops only). The NumPy reference over-achieves to clean `bit-exact-same-stack-same-hw` (gate-11 `test_run_twice_bit_exact_canonical`). **No atomic scatter-add** (streaming is gather/roll, reads neighbours); **no global reduction tree** (the 19-term moment sum is a *local per-cell* reduction, not cross-cell); **no global RNG** (analytic rest-state ICs, seed unused in dynamics — see § 9).

### § 1.3 Trajectory vs golden-table vs MMS vs spec — what does each exercise? (FACT)

Unlike sph-water (whose gate-4b DFSPH-density gold table tested pressure-solving the rigid-free-fall trajectory did NOT touch — S6 finding), **the LBM gate-4 surfaces and the trajectory exercise the SAME kernel path:**

- **Gate-4a — D3Q19 equilibrium golden** (`tests/test_d3q19_equilibrium_golden.py` vs `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`, `abs = 1e-15`): tests `feq` / `density_moment` / `momentum_moment`. The trajectory uses `feq_field` (the field form of the same equilibrium). **Trajectory-exercised.**
- **Gate-4b — NS-2D MMS** (`tests/test_mms_convergence.py`): forced Taylor-Green incompressible-NS on the **shared** `IncompressibleNS2DSolution` (byte-identical with eulerian-smoke), ladder N∈{32,64,128}, observed **OOA = 2.39** (formal p=2, ±0.5 window). Exercises `bgk_step` + Guo forcing in fully-periodic mode — the SAME collision+streaming kernel the Poiseuille trajectory uses. **Trajectory-adjacent.** First cross-discretization OOA comparison on a shared MMS surface in the project.
- **PBT (gate 11):** 2 invariants — `equilibrium_density_moment` (Σf_eq = ρ) + `equilibrium_momentum_moment` (Σc_i·f_eq = ρu), both analytic-exact equilibrium-algebra at FP tol `1e-14`.
- **Spec description:** the implemented sim IS the spec-described method (D3Q19 BGK per algebraic.md), at the spec's canonical descriptors — no simplified variant.

**LBM is the FIRST cross-stack-port sim to carry BOTH a golden-table arm AND an MMS arm at gate-4** (RD-2D was MMS-only; sph-water was golden-only). Stage 1b must re-verify both.

### § 1.4 Canonical descriptors + perf baseline (FACT — informs R-L4 wall-clock)

| Descriptor | Runner | dims (Nx×Ny×Nz) | steps | cadence | size | wall-clock |
|---|---|---|---|---|---|---|
| `poiseuille-64x32-seed42-step1000` (DEFAULT) | `sim_runner_seeded` | 64×32×3 | 1000 | interval=1 (full) | 202.35 MB | **3.784 s** |
| `couette-32x16-seed42-step500` | `sim_runner_seeded_couette` | 32×16×3 | 500 | interval=1 (full) | 27.41 MB | **0.604 s** |

- **N_z = 3 z-periodic depth-3 slab** (Stage-0 Task 0.4 routing): the 2D channel-flow benchmarks are translation-invariant in z; depth-3 is the minimum exercising 19-direction streaming without z-wraparound degeneracy. The Appendix D § D.2.3 labels (64x32, 32x16) are 2D cross-section conventions; D3Q19 requires the 3D slab.
- **TWO canonical captures** (not one). The Stack-D port must reproduce BOTH; gate-14 diffs BOTH (poiseuille = primary, couette = secondary). This is a deliverable-count delta from the RD-2D/sph-water single-canonical template.
- **Perf: LBM is RD-2D-scale (~seconds), NOT sph-water-scale (~1291 s).** R-L4 wall-clock pre-routing is **trivial** — no R-S3-style escape-hatch analysis needed. (cf. RD-2D taichi-cpu 0.568 s; sph-water taichi-cpu 252.346 s.) Taichi JIT overhead on small grids may make the Stack-D wall-clock *larger* than the 3.78 s NumPy floor, but it stays orders below any structural alarm.

### § 1.5 Phase-1 R-LBM risk surfaces inherited (FACT — Phase-1 landing)

- **R-LBM-1** — LBM init-transient at coarse N (MMS ladder non-monotonicity; Mei-Luo-Shyy init deferred Phase-2+ Stack-C).
- **R-LBM-2** — Guo body-force O(dt²) sub-leading term (combines with R-LBM-1 for non-monotonic MMS ladder).
- **R-LBM-3** — Mach-bound (`Ma_lat < 0.1` weakly-compressible / Chapman-Enskog validity; asserted at sim-init + in the MMS runner).
- **R-LBM-4** — velocity-direction order ambiguity (mitigated by the fixed lex-ordered 19-direction `C` matrix; the high-leverage PBT failure surface).

These are Phase-1-reference numerical-method risks. For the **Stack-D cross-stack port**, R-LBM-3/R-LBM-4 are inherited verbatim (the port reuses the same lattice ordering + Ma bound); R-LBM-1/R-LBM-2 matter only if Stage 1b re-runs the MMS gate-4b (it must) — the port must reproduce OOA within ±0.5 of p=2, which the Phase-1 ladder already does at 2.39.

---

## § 2. Infrastructure inventory (consumers — FACT)

| Deliverable | Source sub-phase | State at HEAD |
|---|---|---|
| **IC-11** `set_taichi_deterministic(config, arch="cpu")` | Taichi-integration (`cf7d553`) | first-class; pins `cpu_max_num_threads=1`, `offline_cache`, `random_seed`. |
| **IC-12** `docs/common/taichi.md` (R-T1..R-T5) | Taichi-integration | operative (no `-> None` kernels; init-before-decoration; uv workspace import). |
| **IC-13** content-equivalence contract (spec § 2.5) | capture-determinism-contract (`9bf5b68`/`c4be56b`) | first-class; same-stack zero-tol + cross-stack relaxation. |
| **IC-14** `run_twice_and_diff` (Python) | capture-determinism-contract | consumed by gate-10. |
| **IC-16** `verify_evidence` LFS-content-OID resolution | audit-chain-correctness (`6b4b90a`) | RESOLVED; §B.6 Mode-2 Option-3 annotations retired; `.h5` LFS OIDs resolve automatically. |
| **RD-2D Stack-D** (template ancestor) | `7747d68` | SHIFTED; 14 gates GREEN; gate-14 `max_abs_err ~1.9e-14` (~10 orders margin vs 1e-4); R-P2 falsified (NOT auto-inherited); IC-15 candidate established. |
| **sph-water Stack-D** (structural template) | `f82d1c7` landing / `b8b9bca` back-fill | SHIFTED-with-N1; 14 gates GREEN; gate-14 density `max_rel_err 1.585292e-15` (~11 orders margin); D5 = option (c) PARTIAL FORMALIZATION landed; S6 banked. |

**Stack-D structural exemplars (FACT):**
- `packages/{reaction-diffusion-2d,sph-water}-stack-d/` both registered in root `pyproject.toml [tool.uv.workspace].members`.
- Both pyproject deps: `bit-physics-{testkit,diagnostics,common-py}` (`{ workspace = true }`) + `h5py>=3.10` + `hypothesis>=6.0` + `numpy>=2.0` + **`taichi>=1.7,<2.0`**.
- Both spec-ref-stack-d.md siblings exist (13-section; § 8 declares `bit-exact-same-hw` arch=cpu; § 9 declares cross-stack tolerance + the MANDATORY override).
- `tools/testkit/equivalence/harness.py::compare_captures(left, right, tolerance_table_path=None) -> EquivalenceVerdict{within_tolerance: bool, per_field_diff: dict["field"→{max_abs_err,max_rel_err}], tolerance_table_used: dict}`. **Raises `KeyError` if `sim.category` has no `[defaults.<category>]` and no `[overrides.<sim>]`.**
- `docs/perf-ledger.md` columns: `sim | stack | descriptor | wall_clock_seconds | hardware_id | commit_sha | date | regression`.

**capture API note (INFERENCE):** Phase-1 LBM sim.py uses `from capture import CaptureManifest, StepState, write_capture` (function form). sph-water-stack-d uses `common_py.capture.Writer` (class form). The Stack-D port should follow the Stack-D exemplar; the on-disk `schema_version="1.0.0"` is identical, so `compare_captures` reads both regardless of writer API. Stage-1b detail, not load-bearing for the probe.

---

## § 3. IC-15 PARTIAL-FORMALIZATION document state (FACT — consumed AS-IS)

`docs/conventions/cross-stack-equivalence-methodology.md` (sha256 `326fd94f…`, HEAD-verified). Status header: **PARTIAL formalization** — codifies only what held across the first TWO pairs (both at the **algebraically-identical-trajectory regime, FP-round-off scale**); explicitly NOT stress-tested at iterative-solver / atomic-scatter / chaotic / lattice-velocity-quantization regimes. The doc states verbatim: *"The third cross-stack pair lands the methodology's full stress test and the full-formalization opportunity."*

**5 CODIFIED components (held across both pairs):** (1.1) per-cell/per-particle position-exact comparison via `compare_captures`; (1.2) category-default tolerance via `[defaults.<category>]`; (1.3) MANDATORY per-sim `[overrides.<sim>] category=...` (physics-family → numerical-method resolution wiring, not widening); (1.4) per-frame diff witness `"step:<n>:<field>"→{max_abs_err,max_rel_err}` recorded regardless of pass/fail; (1.5) per-sim `equivalence.md` authoring (de-novo OR additive stub-extension).

**5 DEFERRED aspects (candidate-status) — which does THIS pair exercise? (INFERENCE from § 1 S6 read):**

| # | Deferred aspect | This LBM pair exercises it? |
|---|---|---|
| 1 | R-P2 chaotic-regime escape-hatch | **NO** — Poiseuille/Couette are laminar, dissipative (BGK relaxation), steady-state-approaching. NOT chaotic. R-P2 will again be empirically dissolved. |
| 2 | D8 comparison-projection axis | **Only if gate-14 fails** — fields are `rho` + `u`, compared element-wise; projection unneeded unless margin is breached. |
| 3 | Atomic-scatter handling | **NO** — streaming is gather/roll (np.roll), reads neighbours; `determinism.atomic_ops=False`. Stack-C forward concern only. |
| 4 | **Lattice-velocity quantization** | **PARTIALLY YES** — integer-velocity streaming is bit-exact (trivial); but the **collision-step per-cell 19-term FP-accumulation (moments + equilibrium polynomial + Guo forcing)** is the order-sensitive surface that gets the FIRST empirical cross-stack data, at the tighter 1e-5 category. |
| 5 | Iterative-solver chaotic amplification | **NO** — BGK is single-pass explicit relaxation; no iterative solver. |

**Net:** only deferred aspect **#4** gets new empirical data (and only partially — integer streaming is trivially exact; the collision FP-accumulation is the live surface). Aspects #1/#3/#5 remain **unexercised across all three pairs.** This is decisive for D5 (§ 8).

---

## § 4. HEAD-verified tolerance.toml + budget (FACT)

`tools/testkit/equivalence/tolerance.toml`:
- **`[defaults.lbm] relative = 1e-5, absolute = 0.0`** — **TIGHTER than `[defaults.{reaction-diffusion,sph,mpm}]` = 1e-4** by 10×. This is BY SPEC DESIGN: architecture § 2.6 records the LBM cross-stack row as "epsilon (1e-5 rel)". The prior two pairs ran at category-default 1e-4; LBM's category default is 1e-5. **Less margin headroom than the prior pairs at the same physical diff scale.**
- `[overrides.reaction-diffusion-2d] category="reaction-diffusion"` + `[overrides.sph-water] category="sph"` present (the two prior per-sim overrides — precedent for LBM's).
- **No `[overrides.lattice-boltzmann-d3q19]` pre-exists** → Stage 1c adds the **THIRD per-sim override** (D6).

`tools/testkit/equivalence/tolerance-budget.toml`: **`[budgets.lbm.cross_stack] relative = 1e-5, absolute = 0.0`** — at-budget == default. Phase block currently reads `phase = "sub-phase-sph-water-stack-d"` (Stage-0 carryover will bump it).

**Tolerance-category resolution (D6):** `sim.category = "lattice"` (physics-family; manifest `sim.category="lattice"`) has **no `[defaults.lattice]` row** — `compare_captures` raises `KeyError` until Stage 1c adds `[overrides.lattice-boltzmann-d3q19] category="lbm"` (mapping `lattice` → `lbm`, resolving to `[defaults.lbm]=1e-5`). At-budget resolution wiring, NOT a widening. (Mirrors `continuous-ca`→`reaction-diffusion` and `particle-fluids`→`sph`.)

---

## § 5. HEAD-verified canonical capture sha256s (FACT — commit-first authoritative)

`.h5` are **LFS-tracked** (`git check-attr filter` → `lfs`); the LFS content OID == `sha256sum` of the smudged file == the manifest `payload.checksum`. `.json` committed-blob sha256 (`git cat-file -p HEAD:… | sha256sum`) == working-tree sha256 (already newline-clean).

| File | sha256 / LFS content OID |
|---|---|
| `captures/lbm-ref/poiseuille-64x32-seed42-step1000.h5` (LFS OID) | `0e0843aa8707e5f07f2e12fae81c764fccdbe91b408833bbc67450f1b5e16f68` |
| `captures/lbm-ref/poiseuille-64x32-seed42-step1000.json` (blob) | `8347922d10f048abcb778af2674c4e1f0ef4c49f4f27eca2ddc4736cef611b8f` |
| `captures/lbm-ref/couette-32x16-seed42-step500.h5` (LFS OID) | `7a94843457e44c8747a6514fe6bc56548f637e09a3bd5ee2631d9ddfae15b65b` |
| `captures/lbm-ref/couette-32x16-seed42-step500.json` (blob) | `d9fbcafbc52b0c0be20c83a875ea67f2b8b56704cdb0157c5c7ad2eff54c480f` |

Stage-0 reference-reverify re-checks these (they are the gate-14 LEFT partners). 202 MB `.h5` is under the 1 GB W1 pre-commit ceiling; the Stack-D capture will be comparable + LFS.

---

## § 6. Cross-stack-trivial-vs-non-trivial framing (S6 application) + expected gate-14 shape

**Coordinator dispatch hypothesis** (NOT HEAD-verified at dispatch): *"LBM collision step computes equilibrium distributions from local conserved density+momentum via FP arithmetic that may be order-sensitive across stacks, producing non-trivial cross-stack diff at the collision-step level."*

**HEAD-verified outcome (INFERENCE grounded in § 1 S6 read):** **PARTIALLY confirmed, with an important refinement.**

- **Confirmed:** the trajectory DOES exercise genuine collision-step FP arithmetic (19-term moment accumulation + equilibrium polynomial + Guo forcing). This is NOT a constants-only / degenerate / trivially-bit-exact equilibrium. The per-cell 19-term reduction order is the cross-stack-sensitive surface (NumPy `.sum`/einsum vs Taichi sequential loop). **This is the FIRST pair to exercise the collision-step FP-accumulation surface** that the prior two algebraically-trivial pairs did not.
- **Refinement (decisive):** the dynamical regime is **algebraically-identical-trajectory, single-pass explicit, dissipative, laminar** — NOT chaotic, NOT iterative-solver, NOT atomic-scatter. Poiseuille/Couette relax toward stable parabolic/linear steady-state profiles; BGK damps perturbations. So cross-stack round-off does NOT amplify chaotically; it stays **bounded**. This is the SAME broad class as the prior two pairs (FP-round-off scale), just with **more per-cell FP arithmetic** and a **10× tighter tolerance (1e-5)**.

**Expected gate-14 outcome shape (INFERENCE — Stage 1c decides empirically):** **methodology-validation-at-a-third-regime (lattice), algebraically-identical-trajectory class, but the first to exercise collision-step FP-accumulation, at the tighter 1e-5 category.** Most likely **GREEN at 1e-5 with a SMALLER margin than the prior pairs' ~10–11 orders** — because (a) 1e-5 is 10× tighter and (b) richer per-step FP arithmetic accumulates over 1000 dissipative steps. Plausible roll-up band: ~1e-13 … 1e-9 (margin ~4–8 orders). If the Taichi reduction order happens to match NumPy closely, it could land near the prior pairs' FP-round-off floor; if the 19-term reorder + 1000-step accumulation is larger, it could approach 1e-6 (still PASS) — at which point the small headroom makes it a near-tolerance stress-test outcome. **Both shapes are useful empirical data; the actual margin drives D5.** This is NOT a chaotic-amplification stress-test (the regime forbids that), so it does not close deferred aspects #1/#3/#5.

---

## § 7. Convention-M anchor-sketch verification (dispatch vs HEAD)

| Dispatch claim | HEAD verdict |
|---|---|
| conventions `~69aa39fc…4602bf45` at HEAD | **FACT — exact.** |
| architecture `e82b7b8e…9292d267` at HEAD | **FACT — exact.** |
| methodology `~326fd94f…` at HEAD | **FACT — exact (`326fd94f6ddc…0c6bc6`).** |
| 131 cumulative shifts entering | **FACT — sph-water landing § 9 (130 + N1 = 131).** |
| Phase-1 LBM dir `packages/lbm/` OR `lbm-d3q19/` OR `lattice-boltzmann/` "verify exact name" | **SHIFTED — actual is `packages/lattice-boltzmann-d3q19/`.** Drives D1 (§ 8). |
| spec § 11.3 LBM item "could be 2.<N>; HEAD wins" | **SHIFTED — actual is item 2.5 / work item 2.5.D** (NOT 2.3). |
| `[defaults.lbm]` "do not inherit from memory; HEAD wins" | **SHIFTED-vs-prior-pairs — 1e-5, NOT the 1e-4 the prior two pairs used.** Tighter by design. |
| Phase-1 reference is collision-equilibrium FP arithmetic | **FACT — confirmed (§ 1.2); but laminar/dissipative, not chaotic (§ 6).** |
| Phase-1 perf "informs R-S3" | **SHIFTED — LBM is RD-2D-scale (3.78 s / 0.60 s), R-S3 pre-routing trivial.** |
| D7 lean (a) FOLD-IN "~5-line per-sim fix" | **CHALLENGED — see § 9: LBM has analytic ICs (no RNG) + Phase-1 source is append-only-sealed.** |

No dispatch value was treated as load-bearing; each was verified at HEAD. Four dispatch anchors SHIFTED (LBM dir name; spec item 2.5; tolerance 1e-5; perf scale), one D-lean challenged (D7), three exact (the doc SHAs + shift count).

---

## § 8. Decision surface preview — D1…D9 (surfaced, NOT pre-committed)

**D1 — Sub-phase / package / commit-scope naming.** **Recommend `sub-phase-lattice-boltzmann-d3q19-stack-d`** (package `packages/lattice-boltzmann-d3q19-stack-d/`; audit dir `docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/`; commit scope `lattice-boltzmann-d3q19-stack-d-stage<N>-…`). **This is a SHIFT from the dispatch's abbreviated lean `sub-phase-lbm-stack-d`.** Rationale: § C.1 + the RD-2D (`reaction-diffusion-2d-stack-d`) + sph-water (`sph-water-stack-d`) precedent both use the **full Phase-1 package name + `-stack-d`**, not an abbreviation; the dispatch explicitly authorized "align sub-phase naming to the HEAD package name." The probe + this charter are filed under the full-name dir. Alternative: the `lbm` abbreviation (mechanical rename; touches charter + audit-dir + ~all commit slugs). Downstream: precedent for the remaining Stack-D/E ports.

**D2 — Stage 1 decomposition.** Lean **1a/1b/1c** (RD-2D + sph-water precedent). Stage 1b scope estimate: Phase-1 reference is ~1030 lines (constants 120 + equilibrium 123 + bgk 225 + sim 560) + invariants 116; the Taichi port mirrors this MINUS the np-specific bits PLUS Taichi kernels for collision/streaming/Guo/bounce-back + **TWO canonical runners (poiseuille + couette)** + diagnostic runner + **BOTH gate-4 arms (golden + MMS)**. Estimated comparable to sph-water (~1100–1500 lines) — **LBM is structurally simpler than DFSPH (no iterative solver, no neighbour search) but carries two captures + two code-verification arms.** 1b does NOT need further splitting. Surface confirmed at Stage 0.

**D3 — Cross-stack tolerance value.** HEAD-verified `[defaults.lbm] relative = 1e-5, absolute = 0.0`. NOT pre-committed beyond the HEAD value; Stage 1c empirics decide whether at-budget holds. Alternative (if gate-14 exceeds 1e-5): operator routes tolerance amendment (separate operator-approved commit + budget amendment if it breaches the 1e-5 cap) OR step-horizon override OR comparison-projection (D8). **Note the tighter 1e-5 reduces headroom vs the prior pairs.**

**D4 — Step-horizon.** Lean **full canonical horizon for BOTH** (`poiseuille-…-step1000` 1000 frames + `couette-…-step500` 500 frames, full cadence interval=1). NOT pre-committed shorter. The full-cadence 202 MB capture means gate-14 diffs every frame × {rho, u}.

**D5 — IC-15 partial-vs-full formalization disposition (MOST CONSEQUENTIAL).** Lean **(b) PARTIAL HOLDS + REFINEMENT**, contingent on gate-14 GREEN at 1e-5. Rationale (from § 3 + § 6): the third pair (i) validates the 5 codified components at a third physics family (lattice), and (ii) adds genuine NEW empirical data on deferred aspect #4 (collision-step FP-accumulation + integer-velocity streaming bit-exactness) at the tighter 1e-5 category + the two-canonical-capture + extend-stub-equivalence.md patterns — warranting an **additive amendment** to the partial-formalization doc. BUT deferred aspects **#1 (chaotic), #3 (atomic-scatter), #5 (iterative-solver) remain unexercised across all three pairs** — promoting a methodology that explicitly defers half its stress surface to "FULL" is premature. Alternatives: **(a) FULL** if the operator reads "full formalization" as "promote the 5 CODIFIED components" (held across 3 physics families incl. a richer-FP pair) while carrying #1/#3/#5 as explicit future scope — defensible; **(c) PARTIAL UNCHANGED** — too weak (there IS new data). Routed at Stage 2 on the empirical margin. **This is a temper of the dispatch's framing, which leaned (a) full into play; the HEAD-verified laminar/dissipative/single-pass regime means the third pair strengthens the codified core but does not close the deferred surface.**

**D6 — Per-sim tolerance.toml override.** **MANDATORY** (`KeyError` without it). Lean `[overrides.lattice-boltzmann-d3q19] category = "lbm"` (at-budget; the THIRD per-sim override; resolves physics-family `lattice` → numerical-method `lbm` = 1e-5). Probe-verified: `[defaults.lbm]` exists at 1e-5; no override pre-exists; `[budgets.lbm.cross_stack]` = 1e-5 (at-budget, no amendment).

**D7 — LBM/MPM `sim_runner_diagnostic` defect.** See § 9. **Recommend (b) STAY BANKED** — a SHIFT from the dispatch's (a) FOLD-IN lean, on two HEAD-verified grounds. Alternatives (a)/(c) surfaced.

**D8 (potential, inherited) — comparison-projection axis.** Probe cannot pre-decide (no Stack-D capture). If Stage 1c gate-14 passes with comfortable margin → unneeded. If it approaches/exceeds 1e-5 → surface position-binned / per-field-conservation (mass Σρ; momentum Σρu) / energy-momentum-invariant projections. Resolves with D5 at Stage 2.

**D9 (NEW for LBM) — lattice-velocity-set posture.** **D3Q19** (HEAD-verified). Charter codifies: integer velocity set `{-1,0,1}` → streaming quantization bit-exact across backends; the cross-stack-sensitive surface is the collision-step FP-accumulation (moments + equilibrium + Guo), NOT the velocity discretization itself. Single-τ BGK (no MRT dual-population storage). This narrows deferred aspect #4 to "collision-step FP-accumulation," not "velocity quantization" per se.

---

## § 9. D7 — LBM/MPM sim_runner_diagnostic fold-in adjacency analysis

**The banked defect (FACT — capture-determinism-contract Stage-1 N1, verbatim):** *"The canonical `sim_runner_diagnostic` runners at both `packages/lattice-boltzmann-d3q19` and `packages/mpm-multimaterial` ignore their `seed` parameter,"* which made the perturbed-seed R-D2 drift wrapper insufficient (pivoted to a synthetic `drifting_runner`). The landing noted it is *"NOT a defect of sim-internal determinism … rather an infrastructure observation … remediating it is per-sim work,"* banked to whichever sub-phase touches LBM/MPM next.

**HEAD confirmation (FACT — § 1.2 S6 read):** LBM `sim_runner_diagnostic(seed, out_dir)` threads `seed` ONLY into the manifest `config.seed` field; the evolution (`_evolve_poiseuille_to_step_states`) takes no seed — **the ICs are analytic rest-state (`ρ=1, u=0`), with NO RNG anywhere in the LBM trajectory.**

**Two HEAD-verified complications with the dispatch's (a) FOLD-IN lean:**

1. **The LBM "defect" is cosmetic, not a determinism risk.** Because LBM ICs are analytic (no RNG), the sim is deterministic *by construction* regardless of seed — there is nothing physical to thread a seed into. The sph-water Stage-1b fix-precedent (`_seeded_initial_state(seed)` → `np.random.default_rng(seed)`) works *because sph-water has random dam-break ICs*. **That precedent does NOT transfer to LBM** — there is no random IC to seed. A "fix" would be record-only/cosmetic.
2. **Phase-1 `packages/lattice-boltzmann-d3q19/` is append-only-sealed** (§ B.1; the Stage-2 append-only check runs vs `v0.1.0-phase-1`). Modifying the Phase-1 `sim_runner_diagnostic` *behaviour* is a non-additive edit to sealed code — in direct tension with this sub-phase's Convention-A discipline (which otherwise forbids touching `packages/lattice-boltzmann-d3q19/`). The Stack-D port creates NEW code (`packages/lattice-boltzmann-d3q19-stack-d/`) whose own diagnostic runner follows a clean contract at Stage 1b regardless.

**Recommendation: D7 = (b) STAY BANKED** (SHIFT from dispatch lean (a)). The NEW Stack-D `sim_runner_diagnostic` is in-scope at Stage 1b and will follow a correct contract (accept `seed`; since LBM ICs are analytic, document that determinism is seed-independent — matching the sph-water *contract shape* without a meaningful random-IC thread). The Phase-1 LBM defect — being cosmetic AND on append-only-sealed code — plus the MPM-side defect, are better routed to a focused infrastructure sub-phase (or a future MPM-touching sub-phase) that can handle the append-only question for both sims together. Alternatives: (a) FOLD-IN (requires a sealed-code edit + delivers only cosmetic value for LBM) — surface to operator; (c) STANDALONE hotfix (LBM+MPM both) — adds sub-phase overhead. **Operator routes; do NOT fold in without explicit operator ratification of the append-only-seal exception.**

---

## § 10. Plan-drafting shifts surfaced at this probe

Precedent-establishing shifts common at plan-drafting; recorded per Convention #8. Entering: **131**.

- **S-P1** — spec § 11.3 LBM enumeration is item **2.5 / 2.5.D** (HEAD), NOT a 2.3 extrapolation from RD-2D=2.1 + sph-water=2.2.
- **S-P2** — `[defaults.lbm] = 1e-5` (HEAD), **10× tighter** than the 1e-4 the prior two pairs ran at; by spec design (arch § 2.6 LBM cross-stack = "epsilon (1e-5 rel)"). Less gate-14 headroom.
- **S-P3** — Phase-1 LBM dir is `packages/lattice-boltzmann-d3q19/`; D1 naming SHIFTS to the full-name `sub-phase-lattice-boltzmann-d3q19-stack-d` (dispatch abbreviated to `lbm`).
- **S-P4** — D7 SHIFTS from dispatch lean (a) FOLD-IN to recommended (b) STAY BANKED: LBM has analytic ICs (cosmetic-only seed) + Phase-1 source is append-only-sealed.
- **S-P5** — LBM is the FIRST cross-stack-port sim carrying BOTH gate-4 arms (golden equilibrium + MMS) AND TWO canonical captures (poiseuille + couette); deliverable-count + gate-4 dual-arm deltas from the single-canonical / single-arm template.

**Cumulative at plan-drafting probe close: 136** (131 + S-P1..S-P5). (The charter + landing commits may add none beyond these; recorded at the plan-drafting landing audit.)

---

*End of plan-drafting probe. Charter authored next at `docs/phases/sub-phase-lattice-boltzmann-d3q19-stack-d.md` per the sph-water Stack-D structural template with LBM deltas. D1–D9 surfaced for operator routing; NOT pre-committed.*
