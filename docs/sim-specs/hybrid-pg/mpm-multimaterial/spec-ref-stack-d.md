# mpm-multimaterial — Stack-D Reference Spec

> Stack-D (Python / Taichi-DSL / CPU) port of `mpm-multimaterial`. Sibling to
> `spec-ref.md` (the Phase-1 NumPy+numba reference). FOURTH per-sim cross-stack
> port under spec-Phase-2; first to exercise the P2G atomic-scatter surface
> (IC-15 deferred aspect #3) on the Stack-D side. Authored at Stage 1b.

## 1. Scope

Content-equivalent Stack-D Taichi-DSL re-implementation of the Phase-1 MLS-MPM
(Hu et al. 2018) + APIC drop-impact reference. Single-material neo-Hookean
elastic blob (1M particles) falling under gravity onto a sticky floor on a 128³
grid over 500 steps. The "multimaterial" name is a Phase-1 naming-only surface
(probe S-M5): the constitutive table is declared-only in `algebraic.md` § 3;
both the reference AND this port implement a single material (`material_id`
all-0). Out of scope: multi-material constitutive table; plastic/granular flow;
implicit/Newton MPM; MRT; the Stack-E Warp port (spec § 11.3 item 2.3).

## 2. Upstream and reference anchors

- Hu et al. 2018, *A Moving Least Squares Material Point Method with Displacement
  Discontinuity and Two-Way Rigid Body Coupling*, ACM TOG 37(4),
  DOI 10.1145/3197517.3201293 § 3 (MLS-MPM + APIC) + § 5 (neo-Hookean).
- 88-line MLS-MPM reference, https://github.com/yuanming-hu/taichi_mpm/blob/master/mls-mpm88.cpp
  (citation-only per R8; no vendored code).
- Steffen-Kirby-Berzins 2008, *IJNME* 76(6), DOI 10.1002/nme.2360 § 3 Eq. (15)
  (quadratic B-spline).
- Phase-1 reference: `packages/mpm-multimaterial/` (`stack.name="numpy-numba-reference"`).
- Stack-D port: `packages/mpm-multimaterial-stack-d/`.

## 3. Algorithm

Single-pass explicit MLS-MPM/APIC per step: compute per-particle neo-Hookean
Cauchy stress → P2G transfer (mass + APIC affine momentum + stress-divergence
force injection, Hu-2018 88-line variant) → grid update (momentum→velocity,
gravity, sticky floor at z-index 4, axis-clamp walls) → G2P transfer (velocity +
APIC affine-matrix reconstruction, 4/dx² coefficient) → deformation-gradient
update F ← (I + dt·C)F → symplectic-Euler advection + interior clamp. NO
iterative solver (IC-15 deferred aspect #5 unexercised); NO plastic flow.

## 4. Algebraic form

Quadratic B-spline 3-node shape function, base `floor(p/dx + 0.5) − 1`. APIC
velocity reconstruction `C = (4/dx²) Σ_i w_i v_i ⊗ (x_i − x_p)`. neo-Hookean
Cauchy stress `σ = μ(F Fᵀ − I) + λ log(J) I` (volume-weighted), with `J = det F`
and the `J ≤ 0 → log J = −30` non-smooth volumetric-inversion clamp (R-M2
amplification candidate over the horizon). Lamé params from (E=4000, ν=0.3).

## 5. Implementation

`packages/mpm-multimaterial-stack-d/mpm_multimaterial_stack_d/`:
- `reference/mls_mpm_taichi.py` — 6 `@ti.kernel` transfer/update kernels
  (`p2g`, `p2g_with_stress`, `g2p`, `grid_update`, `deformation_update`,
  `compute_particle_stresses`, `advect_particles`) over `ti.types.ndarray` views
  (NumPy in/out; the RD-2D/sph-water/LBM Stack-D pattern). NO
  `from __future__ import annotations`; NO `-> None` on kernels (IC-12 R-T2/4.6).
  Explicit `ti.f64(0.0)` accumulator seeds throughout (Stage-0 + LBM banked).
- `reference/shape_functions.py` — pure-Python quadratic B-spline `N(x)` +
  `partition_of_unity_sum(p)` (gate-4 golden; stack-agnostic, ported verbatim).
- `sim.py` — `sim_runner_seeded` (canonical) + `sim_runner_diagnostic`; blob
  rejection sampler (`numpy.random.default_rng(seed)`); `_ensure_taichi()` pins
  `arch="cpu"`, `cpu_max_num_threads=1`.
- `invariants.py` — `mass_conservation_p2g_g2p` + `partition_of_unity_b_spline`.

## 6. Verification posture — GOLDEN-only gate-4 (NO MMS)

Gate-4 is golden-table-only (probe S-M6; the sph-water pattern, NOT LBM's
dual-arm): `tests/test_quadratic_bspline_golden.py` reproduces the MLS-MPM
quadratic B-spline `N(x)` samples + partition-of-unity sums at
`tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` (4
independent-reference anchors) at `abs = 1e-15`. The closed-form piecewise
quadratic is stack-agnostic (no FP-accumulation surface). There is no MMS arm
(no manufactured solution for the MLS-MPM elastodynamics at this scope).

### 6.6 PBT-covered invariants

Two (spec § 6.6, ported verbatim): `mass_conservation_p2g_g2p` (P2G round-trip
preserves total mass via partition-of-unity) + `partition_of_unity_b_spline`
(3-node B-spline weights sum to 1). Hypothesis 50 examples each.

## 7. Golden values / Manufactured solutions

Golden: `mls-mpm-shape-functions.json` (consumed read-only; no new table). No MMS.

## 8. Determinism

`bit-exact-same-hw` at `arch="cpu"` (over-achieves the spec `determinism.md`
`epsilon-same-stack-same-hw`). The canonical Stack-D Taichi P2G atomic scatter-add
breaks bit-exactness under parallelism (Stage-0 Task 0.3 posture (ii): threads=8
NOT run-to-run bit-exact) — so the port pins `cpu_max_num_threads=1` (posture (i);
threads=1 run-to-run bit-exact) + explicit `ti.f64(0.0)` accumulator seeds.
`determinism.atomic_ops = True` (ti.atomic_add IS used, serialised). Gate-10
`run_twice_and_diff` witnesses content-equivalence at the diagnostic tier. ICs are
substantively seeded (blob sampler; S-M4 — NOT cosmetic like LBM's analytic ICs).

## 9. Equivalence

Cross-stack content-equivalent against the Phase-1 NumPy+numba reference capture
`captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` via
`compare_captures` at `relative = 1e-4, absolute = 0.0` (the `mpm` tolerance
category, resolved from `sim.category='hybrid-pg'` by the MANDATORY
`[overrides.mpm-multimaterial] category="mpm"` added at Stage 1c — D6). Gate-14 is
EMPIRICAL: the P2G atomic-scatter accumulation order (even serialised) differs
from the numba sequential `+=`, giving a cross-stack diff ~5 orders below 1e-4
(Stage-0 measured ~8.5e-10 single-step) — notably larger than the prior three
pairs' ~1e-15, exercising deferred aspect #3 partially. R-M2: the 500-step
drop-impact horizon (+ the `J ≤ 0` branch) is an amplification candidate; the
Stage-1c full-horizon roll-up is load-bearing. State fields compared:
`particle_pos`, `particle_vel`, `grid_mom` (`particle_material_id` const-int).

## 10. Diagnostics

Tier 1 `check_health` (NaN/Inf). Tier 2 — FIRST sim consuming BOTH IC-5
(`check_count_invariance` + `check_momentum_conservation_drift`, particle) AND
IC-6 (`check_circulation_grid_mom_l1`, vector_field on the grid-momentum field).
Schema identical to the Phase-1 reference (4 keys).

## 11. Build and run

```
# Stack-D test surface (diagnostic tier; ~2 s):
uv run --package mpm-multimaterial-stack-d pytest packages/mpm-multimaterial-stack-d/tests/ -v
# Canonical capture (1M particles x 128^3 x 500; ~minutes; ~1.05 GiB LFS):
uv run --package mpm-multimaterial-stack-d python -c "from pathlib import Path; \
from mpm_multimaterial_stack_d.sim import sim_runner_seeded; \
sim_runner_seeded(42, Path('captures/mpm-multimaterial-stack-d'))"
```

## 12. References

See § 2. Cross-stack methodology: `docs/conventions/cross-stack-equivalence-methodology.md`
(IC-15 PARTIAL); architecture § 2.5 (IC-13) + § 2.6 (tolerance) + Appendix D.6.

## 13. Productization status

Stack-D CPU reference port. Stack-E Warp port (spec § 11.3 item 2.3) deferred.
GPU-arch determinism + parallel-scatter posture (ii) + multi-material table:
Phase-2+/Phase-3.
