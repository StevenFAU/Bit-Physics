# Grow — the Menagerie

The organisms of the Grow v2 page's Menagerie (`docs/planning/rebuild-v2/04-neural-ca.md`, milestone M1).
Each is a Growing Neural CA with the committed checkpoint's architecture and layout (8,320 numbers:
`w1.bias`, `w1.weight`, `w2.weight`, as `packages/neural-ca/web/public/nca-layout.json`), so the page runs
every one of them through the gated kernel (`packages/neural-ca/typescript/src/nca_inference.wgsl`)
unchanged; only the weights differ. The committed checkpoint itself (`nca-weights.bin`, sha256 `c98a4678…`,
the disk the release gate re-runs) is listed first and is not copied.

The page shows only what is listed in `menagerie.toml`, and every organism listed there comes from a
training run that was actually made. `public/menagerie/menagerie.json` records, for each one, the target,
the trainer, the adapter, the hyperparameters, the wall time, the final loss, a downsampled loss curve and
the measurements below; the page reads its cards and its Learn copy from that file.

## How they were trained

With the Grow training spike (`packages/neural-ca/train-spike/`), extended for this milestone with the
Distill *Regenerating* experiment: before each rollout the drawn batch's current losses are computed, the
worst sample is reset to the seed, and the three best are cut by a random disc (centre in the middle half
of the grid, radius 0.05–0.2 of it), drawn from the iteration seed. Everything else is the spike's
training: WGSL forward pass, backpropagation through time with per-step state checkpoints, per-tensor
gradient normalisation and Adam, in headless Chromium's WebGPU. Shape: 64 × 64 dish (the page's), batch 8,
pool 1,024, rollouts of 64–96 steps, 8,000 iterations, learning rate 2e-3 dropping to 2e-4 at 2,000,
training seed 1.

The targets are drawn by `targets.py` (ellipses, capsules and half-planes in a 40 × 40 box, padded by 12
cells to 64 × 64, premultiplied RGBA). No emoji images or fonts are used.

## How they were measured

`build.py` converts each run's parameters from the trainer's packing to the committed layout and measures
them with the package's NumPy reference of the gated kernel (`neural_ca.reference.nca_numpy`: the same
perception, MLP, PCG fire mask and alive mask), on the 64 × 64 dish:

- growth from the canonical seed (mask seed 42): overlap with the target at steps 50–4,000, and the number
  of living cells every 250 steps;
- regrowth: grown 400 steps, then cut (the right half, the bottom half, or a disc of radius 9 through the
  middle), for mask seeds 42, 7 and 11, with the overlap 200 and 800 steps later and an uncut twin's.

Overlap is intersection over union of opacity > 0.5 against the target's. The page calls an organism one
that heals when it is trained with damage and its mean overlap 200 steps after the cuts is at least 0.8.

## Reproducing

```bash
export CHROME_BIN=/snap/bin/chromium
export PLAYWRIGHT_MODULE=$PWD/tools/productization/web-deploy/web/headless/node_modules/playwright/index.mjs
OUT=/tmp/grow-menagerie
uv run --no-sync python packages/neural-ca/menagerie/targets.py --out $OUT
node packages/neural-ca/train-spike/run-spike.mjs --out $OUT train packages/neural-ca/menagerie/runs.json
uv run --no-sync python packages/neural-ca/menagerie/build.py --runs $OUT
```

`runs.json` holds the training configs; `targetFile` resolves next to it, so copy `$OUT/*.f32` there or
edit the paths. On the same adapter a run reproduces its weights bit for bit (the spike measured this;
see `packages/neural-ca/train-spike/results/summary.json`); on another, the weights differ in their last
bits and the measurements move a little. `build.py` needs the workspace venv with the `neural_ca` package
importable.
