# eulerian-smoke — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows IC-10.

## 1. Scope

Stam-Fedkiw Eulerian smoke. Category `volumetric-grid` (spec § 5.6).
Stack C (Vulkan). Variant `stam-fedkiw-stable-fluids`. Non-goals:
flow-map family (Clebsch-PFM, EDGE, VPFM, Cirrus, Leapfrog — all
Phase 4); NanoVDB / quadtree; Gaussian fluids / neural particle
level set / 3DGS-coupled smoke (Phase 4).

## 2. Upstream and reference anchors

- **Stam 1999.** DOI 10.1145/311535.311548.
- **Fedkiw, Stam, Jensen 2001.** DOI 10.1145/383259.383260.
- **Taylor & Green 1937.** DOI 10.1098/rspa.1937.0036.

Algebraic anchor: [`algebraic.md`](./algebraic.md). MMS anchor:
[`tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`](../../../../tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/).

## 3. Algorithm

Per [`algebraic.md`](./algebraic.md) § 2: advect → diffuse → vorticity-
confine → project → advect scalar.

## 4. Algebraic form

See [`algebraic.md`](./algebraic.md). MMS source-term derivation in
the linked MMS directory.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests.
**Phase 2+ contract:**

- C++ reference at `packages/eulerian-smoke/src/`.
- Python NumPy reference at `packages/eulerian-smoke/eulerian_smoke/reference/`.
- `eulerian_smoke.sim.sim_runner_seeded`.

## 6. Verification posture

### 6.1 Code verification
**Method:** MMS (Taylor-Green-style 2D NS) for advection-projection
OOA + IC-6 divergence-free check post-projection.
**Fixture(s):** `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/solution.py`.
**Pass criterion:** observed OOA matches formal order $p = 2$ within
$\pm 0.5$ (semi-Lagrangian MacCormack; pressure-projection gradient).
**Phase 1 state:** RED with `ModuleNotFoundError`.

### 6.2 Solution verification
**Method:** GCI on a 3-grid converging study of the canonical capture.
**Status:** declared, deferred.

### 6.3 Model validation
**Status:** declared. Comparison against Stam / Fedkiw demonstration
scenes.

### 6.4 Calculation validation
**Status:** declared, deferred. Decay-of-decaying-turbulence (Phase 2+).

### 6.5 Gate status
Gates 1–3 exercised this phase; 4–10 deferred.

### 6.6 PBT-covered invariants (≥ 2 per R9)

1. **`divergence_free_post_projection`** — for any IC, after one full
   pressure-projection step, the divergence of $\mathbf{u}$ is below
   the IC-6 divergence-free tolerance. PBT: random divergent IC,
   single projection, verify.
2. **`smoke_density_nonneg`** — the scalar density $\phi$ remains
   $\ge 0$ at every cell across an arbitrary step count under the
   semi-Lagrangian advection. PBT: random non-negative IC, random
   step count.

Implementation at `packages/eulerian-smoke/eulerian_smoke/invariants/`
(deferred).

## 7. Golden values / Manufactured solutions

MMS at `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`.
No closed-form golden table.

## 8. Determinism

`epsilon-same-stack-same-hw` (pressure-projection iterations involve
parallel reductions; Jacobi sweeps depend on bucket iteration order
at the boundary of solver-convergence). See
[`determinism.md`](./determinism.md).

## 9. Equivalence

Category `smoke` per `tools/testkit/equivalence/tolerance.toml`
(`relative = 1e-4`). See [`equivalence.md`](./equivalence.md).

## 10. Diagnostics

- Tier 1: `check_health`, `check_performance`, `check_determinism`.
- Tier 2 vector_field (IC-6): `check_divergence_free` (post-projection
  divergence within tolerance), `check_circulation` (Kelvin's
  theorem advisory under vorticity-confinement), `check_helicity`,
  `check_energy_spectrum` (advisory).

## 11. Build and run

```bash
(cd packages/eulerian-smoke && PYTHONPATH=. python3 -m pytest tests/ -v)
```

## 12. References

- Stam 1999, Fedkiw 2001, Taylor & Green 1937, op. cit.
- Spec § 5.6, § 2.2 (MMS), § 2.6 (smoke tolerance), § 2.14.
- Charter § 7.8.

## 13. Productization status

```yaml
productization:
  web: false
  binary: true
  pypi: false
  render: true
  preprint: true
```
