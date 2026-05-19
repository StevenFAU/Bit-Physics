# Reaction-diffusion 2D (Gray-Scott) — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2.

## 1. Scope

Two-species reaction-diffusion sim on a periodic 2D grid (Gray-Scott).
Category: `continuous-ca`. Variant: `gray-scott`. Non-goals: 3D
extension (Phase 1+), differentiable variant (Phase 4+).

## 2. Upstream and reference anchor

- Gray, P. & Scott, S. K. (1983). *Autocatalytic reactions in the
  isothermal, continuous stirred tank reactor.* Chem. Eng. Sci. 39 (6),
  1087-1097. DOI 10.1016/0009-2509(84)87017-7.
- Pearson, J. E. (1993). *Complex patterns in a simple system.* Science
  261 (5118), 189-192. DOI 10.1126/science.261.5118.189.

Algebraic anchor: `algebraic.md` § 1-3.

## 3. Algorithm

Explicit forward Euler in time + 5-point Laplacian in space, with
periodic boundary conditions. The lambda canonical parameters
(F = 0.0367, k = 0.0649, Du = 0.16, Dv = 0.08, dx = 1.0, dt = 1.0)
sit in Pearson's λ region; pattern formation is self-replicating spots.

See `algebraic.md` § 4 for the discretized update.

## 4. Algebraic form

See `algebraic.md` § 1-3. The continuous PDE is

$$U_t = D_u \nabla^2 U - U V^2 + F (1 - U),$$
$$V_t = D_v \nabla^2 V + U V^2 - (F + k) V.$$

The forward-Euler 5-point discretization is `algebraic.md` § 4.

## 5. Implementation

- Python NumPy reference:
  `packages/reaction-diffusion-2d/reaction_diffusion_2d/reference/gray_scott_numpy.py`.
- Python sim wrapper (SimRunner / SimRunnerPBT protocols):
  `packages/reaction-diffusion-2d/reaction_diffusion_2d/sim.py`.
- WebGPU implementation (Stack B):
  `packages/reaction-diffusion-2d/src/` (WGSL compute shader + TS
  driver).
- Capture: produced by either implementation; cross-checked by the
  testkit's `diff_captures` in epsilon mode (rtol=1e-4, atol=1e-6).

## 6. Verification posture

- **Code verification** by comparison against the Python NumPy
  reference. The WebGPU sim's capture (or, in Phase 0, the canonical
  capture produced from the NumPy reference itself) matches a fresh
  NumPy run within `rtol=1e-4, atol=1e-6` at the canonical seed +
  parameters.
- **Solution verification** (GCI): DEFERRED to Phase 1+ (Block 2's
  MMS pipeline is heat-eq 1D only; an MMS for Gray-Scott requires
  a Phase-1+ extension of the solution-verification toolkit).
- **Model validation**: not in scope for Phase 0; Gray-Scott is a
  demonstration sim, not a calibrated physical model.
- **PBT-covered invariants** (per `architecture.md` § 2.14):
  1. `monotone_bounds`: U, V ∈ [0, 1] at every step.
  2. `mass_approximately_conserved`: total mass drift per step
     bounded by source/sink terms.
  3. `periodic_bc_satisfied`: opposite-boundary values agree.

  Each runs with `n_examples = 20` at Phase 0; Phase 1+ raises the
  budget.

The NumPy reference itself serves as the "≥ 3 independent-reference
anchors" per spec § 2.4: the canonical capture is the result of the
NumPy reference under the locked seed + parameters, and the
code-verification test re-derives the same capture at test time. A
typo in either copy is caught element-wise (rtol 1e-4).

## 7. Golden values / Manufactured solutions

No closed-form analytical solution exists for arbitrary (F, k) in
Gray-Scott (the system supports pattern bifurcations); a "golden table"
of `(inputs → expected)` doesn't apply. The canonical capture (item 5)
is the closest analogue.

MMS-for-Gray-Scott is `deferred_items` in the Block 8 audit and
ships in Phase 1+.

## 8. Determinism

`bit-exact-same-hw`. See `determinism.md` for the declaration +
sources-and-mitigations table.

## 9. Equivalence

Phase 0 has only Stack B; cross-stack equivalence kicks in at Phase 2
when Stack C and Stack D ports land. The
`reaction-diffusion` category default tolerance (`tolerance.toml`) is
`relative = 1e-4`, `absolute = 0.0`. No per-sim override at Phase 0.

## 10. Diagnostics

- Tier 1: `diagnostics.tier1.health.check_health` (NaN/Inf),
  `diagnostics.tier1.performance.check_performance` (wall-clock),
  `diagnostics.tier1.determinism.check_determinism`
  (re-runs `run_twice_and_diff`).
- Tier 2 scalar_field: `monotone_bounds.check_bounds(U, 0, 1)`,
  `monotone_bounds.check_bounds(V, 0, 1)`,
  `conservation.check_conservation` (advisory — Gray-Scott is not
  strictly conservative; report drift).
- Tier 3: not shipped in Phase 0 (per spec § 3.3 Tier 3 is per-sim
  shims; the Phase 0 RD-2D tests compose Tier 1 + Tier 2 directly).

## 11. Build and run

```bash
# Python (NumPy reference + canonical capture replay + tests):
uv run --directory packages/reaction-diffusion-2d pytest -W error

# WebGPU local (Stack B, requires GPU adapter):
cd packages/reaction-diffusion-2d
pnpm install   # if first-run
pnpm typecheck
pnpm vitest run
```

The committed capture file at
`captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}`
is produced by the Python NumPy reference at the canonical parameters
in Phase 0; Phase 1+ produces it from the WebGPU implementation on a
GPU host and verifies cross-stack equivalence.

## 12. References

- Gray, P. & Scott, S. K. (1983), op. cit.
- Pearson, J. E. (1993), op. cit.
- Phase 0 plan § 7.8 (this block).
- Spec § 1.3 step 4 (TDD mechanical anchor) + Appendix G.7.5 (failing-
  tests output hash discipline).
- Spec § 2.14 (property-based testing).

## 13. Productization status

```yaml
productization:
  web: true       # 5.1 — Stack B WebGPU sim ships as a web demo
  binary: false   # 5.2 — Stack B sim; no C++ binary
  pypi: false     # 5.3 — Stack B sim; no PyPI package
  render: true    # 5.4 — offline render of pattern formation
  preprint: true  # 5.5 — documents the testkit demonstration sim
```
