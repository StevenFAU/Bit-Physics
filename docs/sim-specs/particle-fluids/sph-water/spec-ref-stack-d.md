# sph-water — Stack-D Reference Spec

> **Stack-D (Taichi-DSL / CPU) port** of the Phase-1 `sph-water` reference.
> Sibling to [`spec-ref.md`](spec-ref.md) (the Phase-1 NumPy reference,
> `stack.name="numpy-reference"`). Second per-sim cross-stack port under
> spec-Phase-2. Authored at sub-phase-sph-water-stack-d Stage 1b.

## 1. Scope

A content-equivalent Taichi-DSL CPU port of the DFSPH (Bender & Koschier 2015)
dam-break reference. Reproduces the Phase-1 canonical capture descriptor
`dam-break-100K-particles-seed42-step1000` and is diffed cross-stack against the
NumPy-reference capture at `relative = 1e-4, absolute = 0.0` (the `sph` tolerance
category; gate 14, Stage 1c). The spec-designated Stack-C (Vulkan) primary remains
a Phase-2+ forward contract; the frozen diff partner here is the Phase-1 CPU
reference (probe § 9 F1).

## 2. Upstream and reference anchors

- 3D Monaghan cubic-spline kernel: Monaghan (1992), *Annu. Rev. Astron.
  Astrophys.* 30, 543; Monaghan (2005), *Rep. Prog. Phys.* 68 (8), 1703,
  DOI 10.1088/0034-4885/68/8/R01, Eq. (2.7).
- DFSPH continuity / density: Bender & Koschier (2015), *SCA '15*, 147–155,
  DOI 10.1145/2786784.2786796, Eq. (5).
- Reference-implementation cross-check: SPlisHSPlasH (manifest SHA
  `6bff55a6eaf14083d34650f22a268ce156b62b54`).
- Stack-B (Phase-1) anchor: [`spec-ref.md`](spec-ref.md); the kernel math here is
  **re-derived from the upstream sources, not copied** from the sealed Phase-1
  module.
- Taichi-DSL substrate: `docs/common/taichi.md` (IC-12); `common_py.determinism`
  (IC-11).

## 3. Algorithm

DFSPH dam-break. The Phase-1 reference *trajectory* is a deliberately-simple
**explicit (semi-implicit) Euler** integrator under gravity (`g_z`) with the SPH
continuity computed as a per-step diagnostic side-effect; there is **no iterative
pressure solve in the capture-producing path** (the divergence-free / constant-
density correctors exist only for the gate-4b golden). The Stack-D port mirrors
this exactly: per step, build the spatial hash, compute SPH density (cubic-spline
sum), then `v_z += g_z·dt; p += dt·v`. Because every particle shares the same
`v_z`, the cloud free-falls **rigidly** (relative positions invariant), so the SPH
density is static across frames.

## 4. Algebraic form

- Kernel: `W(q, h) = sigma_3 / h^3 · f(q)`, `sigma_3 = 1/pi`, compact support
  `q < 2`. `f(q) = 1 - 1.5 q^2 + 0.75 q^3` (q<1); `0.25 (2-q)^3` (1<=q<2); 0 else.
- Density: `rho_i = m_i·sigma_3/h^3 + sum_{j!=i, q<2} m_j·sigma_3/h^3·f(q)`
  (self-term included; matches the Phase-1 `_density_jit_inner` convention).
- Continuity (gate-4b golden): `drho_i/dt = sum_j m_j (v_i - v_j) . grad_i W`.
- Integrator: `v_z <- v_z + g_z·dt`; `p <- p + dt·v`.

## 5. Implementation

- **Path:** `packages/sph-water-stack-d/sph_water_stack_d/`.
- `reference/dfsph_taichi.py` — pure-Python golden surface (`W`,
  `grad_W_magnitude`, `grad_W`, `density`, `density_evolution`, `neighbor_lists`,
  `canonical_params`, `SIGMA_3D`) + Taichi-DSL spatial-hash kernels (`_build_grid`,
  `_compute_density`, `_integrate`; cell = 2h cutoff, 27-cell stencil).
- `sim.py` — `sim_runner_seeded` (canonical 100K × 1000), `sim_runner_diagnostic`
  (64 × 8, seed-propagating), `compute_diagnostic_trajectory`, `neighbor_lists_at`.
- `invariants.py` — `density_nonneg`, `kernel_normalization_unit_volume`.
- **Public exports:** consumed by `tests/` per the Stage-1a RED contract.
- Neighbor search is inlined in the port (phase-2-plan Rule I3); NOT added to
  common-py.

## 6. Verification posture

Code verification is **golden-table-based — NOT MMS** (SPH is a particle method
without a manufactured-solution gate; spec-ref § 7). The single largest gate-level
delta from the RD-2D Stack-D template.

