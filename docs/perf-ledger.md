# Performance Regression Ledger

Per `architecture.md` § 2.15. Each row records first-landing or
significant-change wall-clock for a `(sim, stack, descriptor)` tuple.
Non-blocking — surfaces at landing-audit review time.

A row is appended:

- On first canonical landing of a sim (first-landing baseline row).
- On every subsequent CI run that produces wall-clock differing by >10%
  from the prior recorded value.
- Rows with `wall_clock_seconds > 2 × first_landing_baseline` are flagged
  `regression: WATCH`.

| sim | stack | descriptor | wall_clock_seconds | hardware_id | commit_sha | date | regression |
|---|---|---|---|---|---|---|---|
| reaction-diffusion-2d | numpy-reference | gray-scott-lambda-128sq-seed42-step2000 | 0.931 | i7-7700HQ-linux-6.17 | (this commit) | 2026-05-19 | baseline |
| strange-attractors | numpy-reference | lorenz-trajectory-seed42-step10000 | 0.061 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-20 | baseline |
| mandelbulb-explorer | numpy-reference | de-probe-points-seed42 | 0.006 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-20 | baseline |
| boids-3d | numpy-reference | flock-3agents-canonical-seed42-step1000 | 0.033 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-20 | baseline |
| boids-3d | numpy-reference | flock-1000agents-seed42-step1000 | 17.592 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-20 | baseline |
| physarum | numpy-reference | network-canonical-seed42-step5000 | 3.128 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-20 | baseline |
| reaction-diffusion-3d | numpy-reference | gray-scott-lambda-64cube-seed42-step2000 | 10.144 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-20 | baseline |
| sph-water | numpy-reference + scipy.cKDTree + numba-@njit(fastmath=False, cache=True) | dam-break-100K-particles-seed42-step1000 | 1291.854 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-21 | baseline (100K-instance of Phase 1 R8 canonical 1M descriptor; full N=1M is Phase-2+ Stack-C scope per spec-ref § 5; R12+R16+R17+R18+R19+R20 routing arc) |
| eulerian-smoke | numpy-reference | taylor-green-128cube-seed42-step500 | 691.587 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-22 | baseline (Stam-Fedkiw stable-fluids 3D; cadence-50 capture per Stage 0 Task 0.4 — conventions doc § N first practical exercise; MacCormack-corrected semi-Lagrangian + n_jacobi=20 collocated projection) |
| eulerian-smoke | numpy-reference | lid-driven-cavity-128sq-re100-seed42-step1000 | 5.099 | i7-12700KF-linux-6.17 | (this commit) | 2026-05-22 | baseline (Stam-Fedkiw 2D; full-cadence capture; periodic-BC approximation of the Dirichlet lid-driven cavity per sim spec-ref § 5 — Phase-2+ Stack-C C++ port implements proper Dirichlet) |
