"""Measure the trained texture NCAs and write what the Grow v2 page ships (rebuild-v2 04-neural-ca.md, M3).

For each run in ``--runs`` (``<id>.weights.npy`` + ``<id>.run.json`` from ``train.py``) this writes,
under ``packages/neural-ca/web/public/textures/``:

- ``<id>.bin``: the weights, little-endian float32, in the page's texture-kernel layout
  (``b1[96]``, ``w1[96][48]``, ``w2[12][96]``; 5,856 numbers);
- ``<id>-target.png``: the target it was trained on (64 x 64);
- ``textures.json``: for every texture its name, blurb, target recipe, the run's provenance (trainer,
  loss, iterations, seed, wall time, loss curve, environment) and these measurements, made with the
  trainer's own PyTorch model (float32, CPU, fire masks from a fixed generator):

  * ``style_by_step``: style loss (no overflow term) of four 64 x 64 planes grown from zeros, mean,
    at steps 64, 256, 1,024 and 4,096;
  * ``rgb_mean`` / ``rgb_std``: the displayed colour (channels 0-2 + 0.5, clamped to [0, 1]) over a
    128 x 128 plane grown from zeros, at steps 256 and 1,024 (the page checks its own against these);
  * ``regrow``: a 128 x 128 plane grown 512 steps, a disc of radius 16 at its centre erased (set to
    zero, the seed state); style loss of the 40 x 40 window over it before, and 32 / 64 / 128 / 256
    steps after;
  * ``max_abs_state_4096``: the largest |state| on the 64 x 64 planes at step 4,096.

    python packages/neural-ca/textures/build.py --runs <dir> --targets <dir>
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from targets import SIZE, TEXTURES
from train import CHN, HIDDEN, PERC, StyleLoss, load_weights, to_rgb

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "packages/neural-ca/web/public/textures"

WORDS = {
    "spots": (
        "Spots",
        "Dark spots on sand, spaced by a reaction–diffusion rule; the network learned their size and spacing, not where they go.",
    ),
    "maze": (
        "Maze",
        "Coral stripes that wander and branch, like a labyrinthine Turing pattern.",
    ),
    "giraffe": (
        "Giraffe",
        "Brown patches inside pale lines: a Voronoi pattern, the closest drawn thing to a giraffe's coat.",
    ),
    "weave": (
        "Weave",
        "A basket weave. The network learned the threads and their crossings but not the grid: blocks drift out of line, because a rule that sees only its neighbours has nothing to keep far-apart blocks in step.",
    ),
}


# What was checked of the training's reproducibility (2026-10-29, torch 2.12.0 CPU, x86-64, 5 threads).
REPRODUCIBILITY = (
    "train.py --id spots --seed 1 --threads 5, run twice for 101 iterations: byte-identical weights, and "
    "the logged losses at iterations 0 and 50 equal the 3,000-iteration run's to six decimals. Not checked: "
    "a whole 3,000-iteration rerun, other thread counts, other CPUs or PyTorch versions. build.py's "
    "measurements were run twice and came out identical."
)


@torch.no_grad()
def run(
    m: torch.nn.Module, x: torch.Tensor, steps: int, gen: torch.Generator
) -> torch.Tensor:
    for _ in range(steps):
        x = m(x, gen)
    return x


@torch.no_grad()
def measure(flat: np.ndarray, target: np.ndarray) -> dict:
    m = load_weights(flat).eval()
    loss = StyleLoss(target)
    gen = torch.Generator().manual_seed(7)
    out: dict = {"style_by_step": {}, "rgb_mean": {}, "rgb_std": {}}
    # four 64 x 64 planes from zeros
    x = torch.zeros(4, CHN, SIZE, SIZE)
    t = 0
    for s in (64, 256, 1024, 4096):
        x = run(m, x, s - t, gen)
        t = s
        out["style_by_step"][str(s)] = round(float(loss(to_rgb(x))), 3)
    out["max_abs_state_4096"] = round(float(x.abs().max()), 4)
    # colour statistics on a 128 x 128 plane
    y = torch.zeros(1, CHN, 128, 128)
    t = 0
    for s in (256, 1024):
        y = run(m, y, s - t, gen)
        t = s
        rgb = to_rgb(y).clamp(0.0, 1.0)[0].reshape(3, -1)
        out["rgb_mean"][str(s)] = [round(float(v), 4) for v in rgb.mean(1)]
        out["rgb_std"][str(s)] = [
            round(float(v), 4) for v in rgb.std(1, unbiased=False)
        ]
    # regrowth after an erased disc
    n = 128
    z = run(m, torch.zeros(1, CHN, n, n), 512, gen)
    yy, xx = torch.meshgrid(torch.arange(n) + 0.5, torch.arange(n) + 0.5, indexing="ij")
    disc = ((xx - n / 2) ** 2 + (yy - n / 2) ** 2) <= 16**2
    w0, w1 = n // 2 - 20, n // 2 + 20

    def window(v: torch.Tensor) -> float:
        return round(float(loss(to_rgb(v[:, :, w0:w1, w0:w1]))), 3)

    regrow = {
        "erase_at": 512,
        "radius": 16,
        "window": 40,
        "before": window(z),
        "after": {},
    }
    z[:, :, disc] = 0.0
    t = 0
    for s in (32, 64, 128, 256):
        z = run(m, z, s - t, gen)
        t = s
        regrow["after"][str(s)] = window(z)
    out["regrow"] = regrow
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--runs", type=Path, required=True)
    ap.add_argument("--targets", type=Path, required=True)
    ap.add_argument("--only", nargs="*", default=None)
    a = ap.parse_args()
    torch.set_num_threads(8)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "textures.json"
    old = (
        json.loads(manifest_path.read_text())
        if manifest_path.exists()
        else {"textures": []}
    )
    by_id = {t["id"]: t for t in old["textures"]}
    for tid in a.only or [
        t for t in TEXTURES if (a.runs / f"{t}.weights.npy").exists()
    ]:
        flat = np.load(a.runs / f"{tid}.weights.npy").astype("<f4")
        assert flat.size == HIDDEN + HIDDEN * PERC + CHN * HIDDEN, flat.size
        runinfo = json.loads((a.runs / f"{tid}.run.json").read_text())
        target = np.load(a.targets / f"{tid}.npy")
        meas = measure(flat, target)
        (OUT / f"{tid}.bin").write_bytes(flat.tobytes())
        Image.fromarray((target * 255 + 0.5).astype(np.uint8)).save(
            OUT / f"{tid}-target.png"
        )
        name, blurb = WORDS[tid]
        training = {k: v for k, v in runinfo.items() if k != "id"}
        by_id[tid] = {
            "id": tid,
            "name": name,
            "blurb": blurb,
            "weights": f"textures/{tid}.bin",
            "sha256": hashlib.sha256(flat.tobytes()).hexdigest(),
            "target": f"textures/{tid}-target.png",
            "how": TEXTURES[tid]["how"],
            "training": training,
            "measured": meas,
        }
        print(
            tid,
            json.dumps(meas["style_by_step"]),
            meas["regrow"]["before"],
            meas["regrow"]["after"],
            flush=True,
        )
    order = [t for t in TEXTURES if t in by_id]
    manifest = {
        "_what": "Grow v2 Textures (rebuild-v2 04-neural-ca.md M3): texture NCAs trained by packages/neural-ca/textures/train.py, measured by build.py",
        "reproducibility": REPRODUCIBILITY,
        "layout": {
            "channels": CHN,
            "hidden": HIDDEN,
            "count": HIDDEN + HIDDEN * PERC + CHN * HIDDEN,
            "b1Off": 0,
            "w1Off": HIDDEN,
            "w2Off": HIDDEN + HIDDEN * PERC,
        },
        "textures": [by_id[t] for t in order],
    }
    manifest_path.write_text(json.dumps(manifest, indent=1) + "\n")


if __name__ == "__main__":
    main()
