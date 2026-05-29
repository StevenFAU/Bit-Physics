# neural-ca Stack-B source (WGSL + TS driver)

- `nca_inference.wgsl` — the forward-inference compute shader. One dispatch =
  one NCA step (perception depthwise conv + per-cell update MLP + stochastic
  fire mask + alpha alive-masking). Weights are loaded from the converted
  flat-f32 buffer (`neural_ca/convert_checkpoint.py`); the layout sidecar
  documents tensor offsets.
- `index.ts` — TypeScript driver: loads the converted weights + the seed,
  binds buffers via `common/common-ts`, runs N steps, reads back RGBA, writes
  the B-inference capture via `common/common-ts` `CaptureWriter`.

Local-only (spec § 7.8) — see `../README.md`. Stage 1b-B implements both.
