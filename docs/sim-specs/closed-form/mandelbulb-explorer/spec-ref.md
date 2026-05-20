# mandelbulb-explorer — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. § 6 follows
> charter IC-10 (Roy 2005). FACT/INFERENCE-tagged per IC-9 discipline.

## 1. Scope

3D fractal distance estimator (Hart 1996 / Quilez 2009) for the
mandelbulb set under $z_{n+1} = z_n^p + c$ with canonical power
$p = 8$ and escape radius $R = 2$. Category `closed-form` (spec
§ 5.1). Variant: `quilez-p8`. Stack A → B. Non-goals: differentiable
DE, 3DGS reconstruction of fractal volumes (per spec § 5.1, "not a
research-active category").

## 2. Upstream and reference anchors

No vendored code at Phase 1; references are textual.

- **Quilez 2009.** <https://iquilezles.org/articles/mandelbulb/>.
- **Hart 1996.** DOI 10.1007/s003710050084 (*Visual Computer*).
- **Hart, Sandin, Kauffman 1989.** DOI 10.1145/74334.74363 (*SIGGRAPH*).

Algebraic anchor: [`algebraic.md`](./algebraic.md).

## 3. Algorithm

Per-pixel sphere-tracing of a ray through the fractal volume:

1. Compute ray origin and direction from camera + screen-space pixel.
2. At each ray-march step, evaluate the DE at the current point.
3. Advance by `DE` (the safe step size).
4. Terminate when either `DE < eps` (hit) or accumulated distance
   exceeds `max_ray_length` (miss).

The DE itself is the closed-form computation described in
[`algebraic.md`](./algebraic.md) §§ 2–3.

## 4. Algebraic form

Per [`algebraic.md`](./algebraic.md). The canonical golden table
(`tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json`)
encodes DE values at three independent anchor points (origin,
bounding-sphere on x-axis, far-field on x-axis), each derivable by
hand from the formula without any in-repo numerical iteration.

## 5. Implementation

**Phase 1 deliverable:** package scaffold + failing tests only.
**Phase 2+ implementation contract** (referenced by the IC-8 probe at
[`tools/testkit/probes/reports/mandelbulb-explorer.md`](../../../../tools/testkit/probes/reports/mandelbulb-explorer.md)):

- Python NumPy reference at
  `packages/mandelbulb-explorer/mandelbulb_explorer/reference/`
  with submodules `quilez.py` (DE), `iterate.py` (the iterated map),
  `march.py` (sphere-tracing loop).
- Common protocol declared in `mandelbulb_explorer.de.DistanceEstimator`.
- Sim wrapper at `mandelbulb_explorer.sim.sim_runner_seeded`
  matching the testkit `SimRunner` Protocol.
- Stack B WebGPU fragment-shader path at
  `packages/mandelbulb-explorer/src/`, consuming
  `@bit-physics/common-ts`.

## 6. Verification posture

This sim exercises the following Roy 2005 V&V levels:

### 6.1 Code verification
**Method:** golden-value.
**Fixture(s):**
- `tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json`
  (3 anchor points; each with ≥ 3 independent-reference anchors per
  spec § 2.4; verified by
  `tools/testkit/golden/generator/mandelbulb_de_samples.py`).

**Pass criterion:** DE values from the sim's Python reference at the
three anchor points (origin, bounding-sphere x-axis, far-field x-axis)
agree with the golden table within `absolute = 1e-12`,
`relative = 1e-13`.

**Phase 1 state:** test committed and failing with module-not-found
(`mandelbulb_explorer.reference` does not yet exist).

### 6.2 Solution verification
**Method:** none.
**Status:** not applicable. The sim has no PDE/discretization; the DE
itself is exact at the formula level.

### 6.3 Model validation
**Status:** not applicable. The mandelbulb is a mathematical artifact,
not a physical model.

### 6.4 Calculation validation
**Status:** not applicable (same rationale).

### 6.5 Gate status
- Gates 1, 2, 3 of spec § 3.5 exercised in this phase.
- Gates 4–10 deferred to the per-sim implementation phase.

### 6.6 PBT-covered invariants (≥ 2 per R9 amendment / spec § 2.14)

1. **`de_lower_bound_property`** — for every $c \notin \mathrm{set}$
   sampled by hypothesis, the DE value is a **lower bound** on the
   true distance from $c$ to the set: $DE(c) \le \mathrm{dist}(c, S)$.
   PBT: sample $c$ uniformly in the bounding box $[-2, 2]^3$;
   approximate $\mathrm{dist}(c, S)$ by exhaustive sampling on a coarse
   grid; assert $DE(c) \le \mathrm{dist}(c, S)$ within FP slack.
2. **`map_p8_z_inversion_symmetry`** — for the canonical $p = 8$ map,
   the iterated function $z^p$ is invariant under $\phi \to \phi +
   2\pi/p$ in the spherical coordinate. PBT: sample $z$ uniformly in
   $[-2,2]^3$; verify $z^p$ at $\phi$ and $\phi + \pi/4$ produce the
   same value within FP tolerance.

Implementation lives at
`packages/mandelbulb-explorer/mandelbulb_explorer/invariants/`
(deferred to Phase 2+; Stage 2 ships only the test stubs).

## 7. Golden values / Manufactured solutions

Golden table:
[`tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json`](../../../../tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json).
Derivation:
[`tools/testkit/golden/derivations/mandelbulb-de-samples.md`](../../../../tools/testkit/golden/derivations/mandelbulb-de-samples.md).
Generator:
[`tools/testkit/golden/generator/mandelbulb_de_samples.py`](../../../../tools/testkit/golden/generator/mandelbulb_de_samples.py).

No MMS.

## 8. Determinism

`bit-exact-same-hw`. See [`determinism.md`](./determinism.md).

## 9. Equivalence

Closed-form category default per
`tools/testkit/equivalence/tolerance.toml` (`relative = 1e-5`,
`absolute = 0.0`). See [`equivalence.md`](./equivalence.md).

## 10. Diagnostics

- Tier 1: `diagnostics.tier1.health.check_health`,
  `diagnostics.tier1.performance.check_performance`,
  `diagnostics.tier1.determinism.check_determinism`.
- Tier 2 closed_form (IC-7):
  `diagnostics.tier2.closed_form.check_output_stability`,
  `check_precision_sensitivity`,
  `check_bound_preservation`.

## 11. Build and run

Phase 1 — failing-tests only:

```bash
PYTHONPATH=packages/mandelbulb-explorer python -m pytest packages/mandelbulb-explorer/tests/ -v
```

## 12. References

- Quilez, I. (2009), op. cit.
- Hart, J. C. (1996), op. cit.
- Hart, J. C., Sandin, D. J., & Kauffman, L. H. (1989), op. cit.
- Hubbard, J. H. & Douady, A. (1985), "Iteration of complex
  quadratic polynomials" (Hubbard–Douady DE in 2D).
- Spec § 5.1, § 2.4 (golden anchors), § 2.6 (tolerance), § 2.14 (PBT),
  § 8.2 (spec template).
- Charter § 7.4 (closed-form pair), § 3.8 (IC-8), § 3.10 (IC-10).

## 13. Productization status

```yaml
productization:
  web: true       # 5.1 — Stack B WebGPU sim ships as a web demo
  binary: false   # 5.2 — Stack B only; no C++ binary
  pypi: false     # 5.3 — Stack B only; no PyPI package
  render: true    # 5.4 — offline render of fractal slice
  preprint: false # 5.5 — not research-active
```
