"""``Camera`` — view + projection construction for the 3DGS renderer (§3.2.1).

Carries the world→view (``view_matrix``) and view→clip (``projection_matrix``)
transforms, the near/far planes, and the image dimensions. Matrix conventions
follow the vendored Inria upstream (``references/3DGS-reference/`` —
``utils/graphics_utils.py`` ``getWorld2View2`` / ``getProjectionMatrix``):
right-handed, column-vector (``p_clip = projection @ view @ p_world``), 4x4
row-major NumPy ``float32``. The convention is documented explicitly in
``docs/common/3dgs.md`` and cross-checked against the upstream at Stage 1b.
"""

from __future__ import annotations

import numpy as np

_NOT_IMPL = "common-3dgs Stage 1a scaffold: implementation lands at Stage 1b"


class Camera:
    """A pinhole camera: view + projection matrices, near/far, image dims."""

    #: 4x4 world→view transform, row-major float32 (set in ``__init__``).
    view_matrix: np.ndarray
    #: 4x4 view→clip transform, row-major float32.
    projection_matrix: np.ndarray
    near: float
    far: float
    image_height: int
    image_width: int

    def __init__(
        self,
        view_matrix: np.ndarray,
        projection_matrix: np.ndarray,
        *,
        near: float,
        far: float,
        image_height: int,
        image_width: int,
    ) -> None:
        """Construct from explicit matrices + planes + image dimensions.

        Validates the matrices are ``(4, 4)`` and the dimensions positive (Stage 1b).
        """
        raise NotImplementedError(_NOT_IMPL)

    @classmethod
    def look_at(
        cls,
        position: tuple[float, float, float] | np.ndarray,
        target: tuple[float, float, float] | np.ndarray,
        up: tuple[float, float, float] | np.ndarray = (0.0, 1.0, 0.0),
        *,
        fov_y: float,
        image_height: int,
        image_width: int,
        near: float = 0.01,
        far: float = 100.0,
    ) -> Camera:
        """Build a camera from an eye position, look-at target, up vector, and
        vertical field-of-view (radians). Aspect ratio is ``image_width /
        image_height``."""
        raise NotImplementedError(_NOT_IMPL)
