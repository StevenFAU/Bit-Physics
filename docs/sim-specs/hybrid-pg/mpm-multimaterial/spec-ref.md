# mpm-multimaterial — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows IC-10.

## 1. Scope

MLS-MPM (Hu 2018) with multi-material constitutive models. Category
`hybrid-PG` (spec § 5.5). Stack D (Taichi). Variant
`mls-mpm-hu-2018-multimaterial`. Non-goals per charter § 7.10:
DiffMPM (Phase 4); sparse MPM (Phase 4); 3DGS-MPM (PhysGaussian etc.,
Phase 4); Stack E Warp port (Phase 2+).

## 2. Upstream and reference anchors

- **Hu et al. 2018.** DOI 10.1145/3197517.3201293.
- 88-line MLS-MPM reference (Hu yuanming-hu/taichi_mpm).
- **Steffen, Kirby & Berzins 2008.** DOI 10.1002/nme.2360.

Algebraic anchor: [`algebraic.md`](./algebraic.md). MLS-MPM B-spline
derivation at `tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md`.

## 3. Algorithm

Per [`algebraic.md`](./algebraic.md) § 1: P2G → grid update → G2P →
deformation gradient update.

## 4. Algebraic form

See [`algebraic.md`](./algebraic.md). Quadratic B-spline golden table
at `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests.
**Phase 2+ contract:**

- Python Taichi reference at `packages/mpm-multimaterial/mpm_multimaterial/reference/`
  consuming `common-py` Taichi GGUI / hotreload utilities (Stage 1
  surfaces, AS-COMMITTED at `bcd9cb2` per the Stage 1 final
  checkpoint).
- `mpm_multimaterial.sim.sim_runner_seeded` matching testkit
  `SimRunner` Protocol.

## 6. Verification posture

### 6.1 Code verification
**Method:** golden-value (quadratic B-spline) + MMS for the linear-
elasticity component.
**Fixture(s):**
- `tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`
  (this commit).
- (Deferred — Phase 2+ adds an MMS for the linear-elasticity update
  step.)

**Pass criterion:** sim reproduces the 1D quadratic-B-spline values
and the partition-of-unity sum within `absolute = 1e-15`.

**Phase 1 state:** RED with `ModuleNotFoundError`.

### 6.2 Solution verification
**Method:** grid convergence on cantilever-bending.
**Status:** declared, deferred.

### 6.3 Model validation
**Status:** Hu 2018 multi-material demonstration scenes (drop-impact,
multi-material slosh). Deferred to Phase 2+.

### 6.4 Calculation validation
**Status:** declared, deferred.

### 6.5 Gate status
Gates 1–3 exercised; 4–10 deferred.

### 6.6 PBT-covered invariants (≥ 2 per R9)

1. **`mass_conservation_p2g_g2p`** — for any random IC, the P2G → grid
   identity → G2P round-trip preserves total particle mass within
   FP tolerance. PBT: random particle positions/masses, single round
   trip, sum check.
2. **`partition_of_unity_b_spline`** — for any particle position $p$,
   the sum of $N(p - i)$ over the 3 neighboring grid nodes equals 1.
   PBT: random $p$, verify partition-of-unity.

Implementation at `packages/mpm-multimaterial/mpm_multimaterial/invariants/`
(deferred).

## 7. Golden values / Manufactured solutions

Quadratic B-spline golden at
`tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`.

## 8. Determinism

`epsilon-same-stack-same-hw`. P2G's atomic scatter-add breaks
bit-exactness even on identical hardware. See
[`determinism.md`](./determinism.md).

## 9. Equivalence

Category `mpm` per `tools/testkit/equivalence/tolerance.toml`
(`relative = 1e-4`). See [`equivalence.md`](./equivalence.md).

## 10. Diagnostics

- Tier 1: `check_health`, `check_performance`, `check_determinism`.
- Tier 2 particle (IC-5): `check_count_invariance`,
  `check_momentum_conservation` (advisory).
- Tier 2 vector_field (IC-6) on the grid momentum field.

## 11. Build and run

```bash
(cd packages/mpm-multimaterial && PYTHONPATH=. python3 -m pytest tests/ -v)
```

**Spec § 4.4 Taichi limitations** (documented per charter § 7.10):
1. F-key GGUI workaround handled in `common-py.ggui` (Stage 1 surface
   AS-COMMITTED at `bcd9cb2`).
2. Atomic-add precision: f64 grid recommended for canonical reference.
3. Hot-reload via `common-py.hotreload` (Stage 1 surface).

## 12. References

- Hu et al. 2018; Steffen-Kirby-Berzins 2008; 88-line reference.
- Spec § 5.5, § 4.4, § 2.4, § 2.6, § 2.14.
- Charter § 7.10.

## 13. Productization status

```yaml
productization:
  web: false
  binary: false
  pypi: true     # 5.3 — Stack D PyPI package
  render: true
  preprint: true
```
