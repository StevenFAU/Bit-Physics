# eulerian-smoke

> Phase 1 Stage 2 TDD bootstrap. Per charter § 7.8. Implementation
> deferred to Phase 2+.

**Category:** volumetric-grid (spec § 5.6). Stack C (Vulkan).
**Variant:** `stam-fedkiw-stable-fluids`.

**Summary.** Eulerian smoke / fluid solver: semi-Lagrangian advection
with MacCormack correction, vorticity confinement (Fedkiw), Jacobi
pressure projection. The "Stam stable-fluids stack" — canonical
production reference for grid-based incompressible-NS fluid sims.

See [`spec-ref.md`](./spec-ref.md), [`algebraic.md`](./algebraic.md).
