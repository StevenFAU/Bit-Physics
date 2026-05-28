"""``Camera`` — view + projection construction for the 3DGS renderer (§3.2.1).

Carries the world→view (``view_matrix``) and view→clip (``projection_matrix``)
transforms, the near/far planes, and the image dimensions. Conventions
(documented in ``docs/common/3dgs.md`` and cross-checked against the vendored
Inria ``references/3DGS-reference/utils/graphics_utils.py``
``getWorld2View2`` / ``getProjectionMatrix``):

- **Right-handed**, column-vector (``p_view = view @ p_world``), 4x4 row-major
  NumPy ``float32``.
- The camera looks down its **+Z** axis (COLMAP / Inria convention): a point in
  front of the camera has ``view-space z > 0``.
- ``view_matrix`` rows are ``[right; down; forward; (0,0,0,1)]`` with translation
  ``-R @ eye``. The image y-axis points down (standard raster coordinates).

``camera_center`` (world eye) and ``fov_y`` (vertical field of view, radians) are
derived in ``__init__`` so the renderer can build the EWA projection Jacobian
without re-deriving them; both are exposed as attributes.
"""

from __future__ import annotations

import math

import numpy as np


def _as_vec3(v: tuple[float, float, float] | np.ndarray) -> np.ndarray:
    out = np.asarray(v, dtype=np.float64).reshape(3)
    return out


def _normalize(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    if n == 0.0:
        raise ValueError("cannot normalize a zero-length vector")
    return v / n


class Camera:
    """A pinhole camera: view + projection matrices, near/far, image dims."""

    view_matrix: np.ndarray
    projection_matrix: np.ndarray
    near: float
    far: float
    image_height: int
    image_width: int
    camera_center: np.ndarray
    fov_y: float

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

        Validates the matrices are ``(4, 4)`` and the dimensions positive; derives
        ``camera_center`` (from the view matrix) and ``fov_y`` (from the projection
        matrix, assuming a symmetric perspective frustum).
        """
        vm = np.ascontiguousarray(view_matrix, dtype=np.float32)
        pm = np.ascontiguousarray(projection_matrix, dtype=np.float32)
        if vm.shape != (4, 4):
            raise ValueError(f"view_matrix must be (4, 4); got {vm.shape}")
        if pm.shape != (4, 4):
            raise ValueError(f"projection_matrix must be (4, 4); got {pm.shape}")
        if image_height <= 0 or image_width <= 0:
            raise ValueError("image_height and image_width must be positive")

        self.view_matrix = vm
        self.projection_matrix = pm
        self.near = float(near)
        self.far = float(far)
        self.image_height = int(image_height)
        self.image_width = int(image_width)

        rot = vm[:3, :3].astype(np.float64)
        trans = vm[:3, 3].astype(np.float64)
        self.camera_center = (-rot.T @ trans).astype(np.float32)

        p11 = float(pm[1, 1])
        if p11 <= 0.0:
            raise ValueError("projection_matrix[1, 1] must be positive (symmetric frustum)")
        self.fov_y = 2.0 * math.atan(1.0 / p11)

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
        image_height``; the camera looks down +Z toward ``target``."""
        eye = _as_vec3(position)
        fwd = _normalize(_as_vec3(target) - eye)  # camera +Z (looks toward target)
        right = _normalize(np.cross(_as_vec3(up), fwd))  # camera +X
        down = np.cross(fwd, right)  # camera +Y (image y points down)

        view = np.eye(4, dtype=np.float64)
        view[0, :3] = right
        view[1, :3] = down
        view[2, :3] = fwd
        view[:3, 3] = -view[:3, :3] @ eye

        aspect = image_width / image_height
        th = math.tan(fov_y / 2.0)
        proj = np.zeros((4, 4), dtype=np.float64)
        proj[0, 0] = 1.0 / (aspect * th)
        proj[1, 1] = 1.0 / th
        proj[2, 2] = (far + near) / (far - near)
        proj[2, 3] = -2.0 * far * near / (far - near)
        proj[3, 2] = 1.0  # +Z forward

        return cls(
            view.astype(np.float32),
            proj.astype(np.float32),
            near=near,
            far=far,
            image_height=image_height,
            image_width=image_width,
        )
