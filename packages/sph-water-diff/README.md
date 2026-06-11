# sph-water-diff

Differentiable variant of `sph-water` (Stack D / Taichi `ti.ad.Tape`) — Phase 6 cluster C-1
unit U-1 (spec § 11.5 item 4.2; Phase-4 ledger row 10, deferred → Phase-4-Greenfield-CPU;
charter `docs/phases/phase-6/c1-charter.md` § 3.1).

The forward is the landed parent's canonical physics (`packages/sph-water-stack-d`,
R-S3/S6): semi-implicit-Euler gravity free-fall + Monaghan-cubic-spline SPH density. Two
inverse problems on the WU-A autodiff substrate (`common_py.autodiff`):

- **`SphInitialVelocityControl`** — the plan's control problem: recover the shared initial
  vertical velocity `v0z` from observed final positions (exactly linear map; DiffTaichi
  throw-to-target shape, Hu et al. ICLR 2020, CITE-DON'T-IMPORT).
- **`SphKernelWidthID`** — recover the smoothing length `h` from observed densities: the
  SPH-specific differentiable surface (gradient through the cubic-spline kernel), scoped to
  the fixed-topology interior regime per batch-1's EXP-C hold.

Spec sheet: `docs/sim-specs/particle-fluids/sph-water/spec-diff.md`. Gradient golden table:
`tools/testkit/golden/tables/sph-water-diff-gradient.json` (A1 free-fall closed form / A2
central-FD baseline / A3 kernel-width analytic).

```bash
uv run --no-sync pytest packages/sph-water-diff/tests/
```
