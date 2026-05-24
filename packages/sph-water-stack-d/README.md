# sph-water-stack-d

Spec-Phase-2 **Stack-D** port of the `sph-water` simulation (DFSPH;
Bender & Koschier 2015) — a Taichi-DSL CPU implementation diffed for
cross-stack content-equivalence against the Phase-1-frozen NumPy reference
(`stack.name="numpy-reference"`; scipy.cKDTree + numba) at
`relative = 1e-4, absolute = 0.0` (the `sph` tolerance category; spec § 2.6).

The **SECOND** per-sim cross-stack port under spec-Phase-2 (after
`reaction-diffusion-2d-stack-d`) and the empirical-validation pair for the
IC-15 candidate cross-stack-port methodology. Gate-4 code verification is
**golden-table-based** (cubic-spline-kernel + DFSPH density-evolution),
**not** MMS — the largest gate-level delta from the RD-2D Stack-D template.

Stage 1a ships only the failing-tests (RED) surface; the reference / sim /
invariants modules are Stage 1b deliverables.
