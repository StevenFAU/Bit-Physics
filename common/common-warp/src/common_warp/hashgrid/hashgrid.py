"""HashGrid subsystem (Subsystem 6) — §1.9.1 surface.

Thin wrapper over the native ``wp.HashGrid`` for SPH/MPM neighbor queries
(Phase-2 minimal: construct / build / query). Kernel-defining module:
deliberately omits ``from __future__ import annotations`` (mirroring the
tools/testkit/taichi_harness defensive posture for kernel modules; Warp
itself tolerates future-annotations per observation O-W6).

``wp.HashGrid`` is dimensioned by table extents (dim_x, dim_y, dim_z); the
§1.9.1 ``cell_size`` is passed to ``build`` as the spatial-hash cell radius.
Neighbor queries run inside a kernel (the ``wp.hash_grid_query`` /
``wp.hash_grid_query_next`` builtins are kernel-only); ``query_radius``
gathers the per-call neighbor indices back to the host.
"""

import numpy as np
import warp as wp

from .._internal.devices import resolve_device


@wp.kernel
def _query_radius_kernel(
    grid: wp.uint64,
    qpoint: wp.vec3,
    radius: float,
    points: wp.array(dtype=wp.vec3),
    out_idx: wp.array(dtype=wp.int32),
    out_count: wp.array(dtype=wp.int32),
):
    query = wp.hash_grid_query(grid, qpoint, radius)
    # Warp needs a MUTABLE int local here (hash_grid_query_next takes `int&`);
    # `int(0)` declares it mutable. A bare `0` literal is const-folded and the
    # generated C++ fails to bind the non-const reference. (ruff UP018/RUF046
    # would "simplify" int(0) -> 0 and break the kernel; both suppressed.)
    nbr = int(0)  # noqa: UP018, RUF046
    while wp.hash_grid_query_next(query, nbr):
        if wp.length(points[nbr] - qpoint) <= radius:
            slot = wp.atomic_add(out_count, 0, 1)
            if slot < out_idx.shape[0]:
                out_idx[slot] = nbr


class HashGrid:
    """Thin wrapper over ``wp.HashGrid`` for SPH/MPM neighbor queries.

    Phase-2 minimal: construction, build, query. Phase-3.7 may add
    incremental rebuild and spatial-hash tuning helpers.
    """

    def __init__(self, cell_size: float, max_particles: int, device: str | None = None):
        """Construct an empty hash grid sized for up to ``max_particles``."""
        self.cell_size = float(cell_size)
        self.max_particles = int(max_particles)
        self._device = resolve_device(device)
        dim = self._grid_dim(self.max_particles)
        with wp.ScopedDevice(self._device):
            self._grid = wp.HashGrid(dim, dim, dim)
        self._points: wp.array | None = None

    @staticmethod
    def _grid_dim(max_particles: int) -> int:
        # ~one cell per particle along a side; clamped to a sane table size.
        side = max(4, round(max(1, max_particles) ** (1.0 / 3.0)) + 1)
        return min(side, 512)

    def build(self, positions: wp.array) -> None:
        """Insert particles into the grid. Replaces previous contents."""
        with wp.ScopedDevice(self._device):
            self._grid.build(positions, self.cell_size)
        self._points = positions

    def query_radius(self, point: wp.vec3, radius: float) -> wp.array:
        """Return indices of particles within ``radius`` of ``point``.

        Returns ``wp.array(dtype=wp.int32)``, variable-length per call.
        """
        if self._points is None:
            raise RuntimeError("HashGrid.query_radius called before build()")
        qp = wp.vec3(float(point[0]), float(point[1]), float(point[2]))
        with wp.ScopedDevice(self._device):
            out_idx = wp.zeros(self.max_particles, dtype=wp.int32)
            out_count = wp.zeros(1, dtype=wp.int32)
            wp.launch(
                _query_radius_kernel,
                dim=1,
                inputs=[self._grid.id, qp, float(radius), self._points, out_idx, out_count],
            )
            wp.synchronize()
            n = int(out_count.numpy()[0])
            found = np.ascontiguousarray(out_idx.numpy()[:n], dtype=np.int32)
            return wp.from_numpy(found, dtype=wp.int32) if n > 0 else wp.zeros(0, dtype=wp.int32)
