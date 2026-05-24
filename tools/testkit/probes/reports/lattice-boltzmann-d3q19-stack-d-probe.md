# Pre-implementation probe — lattice-boltzmann-d3q19-stack-d

> Stack-D (Taichi-DSL / CPU) port of the Phase-1 `lattice-boltzmann-d3q19` D3Q19
> BGK reference. THIRD per-sim cross-stack port under spec-Phase-2. Authored at
> sub-phase-lattice-boltzmann-d3q19-stack-d Stage 1b (gate-2 deliverable).

## 1. Scope

Enumerates the API surfaces, upstream citations, fixtures, and public exports the
Stack-D port consumes/produces. The port reproduces BOTH Phase-1 canonical
descriptors `poiseuille-64x32-seed42-step1000` + `couette-32x16-seed42-step500`
(D4 dual-capture) and diffs each cross-stack against the NumPy-reference capture
at `relative = 1e-5` (gate 14, Stage 1c). Code verification carries BOTH gate-4
arms (golden 4a + MMS 4b) — the first cross-stack port to do so.

## 2. API surfaces consumed

### 2.1 `capture` (testkit, IC-2)
`CaptureManifest`, `StepState`, `write_capture` (gate-9 dual canonical write);
`load_capture` (gate-14 Stage 1c).

### 2.2 `determinism` (testkit, IC-14)
`run_twice_and_diff(sim_runner, seed, tmp_dir) -> DeterminismVerdict
{content_equivalent, detail}` (gate-10; storage/wall-clock metadata excluded).

### 2.3 `common_py` (IC-11 + IC-4)
`common_py.determinism.{Config, set_taichi_deterministic}` —
`set_taichi_deterministic(Config(deterministic=True, seed=...), arch="cpu")` pins
`cpu_max_num_threads=1` + `offline_cache=True`. **f64 accumulator seeds**
(`ti.f64(0.0)`) on every in-kernel reduction — `set_taichi_deterministic` does NOT
set `default_fp=ti.f64` (Stage-0 banked; bare-`0.0` locals leaked 3.4e-6).

### 2.4 `diagnostics` / Tier 1 + Tier 2 vector_field (IC-5/IC-6)
Tier 1 NaN/Inf health; Tier 2 `check_divergence_free` (advisory; weakly
compressible) + `check_circulation` on the macroscopic velocity (gates 6/7).

### 2.5 `equivalence` (testkit) — gate-14 cross-stack (Stage 1c consumption)
`equivalence.harness.compare_captures(left, right, tolerance_table_path=None) ->
EquivalenceVerdict`. Requires the MANDATORY `[overrides.lattice-boltzmann-d3q19]
category="lbm"` (D6; Stage 1c) — without it `compare_captures` raises `KeyError`
on `lattice` (Stage-0 Task 0.5). Budget `relative = 1e-5` (10x tighter than the
RD-2D / sph-water `1e-4`).

### 2.6 `taichi` (Stack-D DSL, IC-12)
`ti.init` via `set_taichi_deterministic`; `@ti.kernel` (no `-> None` annotation,
section 4.6); NO `from __future__ import annotations` in the kernel module
(section 4.2); per-cell 19-term f64-seeded moment reductions + per-direction
`ti.static(range(19))` loops; integer-offset streaming via periodic gather
(bit-exact, no FP). NO `ti.atomic_add` / subgroup-collectives.

### 2.7 MMS pipeline
**Consumed** (gate-4b) — the SHARED `IncompressibleNS2DSolution`
(`tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`), UNMODIFIED
(`solution.py` `30e490a7...320d8e`, `derivation.md` `30dfc294...ac86e76`). LBM
carries BOTH gate-4 arms (unlike RD-2D MMS-only / sph-water golden-only).

## 3. Upstream citations

- Qian, d'Humieres & Lallemand (1992), *Europhys. Lett.* 17 (6), 479,
  DOI 10.1209/0295-5075/17/6/001 (D3Q19 equilibrium + weights).
- Guo, Zheng & Shi (2002), *Phys. Rev. E* 65, 046308,
  DOI 10.1103/PhysRevE.65.046308 (body forcing).
- Kruger et al. (2017), ISBN 978-3-319-44649-3, Ch. 5 (bounce-back / moving wall).

The kernel math is **re-derived from these sources, not copied** from the sealed
Phase-1 `packages/lattice-boltzmann-d3q19/` module (Convention A; the lattice
ORDERING is mirrored verbatim per R-LBM-4 for cross-stack parity).

