"""Canonical training target — a procedurally-generated emoji-style glyph.

§0.3 SHIFT-from-discovered: the Distill reference trains on a noto-emoji PNG
(`growing_ca.ipynb` `load_emoji`), but noto-emoji is **OFL-1.1** (a font license
with redistribution restrictions, incompatible with the repo's MIT distribution
posture without operator routing). To keep the package self-contained and the
license surface clean, the canonical "growing-emoji" target is generated
procedurally here (deterministic NumPy; premultiplied-alpha RGBA on a
transparent background) — a concentric two-tone disk glyph. The Distill emoji-target
approach is cited, not vendored; the cross-stack gate-14 validity is unaffected
(it compares D-inference vs B-inference of the SAME trained model — the target's
origin is irrelevant to equivalence).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def make_emoji_target(grid_size: int = 64) -> NDArray[np.float32]:
    """A deterministic emoji-style two-tone-disk RGBA target, ``(grid, grid, 4)`` in
    [0, 1] with premultiplied alpha (RGB premultiplied by alpha; transparent
    background) — matching the Distill premultiplied-alpha convention."""
    g = grid_size
    yy, xx = np.mgrid[0:g, 0:g].astype(np.float32)
    cx = cy = (g - 1) / 2.0
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)

    # A clean concentric two-tone disk ("token" glyph): a warm-yellow disk with a
    # contrasting orange core. Structured enough for a meaningful render-similarity
    # gate (SSIM/LPIPS see the ring boundary), simple enough to learn stably (no
    # sub-pixel features that an under-trained Growing-NCA cannot reproduce).
    disk_r = 0.40 * g
    core_r = 0.18 * g
    rgb = np.zeros((g, g, 3), dtype=np.float32)
    alpha = np.zeros((g, g), dtype=np.float32)

    disk = r <= disk_r
    alpha[disk] = 1.0
    rgb[disk] = np.array([1.0, 0.78, 0.10], dtype=np.float32)  # warm yellow

    core = r <= core_r
    rgb[core] = np.array([0.95, 0.35, 0.05], dtype=np.float32)  # orange core

    # Premultiply RGB by alpha (transparent background -> RGB 0 where alpha 0).
    rgba = np.zeros((g, g, 4), dtype=np.float32)
    rgba[..., :3] = rgb * alpha[..., None]
    rgba[..., 3] = alpha
    return rgba
