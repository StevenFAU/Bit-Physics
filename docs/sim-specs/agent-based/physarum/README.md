# physarum

> Phase 1 Stage 2 TDD bootstrap. Per charter § 7.5. Paired with
> [boids-3d](../boids-3d/).

**Category:** agent-based (spec § 5.3). Stack B (WebGPU).

**Summary.** Jones 2010 mold-simulation algorithm: discrete-time
agents on a 2D/3D grid that **sense** ahead at three angles, **rotate**
toward the highest-trail neighbor, **move** forward, **deposit**
trail, then a global **diffuse-and-decay** step relaxes the trail
map. Chaotic by design: cross-stack equivalence is **distributional**
(EFECT-style histogram comparison or χ² on trail-density), not
trajectory-bit-exact.

See [`spec-ref.md`](./spec-ref.md), [`algebraic.md`](./algebraic.md),
[charter § 7.5](../../../phases/phase-1-plan.md).