## 4. Test-fixture paths

- `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json` (gate-4a; abs 1e-15;
  sha256 `959e0248...e30a2`).
- `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/` (gate-4b).
- `captures/lattice-boltzmann-d3q19-stack-d/{poiseuille-64x32-seed42-step1000,
  couette-32x16-seed42-step500}.{h5,json}` (gate-9 dual canonical capture, produced
  this stage).
- `captures/lbm-ref/{...}.{h5,json}` (gate-14 LEFT/reference partner; Phase-1-frozen).

## 5. Public types / functions exported

```
# lattice_boltzmann_d3q19_stack_d/reference/constants.py
VELOCITIES, WEIGHTS, CS2, C, W ; CANONICAL_DESCRIPTOR_{POISEUILLE,COUETTE},
CANONICAL_{SEED,NZ}, CANONICAL_{POISEUILLE,COUETTE}_{NX,NY,STEPS}

# lattice_boltzmann_d3q19_stack_d/reference/d3q19_taichi.py
feq(rho, u) -> list[float] ; density_moment(f) -> float ; momentum_moment(f) -> list[float]
feq_field(rho, u) ; density_field(f) ; momentum_field(f)
bgk_step(f, tau, force_lattice=None) ; stream(f_post)
macroscopic_velocity(f, force_lattice=None) ; apply_bounce_back_y_walls(f, ...)
# Taichi-DSL: _ensure_taichi() + @ti.kernel _k_{feq_point,feq_field,density_moment_point,
#   momentum_moment_point,density_field,momentum_field,collide_guo,stream}

# lattice_boltzmann_d3q19_stack_d/sim.py
sim_runner_seeded(seed, out_dir) -> Path           # Poiseuille 64x32x3 x 1000
sim_runner_seeded_couette(seed, out_dir) -> Path   # Couette 32x16x3 x 500 (D4)
sim_runner_diagnostic(seed, out_dir) -> Path       # 16x8x3 x 50 (seed COSMETIC, D7)

# lattice_boltzmann_d3q19_stack_d/invariants.py
equilibrium_density_moment() ; equilibrium_momentum_moment()   # Hypothesis-driven
```

## 6. Risk surfaces (charter section 9)

- **R-L1 (gate-14 amplification @ tighter 1e-5):** de-risked at Stage 1b — informal
  poiseuille final-step diff vs the NumPy reference is `max_abs ~ 1e-15` (rho 3.8e-15,
  u 6.2e-15); `compare_captures` verdicts `abs_err > atol + rtol*field_scale`
  (field scale ~0.01 -> threshold ~1e-7), so the ~8-order margin holds. Empirical
  disposition at Stage 1c (R-L1; no silent widening).
- **R-L2/R-L3 (Taichi-DSL f64 reductions):** the per-cell 19-term collision-moment
  reduction is the first genuine in-kernel f64 reduction in the portfolio (D9);
  resolved with explicit `ti.f64(0.0)` accumulator seeds (Stage-0 banked) — 7e-15
  vs NumPy. No MRT multi-stage transform needed (BGK single-tau).
- **R-L4 (wall-clock):** measured at Stage 1b — poiseuille **4.954 s**, couette
  **0.973 s** (combined ~5.9 s; RD-2D-scale). Taichi-cpu modestly above the NumPy
  floor (3.784 / 0.604 s) from per-step kernel-launch overhead on small grids; far
  below any structural alarm. Escape-hatch NOT triggered.

## 7. Gate-to-deliverable mapping (charter section 2)

Gates 1 (spec sheet), 2 (this probe), 3 (Stage-1a RED), 4a (equilibrium golden) +
4b (MMS OOA 2.39), 5/6/7 (reference-sanity + Tier1/Tier2 diagnostics), 8
(citations/API via integrity), 9 (TWO canonical captures), 10 (determinism IC-14),
11 (PBT x2), 12 (TWO perf-ledger rows), 13 (gate-13 replay) — all landed at Stage
1b. Gate 14 (cross-stack, both captures) PENDING-1c.

## 8. Out-of-scope at Stage 1b (Stage 1c / Stage 2 owners)

`[overrides.lattice-boltzmann-d3q19]` (Stage 1c, D6); `equivalence.md` extension +
both gate-14 verdicts (Stage 1c); un-skip `test_cross_stack_equivalence.py` (Stage
1c); schema-corpus entry (Stage 1c); CHANGELOG / dependencies.md convergence (Stage
2); IC-15 methodology amendment (Stage 2, D5 option (b)).
