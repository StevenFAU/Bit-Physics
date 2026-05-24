# Pre-implementation probe — sph-water-stack-d

> Stack-D (Taichi-DSL / CPU) port of the Phase-1 `sph-water` DFSPH reference.
> SECOND per-sim cross-stack port under spec-Phase-2. Authored at
> sub-phase-sph-water-stack-d Stage 1b (gate-2 deliverable).

## 1. Scope

Enumerates the API surfaces, upstream citations, fixtures, and public exports the
Stack-D port consumes/produces. The port reproduces the Phase-1 canonical
descriptor `dam-break-100K-particles-seed42-step1000` and is diffed cross-stack
against the NumPy-reference capture (gate 14, Stage 1c). Code verification is
golden-table-based (NOT MMS).

## 2. API surfaces consumed

### 2.1 `capture` (testkit, IC-2)
`CaptureManifest`, `StepState`, `write_capture` (gate-9 canonical write);
`load_capture` (gate-5 diagnostics; gate-14 Stage 1c).

### 2.2 `determinism` (testkit, IC-14)
`run_twice_and_diff(sim_runner, seed, tmp_dir) -> DeterminismVerdict
{content_equivalent, detail}` (gate-10).

### 2.3 `common_py` (IC-11 + IC-4)
`common_py.determinism.{Config, set_taichi_deterministic}` —
`set_taichi_deterministic(Config(deterministic=True, seed=...), arch="cpu")` pins
`cpu_max_num_threads=1`. f64 via f64-typed `ti.types.ndarray` args (NOT a
`default_fp` edit; Stage-0 banked requirement).

### 2.4 `diagnostics` (IC-5, Tier 1 + Tier 2 particle)
`diagnostics.tier2.particle.{check_count_invariance, check_no_overlap,
check_neighbor_list_integrity, check_momentum_conservation}` (gate-6;
momentum advisory).

### 2.5 `equivalence` (testkit) — gate-14 cross-stack (Stage 1c consumption)
`equivalence.harness.compare_captures(left, right, tolerance_table_path=None) ->
EquivalenceVerdict`. Requires the MANDATORY `[overrides.sph-water] category="sph"`
(D6; Stage 1c) — without it `compare_captures` raises `KeyError` on
`particle-fluids` (Stage-0 Task 0.4).

### 2.6 `taichi` (Stack-D DSL, IC-12)
`ti.init` via `set_taichi_deterministic`; `@ti.kernel` (no `-> None` annotation,
§ 4.6); no `from __future__ import annotations` in the kernel module (§ 4.2);
27-cell spatial hash + `ti.atomic_add` cell insertion (serialised at 1 thread).

### 2.7 MMS pipeline
**Not consumed** — sph-water has no MMS gate (golden-table verification only;
the largest delta from the RD-2D Stack-D template).

## 3. Upstream citations

- Monaghan (1992), *Annu. Rev. Astron. Astrophys.* 30, 543 (cubic-spline kernel).
- Monaghan (2005), *Rep. Prog. Phys.* 68 (8), 1703, DOI 10.1088/0034-4885/68/8/R01,
  Eq. (2.7).
- Bender & Koschier (2015), *SCA '15*, 147–155, DOI 10.1145/2786784.2786796,
  Eq. (5) (DFSPH continuity).
- SPlisHSPlasH reference implementation (manifest SHA `6bff55a6eaf14083d34650f22a268ce156b62b54`).

The kernel math is **re-derived from these sources, not copied** from the sealed
Phase-1 `packages/sph-water/` module (Convention A; append-only-protected).

## 4. Test-fixture paths

- `tools/testkit/golden/tables/cubic-spline-kernel.json` (gate-4a; abs 1e-12).
- `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json`
  (gate-4b; abs 1e-15; 3 anchors).
- `captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.{h5,json}`
  (gate-9 canonical capture, produced this stage).
- `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.{h5,json}`
  (gate-14 LEFT/reference partner; Phase-1-frozen).

## 5. Public types / functions exported

```
# sph_water_stack_d/reference/dfsph_taichi.py
SIGMA_3D: float
W(q, h) -> float ; grad_W_magnitude(q, h) -> float ; grad_W(r_vec, h) -> ndarray
density(*, particles, h) -> list[float]
density_evolution(*, particles, h) -> list[float]
neighbor_lists(positions, h, *, support_factor=2.0) -> list[list[int]]
canonical_params() -> dict[str, float]
# Taichi-DSL: _ensure_taichi(), _build_grid(...), _compute_density(...), _integrate(...)

# sph_water_stack_d/sim.py
sim_runner_seeded(seed, out_dir) -> Path        # canonical 100K x 1000
sim_runner_diagnostic(seed, out_dir) -> Path    # 64 x 8 (seed-propagating)
compute_diagnostic_trajectory(*, seed, n_particles, n_steps, capture_interval)
neighbor_lists_at(positions, *, h=None) -> list[list[int]]

# sph_water_stack_d/invariants.py
density_nonneg() ; kernel_normalization_unit_volume()   # Hypothesis-driven
```

## 6. Risk surfaces (charter § 9)

- **R-S1 (gate-14 amplification):** dissolved in magnitude — the reference
  trajectory is explicit-Euler rigid free-fall (no iterative solver), so per-step
  FP differences do not amplify; positions/velocities match the reference to FP and
  density to ~1e-9. Empirical disposition at Stage 1c.
- **R-S2 (neighbor-accumulation primitive):** the port uses `ti.atomic_add` for
  cell insertion, serialised at `cpu_max_num_threads=1` → deterministic;
  `atomic_ops=False` (not an epsilon source). Density accumulation is per-particle
  (no cross-particle scatter).
- **R-S3 (wall-clock):** instrumented at Stage 1b — combined iters/step = **1**
  (explicit Euler), full canonical ≈ **4.4 min** (≪ 43-min band; escape-hatch NOT
  triggered). The Stage-0 k≈10 estimate assumed an iterative DFSPH the reference
  trajectory does not use.

## 7. Gate-to-deliverable mapping (charter § 2)

Gates 1 (this stage's spec sheet), 2 (this probe), 3 (Stage-1a RED), 4a/4b (golden),
5/6 (diagnostics), 7/8 (citations/API via integrity), 9 (canonical capture), 10
(determinism IC-14), 11 (PBT ×2), 12 (perf-ledger row), 13 (gate-13 replay) — all
landed at Stage 1b. Gate 14 (cross-stack) PENDING-1c.

## 8. Out-of-scope at Stage 1b (Stage 1c / Stage 2 owners)

`[overrides.sph-water]` (Stage 1c, D6); `equivalence.md` extension (Stage 1c);
un-skip `test_cross_stack_equivalence.py` (Stage 1c); schema-corpus entry (Stage 1c);
CHANGELOG / dependencies.md convergence (Stage 2); IC-15 formalization (Stage 2, D5).
