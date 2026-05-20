# boids-3d

> Phase 1 Stage 2 TDD bootstrap. Per charter § 7.5. Implementation
> deferred to Phase 2+ per spec § 2.5.

**Category:** agent-based (spec § 5.3). Stack B (WebGPU).

**Summary.** 3D boids flocking under Reynolds 1987's three rules
(separation, alignment, cohesion). Agents are individual entities;
state per agent is `(position, velocity)`. The flock emerges from
local-rule interactions within a perception radius. Stack B compute
shader runs the velocity update; Stack B render pass draws the flock.

See [`spec-ref.md`](./spec-ref.md), [`algebraic.md`](./algebraic.md),
[charter § 7.5](../../../phases/phase-1-plan.md), and the paired
[physarum sim](../physarum/).
