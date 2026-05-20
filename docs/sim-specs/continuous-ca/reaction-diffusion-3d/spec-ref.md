# reaction-diffusion-3d — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows
> charter IC-10.

## 1. Scope

3D Gray-Scott reaction-diffusion. Category `continuous-CA` (spec
§ 5.2.1). Stack C (Vulkan compute + iso-surface ray-march).
Variant `gray-scott-3d`. Non-goals: 2D (Phase 0); differentiable
parameter ID (Phase 4+); Lenia / Neural CA (Phase 4+).

## 2. Upstream and reference anchors

- **Gray & Scott 1983.** DOI 10.1016/0009-2509(84)87017-7.
- **Pearson 1993.** DOI 10.1126/science.261.5118.189.
- **Roy 2005** (V&V): DOI 10.1016/j.jcp.2004.10.017 (MMS framework).

Algebraic anchor: [`algebraic.md`](./algebraic.md). MMS anchor:
[`tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`](../../../../tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/).

## 3. Algorithm

Explicit forward Euler in time + 7-point Laplacian in space, periodic
BCs. See [`algebraic.md`](./algebraic.md) § 2.

## 4. Algebraic form

See [`algebraic.md`](./algebraic.md). The MMS source-term derivation
is at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/derivation.md`.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests only.
**Phase 2+ implementation contract:**

- C++ reference at `packages/reaction-diffusion-3d/src/` (Vulkan
  compute shader + C++ driver).
- Python NumPy reference at `packages/reaction-diffusion-3d/reaction_diffusion_3d/reference/`
  consuming `common-cpp` via the IC-1 Reader/Writer for capture I/O.
- `reaction_diffusion_3d.sim.sim_runner_seeded` matching testkit
  `SimRunner`.

## 6. Verification posture

This sim exercises the following Roy 2005 V&V levels:

### 6.1 Code verification
**Method:** MMS (3D Gray-Scott).
**Fixture(s):** `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/solution.py`.
**Pass criterion:** Observed order of accuracy (OOA) from a 3-grid
convergence study matches the formal order $p_{\mathrm{formal}} = 2$
within $\pm 0.5$ (per spec § 2.2).
**Phase 1 state:** test committed and failing with module-not-found
(`reaction_diffusion_3d.reference` does not yet exist).

### 6.2 Solution verification
**Method:** GCI on the canonical capture.
**Status:** declared, deferred to per-sim implementation phase.

### 6.3 Model validation
**Status:** not applicable. Gray-Scott is a demonstration sim
(spec § 5.2.1).

### 6.4 Calculation validation
**Status:** not applicable.

### 6.5 Gate status
- Gates 1, 2, 3 of spec § 3.5 exercised.
- Gates 4–10 deferred.

### 6.6 PBT-covered invariants (≥ 2 per R9)

1. **`monotone_bounds`** — $u, v \in [0, 1]$ at every step under
   the canonical IC + parameters; PBT samples random IC inside the
   bounding box and a small number of steps, asserts the bounds
   hold (Phase 0's RD-2D invariant generalizes verbatim).
2. **`periodic_bc_satisfied`** — opposite-boundary values agree to
   machine precision under the periodic-BC stencil.

Implementation at `packages/reaction-diffusion-3d/reaction_diffusion_3d/invariants/`
(deferred).

## 7. Golden values / Manufactured solutions

MMS at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_3d/`.
The co-bundled RD-2D MMS is at
`tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/`
per charter R8 amendment (Phase 0 RD-2D lacks an MMS gate; the 2D
MMS lands here so Phase 2+ implementations of either dimension share
the same code-verification structure).

No closed-form golden table at this phase (chaotic pattern formation).

## 8. Determinism

`bit-exact-same-stack-same-hw`. Stack C explicit (no atomic scatter
in the 7-point stencil; per-cell read-only neighbors). See
[`determinism.md`](./determinism.md).

## 9. Equivalence

Category `reaction-diffusion` default per
`tools/testkit/equivalence/tolerance.toml` (`relative = 1e-4`,
`absolute = 0`). See [`equivalence.md`](./equivalence.md).

## 10. Diagnostics

- Tier 1: `check_health`, `check_performance`, `check_determinism`.
- Tier 2 scalar_field: `check_bounds`, `check_conservation`
  (advisory — Gray-Scott is non-conservative, drift reported).
- Optionally Tier 2 vector_field (IC-6) on gradient fields for
  visualization checks.

## 11. Build and run

Phase 1 — failing-tests only:

```bash
(cd packages/reaction-diffusion-3d && PYTHONPATH=. python3 -m pytest tests/ -v)
```

Phase 2+ adds the C++ build (CMake) + Vulkan local invocation.

## 12. References

- Gray & Scott 1983, Pearson 1993, op. cit.
- Roy 2005 (V&V), op. cit.
- Spec § 5.2.1, § 2.2 (MMS), § 2.4, § 2.6, § 2.14.
- Charter § 7.6 (RD-3D card), R8 amendment (RD-2D MMS co-bundle).

## 13. Productization status

```yaml
productization:
  web: false      # Stack C, not web
  binary: true    # 5.2 — Stack C binary release
  pypi: false
  render: true    # 5.4 — offline iso-surface render
  preprint: true  # 5.5 — extends the Pearson-1993 demonstration
```
