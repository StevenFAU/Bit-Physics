# strange-attractors

> Phase 1 Stage 2 TDD bootstrap. Per charter § 7.4. Sim implementation
> deferred to a per-sim implementation phase per spec § 2.5.

**Category:** closed-form (spec § 5.1) — render-only artifacts with no
time-evolution PDE. Stack A → B (this phase: Stack B only).

**Summary.** A family of classical 3D dynamical systems (Lorenz 1963,
Rössler 1976, Aizawa, Pickover, Sprott) whose trajectories form
strange attractors. Each system is a continuous-time autonomous ODE
$\dot{\mathbf{x}} = f(\mathbf{x};\boldsymbol{\theta})$ integrated via
RK4 with fixed step size. Visualization is point-cloud / polyline
sweeping over time. The "closed-form" label denotes that there is no
manufactured-solution gate (no PDE discretization) — code verification
is by golden values derived from algebraic / structural invariants of
each system (fixed points, Jacobian eigenvalues at fixed points,
short-time Taylor expansion of the flow).

**Bundled deliverables (Phase 1 Stage 2):**

- `spec-ref.md` — 13-section reference spec; § 6 follows IC-10.
- `algebraic.md` — ODE definitions for each canonical attractor, with
  canonical parameter choices and citations.
- `determinism.md` — bit-exact same-hw (closed-form has no atomic
  reductions or subgroup ops).
- `equivalence.md` — Stack A → B cross-stack tolerance row.
- Per-sim package at `packages/strange-attractors/`.
- Pre-implementation probe at `tools/testkit/probes/reports/strange-attractors.md` per IC-8.
- Golden table at `tools/testkit/golden/tables/closed-form/lorenz-structural.json`
  with generator at `tools/testkit/golden/generator/lorenz_structural.py`
  and derivation at `tools/testkit/golden/derivations/lorenz-structural.md`.
- Legacy-capture placeholder at
  `tests/fixtures/legacy-captures/strange-attractors-ref.{h5,json}`.

**Render placeholder:** none in this phase. Phase 2 (cross-stack
replication) and Phase 5.4 (offline render) populate.

**Web demo placeholder:** none in this phase. Phase 5.1 populates.

**Academic preprint placeholder:** none planned (spec § 5.1 "not a
research-active category").

**See also:** [`spec-ref.md`](./spec-ref.md), [charter § 7.4](../../../phases/phase-1-plan.md).
