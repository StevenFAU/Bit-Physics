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
