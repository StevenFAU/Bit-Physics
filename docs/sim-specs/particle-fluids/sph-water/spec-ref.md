# sph-water — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows
> IC-10.

## 1. Scope

DFSPH water sim with screen-space rendering. Category
`particle-fluids` (spec § 5.4). Stack C (Vulkan). Variant
`dfsph-bender-koschier-2015`. Non-goals: differentiable SPH,
3DGS-coupled SPH, flow-map SPH (Phase 4+); 2D variant; rigid-body
coupling (Phase 2+).

## 2. Upstream and reference anchors

- **SPlisHSPlasH 2.16.1** vendored at
  `references/SPlisHSPlasH/`, manifest SHA `6bff55a6eaf14083d34650f22a268ce156b62b54`
  (verified at this commit per playbook P4 against
  `references/SPlisHSPlasH/MANIFEST.toml`). License MIT, file at
  `references/SPlisHSPlasH/LICENSE`. Kernel source at
  `references/SPlisHSPlasH/SPlisHSPlasH/SPHKernels.h`.
- **Bender & Koschier 2015** (DFSPH). DOI 10.1145/2786784.2786796.
- **Monaghan 1992, 2005** (SPH baseline). DOI 10.1146/annurev.aa.30.090192.002551 ;
  DOI 10.1088/0034-4885/68/8/R01.

Algebraic anchor: [`algebraic.md`](./algebraic.md).

## 3. Algorithm

Per [`algebraic.md`](./algebraic.md): SPH neighbor query → DFSPH
divergence-free solver → DFSPH constant-density solver → integrate
position + velocity. Screen-space rendering of the resulting particle
field.

## 4. Algebraic form

See [`algebraic.md`](./algebraic.md). Discrete continuity equation
verified at the two-particle DFSPH golden.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests only.
**Phase 2+ implementation contract:**

- C++ reference at `packages/sph-water/src/` (Vulkan compute +
  driver, consuming the vendored SPlisHSPlasH kernels via PIMPL
  bridge or direct include).
- Python NumPy reference at `packages/sph-water/sph_water/reference/`
  for the small-N closed-form anchor.
- `sph_water.sim.sim_runner_seeded` matching testkit `SimRunner`.

## 6. Verification posture

### 6.1 Code verification
**Method:** golden-value (Phase 0 cubic-spline-kernel + the new
DFSPH density-evolution golden in this commit).
**Fixture(s):**
- `tools/testkit/golden/tables/cubic-spline-kernel.json` (Phase 0,
  unchanged).
- `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json`
  (Stage 2, this commit).

**Pass criterion:** sim's reference at the two-particle fixture
reproduces $\rho_{0}$, $d\rho_{0}/dt$ within `absolute = 1e-15`.

**Phase 1 state:** test RED with `ModuleNotFoundError` on
`sph_water.reference`.

### 6.2 Solution verification
**Method:** GCI on a converging-resolution dam-break or rotating-
bucket study (declared, deferred to per-sim implementation phase).

### 6.3 Model validation
**Status:** declared. Comparison against SPlisHSPlasH reference
renders / SPlisHSPlasH benchmark scenarios (dam-break, drop-on-pool).

### 6.4 Calculation validation
**Status:** declared, deferred. Standard SPH benchmarks: dam-break
height vs. time, rotating-bucket free-surface shape.

### 6.5 Gate status
- Gates 1, 2, 3 of spec § 3.5 exercised.
- Gates 4–10 deferred.

### 6.6 PBT-covered invariants (≥ 2 per R9)

1. **`density_nonneg`** — for any valid particle configuration,
   $\rho_{i} \ge 0$ at every particle. PBT: random IC, verify each
   density.
2. **`kernel_normalization_unit_volume`** — at any particle position,
   the kernel volume integral evaluates to unity within the discrete
   neighbor support; PBT samples random positions and verifies the
   normalized sum $\sum_{j} m_{j} W \approx \rho_{0}$ for a uniform
   reference configuration (within FP tolerance set by the
   `particle-fluids` category in tolerance.toml).

Implementation at `packages/sph-water/sph_water/invariants/`
(deferred).

## 7. Golden values / Manufactured solutions

- Phase 0's `cubic-spline-kernel.json` (kernel evaluation; UNCHANGED).
- This commit: `dfsph-density-evolution.json` (Stage 2, charter § 7.7).

No MMS — SPH is a particle method without a manufactured-solution
gate; convergence is governed by particle count + smoothing length.

## 8. Determinism

`epsilon-same-stack-same-hw` (atomic scatter-add in the neighbor
accumulator). See [`determinism.md`](./determinism.md).

## 9. Equivalence

Category `sph` defaults per `tools/testkit/equivalence/tolerance.toml`
(`relative = 1e-4`, `absolute = 0`). See
[`equivalence.md`](./equivalence.md).

## 10. Diagnostics

- Tier 1: `check_health`, `check_performance`, `check_determinism`.
- Tier 2 particle (IC-5): `check_no_overlap` (with epsilon set to
  half the particle spacing), `check_neighbor_list_integrity`,
  `check_momentum_conservation` (advisory — DFSPH is not strictly
  momentum-conserving due to numerical viscosity), `check_count_invariance`.

## 11. Build and run

```bash
(cd packages/sph-water && PYTHONPATH=. python3 -m pytest tests/ -v)
```

Per charter shift #15: Stack C TDD bootstrap uses pytest; per-sim
implementation phase adds Vulkan/CMake.

## 12. References

- Monaghan 1992, 2005; Bender & Koschier 2015; SPlisHSPlasH (vendored).
- Spec § 5.4, § 2.4, § 2.6, § 2.14, § 0.8.
- Charter § 7.7 + R8 amendment.

## 13. Productization status

```yaml
productization:
  web: false
  binary: true    # 5.2 — Stack C binary release
  pypi: false
  render: true    # 5.4 — screen-space rendered offline
  preprint: true  # 5.5 — DFSPH demonstration scene
```