- **Gate 4a — cubic-spline-kernel golden** (`tools/testkit/golden/tables/cubic-spline-kernel.json`;
  9 fixture points; `abs = 1e-12`): `dfsph_taichi.W` / `grad_W_magnitude` reproduce
  the table exactly (pure-Python f64; observed error 0.0).
- **Gate 4b — DFSPH density-evolution golden** (`.../particle-fluids/dfsph-density-evolution.json`;
  3 anchors; `abs = 1e-15`): `density` / `density_evolution` reproduce
  `rho_0 = 0.5470951168783902`, `drho_dt_0 = -0.2984155182973038` exactly.
- Gates 5/6 (Tier 1 + Tier 2 particle), 10 (determinism), 11 (PBT) GREEN; see
  `tests/`.

### 6.6 PBT-covered invariants

1. `density_nonneg` — SPH density non-negative for any valid config.
2. `kernel_normalization_unit_volume` — a unit-mass particle alone gives
   `rho = sigma_3/h^3` exactly; sweeps h for the `h^-3` scaling.

(Exactly 2, ported verbatim from the Phase-1 reference — NOT 3 like RD-2D.)

## 7. Golden values / Manufactured solutions

No MMS. Golden tables only (§ 6). Anchors: `W(0,1) = sigma_3 = 0.3183098861837907`;
`W(0.5,1) = 0.22878523069459955`; `rho_0 = 0.5470951168783902`;
`drho_dt_0 = -0.2984155182973038`.

## 8. Determinism

**Claim: `bit-exact-same-hw` at `arch="cpu"`** (the zero-tolerance same-stack
special case of IC-13); witnessed by gate-10 `run_twice_and_diff`
(`content_equivalent == True`). Mechanism: `set_taichi_deterministic(arch="cpu")`
pins `cpu_max_num_threads=1`, serialising the spatial-hash `ti.atomic_add` cell-
insertion (insertion order == particle-id order — Stage-0 R-S2 derisk), so it is
**NOT** an epsilon-class atomic-scatter source (spec § 2.5); `determinism.atomic_ops
= False`. No in-kernel reductions in the per-particle loop. f64 via f64-typed
`ti.types.ndarray` args + direct f64-ndarray accumulation (no `default_fp` IC-11
edit; Stage-0 banked requirement). Phase-2+ deferred: GPU arch determinism; FMA
fusion; subgroup-collectives.

## 9. Equivalence

Gate 14 (Phase-2 14th gate) diffs the Stack-D canonical capture against the NumPy-
reference capture via `compare_captures` at `relative = 1e-4, absolute = 0.0`
(`sph` category, resolved from `sim.category="particle-fluids"` by the MANDATORY
`[overrides.sph-water] category="sph"` entry — D6; added at Stage 1c, without which
`compare_captures` raises `KeyError`, confirmed at Stage-0 Task 0.4). The per-field
per-frame witness + step-horizon analysis are authored into
[`equivalence.md`](equivalence.md) at Stage 1c regardless of pass/fail (R-S1; no
silent widening). The positions/velocities are explicit-Euler free-fall (match the
reference to FP); the density is the static SPH sum (matches the reference
`_density_jit_inner` to FP-accumulation order ~1e-9). Empirical disposition is a
Stage-1c deliverable.

## 10. Diagnostics

Tier 1 (NaN/Inf health) over the captured frames; Tier 2 particle (IC-5):
`count_invariance`, `no_overlap`, `neighbor_list_integrity`, and
`momentum_conservation` (**advisory** — DFSPH + gravity is not strictly
momentum-conserving). Diagnostic-tier trajectory: 64 particles × 8 steps.

## 11. Build and run

```
# Run the Stack-D test surface:
uv run pytest --rootdir=packages/sph-water-stack-d packages/sph-water-stack-d/tests/ -v
# Re-derive the Stack-D canonical capture (~4-5 min, 100K x 1000 steps):
uv run python -c "from pathlib import Path; from sph_water_stack_d.sim import sim_runner_seeded; print(sim_runner_seeded(42, Path('captures/sph-water-stack-d')))"
```

## 12. References

Monaghan 1992; Monaghan 2005 (DOI 10.1088/0034-4885/68/8/R01); Bender & Koschier
2015 (DOI 10.1145/2786784.2786796); SPlisHSPlasH (`6bff55a6…`).

## 13. Productization status

Research / reference port. Stack-D (Taichi-DSL CPU) is the spec-Phase-2 cross-stack
validation target; the Stack-C (Vulkan) primary is a Phase-2+ forward contract.
Gate 14 cross-stack equivalence verdict lands at Stage 1c.
