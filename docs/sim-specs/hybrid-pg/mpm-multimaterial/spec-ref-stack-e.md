# mpm-multimaterial — Stack-E Reference Spec

> Stack-E (Python / NVIDIA Warp 1.13.0 / CPU) port of `mpm-multimaterial`.
> Sibling to `spec-ref.md` (the Phase-1 NumPy+numba reference) and
> `spec-ref-stack-d.md` (the Taichi-DSL port). SIXTH per-sim cross-stack port
> under spec-Phase-2 and the FIRST Stack-E port consuming `common-warp` (spec
> § 11.3 item 2.3 mandate). Authored at Stage 1b (mirroring the Stack-D spec
> sheet's impl-stage timing). Cites `spec-ref-stack-d.md` as the structural
> template.

## 1. Scope

Content-equivalent Stack-E NVIDIA Warp `@wp.kernel` re-implementation of the
Phase-1 MLS-MPM (Hu et al. 2018) + APIC drop-impact reference. Single-material
neo-Hookean elastic blob (1M particles) falling under gravity onto a sticky
floor on a 128³ grid over 500 steps. The "multimaterial" name is a Phase-1
naming-only surface (`spec-ref-stack-d.md` § 1): the constitutive table is
declared-only in `algebraic.md` § 3; the reference, the Stack-D port, AND this
Stack-E port all implement a single material (`material_id` all-0). Out of
scope: multi-material constitutive table; plastic/granular flow; implicit/Newton
MPM; GPU-arch determinism; the other two Stack-E ports (Smoke § 11.3 item 2.4 /
LBM item 2.5).

## 2. Upstream and reference anchors

- Hu et al. 2018, *A Moving Least Squares Material Point Method with Displacement
  Discontinuity and Two-Way Rigid Body Coupling*, ACM TOG 37(4),
  DOI 10.1145/3197517.3201293 § 3 (MLS-MPM + APIC) + § 5 (neo-Hookean).
- 88-line MLS-MPM reference, https://github.com/yuanming-hu/taichi_mpm/blob/master/mls-mpm88.cpp
  (citation-only per R8; no vendored code).
- Steffen-Kirby-Berzins 2008, *IJNME* 76(6), DOI 10.1002/nme.2360 § 3 Eq. (15)
  (quadratic B-spline; the upstream derivation anchoring the gate-4 golden
  `N(x)` values).
- Phase-1 reference: `packages/mpm-multimaterial/` (`stack.name="numpy-numba-reference"`);
  spec sheet `spec-ref.md` § 2 (upstream anchors) + § 6 (verification posture).
- Stack-E port: `packages/mpm-multimaterial-stack-e/`.

## 3. Algorithm

Single-pass explicit MLS-MPM/APIC per step (algebraic surface re-derived VERBATIM
from the Phase-1 numba reference; same operation order for cross-stack
FP-round-off equivalence): compute per-particle neo-Hookean Cauchy stress → P2G
transfer (mass + APIC affine momentum + stress-divergence force injection,
Hu-2018 88-line variant) → grid update (momentum→velocity, gravity, sticky floor
at z-index 4, axis-clamp walls) → G2P transfer (velocity + APIC affine-matrix
reconstruction, 4/dx² coefficient) → deformation-gradient update F ← (I + dt·C)F
→ symplectic-Euler advection + interior clamp. NO iterative solver (IC-15
deferred aspect #5 unexercised); NO plastic flow.

## 4. Algebraic form

Quadratic B-spline 3-node shape function, base `floor(p/dx + 0.5) − 1`. APIC
velocity reconstruction `C = (4/dx²) Σ_i w_i v_i ⊗ (x_i − x_p)`. neo-Hookean
Cauchy stress `σ = μ(F Fᵀ − I) + λ log(J) I` (volume-weighted), with `J = det F`
and the `J ≤ 0 → log J = −30` non-smooth volumetric-inversion clamp. Lamé params
from (E=4000, ν=0.3).

## 5. Implementation

`packages/mpm-multimaterial-stack-e/mpm_multimaterial_stack_e/`:

- `reference/mls_mpm_warp.py` — seven `@wp.kernel` transfer/update kernels
  (`p2g`, `p2g_with_stress`, `g2p`, `grid_update`, `deformation_update`,
  `compute_particle_stresses`, `advect_particles`) over **own**
  `wp.array(dtype=wp.float64)` storage + NumPy-marshalling wrappers (in-place
  mutation contract matching the Phase-1 API). **D15 / R-MPME-F64:** common-warp's
  `Particles`/`Grids` are f32 convenience surfaces; this f64 port declares its own
  f64 arrays (the warp.md § 6 LBM-precedent of stack-specific arrays).
  Every in-kernel literal is seeded `wp.float64(...)` (banked precedent #7
  extended to pure-literal `@wp.kernel` constants, conventions § L.4). The kernel
  module omits `from __future__ import annotations` (defensive; O-W6).
- `reference/shape_functions.py` — pure-Python quadratic B-spline `N(x)` +
  `partition_of_unity_sum(p)` (gate-4 golden; stack-agnostic, ported verbatim).
- `sim.py` — `sim_runner_seeded` (canonical) + `sim_runner_diagnostic`; blob
  rejection sampler (`numpy.random.default_rng(seed)`, host-side, stack-agnostic).
- `invariants.py` — `mass_conservation_p2g_g2p` + `partition_of_unity_b_spline`.

**common-warp consumption (D10 — socket-only):** Runtime (`init("cpu",
deterministic=True)`) + Capture (`Capture` / `write_capture`, f64-preserving) +
Determinism (`set_warp_deterministic` / `deterministic_context`). The f32-pinned
`Particles`/`Grids` and the `HashGrid` neighbor-search subsystems are NOT consumed
(MPM is f64 + a fixed 27-cell stencil, not neighbor-search).

**O-W7 extension (the `wp.float64()` taint workaround; conventions § L.5).** In
Warp 1.13.0, applying `wp.float64(v)` to a kernel-local variable taints `v`'s
inferred type to float64. The integer grid base node is derived via
`wp.int32(<float_base>)` (the float base is not reused as an int) and the
quadratic-B-spline weights + node offsets are packed into `wp.vec3d` indexed by
the pure-int stencil loop variable — never `wp.float64(di)` on a variable also
used as an int index. (Discovered at this sub-phase Stage 0; applied throughout.)

## 6. Verification posture — GOLDEN-only gate-4 (NO MMS)

Gate-4 is golden-table-only (S1a-ME1; the Stack-D / sph-water pattern, NOT LBM's
dual-arm): `tests/test_quadratic_bspline_golden.py` reproduces the MLS-MPM
quadratic B-spline `N(x)` samples + partition-of-unity sums at
`tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json` at
`abs = 1e-15`. The closed-form piecewise quadratic is stack-agnostic (no
FP-accumulation surface). There is no MMS arm (no manufactured solution for the
MLS-MPM elastodynamics at this scope). Gates 5–13 GREEN at Stage 1a (the Stage-1a
checkpoint § 8 gate table); gate-14 cross-stack equivalence is deferred to
Stage 1c (§ 9).

### 6.6 PBT-covered invariants

Two (spec `spec-ref.md` § 6.6, ported verbatim): `mass_conservation_p2g_g2p`
(P2G round-trip preserves total mass via partition-of-unity) +
`partition_of_unity_b_spline` (3-node B-spline weights sum to 1). Hypothesis 50
examples each.

## 7. Golden values / Manufactured solutions

Golden: `mls-mpm-shape-functions.json` (consumed read-only; no new table; the
same table Stack-D and Phase-1 consume). No MMS.

## 8. Determinism

`bit-exact-same-hw` at `device="cpu"` (over-achieves the spec `determinism.md`
`epsilon-same-stack-same-hw`). **D5 / banked precedent #8:** Warp's CPU backend
`wp.launch` executes serially over the launch dimension in a single thread, so
the P2G `wp.atomic_add` accumulation order is fixed and bit-exact run-to-run —
the Warp analog of Taichi `cpu_max_num_threads=1` / numba `parallel=False`, with
**no serialisation knob needed** (contrast the Stack-D port, which must pin
`cpu_max_num_threads=1`). `determinism.atomic_ops = True` (`wp.atomic_add` IS
used, serialised by the CPU serial launch). Every f64 accumulator + pure-literal
constant is seeded `wp.float64(...)`.

**R-A1 anchor (Stage 0 / Stage 1a).** The production `p2g` kernel reproduces the
Stage-0 Task-0.6 P2G-atomic-scatter verification digest
`a8f6e654…07ff1fe1` EXACTLY on the identical IC (6/6 bit-identical at Stage 0; the
Stage-1a `test_determinism.py::test_r_a1_anchor_reproduces_stage0_p2g_digest`
re-witnesses it). Gate-10 additionally witnesses full-sim content-equivalence
(`run_twice_and_diff` + `assert_deterministic_run`, `tolerance=0.0`). ICs are
substantively seeded (the blob sampler; not cosmetic).

## 9. Equivalence

Cross-stack content-equivalent against the Phase-1 NumPy+numba reference capture
`captures/mpm-ref/drop-impact-128cube-seed42-step500.{h5,json}` via
`compare_captures` at `relative = 1e-4, absolute = 0.0` (the `mpm` tolerance
category, resolved from `sim.category='hybrid-pg'` by the existing
`[overrides.mpm-multimaterial] category="mpm"`). **D7 REUSE (S-ME2): the override
already exists** (established by the Stack-D port at its Stage 1c) and
`compare_captures` keys on the LEFT/reference `sim.name="mpm-multimaterial"` — so
the Stack-E port REUSES it; **no new `tolerance.toml` row is added** (the FIRST
cross-stack port to skip the Stage-1c override edit, since it is the second port
for an already-overridden sim). Gate-14 executes at Stage 1c. **Prediction:**
`within_tolerance=True` at FP-round-off — the canonical drop-impact is a BOUNDED
rigid free-fall (plan-drafting Task 1.6: the blob does not deform within the
horizon → `F=I` → zero stress → near-uniform velocity), so the cross-stack diff
stays far below 1e-4 (methodology § 5.1 PRESENT-but-NOT-EXERCISED for the
atomic-scatter surface; the Stack-D pair landed ~24 orders below 1e-4). State
fields compared: `particle_pos`, `particle_vel`, `grid_mom`
(`particle_material_id` const-int). The RIGHT partner is
`captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.{h5,json}`
(produced at Stage 1b).

## 10. Diagnostics

Tier 1 `check_health` (NaN/Inf). Tier 2 — BOTH IC-5 (`check_count_invariance` +
`check_momentum_conservation_drift`, particle) AND IC-6
(`check_circulation_grid_mom_l1`, vector_field on the grid-momentum field).
Schema identical to the Phase-1 reference (4 keys).

## 11. Build and run

```
# Stack-E test surface (diagnostic tier; ~1 s):
uv run --package mpm-multimaterial-stack-e --extra dev python -m pytest packages/mpm-multimaterial-stack-e/tests/ -v
# Canonical capture (1M particles x 128^3 x 500; ~minutes; ~1 GiB LFS):
uv run --package mpm-multimaterial-stack-e python -c "from pathlib import Path; \
from mpm_multimaterial_stack_e.sim import sim_runner_seeded; \
sim_runner_seeded(42, Path('captures/mpm-multimaterial-stack-e'))"
```

## 12. References

See § 2. Cross-stack methodology: `docs/conventions/cross-stack-equivalence-methodology.md`
(IC-15 PARTIAL); architecture § 2.5 (IC-13) + § 2.6 (tolerance) + § 4.4
(CPU bit-exact / GPU epsilon-bounded) + Appendix D.6. common-warp § 1.9.1 socket
+ port-consumption guide: `docs/common/warp.md` § 6.

## 13. Productization status

Stack-E CPU reference port. GPU-arch determinism (`epsilon-bounded-cross-stack`
per spec § 4.4) + multi-material constitutive table: Phase-2+/Phase-3.
