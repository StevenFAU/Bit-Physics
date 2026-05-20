# lattice-boltzmann-d3q19 — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows IC-10.

## 1. Scope

D3Q19 BGK lattice Boltzmann. Category `lattice` (spec § 5.7). Stack C
(Vulkan). Variant `bgk-d3q19-qian-1992`. Non-goals per charter
§ 7.9 + R8 amendment: Krüger 2017 vendored code (algebraic reference
only), Zou-He BCs, MRT (Phase 4+), differentiable LBM (Phase 4),
NanoVDB-backed sparse LBM (Phase 4).

## 2. Upstream and reference anchors

- **Qian, d'Humières & Lallemand 1992.** DOI 10.1209/0295-5075/17/6/001.
- **Krüger et al. 2017** *The Lattice Boltzmann Method: Principles
  and Practice*. ISBN 978-3-319-44649-3. **Citation-only**; companion
  code is NOT vendored at this phase (R8 amendment).

Algebraic anchor: [`algebraic.md`](./algebraic.md). D3Q19 derivation
at `tools/testkit/golden/derivations/d3q19.md`.

## 3. Algorithm

Per [`algebraic.md`](./algebraic.md) § 3: BGK collision + streaming
step. Macroscopic $\rho$ and $\mathbf{u}$ recovered via moments
(§ 4). Bounce-back walls (§ 5).

## 4. Algebraic form

See [`algebraic.md`](./algebraic.md). D3Q19 equilibrium golden table
at `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests.
**Phase 2+ contract:**

- C++ reference at `packages/lattice-boltzmann-d3q19/src/`.
- Python NumPy reference at
  `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/reference/`.
- `lattice_boltzmann_d3q19.sim.sim_runner_seeded`.

## 6. Verification posture

### 6.1 Code verification
**Method:** golden-value (D3Q19 equilibrium) + MMS (for streaming-
collision OOA via macroscopic moments).
**Fixture(s):**
- `tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`
  (Stage 2; this commit).
- The eulerian-smoke incompressible NS-2D MMS at
  `tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/`
  (the LBM macroscopic Chapman-Enskog moment of the discrete BGK
  scheme recovers incompressible NS, so the same MMS applies).

**Pass criterion:** Phase 2+ sim reproduces $f_{i}^{\mathrm{eq}}$ at
all 19 directions within `absolute = 1e-15`; observed OOA on the
NS-2D macroscopic moments matches the formal order
$p_{\mathrm{formal}} = 2$ within $\pm 0.5$ (BGK is space-second-order,
time-first-order — charter § 7.9 / spec § 5.7).

**Phase 1 state:** RED with `ModuleNotFoundError`.

### 6.2 Solution verification
**Method:** GCI on Taylor-Green vortex.
**Status:** declared, deferred.

### 6.3 Model validation
**Status:** NACA airfoil drag/lift (Phase 2+; published target
values per spec § 5.7).

### 6.4 Calculation validation
**Status:** Schäfer-Turek 2D cylinder benchmark — deferred (Phase 2+).

### 6.5 Gate status
Gates 1–3 exercised; 4–10 deferred.

### 6.6 PBT-covered invariants (≥ 2 per R9)

1. **`equilibrium_density_moment`** — $\sum_{i} f_{i}^{\mathrm{eq}} = \rho$ identically. PBT: random $(\rho, \mathbf{u})$, verify the sum within FP tolerance.
2. **`equilibrium_momentum_moment`** — $\sum_{i} \mathbf{c}_{i} f_{i}^{\mathrm{eq}} = \rho \mathbf{u}$ identically. PBT: random $(\rho, \mathbf{u})$, verify each component.

Implementation at `packages/lattice-boltzmann-d3q19/lattice_boltzmann_d3q19/invariants/`
(deferred).

## 7. Golden values / Manufactured solutions

D3Q19 equilibrium golden at
`tools/testkit/golden/tables/lattice/d3q19-equilibrium.json`. MMS
shared with eulerian-smoke per § 6.1.

## 8. Determinism

`bit-exact-effort-same-stack-same-hw`. Streaming + collision are
structurally deterministic; the "effort" caveat is subgroup ops in
optimized GPU implementations. See [`determinism.md`](./determinism.md).

## 9. Equivalence

Category `lbm` per `tools/testkit/equivalence/tolerance.toml`
(`relative = 1e-5`). See [`equivalence.md`](./equivalence.md).

## 10. Diagnostics

- Tier 1: `check_health`, `check_performance`, `check_determinism`.
- Tier 2 vector_field (IC-6) on macroscopic moments.

## 11. Build and run

```bash
(cd packages/lattice-boltzmann-d3q19 && PYTHONPATH=. python3 -m pytest tests/ -v)
```

## 12. References

- Qian, d'Humières & Lallemand 1992; Krüger 2017.
- Spec § 5.7, § 2.4, § 2.6, § 2.14.
- Charter § 7.9 + R8 amendment.

## 13. Productization status

```yaml
productization:
  web: false
  binary: true
  pypi: false
  render: true
  preprint: true
```
