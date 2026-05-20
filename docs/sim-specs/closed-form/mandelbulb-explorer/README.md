# mandelbulb-explorer

> Phase 1 Stage 2 TDD bootstrap. Per charter § 7.4. Sim implementation
> deferred to a per-sim implementation phase per spec § 2.5.

**Category:** closed-form (spec § 5.1). Stack A → B (Phase 1: Stack B
target only). Paired with [strange-attractors](../strange-attractors/)
in the closed-form Stage 2 commit per charter § 4.3.

**Summary.** A 3D analog of the Mandelbrot set (Hart 1996 / Quilez
2009 distance estimator for sphere-traced ray marching). The DE
evaluates the iterated map $z_{n+1} = z_n^p + c$ in spherical
coordinates with $p = 8$ until $|z| > R$ (escape radius) or the
iteration cap is hit; the distance is then estimated from the local
derivative via the standard Hubbard–Douady / Hart formula.

The "closed-form" label captures that the sim is pure pixel-shader
evaluation: given a ray origin and direction, the DE returns a
real-valued distance estimate. There is no time-step PDE. Code
verification is by golden values at fixed sample points.

**Bundled deliverables (Phase 1 Stage 2):**

- `spec-ref.md` — 13-section reference spec; § 6 follows IC-10.
- `algebraic.md` — DE derivation citing Hart 1996 and Quilez 2009.
- `determinism.md` — bit-exact same-hw.
- `equivalence.md` — Stack A → B cross-stack tolerance row.
- Per-sim package at `packages/mandelbulb-explorer/`.
- Pre-implementation probe at `tools/testkit/probes/reports/mandelbulb-explorer.md` per IC-8.
- Golden table at `tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json`
  with derivation at `tools/testkit/golden/derivations/mandelbulb-de-samples.md`
  and generator at `tools/testkit/golden/generator/mandelbulb_de_samples.py`.
- Legacy-capture placeholder at
  `tests/fixtures/legacy-captures/mandelbulb-explorer-ref.{h5,json}`.

**See also:** [`spec-ref.md`](./spec-ref.md),
[`docs/sim-specs/closed-form/strange-attractors/`](../strange-attractors/),
[charter § 7.4](../../../phases/phase-1-plan.md).
