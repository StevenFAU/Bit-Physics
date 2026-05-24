"""Particles subsystem (Subsystem 4) — §1.9.1 surface.

Base particle storage (position / velocity / mass) over Warp arrays. Per
§1.9.1, MPM-specific extensions (deformation gradient, material id, …) live
in the MPM sim's own wrapper, NOT here. Capture I/O marshals through NumPy
(``wp.array.numpy()`` / ``wp.from_numpy``) — Warp arrays do not serialize
to HDF5 directly.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import warp as wp

from .._internal.devices import resolve_device


@dataclass
class Particles:
    """Particle storage compatible with capture-v1 (positions/velocities/masses)."""

    positions: wp.array  # wp.array(dtype=wp.vec3), shape (N,)
    velocities: wp.array  # wp.array(dtype=wp.vec3), shape (N,)
    masses: wp.array  # wp.array(dtype=wp.float32), shape (N,)

    @property
    def count(self) -> int:
        return int(self.positions.shape[0])

    def to_capture_payload(self) -> dict[str, np.ndarray]:
        """Returns {'positions': (N, 3), 'velocities': (N, 3), 'masses': (N,)}."""
        return {
            "positions": self.positions.numpy(),
            "velocities": self.velocities.numpy(),
            "masses": self.masses.numpy(),
        }

    @classmethod
    def from_capture_payload(cls, payload: dict, device: str | None = None) -> Particles:
        dev = resolve_device(device)
        with wp.ScopedDevice(dev):
            return cls(
                positions=wp.from_numpy(
                    np.ascontiguousarray(payload["positions"], dtype=np.float32), dtype=wp.vec3
                ),
                velocities=wp.from_numpy(
                    np.ascontiguousarray(payload["velocities"], dtype=np.float32), dtype=wp.vec3
                ),
                masses=wp.from_numpy(
                    np.ascontiguousarray(payload["masses"], dtype=np.float32), dtype=wp.float32
                ),
            )


def allocate_particles(n: int, device: str | None = None) -> Particles:
    """Allocate ``Particles`` with ``n`` elements, zeroed."""
    dev = resolve_device(device)
    with wp.ScopedDevice(dev):
        return Particles(
            positions=wp.zeros(n, dtype=wp.vec3),
            velocities=wp.zeros(n, dtype=wp.vec3),
            masses=wp.zeros(n, dtype=wp.float32),
        )
