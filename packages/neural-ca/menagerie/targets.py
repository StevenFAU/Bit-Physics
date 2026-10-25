"""Procedural targets for the Grow Menagerie (rebuild-v2 04-neural-ca.md, M1).

Each organism is drawn here from ellipses, capsules and half-planes in a 40 x 40
box, supersampled 4 x 4 at the edges, and padded to the 64 x 64 dish the v2 page
runs (12 cells of empty agar on every side). Output is premultiplied RGBA on a
transparent field: the Distill target convention, and the one the trainer's
loss reads.

No emoji fonts or images are vendored: the package's own target
(``neural_ca/target.py``) avoids them for licence reasons, and so does this
file. The gecko and starfish are the training spike's
(``packages/neural-ca/train-spike/spike_ref.py``), copied so this file stands
alone.

    uv run --no-sync python packages/neural-ca/menagerie/targets.py --out <dir>

writes ``<id>.f32`` (64 x 64 x 4 little-endian f32) and ``target-<id>.png``.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np

SIZE = 40
PAD = 12
GRID = SIZE + 2 * PAD  # 64, the live dish

Pt = tuple[float, float]


def _capsule(px: np.ndarray, py: np.ndarray, a: Pt, b: Pt, r: float) -> np.ndarray:
    ax, ay = a
    bx, by = b
    vx, vy = bx - ax, by - ay
    t = np.clip(
        ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy + 1e-12), 0.0, 1.0
    )
    dx = px - (ax + t * vx)
    dy = py - (ay + t * vy)
    return dx * dx + dy * dy <= r * r


def _ellipse(
    px: np.ndarray, py: np.ndarray, c: Pt, rx: float, ry: float, deg: float = 0.0
) -> np.ndarray:
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    dx = px - c[0]
    dy = py - c[1]
    u = dx * ca + dy * sa
    v = -dx * sa + dy * ca
    return (u / rx) ** 2 + (v / ry) ** 2 <= 1.0


def _disc(px: np.ndarray, py: np.ndarray, c: Pt, r: float) -> np.ndarray:
    return _ellipse(px, py, c, r, r)


def _mirror(f, px: np.ndarray, py: np.ndarray) -> np.ndarray:  # type: ignore[no-untyped-def]
    """f drawn on the left half plus its mirror about x = 20."""
    return f(px, py) | f(40.0 - px, py)


# ----------------------------------------------------------------- organisms


def gecko(px: np.ndarray, py: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The spike's lizard: thin limbs and a curled tail (the hard parts of the Distill lizard)."""
    col = np.zeros(px.shape + (3,), dtype=np.float32)
    body = _ellipse(px, py, (20.0, 20.5), 4.6, 8.5)
    head = _ellipse(px, py, (20.0, 9.0), 4.0, 4.6)
    neck = _capsule(px, py, (20.0, 10.0), (20.0, 14.0), 3.0)
    tail = (
        _capsule(px, py, (20.0, 27.0), (21.5, 32.0), 2.6)
        | _capsule(px, py, (21.5, 32.0), (25.0, 35.5), 2.0)
        | _capsule(px, py, (25.0, 35.5), (30.0, 36.5), 1.4)
        | _capsule(px, py, (30.0, 36.5), (33.5, 34.5), 1.0)
    )
    legs = np.zeros_like(body)
    for sx in (-1.0, 1.0):
        for (ax, ay), (kx, ky), (fx, fy) in (
            ((3.0, -4.5), (9.0, -6.5), (11.0, -11.0)),
            ((3.0, 5.0), (9.0, 7.5), (11.0, 12.0)),
        ):
            a = (20.0 + sx * ax, 20.5 + ay)
            k = (20.0 + sx * kx, 20.5 + ky)
            f = (20.0 + sx * fx, 20.5 + fy)
            legs |= _capsule(px, py, a, k, 1.5) | _capsule(px, py, k, f, 1.3)
            legs |= _ellipse(px, py, f, 1.9, 1.9)
    inside = body | head | neck | tail | legs
    col[...] = (0.36, 0.74, 0.24)
    col[_ellipse(px, py, (20.0, 20.5), 2.0, 6.5)] = (0.62, 0.86, 0.36)
    for cx, cy in ((18.0, 16.0), (22.0, 19.0), (18.5, 23.5), (21.5, 26.5)):
        col[_disc(px, py, (cx, cy), 1.1)] = (0.14, 0.40, 0.13)
    for cx in (18.0, 22.0):
        col[_disc(px, py, (cx, 7.8), 0.95)] = (0.05, 0.08, 0.05)
    return inside, col


