"""Grids subsystem (Subsystem 5) — §1.9.1 surface.

Dense 3D scalar / vector fields over Warp arrays, collocated cell-centered
(the smoke-Stack-D plan-drafting S-S3 convention: a single value per cell,
no MAC staggering). ``spacing`` / ``origin`` describe the cell-centered
sample lattice. Capture I/O marshals through NumPy.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import warp as wp

from .._internal.devices import resolve_device

_Vec3f = tuple[float, float, float]


@dataclass
class ScalarField3D:
    """3D scalar field, dense storage, compatible with capture-v1."""

    data: wp.array  # wp.array(dtype=wp.float32, ndim=3), shape (Nx, Ny, Nz)
    spacing: _Vec3f
    origin: _Vec3f

    @property
    def shape(self) -> tuple[int, int, int]:
        return tuple(int(d) for d in self.data.shape)  # type: ignore[return-value]

    def to_capture_payload(self) -> dict[str, np.ndarray]:
        """Returns {'data': (Nx, Ny, Nz), 'spacing': (3,), 'origin': (3,)}."""
        return {
            "data": self.data.numpy(),
            "spacing": np.asarray(self.spacing, dtype=np.float64),
            "origin": np.asarray(self.origin, dtype=np.float64),
        }

    @classmethod
    def from_capture_payload(cls, payload: dict, device: str | None = None) -> ScalarField3D:
        dev = resolve_device(device)
        with wp.ScopedDevice(dev):
            # Explicit dtype is REQUIRED: wp.from_numpy on a 3-D scalar array
            # without it mis-infers the shape (collapses to (Nx,)).
            data = wp.from_numpy(
                np.ascontiguousarray(payload["data"], dtype=np.float32), dtype=wp.float32
            )
        return cls(
            data=data,
            spacing=tuple(float(x) for x in payload["spacing"]),  # type: ignore[arg-type]
            origin=tuple(float(x) for x in payload["origin"]),  # type: ignore[arg-type]
        )


@dataclass
class VectorField3D:
    """3D vector field; matches ScalarField3D shape with an extra component axis."""

    data: wp.array  # wp.array(dtype=wp.vec3, ndim=3), shape (Nx, Ny, Nz)
    spacing: _Vec3f
    origin: _Vec3f

    @property
    def shape(self) -> tuple[int, int, int]:
        return tuple(int(d) for d in self.data.shape)  # type: ignore[return-value]

    def to_capture_payload(self) -> dict[str, np.ndarray]:
        """Returns {'data': (Nx, Ny, Nz, 3), 'spacing': (3,), 'origin': (3,)}."""
        return {
            "data": self.data.numpy(),
            "spacing": np.asarray(self.spacing, dtype=np.float64),
            "origin": np.asarray(self.origin, dtype=np.float64),
        }

    @classmethod
    def from_capture_payload(cls, payload: dict, device: str | None = None) -> VectorField3D:
        dev = resolve_device(device)
        with wp.ScopedDevice(dev):
            data = wp.from_numpy(
                np.ascontiguousarray(payload["data"], dtype=np.float32), dtype=wp.vec3
            )
        return cls(
            data=data,
            spacing=tuple(float(x) for x in payload["spacing"]),  # type: ignore[arg-type]
            origin=tuple(float(x) for x in payload["origin"]),  # type: ignore[arg-type]
        )


def allocate_scalar_field(
    shape: tuple[int, int, int],
    *,
    spacing: _Vec3f = (1.0, 1.0, 1.0),
    origin: _Vec3f = (0.0, 0.0, 0.0),
    device: str | None = None,
) -> ScalarField3D:
    """Allocate a zeroed dense 3D scalar field."""
    dev = resolve_device(device)
    with wp.ScopedDevice(dev):
        data = wp.zeros(tuple(int(s) for s in shape), dtype=wp.float32)
    return ScalarField3D(data=data, spacing=spacing, origin=origin)


def allocate_vector_field(
    shape: tuple[int, int, int],
    *,
    spacing: _Vec3f = (1.0, 1.0, 1.0),
    origin: _Vec3f = (0.0, 0.0, 0.0),
    device: str | None = None,
) -> VectorField3D:
    """Allocate a zeroed dense 3D vector field."""
    dev = resolve_device(device)
    with wp.ScopedDevice(dev):
        data = wp.zeros(tuple(int(s) for s in shape), dtype=wp.vec3)
    return VectorField3D(data=data, spacing=spacing, origin=origin)
