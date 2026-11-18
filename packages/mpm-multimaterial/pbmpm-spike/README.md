# Materials — PB-MPM 3D spike (rebuild-v2 M0)

Throwaway measurement code for milestone M0 in
`docs/planning/rebuild-v2/10-mpm-multimaterial.md`. It answers one question: does
position-based MPM (Lewin, SIGGRAPH 2024) work in **3D** in WebGPU for all six
materials, at the frame budget and under a violent kinematic hammer? The findings are in
that spec's status note; this folder is how they were measured.

It is **not** the M1 page and **not** the gated path. The gated MLS-MPM kernel
(`packages/mpm-multimaterial/src/mpm_core.wgsl`), the v1 page and its capture path are
untouched. `packages/mpm-multimaterial/src/mpm_prelude.wgsl` is imported read-only for
its `svd3` (the Givens-sign-fixed Jacobi SVD) and, for the snow fallback, `stress_snow` +
`snow_return_map` verbatim. The folder sits outside the npm workspace globs
(`packages/*/web`), so `npm run build`, CI and the web-deploy pipeline never see it.

## What is here

| File | What |
|---|---|
| `src/pbmpm3d.wgsl` | The 3D PB-MPM step: `particle_iter` (G2P, constraint, P2G, and on the last iteration the integration), `grid_update` (fixed-point decode, kinematic SDF colliders, guardian walls), diagnostics (`particle_stats`, `occupancy`, `brick_count`) |
| `src/pbmpm.ts` | Buffers, one explicit bind-group layout, a dynamic-offset uniform ring (one 256 B slot per dispatch), frame encoding, timestamp benches, readbacks, a sphere-impostor renderer for screenshots |
| `src/scenes.ts` | Materials, the standard per-material tests, the Table scene, hammer and press scripts |
| `src/main.ts` | `window.spike` API for the driver (`info`, `svdcheck`, `run`, `bench`, `determinism`), readback metrics (repose angle, pieces, volume ratio, footprint) |
| `src/svdcheck.wgsl` | U·Σ·Vᵀ reconstruction probe on the prelude's `svd3` |
| `src/render.wgsl` | Screenshot renderer (not the M1 look) |
| `run-spike.mjs` | Builds the page, serves it, drives snap Chromium headless (or SwiftShader), takes screenshots when the page asks |
| `results/` | The measured summary the status note cites, plus selected screenshots |

## The model as ported

Per substep, K iterations, one dispatch each:

```
it = 0        constraint on the stored D, P2G           -> grid_update
0 < it < K-1  G2P, constraint, P2G                      -> grid_update
it = K-1      G2P, integrate (F, plasticity, x, gravity warm start, colliders)
```

- Positions are in grid cells (dx = 1, node i at i + 0.5), as in the reference. P2G
  scatters `m (d + D·offset)` and `m` as i32 quanta (the v1 fixed-point pattern, M = 4×10⁶),
  so a run is byte-identical on the same device.
- 2D → 3D: 27-node stencil; volume terms use trace/3; the unit-determinant target is
  `F / ∛det F`; the Drucker–Prager projection uses (3λ + 2μ)/(2μ) = 1.5 λ/μ + 1.
- The reference scatters on its last iteration too; that grid is never read, so the spike
  skips it (K − 1 P2Gs and grid solves per substep, K G2Ps).
- Kinematic colliders follow the reference rule *prevent further penetration* in the
  collider's frame. Snapping nodes that are already inside out to the surface (the first
  version) put a one-cell jump into the displacement field and wrecked F under a press.

Materials: water = the reference liquid (volume constraint + viscosity; an optional
no-tension switch); jelly = the reference elastic (target R, relaxation); sand = the
reference Drucker–Prager; clay and honey = von Mises (J2) return maps in Hencky strain over
the elastic constraint (clay ratio 1, honey ratio 0.07, the reference coil's shape/volume
blend); snow = Stomakhin clamp + Jp on the elastic constraint, with hardening moved onto
the critical compression (the stiffness lever is capped by the relaxation); `snowmls` = the
shipped explicit MLS-MPM snow, run as a K = 2 "iteration" (in displacement form one
MLS-MPM substep is exactly P2G with the stress term, grid, G2P + integrate).

## Running it

```bash
export CHROME_BIN=/snap/bin/chromium
export PLAYWRIGHT_MODULE=$PWD/tools/productization/web-deploy/web/headless/node_modules/playwright/index.mjs
OUT=/tmp/materials-spike
node packages/mpm-multimaterial/pbmpm-spike/run-spike.mjs --out $OUT svdcheck
node packages/mpm-multimaterial/pbmpm-spike/run-spike.mjs --out $OUT run <runs.json>
node packages/mpm-multimaterial/pbmpm-spike/run-spike.mjs --out $OUT determinism <run.json>
node packages/mpm-multimaterial/pbmpm-spike/run-spike.mjs --swiftshader --out $OUT run <runs.json>
```

A run config is an object or array, for example
`{"label":"jelly","scene":"jelly","substeps":4,"iterations":5,"duration":3,"statsEvery":6,"metricsAt":[0,3],"shotsAt":[0.5,3]}`.
Scenes: `dam`, `sandcol`, `jelly` (`y0`, `mat`), `snowball` (`mat`), `press` (`mat`),
`honeycol`, `honeypour`, `table`, `tablepond`. Options: `gridX` (128 = T3), `hammer`,
`hammerSpeed` (m/s), `hammerAt`, `wallFriction`, `mats` (per-material overrides),
`occupancyAt`, `benchAt` + `benchFrames` (GPU timestamps, frame and per-pass split).
`results/runs/` holds the configs behind the status note. `final.json` and the bench configs
(`fair*.json`, `curve*.json`, `resort.json`, `mat.json`, `probe*.json`) ran on the committed defaults;
the tuning configs (`jelly-sweep`, `water-sweep`, `tune*`, `honey`, `repose*`, `mls`) ran on the
defaults of their time, which the status note describes where it cites them.
