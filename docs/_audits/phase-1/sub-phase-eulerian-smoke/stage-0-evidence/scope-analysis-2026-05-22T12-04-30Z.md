# Task 0.4 — Canonical-descriptor scope-analysis (eulerian-smoke)

> First practical exercise of conventions doc § N PROPOSED. Methodology
> per plan § 7.1 Task 0.4 checklist.

## Probe methodology

- **Per-step floor:** measured directly at canonical N (NOT projected
  from a smaller N) per conventions doc § K.3 measured-floor discipline.
- **Stack:** Python NumPy reference at HEAD (`numpy 2.x`); no numba;
  no BLAS-fast-path.
- **Reduced pipeline:** the probe ran advect-velocity (3 trilinear
  semi-Lagrangian backtraces) + Jacobi pressure-projection
  (n_jacobi=20) at canonical resolution. Production includes
  vorticity-confinement (~+30%), scalar advection (~+25%), and
  optional diffusion sub-step (small for high-Re smoke). Effective
  factor: ~1.5–2× the probe per step.
- **Hardware:** i7-12700KF-linux-6.17 (the hardware_id used across
  prior sub-phases per conventions doc § M.2 / § M.3 S2).

## Descriptor 1 — `taylor-green-128cube-seed42-step500`

### Storage
- Per-frame raw payload (5 fields = u, v, w, p, φ at float32):
  128³ × 5 × 4 bytes = **41.9 MB**.
- Full cadence (every step):       500 frames × 41.9 MB = **20.9 GB** — **BREACH** 1 GB ceiling (20.9× over).
- Cadence every 10 steps  (50 frames): **2.10 GB** — **BREACH** (2.1× over).
- **Cadence every 50 steps (10 frames): 0.42 GB** — fits.
- Cadence every 100 steps (5 frames): 0.21 GB — comfortable.
- Endpoint + 5 cadence-100: 0.21 GB — fits.

### Memory
- Working set at canonical 128³ with ~8 intermediate float64 fields:
  ~1.0 GB peak. Fits in host RAM (16+ GB available).

### Wall-clock (MEASURED at N=128)
- Per-step floor (advect-only + Jacobi-20): **0.93 s** (3-run avg).
- Production-corrected per-step floor (×1.5–2 for confinement +
  scalar advect): ~1.4–1.9 s.
- 500-step projection (n_jacobi=20): **466–933 s = 7.8–15.6 min**.
- 500-step projection (n_jacobi=50, tighter convergence): ~1170–2330 s
  = **19–39 min**.
- 500-step projection (n_jacobi=100): ~2330–4660 s = **39–78 min**.
- All projections **within a 1-hour operator-routable threshold** at
  n_jacobi ≤ 50. n_jacobi=100 is borderline but acceptable.

### Decision
- **FITS within ceilings** with a single cadence override.
- **Capture cadence: every 50 steps** (10 frames) at Stage 1 step 5.
- Sidecar metadata records the cadence value; Stage 1 commit footer
  cites Task 0.4 finding per conventions doc § N output structure.

## Descriptor 2 — `lid-driven-cavity-128sq-re100-seed42-step1000`

### Storage
- Per-frame raw payload (4 fields = u, v, p, φ at float32):
  128² × 4 × 4 bytes = **262 KB**.
- Full cadence (every step): 1000 × 262 KB = **262 MB** — **fits**
  comfortably at full cadence.

### Memory
- 128² is trivial: <50 MB peak.

### Wall-clock (MEASURED at N=128 2D)
- Per-step floor (advect 1 component + Jacobi-50): **5.6 ms**.
- Production-corrected (×~1.3 for 2-component 2D + scalar):
  ~7–10 ms per step.
- 1000-step projection: **5.6–10 s** total. Trivial.

### Decision
- **FITS at full cadence**, no override.

## Overall decision tree finding

- Both descriptors: **FITS within ceilings**.
- 3D Taylor-Green: cadence=50 override (sidecar-documented).
- 2D Lid-Driven-Cavity: full cadence.
- **NO STOP-AND-SURFACE.** Coordinator's lean for Item 2 routing
  (combine cadence + numba): numba **NOT REQUIRED** at this sub-phase;
  cadence routing alone is sufficient.
- Per-sub-phase descriptor override (e.g., 64³ contracted forward
  per sph-water R20 precedent): **NOT REQUIRED**.
- Stage 1 step 5 has a STOP-and-surface fall-back if measured per-step
  floor at full implementation exceeds the Stage 0 estimate by > 3×
  (the post-Stage-0 reality check per conventions doc § N).

## Inputs cross-referenced

- spec Appendix D § D.2.3 line 2481: eulerian-smoke `ref` =
  `taylor-green-128cube-seed42-step500` +
  `lid-driven-cavity-128sq-re100-seed42-step1000`.
- conventions doc § M.5 R12: 1 GB pre-commit ceiling (sph-water
  raise from 64 MB → 1 GB).
- conventions doc § N: Task 0.4 PROPOSED.
- conventions doc § K.3: MEASURED component floors discipline.
