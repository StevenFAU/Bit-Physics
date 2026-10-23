# Grow — in-browser training spike (rebuild-v2 M0)

Throwaway measurement code for the "training spike measured" item of milestone M0 in
`docs/planning/rebuild-v2/04-neural-ca.md`. It answers one question: can a visitor's
browser train a Growing NCA with WebGPU (forward, backward through time, Adam) fast enough
for the Teach experience? The findings are in that spec's status note; this folder is how
they were measured.

It is **not** the v2 page and **not** the gated path. The gated kernel
(`packages/neural-ca/typescript/src/nca_inference.wgsl`), the v1 page, the capture path and
the committed checkpoint (`packages/neural-ca/web/public/nca-weights.bin`, sha256 `c98a4678…`,
read here only as gradient-check weights) are untouched. The folder sits outside the npm
workspace globs (`packages/*/web`), so `npm run build` and the web-deploy pipeline never see it.

## What is here

| File | What |
|---|---|
| `src/kernels.ts` | WGSL: forward (MLP + alive mask), loss, backward (MLP recompute, perception transpose, split-K weight gradients), per-tensor gradient normalisation + Adam, pool reset |
| `src/trainer.ts` | Buffers, bind groups, one-iteration encoder, timestamped readback ring, eval and gradient entry points |
| `src/main.ts` | `window.spike` API (info / alloc / gradcheck / train) for the driver; no UI |
| `run-spike.mjs` | Builds the page, serves it, drives snap Chromium headless, samples VRAM from sysfs |
| `spike_ref.py` | Procedural targets, float64/float32 PyTorch autograd reference with the same hashed fire masks, gradient comparison, PNG helpers |

## Design points that matter for M2

- **Checkpoint every step, recompute the hidden layer.** One state buffer per step keeps every
  binding under the default 128 MiB `maxStorageBufferBindingSize`. All buffers fit the
  default device limits; `@bp/gpu`'s `acquireGpu` requests no raised limits and none are needed.
- **Skip dead cells exactly.** The forward MLP runs only where alpha > 0.1 within 5×5. Those
  are the only cells whose update can reach a pre-alive cell. Backward work runs only on
  cells that are alive and fired; every other cell's gradient is exactly zero.
- **Deterministic reductions.** Workgroup trees and a prefix-sum compaction, with no float
  atomics, so the same adapter, seed and target give the same weights bit for bit.
- **Counter-hash fire masks** (`bp_hash3(seed, t, cell)` from `@bp/gpu`), mirrored in
  `spike_ref.py`, so autograd sees the GPU's exact masks.

## Running it

```bash
export CHROME_BIN=/snap/bin/chromium
export PLAYWRIGHT_MODULE=$PWD/tools/productization/web-deploy/web/headless/node_modules/playwright/index.mjs
OUT=/tmp/grow-spike
uv run --no-sync python packages/neural-ca/train-spike/spike_ref.py targets --out $OUT/targets
uv run --no-sync python packages/neural-ca/train-spike/spike_ref.py cases --out $OUT/gc
node packages/neural-ca/train-spike/run-spike.mjs --out $OUT gradcheck $OUT/gc/cases.json
uv run --no-sync python packages/neural-ca/train-spike/spike_ref.py compare --cases $OUT/gc --gpu $OUT/gradcheck-gpu.json --out $OUT/gradcheck-report.json
node packages/neural-ca/train-spike/run-spike.mjs --out $OUT train <config.json>   # configs: see results/
```

A training config is a JSON object or array, for example:
`{"label":"t3-gecko-s1","targetFile":"gecko.f32","G":72,"B":8,"Tmin":64,"Tmax":96,"poolSize":1024,"iters":2000,"lr":0.002,"decayAt":2000,"seed":1,"evalEvery":50,"evalSteps":[96,300],"snapshotEvery":100}`.
`targetFile` is resolved relative to the config file, so copy `$OUT/targets/*.f32` next to it.
`results/` holds the measured summary the status note cites.
