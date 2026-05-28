"""``save_png`` — the rendered-RGB-image PNG writer (D-D resolution).

The neural-rendered capture category stores a rendered RGB image per step
(``docs/phases/phase-3-plan.md`` §3.2.3). No existing common-* module exposes an
``(H, W, 3)``-RGB-array → PNG writer — common-py's ``plot_field_2d`` is a
colormapped single-channel field ``imshow``, semantically wrong for an RGB
render — so common-3dgs ships its own writer (D-D resolved to "common-3dgs
writer"). Backed by matplotlib ``imsave`` (the repo's established image-writing
dependency; lazily imported so headless / non-image consumers do not pay the cost).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

_NOT_IMPL = "common-3dgs Stage 1a scaffold: implementation lands at Stage 1b"


def save_png(image: np.ndarray, path: str | Path) -> Path:
    """Write an ``(H, W, 3) float32`` image in ``[0, 1]`` to ``path`` as PNG.

    Clamps to ``[0, 1]`` before quantizing to 8-bit. Returns the written path.
    """
    raise NotImplementedError(_NOT_IMPL)
