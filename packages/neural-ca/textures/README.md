# Grow — the Textures

The texture networks of the Grow v2 page's Textures scene (`docs/planning/rebuild-v2/04-neural-ca.md`,
milestone M3): Self-Organising Textures (Niklasson et al. 2021, Distill) trained for this page. The page shows
only what is listed in `packages/neural-ca/web/public/textures/textures.json`, and every texture listed there
comes from a training run that was actually made; the file records, for each one, the target and how it was
drawn, the trainer, the run's settings, seed, wall time, loss curve and environment, and the measurements below.

## The model

12 channels per cell (the page keeps them in its 16-float cell; 12–15 stay zero); RGB = channels 0–2 + 0.5.
Perception is identity, Sobel x, Sobel y and the 9-point Laplacian per channel (48 values) with periodic
padding; a dense layer 48 → 96 with bias and ReLU, then 96 → 12 without bias, zero-initialised; each cell
updates with probability 0.5. No alive mask: every cell is alive and the seed is the all-zero plane. 5,856
weights. The page runs them in `packages/neural-ca/web/src/v2/model/texture.wgsl` — its own kernel, not the
gated one, with the gated kernel's hashed coin instead of PyTorch's generator, so a page's plane matches the
reference statistically, not cell for cell.

## How they were trained

`train.py`, on a CPU with PyTorch (the spec: the VGG-based loss is too heavy to train in a browser). The loss
compares Gram matrices of VGG16 features (torchvision's ImageNet weights, after conv1_1 … conv5_1) of the
cells' colours with the target's, plus an overflow term that keeps the state in [−1, 1]. Pool of 1,024
states on a 64 × 64 wrap-around grid, batch 4, rollouts of 32–96 steps, one sample reset to zeros every 8
iterations, per-tensor gradient normalisation, Adam at 2e-3 (×0.3 at half and three quarters of the run).

The targets are drawn by `targets.py` (Gray–Scott spots and stripes, a periodic Voronoi giraffe, a basket
weave), all periodic, 64 × 64. No photographs or images are vendored.

## How they were measured

`build.py` loads each run's weights into the trainer's own model (float32, CPU, fire masks from a fixed
generator) and measures: the style loss of four 64 × 64 planes grown from zeros at steps 64, 256, 1,024 and
4,096; the displayed colour's mean and standard deviation over a 128 × 128 plane at steps 256 and 1,024 (the
page's acceptance script checks its own plane against these); regrowth — a 128 × 128 plane grown 512 steps,
a disc of radius 16 erased, the style loss of the 40 × 40 window over it before and 32–256 steps after; and
the largest state value at step 4,096.

## Reproducing

```bash
OUT=/tmp/grow-textures
python packages/neural-ca/textures/targets.py --out $OUT
for t in spots maze giraffe weave; do
  python packages/neural-ca/textures/train.py --targets $OUT --out $OUT/runs --id $t --iters 3000 --threads 5
done
python packages/neural-ca/textures/build.py --runs $OUT/runs --targets $OUT
```

Use the workspace venv (`uv run --no-sync python …`); it needs `torch`, `torchvision` (with the VGG16
ImageNet weights in the torch hub cache), `numpy` and `Pillow`. Runs are seeded (model, fire masks, pool
sampling); whether a rerun reproduces the weights bit for bit depends on PyTorch's CPU kernels and thread
count — see `reproducibility` in `textures.json` for what was checked.
