# sph-water

> Phase 1 Stage 2 TDD bootstrap. Per charter § 7.7. Implementation
> deferred to Phase 2+.

**Category:** particle-fluids (spec § 5.4). Stack C (Vulkan).
**Variant:** `dfsph-bender-koschier-2015`.

**Summary.** Smoothed-particle-hydrodynamics water surface
simulation. Algorithm: DFSPH (Bender & Koschier 2015). Phase 0
vendored SPlisHSPlasH 2.16.1 at
[`references/SPlisHSPlasH/`](../../../../references/SPlisHSPlasH/);
this Stage 2 sim references the vendored kernel implementation but
**does not re-vendor** (charter R8 amendment + spec § 0.8).

See [`spec-ref.md`](./spec-ref.md), [`algebraic.md`](./algebraic.md).
