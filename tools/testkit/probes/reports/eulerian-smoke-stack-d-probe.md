# Pre-implementation probe — eulerian-smoke-stack-d

> FIFTH per-sim cross-stack port under spec-Phase-2. Ports `eulerian-smoke` from
> its Phase-1 NumPy reference (`stack.name="numpy-reference"`) to Stack-D
> (Python / Taichi-DSL / CPU). Authored at the (collapsed single) Stage 1 per the
> coordinator dispatch; the plan-drafting probe
> (`docs/_audits/phase-2/sub-phase-eulerian-smoke-stack-d/plan-drafting-probe-*.md`)
> is the API-surface contract this report consumes + re-verifies.

## 1. Scope

A content-equivalent Taichi-DSL CPU port of the Stam-Fedkiw stable-fluids
reference (Stam 1999 + Fedkiw 2001): collocated cell-centered periodic grid;
plain trilinear semi-Lagrangian advection (3D), MacCormack-corrected SL (2D),
5/7-point explicit Laplacian diffusion, fixed-`n_jacobi=20` Jacobi
pressure-projection, Fedkiw vorticity confinement (skeleton; `eps=0`
PRESENT-but-NOT-EXERCISED at canonical). Reproduces BOTH Phase-1 canonical
descriptors (`taylor-green-128cube-seed42-step500` 3D +
`lid-driven-cavity-128sq-re100-seed42-step1000` 2D; D4) and diffs each
cross-stack against the NumPy-reference capture at `relative = 1e-4` (the `smoke`
tolerance category; gate 14). Gate-4 carries the MMS arm ONLY (no golden table).

## 2. API surfaces consumed

### 2.1 `capture` (testkit, IC-2)
`CaptureManifest`, `StepState`, `write_capture(states, manifest, out_dir) -> Path`,
`load_capture(manifest_path) -> Capture`. State dicts: 3D `{u,v,w,density}`,
2D `{u,v,density}` (f64, matching the reference for the gate-14 dtype check).

### 2.2 `determinism` (testkit, IC-14)
`run_twice_and_diff(runner, seed=42, tmp_dir) -> DeterminismVerdict`
(`{content_equivalent, detail}`). Consumed by gate-10.

### 2.3 `common_py` (IC-11 + IC-4)
`common_py.determinism.{Config, set_taichi_deterministic}`; `arch="cpu"` pins
`cpu_max_num_threads=1`, `offline_cache=True`. Does NOT set `default_fp=ti.f64`
(banked precedent #7; see § 6 R-S1).

### 2.4 `diagnostics` Tier 1 + Tier 2 vector_field (IC-5/IC-6)
`diagnostics.tier2.vector_field.{check_divergence_free, check_circulation,
check_helicity, check_energy_spectrum}` (gate 6). Tier-1 NaN/Inf scan over the
diagnostic trajectory (gate 5).

### 2.5 `equivalence` (testkit) — gate-14
`equivalence.harness.compare_captures(left, right, tolerance_table_path=None) ->
EquivalenceVerdict{within_tolerance, per_field_diff, tolerance_table_used}`.
Resolves tolerance via `[overrides.eulerian-smoke] category="smoke"` (MANDATORY;
KeyError on `sim.category="volumetric-grid"` without it). Compares state fields
only (not diagnostics); raises on dtype mismatch.

### 2.6 `taichi` (Stack-D DSL, IC-12)
`@ti.kernel` over `ti.types.ndarray(dtype=ti.f64, ndim=N)`; lazy `_ensure_taichi`.
R-T2 (no `from __future__ import annotations`), R-T4 (no `-> None`). Per-cell
`ti.ndrange` stencil kernels; no `ti.atomic_*` (no scatter).

### 2.7 MMS pipeline
`code_verification.mms.solutions.incompressible_ns_2d.solution.IncompressibleNS2DSolution`
(shared with lattice-boltzmann-d3q19; shift #18). Drives the 2D Taichi
`stable_fluids_step` (advection arm) + `project_pressure` (projection arm).

## 3. Upstream citations
- Stam, J. (1999), "Stable Fluids", SIGGRAPH '99, DOI 10.1145/311535.311548.
- Fedkiw, R., Stam, J., Jensen, H. W. (2001), "Visual Simulation of Smoke",
  SIGGRAPH '01, DOI 10.1145/383259.383260.
- Taylor, G. I., Green, A. E. (1937), Proc. R. Soc. Lond. A 158, DOI 10.1098/rspa.1937.0036.

## 4. Public types / functions exported
```
# eulerian_smoke_stack_d/reference/stable_fluids_taichi.py
#   CANONICAL_DESCRIPTOR_{2D,3D}, CANONICAL_SEED, CANONICAL_STEP_COUNT_{2D,3D},
#   _DEFAULT_N_JACOBI, canonical_params_{2d,3d}, Array2D, Array3D,
#   semi_lagrangian_advect_{2d,3d}, maccormack_advect_2d, project_pressure,
#   project_pressure_3d, stable_fluids_step, stable_fluids_step_3d
#   Taichi-DSL: _ensure_taichi() + @ti.kernel _k_{sl_advect_2d,sl_advect_3d,
#     laplacian_5point_2d,laplacian_7point_3d,divergence_2d,divergence_3d,
#     jacobi_sweep_2d,jacobi_sweep_3d,subtract_grad_2d,subtract_grad_3d,curl_3d}
# eulerian_smoke_stack_d/sim.py
#   sim_runner_seeded, sim_runner_seeded_2d, sim_runner_diagnostic,
#   compute_canonical_trajectory_3d
# eulerian_smoke_stack_d/invariants.py
#   divergence_free_post_projection, smoke_density_nonneg
```

## 5. Risk surfaces (re-verified at Stage 1)
- **R-S1 — banked precedent #7 (f64-seed), applies NON-vacuously.** The 3D Jacobi
  normaliser `1.0/6.0` is a pure-literal division that infers f32 absent
  `default_fp=ti.f64`, leaking ~1e-9 into the 3D cross-stack pressure solve;
  seeded `ti.f64(1.0)/ti.f64(6.0)`. The 2D `0.25` is exact in f32 (no seed). FIRST
  cross-stack port where #7 bites a pure-literal CONSTANT, not a reduction.
- **R-S2 (SUBSTANTIVE; surfaced at Stage 1 gate-14).** The 2D lid-driven-cavity
  canonical is NOT laminar (contra probe § 6 / charter § 1.4.2): the thin shear
  layer on a periodic grid is Kelvin-Helmholtz unstable, and the reference
  trajectory reaches `u ~ 1.6e3` by step 5 before settling to `~O(10)`. Cross-stack
  FP-round-off perturbations (matched to ~1e-16 through step 2) amplify ~16 orders
  by step 5 — IC-15 aspect #1 (chaotic) is EXERCISED, and gate-14 returns
  `within_tolerance=False`. Hard-Rule-2 STOP filed; see the Stage-1 checkpoint.
- **R-S3 — no atomic scatter** (per-cell stencil / SL gather; `atomic_ops=False`).

## 6. Gate-to-deliverable mapping
Gate 1 spec-ref-stack-d.md; 2 this report; 3 failing-tests evidence; 4
`test_mms_convergence` (MMS-only); 5 `test_diagnostics` Tier-1; 6 `test_diagnostics`
Tier-2 vector_field; 7/8 citations + API (`test_reference_sanity`); 9 two
canonical captures; 10 `test_determinism` (IC-14); 11 `test_pbt_invariants` (2 @
50 ex.); 12 perf-ledger (two rows); 13 worktree replay; 14
`test_cross_stack_equivalence` (TWO verdicts — see R-S2 finding).
