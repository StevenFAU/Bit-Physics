"""Train the texture NCAs of Grow's Textures scene (rebuild-v2 04-neural-ca.md, M3).

The model and training are Niklasson et al. 2021, *Self-Organising Textures* (Distill), as in
their PyTorch notebook, with the page's sizes:

- 12 channels (RGB = channels 0-2 + 0.5), perception = identity, Sobel x, Sobel y and the
  9-point Laplacian per channel (48 values) with periodic (circular) padding;
- dense 48 -> 96 (bias, ReLU) -> 12 (no bias, zero-initialised); stochastic update, rate 0.5;
  no alive masking: every cell is alive, the seed is all zeros;
- loss: Gram matrices of VGG16 features after conv1_1, conv2_1, conv3_1, conv4_1 and conv5_1
  (torchvision's ImageNet weights) against the target's, plus an overflow term that keeps the
  state within [-1, 1];
- pool of 1,024 states, batch 4, rollouts of 32-96 steps, one sample reset to the seed every
  8 iterations; per-tensor gradient normalisation; Adam, lr 2e-3, x0.3 at 1/2 and 3/4 of the run.

The browser runs the exported weights in ``web/src/v2/model/texture.wgsl`` (float32, its own
hashed fire mask), so a page's texture is statistically, not bitwise, the one measured here.

    python packages/neural-ca/textures/train.py --targets <dir> --out <dir> --id spots --iters 4000

writes ``<id>.weights.npy`` (the texture kernel's layout: b1[96], w1[96][48], w2[12][96]) and
``<id>.run.json`` (config, seed, wall time, loss curve, environment).
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

CHN = 12
HIDDEN = 96
PERC = 4 * CHN
FIRE_RATE = 0.5
STYLE_LAYERS = (
    1,
    6,
    11,
    18,
    25,
)  # ReLU after conv1_1, conv2_1, conv3_1, conv4_1, conv5_1
MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
STD = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)


def _filters() -> torch.Tensor:
    ident = torch.tensor([[0.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 0.0]])
    sobel_x = torch.tensor([[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]]) / 8.0
    lap = torch.tensor([[1.0, 2.0, 1.0], [2.0, -12.0, 2.0], [1.0, 2.0, 1.0]]) / 16.0
    return torch.stack([ident, sobel_x, sobel_x.T, lap])  # (4, 3, 3)


class TextureNCA(torch.nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.w1 = torch.nn.Conv2d(PERC, HIDDEN, 1)
        self.w2 = torch.nn.Conv2d(HIDDEN, CHN, 1, bias=False)
        with torch.no_grad():
            self.w2.weight.zero_()
        self.register_buffer("filt", _filters()[:, None])  # (4, 1, 3, 3)

    def perceive(self, x: torch.Tensor) -> torch.Tensor:
        b, c, h, w = x.shape
        y = F.pad(x.reshape(b * c, 1, h, w), [1, 1, 1, 1], "circular")
        y = F.conv2d(y, self.filt)  # (b*c, 4, h, w)
        return y.reshape(b, c * 4, h, w)  # index 4 * channel + filter

    def forward(
        self, x: torch.Tensor, gen: torch.Generator | None = None
    ) -> torch.Tensor:
        y = self.w2(torch.relu(self.w1(self.perceive(x))))
        b, _, h, w = y.shape
        fire = (torch.rand(b, 1, h, w, generator=gen) + FIRE_RATE).floor()
        return x + y * fire


def to_rgb(x: torch.Tensor) -> torch.Tensor:
    return x[:, :3] + 0.5


class StyleLoss:
    def __init__(self, target: np.ndarray) -> None:
        import torchvision

        vgg = torchvision.models.vgg16(
            weights=torchvision.models.VGG16_Weights.IMAGENET1K_V1
        ).features
        self.vgg = vgg[: max(STYLE_LAYERS) + 1].eval()
        for p in self.vgg.parameters():
            p.requires_grad_(False)
        t = torch.from_numpy(target).permute(2, 0, 1)[None].float()
        with torch.no_grad():
            self.target = [g.detach() for g in self.grams(t)]

    def grams(self, rgb: torch.Tensor) -> list[torch.Tensor]:
        x = (rgb - MEAN) / STD
        out = []
        for i, layer in enumerate(self.vgg):
            x = layer(x)
            if i in STYLE_LAYERS:
                b, c, h, w = x.shape
                out.append(torch.einsum("bchw,bdhw->bcd", x, x) / (h * w))
        return out

    def __call__(self, rgb: torch.Tensor) -> torch.Tensor:
        return sum(
            (g - t).square().mean()
            for g, t in zip(self.grams(rgb), self.target, strict=True)
        )


def export_weights(m: TextureNCA) -> np.ndarray:
    b1 = m.w1.bias.detach().numpy().astype(np.float32)  # (96,)
    w1 = m.w1.weight.detach().numpy()[:, :, 0, 0].astype(np.float32)  # (96, 48)
    w2 = m.w2.weight.detach().numpy()[:, :, 0, 0].astype(np.float32)  # (12, 96)
    return np.concatenate([b1.ravel(), w1.ravel(), w2.ravel()])


def load_weights(flat: np.ndarray) -> TextureNCA:
    m = TextureNCA()
    b1 = flat[:HIDDEN]
    w1 = flat[HIDDEN : HIDDEN + HIDDEN * PERC].reshape(HIDDEN, PERC)
    w2 = flat[HIDDEN + HIDDEN * PERC :].reshape(CHN, HIDDEN)
    with torch.no_grad():
        m.w1.bias.copy_(torch.from_numpy(b1))
        m.w1.weight.copy_(torch.from_numpy(w1)[:, :, None, None])
        m.w2.weight.copy_(torch.from_numpy(w2)[:, :, None, None])
    return m


def train(
    target: np.ndarray,
    iters: int,
    seed: int,
    size: int,
    batch: int,
    log_every: int = 50,
) -> tuple[TextureNCA, dict]:
    torch.manual_seed(seed)
    gen = torch.Generator().manual_seed(seed + 1000)
    rng = np.random.default_rng(seed)
    m = TextureNCA()
    loss_f = StyleLoss(target)
    opt = torch.optim.Adam(m.parameters(), lr=2e-3)
    sched = torch.optim.lr_scheduler.MultiStepLR(
        opt, [iters // 2, (3 * iters) // 4], 0.3
    )
    pool = torch.zeros(1024, CHN, size, size)
    curve: list[list[float]] = []
    t0 = time.perf_counter()
    for i in range(iters):
        with torch.no_grad():
            idx = rng.choice(len(pool), batch, replace=False)
            x = pool[idx]
            if i % 8 == 0:
                x[:1] = 0.0
        steps = int(rng.integers(32, 97))
        for _ in range(steps):
            x = m(x, gen)
        style = loss_f(to_rgb(x))
        overflow = (x - x.clamp(-1.0, 1.0)).abs().sum()
        loss = style + overflow
        opt.zero_grad()
        loss.backward()
        with torch.no_grad():
            for p in m.parameters():
                p.grad /= p.grad.norm() + 1e-8
        opt.step()
        sched.step()
        with torch.no_grad():
            pool[idx] = x.detach()
        if i % log_every == 0 or i == iters - 1:
            curve.append([i, round(style.item(), 6), round(overflow.item(), 6)])
            print(
                f"{i:5d} style {style.item():.4f} overflow {overflow.item():.3f} {time.perf_counter() - t0:7.1f}s",
                flush=True,
            )
    wall = time.perf_counter() - t0
    return m, {"wall_s": round(wall, 1), "curve": curve}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--targets", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--id", required=True)
    ap.add_argument("--iters", type=int, default=4000)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--size", type=int, default=64)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--threads", type=int, default=0)
    a = ap.parse_args()
    if a.threads:
        torch.set_num_threads(a.threads)
    a.out.mkdir(parents=True, exist_ok=True)
    target = np.load(a.targets / f"{a.id}.npy")
    m, res = train(target, a.iters, a.seed, a.size, a.batch)
    np.save(a.out / f"{a.id}.weights.npy", export_weights(m))
    run = {
        "id": a.id,
        "trainer": "packages/neural-ca/textures/train.py (Niklasson et al. 2021, PyTorch notebook recipe)",
        "model": {
            "channels": CHN,
            "hidden": HIDDEN,
            "perception": "identity, sobel x, sobel y, laplacian; circular padding",
            "fire_rate": FIRE_RATE,
        },
        "loss": "VGG16 (torchvision IMAGENET1K_V1) Gram matrices after conv1_1..conv5_1 + overflow |x - clamp(x, -1, 1)|",
        "iterations": a.iters,
        "seed": a.seed,
        "grid": a.size,
        "batch": a.batch,
        "pool": 1024,
        "rollout": [32, 96],
        "lr": "2e-3, x0.3 at 1/2 and 3/4",
        "wall_s": res["wall_s"],
        "final_style_loss": res["curve"][-1][1],
        "curve": res["curve"],
        "environment": {
            "torch": torch.__version__,
            "threads": torch.get_num_threads(),
            "cpu": platform.processor() or platform.machine(),
            "cores": os.cpu_count(),
        },
    }
    (a.out / f"{a.id}.run.json").write_text(json.dumps(run, indent=1) + "\n")


if __name__ == "__main__":
    main()
