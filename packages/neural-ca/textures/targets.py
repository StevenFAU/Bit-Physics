"""Procedural target textures for Grow's Textures scene (rebuild-v2 04-neural-ca.md, M3).

Every target is drawn here, on a periodic (toroidal) square, so it tiles:

- ``spots`` and ``maze``: Gray-Scott reaction-diffusion (Pearson 1993 parameters), run to a
  settled pattern on a periodic grid, then coloured with two tones;
- ``giraffe``: a periodic Voronoi diagram of jittered lattice points, patches inside pale lines;
- ``weave``: a basket weave of alternating thread bands with shading across each thread.

No images, fonts or photographs are vendored: the package's own targets avoid them for licence
reasons, and so does this file. Output is sRGB in [0, 1], H x W x 3.

    uv run --no-sync python packages/neural-ca/textures/targets.py --out <dir>

writes ``<id>.npy`` (float32) and ``<id>-target.png`` for each texture.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

SIZE = 64  # the training grid (and the target's period), cells


def _hex(c: str) -> np.ndarray:
    c = c.lstrip("#")
    return np.array(
        [int(c[i : i + 2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float64
    )


def _lap(a: np.ndarray) -> np.ndarray:
    return (
        np.roll(a, 1, 0)
        + np.roll(a, -1, 0)
        + np.roll(a, 1, 1)
        + np.roll(a, -1, 1)
        - 4.0 * a
    )


def gray_scott(
    f: float, k: float, steps: int, seed: int, size: int = SIZE
) -> np.ndarray:
    """Pearson's Gray-Scott on a periodic grid (Du = 0.16, Dv = 0.08, dt = 1); returns v."""
    rng = np.random.default_rng(seed)
    u = np.ones((size, size))
    v = np.zeros((size, size))
    # a scatter of small squares of v
    for _ in range(max(6, size * size // 300)):
        x, y = rng.integers(0, size, 2)
        r = 2
        idx = np.ix_(
            [(y + i) % size for i in range(-r, r + 1)],
            [(x + i) % size for i in range(-r, r + 1)],
        )
        u[idx] = 0.5
        v[idx] = 0.25
    u += 0.02 * rng.standard_normal(u.shape)
    v += 0.02 * rng.standard_normal(v.shape)
    du, dv = 0.16, 0.08
    for _ in range(steps):
        uvv = u * v * v
        u = u + du * _lap(u) - uvv + f * (1.0 - u)
        v = v + dv * _lap(v) + uvv - (f + k) * v
    return v


def _two_tone(v: np.ndarray, lo: str, hi: str, edge: tuple[float, float]) -> np.ndarray:
    t = np.clip((v - edge[0]) / (edge[1] - edge[0]), 0.0, 1.0)
    t = t * t * (3 - 2 * t)
    return (
        _hex(lo)[None, None] * (1 - t[..., None]) + _hex(hi)[None, None] * t[..., None]
    )


def spots(seed: int = 1) -> np.ndarray:
    v = gray_scott(0.0367, 0.0649, 12000, seed)
    return _two_tone(v, "#e9c88c", "#3b2416", (0.12, 0.3))


def maze(seed: int = 2) -> np.ndarray:
    v = gray_scott(0.029, 0.057, 12000, seed)
    return _two_tone(v, "#123a4a", "#f2a07b", (0.14, 0.3))


def giraffe(seed: int = 3, size: int = SIZE) -> np.ndarray:
    """Patches of a periodic Voronoi diagram of a jittered 4 x 4 lattice, inside pale lines."""
    rng = np.random.default_rng(seed)
    n = 4
    cell = size / n
    pts = []
    for j in range(n):
        for i in range(n):
            pts.append(
                (
                    (i + 0.5 + rng.uniform(-0.3, 0.3)) * cell,
                    (j + 0.5 + rng.uniform(-0.3, 0.3)) * cell,
                )
            )
    pts = np.array(pts)
    shade = rng.uniform(-0.06, 0.06, len(pts))
    yy, xx = np.mgrid[0:size, 0:size] + 0.5
    d = np.empty((len(pts), size, size))
    for k, (px, py) in enumerate(pts):
        dx = np.abs(xx - px)
        dy = np.abs(yy - py)
        dx = np.minimum(dx, size - dx)
        dy = np.minimum(dy, size - dy)
        d[k] = np.hypot(dx, dy)
    order = np.sort(d, axis=0)
    nearest = np.argmin(d, axis=0)
    gap = order[1] - order[0]  # ~2 x distance to the bisector
    line = np.clip((gap - 1.2) / 1.6, 0.0, 1.0)  # 0 on the line, 1 inside a patch
    line = line * line * (3 - 2 * line)
    patch = _hex("#a8541e")[None, None] + shade[nearest][..., None] * np.array(
        [1.0, 0.7, 0.4]
    )
    # patches darken towards their centres a little
    patch = (
        patch * (1.0 - 0.18 * np.clip(1.0 - order[0] / (0.55 * cell), 0, 1))[..., None]
    )
    pale = _hex("#efe1bd")[None, None]
    return pale * (1 - line[..., None]) + patch * line[..., None]


def weave(size: int = SIZE) -> np.ndarray:
    """A basket weave: 4-cell threads in 8 x 8 blocks, alternating direction, shaded across each thread."""
    yy, xx = np.mgrid[0:size, 0:size] + 0.5
    block = 8
    bx = (xx // block).astype(int)
    by = (yy // block).astype(int)
    horiz = (bx + by) % 2 == 0
    thread = 4
    across = np.where(horiz, yy % thread, xx % thread) / thread  # 0..1 across a thread
    along = np.where(horiz, xx % block, yy % block) / block  # 0..1 along the block
    shade = 0.55 + 0.45 * np.sin(np.pi * across)  # round threads
    shade *= 0.85 + 0.15 * np.sin(np.pi * along)  # dips where a thread goes under
    warm = _hex("#d9a441")
    cool = _hex("#3c6e8f")
    col = np.where(horiz[..., None], warm[None, None], cool[None, None])
    return np.clip(col * shade[..., None] + 0.04, 0.0, 1.0)


TEXTURES = {
    "spots": {
        "draw": spots,
        "how": "Gray-Scott F=0.0367 k=0.0649, Du=0.16 Dv=0.08, 12,000 steps, seed 1; v mapped sand -> umber",
    },
    "maze": {
        "draw": maze,
        "how": "Gray-Scott F=0.029 k=0.057, Du=0.16 Dv=0.08, 12,000 steps, seed 2; v mapped deep teal -> coral",
    },
    "giraffe": {
        "draw": giraffe,
        "how": "periodic Voronoi of a jittered 4 x 4 lattice (seed 3), patches inside pale lines",
    },
    "weave": {
        "draw": weave,
        "how": "basket weave: 4-cell threads in 8 x 8 blocks, alternating direction",
    },
}


def draw(tid: str) -> np.ndarray:
    return np.clip(TEXTURES[tid]["draw"](), 0.0, 1.0).astype(np.float32)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--only", nargs="*", default=None)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    from PIL import Image

    for tid in a.only or TEXTURES:
        img = draw(tid)
        np.save(a.out / f"{tid}.npy", img)
        Image.fromarray((img * 255 + 0.5).astype(np.uint8)).save(
            a.out / f"{tid}-target.png"
        )
        print(tid, img.shape, img.mean(axis=(0, 1)).round(3))


if __name__ == "__main__":
    main()
