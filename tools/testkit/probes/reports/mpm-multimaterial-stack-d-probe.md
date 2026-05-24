# Pre-implementation probe — mpm-multimaterial-stack-d

> FOURTH per-sim cross-stack port under spec-Phase-2. Stack-D (Python /
> Taichi-DSL / CPU) port of the Phase-1 MLS-MPM/APIC neo-Hookean reference.
> Authored at Stage 1b (sibling to the Phase-1 `mpm-multimaterial.md` probe).

## 1. Scope

Enumerates the common-py + testkit + Taichi API surfaces consumed by the
Stack-D port, the upstream citations, the test fixtures, and the public exports.
Single-material neo-Hookean MLS-MPM/APIC (probe S-M5); golden-only gate-4 (S-M6);
ONE canonical capture (D4); P2G atomic-scatter serialised at
`cpu_max_num_threads=1` (Stage-0 Task 0.3 posture (i)).

## 2. API surfaces consumed

### 2.1 `capture` (testkit, IC-2)
`CaptureManifest`, `StepState`, `write_capture` — canonical + diagnostic capture
write. State fields: `particle_pos` (f64), `particle_vel` (f64),
`particle_material_id` (int32), `grid_mom` (f64). Schema mirrors the Phase-1
reference verbatim (gate-14 requires matching state keys + dtypes + step set).

### 2.2 `determinism` (testkit, IC-14)
`run_twice_and_diff` — gate-10 content-equivalence at the diagnostic tier.

### 2.3 `common_py` (IC-11 + IC-4)
`common_py.determinism.{Config, set_taichi_deterministic}` — `arch="cpu"`,
`cpu_max_num_threads=1`, `offline_cache=True`, `seed=42`. Invoked lazily once via
`reference.mls_mpm_taichi._ensure_taichi()`.

### 2.4 `diagnostics` / Tier 1 + Tier 2 (IC-5 + IC-6)
FIRST sim consuming BOTH IC-5 (particle: count-invariance + momentum-drift) AND
IC-6 (vector_field: grid-momentum L1 circulation surrogate) at Tier-2.

### 2.5 `equivalence` (testkit) — gate-14 cross-stack (Stage 1c consumption)
`equivalence.harness.compare_captures` at `relative = 1e-4` (`mpm` category via
the MANDATORY `[overrides.mpm-multimaterial]`, Stage 1c). SKIPPED at Stage 1b.

### 2.6 `taichi` (Stack-D DSL, IC-12)
Taichi 1.7.4; `@ti.kernel` over `ti.types.ndarray` (NumPy in/out). NO
`from __future__ import annotations`; NO `-> None` (R-T2/4.6). `ti.atomic_add`
for the P2G grid-node scatter; `ti.f64(0.0)` accumulator seeds throughout.

## 3. Upstream citations

Hu 2018 (DOI 10.1145/3197517.3201293); 88-line MLS-MPM reference (citation-only,
R8); Steffen-Kirby-Berzins 2008 (DOI 10.1002/nme.2360). Cross-ref the Phase-1
`spec-ref.md` § 2.

## 4. Test-fixture paths

- `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` (gate-4; read-only).
- `captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` (gate-14 LEFT partner; Stage 1c).
- `captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.{h5,json}` (Stack-D capture; gate-9).

## 5. Public types / functions exported

```
# mpm_multimaterial_stack_d/reference/shape_functions.py
N(x) -> float; partition_of_unity_sum(p) -> float

# mpm_multimaterial_stack_d/reference/mls_mpm_taichi.py
# Constants: CANONICAL_{DESCRIPTOR, GRID_N=128, N_PARTICLES=1_000_000, N_STEPS=500,
#   CAPTURE_INTERVAL=50, SEED=42, FLOOR_Z_INDEX=4, YOUNGS_MODULUS=4000.0,
#   POISSON_RATIO=0.3, MU, LAMBDA, BLOB_CENTER, BLOB_RADIUS=0.15, BLOB_VELOCITY_Z=-2.0,
#   GRAVITY_Z=-9.81, DT=1e-4}
# Taichi-DSL: _ensure_taichi() + @ti.kernel _k_{p2g, p2g_with_stress, g2p,
#   grid_update, deformation_update, compute_stresses, advect}
# Wrappers: p2g, p2g_with_stress, g2p, grid_update, deformation_update,
#   compute_particle_stresses, advect_particles

# mpm_multimaterial_stack_d/sim.py
sim_runner_seeded(seed, out_dir) -> Path; sim_runner_diagnostic(seed, out_dir) -> Path

# mpm_multimaterial_stack_d/invariants.py
mass_conservation_p2g_g2p(positions, masses, grid_n=16, grid_dx=1/16) -> (float, float)
partition_of_unity_b_spline(p) -> float
```

## 6. Risk surfaces (charter § 9)

- **R-M1 atomic-scatter** — P2G `ti.atomic_add`; serialised at `cpu_max_num_threads=1`
  (Stage-0 posture (i) bit-exact run-to-run). Cross-stack ~8.5e-10 single-step (~5
  orders below 1e-4); deferred IC-15 aspect #3 partially exercised.
- **R-M2 horizon amplification** — `J ≤ 0` non-smooth clamp over 500 steps;
  instrumented via stdout `[R-M2]` j_det min/max/n(J≤0) logging in `sim_runner_seeded`.
- **R-M5 S6** — single-material neo-Hookean MLS-MPM/APIC (Phase-1 sim.py read).
- f64 accumulator-seed (Stage-0 + LBM banked) — `ti.f64(0.0)` throughout.

## 7. Gate-to-deliverable mapping (charter § 2)

gate-4 golden (test_quadratic_bspline_golden); gate-5 Tier-1 + gate-6 Tier-2
(test_diagnostics); gate-10 determinism (test_determinism); gate-11 PBT
(test_pbt_invariants); gate-5 reference-sanity (test_reference_sanity); gate-9
canonical capture; gate-12 perf-ledger; gate-13 replay; gate-14 cross-stack
(test_cross_stack_equivalence; Stage 1c).

## 8. Out-of-scope at Stage 1b (Stage 1c / Stage 2 owners)

`[overrides.mpm-multimaterial]` (1c, D6); `equivalence.md` extension (1c);
gate-14 un-skip + per-field witness + step-horizon roll-up (1c); schema-corpus
representative subset (2, D10); IC-15 methodology amendment (2, D5 (b)).