def starfish(px: np.ndarray, py: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The spike's five-armed star."""
    col = np.zeros(px.shape + (3,), dtype=np.float32)
    ang = np.arctan2(py - 20.0, px - 20.0) + math.pi / 2.0
    r = np.hypot(px - 20.0, py - 20.0)
    edge = 17.0 * (0.42 + 0.58 * ((0.5 + 0.5 * np.cos(5.0 * ang)) ** 1.6))
    inside = r <= edge
    col[...] = (0.98, 0.50, 0.20)
    col[r <= 5.0] = (1.0, 0.80, 0.50)
    return inside, col


def butterfly(px: np.ndarray, py: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Top view: blue forewings and hindwings with dark borders and spots, a dark body, clubbed antennae."""
    col = np.zeros(px.shape + (3,), dtype=np.float32)
    fore = lambda x, y: _ellipse(x, y, (12.6, 15.0), 9.0, 6.4, -32.0)  # noqa: E731
    hind = lambda x, y: _ellipse(x, y, (14.4, 26.2), 6.6, 5.4, 28.0)  # noqa: E731
    fore_in = lambda x, y: _ellipse(x, y, (12.9, 15.2), 6.8, 4.4, -32.0)  # noqa: E731
    hind_in = lambda x, y: _ellipse(x, y, (14.6, 26.0), 4.6, 3.5, 28.0)  # noqa: E731
    wings = _mirror(fore, px, py) | _mirror(hind, px, py)
    body = _capsule(px, py, (20.0, 11.0), (20.0, 31.0), 1.7)
    head = _disc(px, py, (20.0, 9.6), 2.3)
    antennae = np.zeros_like(body)
    for s in (-1.0, 1.0):
        antennae |= _capsule(px, py, (20.0 + s * 0.8, 8.0), (20.0 + s * 4.5, 2.6), 0.9)
        antennae |= _disc(px, py, (20.0 + s * 4.8, 2.3), 1.4)
    inside = wings | body | head | antennae
    col[...] = (0.10, 0.16, 0.42)  # the dark border
    col[_mirror(fore_in, px, py) | _mirror(hind_in, px, py)] = (0.16, 0.48, 0.96)
    col[_mirror(lambda x, y: _disc(x, y, (7.5, 11.0), 1.5), px, py)] = (
        0.95,
        0.96,
        0.98,
    )
    col[_mirror(lambda x, y: _disc(x, y, (13.9, 28.1), 1.7), px, py)] = (
        1.0,
        0.62,
        0.12,
    )
    col[body | head | antennae] = (0.36, 0.25, 0.16)
    return inside, col


def ladybug(px: np.ndarray, py: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Top view: a red shell with a black seam and six spots, a black head with white eyes, six short legs."""
    col = np.zeros(px.shape + (3,), dtype=np.float32)
    shell = _ellipse(px, py, (20.0, 22.5), 12.5, 13.5)
    head = _ellipse(px, py, (20.0, 8.6), 6.4, 4.6)
    legs = np.zeros_like(shell)
    for (ax, ay), (bx, by) in (
        ((9.0, 15.0), (5.0, 11.5)),
        ((7.8, 22.5), (3.2, 22.5)),
        ((9.0, 30.0), (5.0, 33.5)),
    ):
        legs |= _mirror(
            lambda x, y, a=(ax, ay), b=(bx, by): _capsule(x, y, a, b, 1.1), px, py
        )
    inside = shell | head | legs
    col[...] = (0.15, 0.12, 0.12)
    col[shell] = (0.88, 0.12, 0.08)
    col[shell & _capsule(px, py, (20.0, 10.0), (20.0, 36.0), 0.8)] = (0.15, 0.12, 0.12)
    for c, r in (((14.0, 16.5), 2.5), ((12.6, 25.0), 2.6), ((16.0, 32.0), 2.2)):
        col[_mirror(lambda x, y, c=c, r=r: _disc(x, y, c, r), px, py)] = (
            0.15,
            0.12,
            0.12,
        )
    col[_mirror(lambda x, y: _disc(x, y, (17.3, 7.6), 1.15), px, py)] = (
        0.96,
        0.96,
        0.94,
    )
    return inside, col


def mushroom(px: np.ndarray, py: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Side view: a red domed cap with white spots, cream gills and a stout stem."""
    col = np.zeros(px.shape + (3,), dtype=np.float32)
    cap = _ellipse(px, py, (20.0, 19.0), 17.5, 14.0) & (py <= 20.0)
    gills = _ellipse(px, py, (20.0, 20.0), 14.5, 2.6)
    stem = _capsule(px, py, (20.0, 23.0), (20.0, 33.5), 4.6) | _ellipse(
        px, py, (20.0, 34.5), 6.4, 3.4
    )
    inside = cap | gills | stem
    col[...] = (0.94, 0.89, 0.78)
    col[cap] = (0.84, 0.16, 0.12)
    for c, r in (
        ((11.5, 13.0), 2.7),
        ((21.0, 9.0), 2.4),
        ((29.0, 13.5), 2.5),
        ((17.0, 16.5), 1.9),
        ((32.5, 18.0), 1.5),
        ((6.8, 17.8), 1.4),
    ):
        col[cap & _disc(px, py, c, r)] = (0.97, 0.95, 0.90)
    col[gills & ~(cap & (py < 19.0))] = (0.78, 0.66, 0.50)
    return inside, col


def fish(px: np.ndarray, py: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Side view: an orange clownfish with white bands, a dorsal fin, a forked tail and an eye."""
    col = np.zeros(px.shape + (3,), dtype=np.float32)
    body = _ellipse(px, py, (17.5, 20.0), 13.5, 9.0)
    tail = (px >= 28.0) & (px <= 38.0) & (np.abs(py - 20.0) <= (px - 28.0) * 0.95 + 1.6)
    tail &= ~((px >= 35.0) & (np.abs(py - 20.0) <= (px - 35.0) * 1.2))  # the fork
    dorsal = _ellipse(px, py, (17.0, 11.6), 7.0, 3.4, -8.0)
    ventral = _ellipse(px, py, (19.0, 28.6), 4.4, 2.4, 12.0)
    inside = body | tail | dorsal | ventral
    col[...] = (1.0, 0.47, 0.08)
    bands = (
        ((px >= 9.4) & (px <= 12.2))
        | ((px >= 19.4) & (px <= 22.0))
        | ((px >= 28.0) & (px <= 29.8))
    )
    col[bands & (body | dorsal | ventral | tail)] = (0.98, 0.97, 0.95)
    col[_disc(px, py, (8.6, 17.4), 1.9)] = (0.98, 0.97, 0.95)
    col[_disc(px, py, (8.4, 17.4), 1.05)] = (0.05, 0.05, 0.08)
    return inside, col


def turtle(px: np.ndarray, py: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Top view: a domed olive shell with lighter scutes and a dark rim, head, four flippers, a tail."""
    col = np.zeros(px.shape + (3,), dtype=np.float32)
    shell = _ellipse(px, py, (20.0, 21.0), 11.0, 13.0)
    head = _ellipse(px, py, (20.0, 5.6), 3.6, 4.2)
    neck = _capsule(px, py, (20.0, 6.0), (20.0, 9.5), 2.6)
    flip = _mirror(
        lambda x, y: (
            _ellipse(x, y, (8.6, 13.0), 5.4, 2.7, -32.0)
            | _ellipse(x, y, (10.2, 31.0), 3.8, 2.3, 32.0)
        ),
        px,
        py,
    )
    tail = _capsule(px, py, (20.0, 33.0), (20.0, 37.4), 1.3)
    inside = shell | head | neck | flip | tail
    col[...] = (0.52, 0.74, 0.42)  # skin
    col[shell] = (0.30, 0.38, 0.13)  # the rim
    col[_ellipse(px, py, (20.0, 21.0), 9.4, 11.4)] = (0.44, 0.54, 0.19)
    for c, r in (
        ((20.0, 21.0), 3.4),
        ((20.0, 13.4), 2.8),
        ((20.0, 28.6), 2.8),
        ((14.4, 17.2), 2.4),
        ((14.4, 24.8), 2.4),
    ):
        col[_mirror(lambda x, y, c=c, r=r: _disc(x, y, c, r), px, py)] = (
            0.64,
            0.72,
            0.30,
        )
    col[_mirror(lambda x, y: _disc(x, y, (18.5, 4.6), 0.85), px, py)] = (
        0.05,
        0.06,
        0.04,
    )
    return inside, col


ORGANISMS = {
    "gecko": gecko,
    "starfish": starfish,
    "butterfly": butterfly,
    "ladybug": ladybug,
    "mushroom": mushroom,
    "fish": fish,
    "turtle": turtle,
}


def make_target(name: str, size: int = SIZE, pad: int = PAD, ss: int = 4) -> np.ndarray:
    """(G, G, 4) premultiplied RGBA, G = size + 2 * pad; ss x ss supersampled edges."""
    g = size + 2 * pad
    off = (np.arange(ss, dtype=np.float32) + 0.5) / ss
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    px = (xx[..., None, None] + off[None, None, None, :]).astype(np.float64)
    py = (yy[..., None, None] + off[None, None, :, None]).astype(np.float64)
    px, py = np.broadcast_arrays(px, py)
    inside, col = ORGANISMS[name](px, py)
    a = inside.mean(axis=(2, 3))
    rgb = (col * inside[..., None]).mean(axis=(2, 3))  # premultiplied by coverage
    out = np.zeros((g, g, 4), dtype=np.float32)
    out[pad : pad + size, pad : pad + size, :3] = rgb
    out[pad : pad + size, pad : pad + size, 3] = a
    return out


def composite(rgba: np.ndarray, scale: int = 6) -> np.ndarray:
    """Premultiplied RGBA over the dish colour, nearest-upscaled, uint8."""
    bg = np.array([0.04, 0.07, 0.08], dtype=np.float32)
    c = np.clip(rgba, 0.0, 1.0)
    rgb = c[..., :3] + (1.0 - c[..., 3:4]) * bg
    img = (np.clip(rgb, 0, 1) * 255.0 + 0.5).astype(np.uint8)
    return np.kron(img, np.ones((scale, scale, 1), dtype=np.uint8))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--only", nargs="*", default=None)
    a = ap.parse_args()
    from PIL import Image

    a.out.mkdir(parents=True, exist_ok=True)
    tiles = []
    for name in a.only or ORGANISMS:
        t = make_target(name)
        (a.out / f"{name}.f32").write_bytes(t.astype("<f4").tobytes())
        img = composite(t, scale=6)
        Image.fromarray(img).save(a.out / f"target-{name}.png")
        tiles.append(img)
        print(
            f"{name:10s} coverage {float(t[..., 3].mean()):.3f}  cells>0.5 {int((t[..., 3] > 0.5).sum())}"
        )
    Image.fromarray(np.concatenate(tiles, axis=1)).save(a.out / "targets.png")


if __name__ == "__main__":
    main()
