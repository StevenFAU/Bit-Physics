"""``render`` — the deterministic forward EWA-splatting renderer (§3.2.1).

Projects each 3D Gaussian to a screen-space 2D Gaussian (EWA splatting: the
local-affine Jacobian of the projective map applied to the 3D covariance),
evaluates its view-dependent colour from the spherical-harmonic bank, sorts the
splats by camera-space depth, and alpha-composites them front-to-back per pixel.

**Determinism (D-C).** The compositing is a per-pixel front-to-back *gather* over
a depth-sorted splat list — no atomic scatter, no parallel reduction over a
non-fixed worker pool. On Warp's CPU backend ``wp.launch`` runs serially over the
launch dimension, so the image is bit-identical run-to-run at fixed inputs
(``bit-exact-same-hw``; measured at Stage 1b). The depth sort uses a stable key so
ties resolve deterministically.

This module hosts ``@wp.kernel``-decorated functions at Stage 1b and therefore
deliberately omits ``from __future__ import annotations`` (Warp resolves kernel
argument annotations at decoration time; banked precedent O-W6 / the common-warp
kernel-module posture).
"""

import numpy as np

from .camera import Camera
from .model import GaussianSplatModel

_NOT_IMPL = "common-3dgs Stage 1a scaffold: implementation lands at Stage 1b"

#: Default background colour (RGB in [0, 1]).
BACKGROUND_DEFAULT = (0.0, 0.0, 0.0)


def render(
    model: GaussianSplatModel,
    camera: Camera,
    *,
    image_height: int | None = None,
    image_width: int | None = None,
    background: tuple[float, float, float] = BACKGROUND_DEFAULT,
) -> np.ndarray:
    """Render ``model`` from ``camera`` to an ``(H, W, 3) float32`` image in ``[0, 1]``.

    Image dimensions default to the camera's ``image_height`` / ``image_width`` when
    not given. An empty model (``N == 0``) returns a background-filled image of the
    requested shape/dtype. Deterministic given fixed inputs (D-C).
    """
    raise NotImplementedError(_NOT_IMPL)
