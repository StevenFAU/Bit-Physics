"""Small-N f64 oracle for the WebGPU topological murmuration model.

This module intentionally favors transparent ordering and assertions over
speed.  It is the reviewable counterpart to ``web/src/grid.wgsl`` and
``web/src/starling.wgsl``: dense no-drop cells produce candidates, while the
physics identity is the lexicographically closest ``(distance², stable_id)``
set.  Atomic scatter order therefore cannot change the selected neighbors.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]
IntArray = npt.NDArray[np.int64]


@dataclass(frozen=True)
class DenseGrid:
    minimum: FloatArray
    dimensions: tuple[int, int, int]
    cell_size: float
    starts: IntArray
    counts: IntArray
    indices: IntArray

    def cell(self, position: FloatArray) -> tuple[int, int, int]:
        raw = np.floor((position - self.minimum) / self.cell_size).astype(np.int64)
        return tuple(
            int(np.clip(raw[axis], 0, self.dimensions[axis] - 1)) for axis in range(3)
        )

    def cell_id(self, cell: tuple[int, int, int]) -> int:
        x, y, z = cell
        nx, ny, _ = self.dimensions
        return x + nx * (y + ny * z)


def build_dense_grid(
    positions: npt.ArrayLike,
    *,
    minimum: npt.ArrayLike = (-72.0, -36.0, -72.0),
    dimensions: tuple[int, int, int] = (24, 12, 24),
    cell_size: float = 6.0,
    scatter_order: npt.ArrayLike | None = None,
) -> DenseGrid:
    """Histogram, exclusive-scan, and scatter every stable agent ID once."""
    points = np.asarray(positions, dtype=np.float64)
    low = np.asarray(minimum, dtype=np.float64)
    n = len(points)
    total_cells = int(np.prod(dimensions))
    cells = np.floor((points - low) / cell_size).astype(np.int64)
    cells = np.clip(cells, 0, np.asarray(dimensions) - 1)
    linear = cells[:, 0] + dimensions[0] * (cells[:, 1] + dimensions[1] * cells[:, 2])
    counts = np.bincount(linear, minlength=total_cells).astype(np.int64)
    starts = np.zeros(total_cells, dtype=np.int64)
    starts[1:] = np.cumsum(counts[:-1])
    cursors = starts.copy()
    indices = np.empty(n, dtype=np.int64)
    order = (
        np.arange(n, dtype=np.int64)
        if scatter_order is None
        else np.asarray(scatter_order, dtype=np.int64)
    )
    if sorted(order.tolist()) != list(range(n)):
        raise ValueError("scatter_order must be a permutation of stable IDs")
    for stable_id in order:
        cell_id = int(linear[stable_id])
        indices[cursors[cell_id]] = stable_id
        cursors[cell_id] += 1
    if sorted(indices.tolist()) != list(range(n)):
        raise AssertionError("dense-grid scatter dropped or duplicated an agent")
    return DenseGrid(low, dimensions, cell_size, starts, counts, indices)


def _visible_candidates(
    positions: FloatArray,
    headings: FloatArray,
    agent: int,
    candidate_ids: npt.ArrayLike,
    *,
    social_radius: float,
    blind_cosine: float,
) -> list[tuple[float, int]]:
    pairs: list[tuple[float, int]] = []
    heading = headings[agent] / max(np.linalg.norm(headings[agent]), 1e-15)
    for other in np.asarray(candidate_ids, dtype=np.int64):
        stable_id = int(other)
        if stable_id == agent:
            continue
        delta = positions[stable_id] - positions[agent]
        distance2 = float(delta @ delta)
        if distance2 <= 1e-12 or distance2 > social_radius**2:
            continue
        if float(heading @ (delta / np.sqrt(distance2))) < blind_cosine:
            continue
        pairs.append((distance2, stable_id))
    return sorted(pairs)


def brute_topological_neighbors(
    positions: npt.ArrayLike,
    headings: npt.ArrayLike,
    agent: int,
    *,
    k: int = 7,
    social_radius: float = 6.0,
    blind_cosine: float = -0.82,
) -> tuple[int, ...]:
    """Return the exact stable topological set using all-pairs candidates."""
    points = np.asarray(positions, dtype=np.float64)
    directions = np.asarray(headings, dtype=np.float64)
    pairs = _visible_candidates(
        points,
        directions,
        agent,
        np.arange(len(points)),
        social_radius=social_radius,
        blind_cosine=blind_cosine,
    )
    return tuple(stable_id for _, stable_id in pairs[:k])


def grid_topological_neighbors(
    positions: npt.ArrayLike,
    headings: npt.ArrayLike,
    grid: DenseGrid,
    agent: int,
    *,
    k: int = 7,
    social_radius: float = 6.0,
    blind_cosine: float = -0.82,
) -> tuple[int, ...]:
    """Return the exact set from the same 27-cell candidates as WGSL."""
    if social_radius > grid.cell_size:
        raise ValueError("27-cell search requires social_radius <= cell_size")
    points = np.asarray(positions, dtype=np.float64)
    directions = np.asarray(headings, dtype=np.float64)
    cx, cy, cz = grid.cell(points[agent])
    candidates: list[int] = []
    for dz in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                cell = (cx + dx, cy + dy, cz + dz)
                if any(c < 0 or c >= grid.dimensions[a] for a, c in enumerate(cell)):
                    continue
                cell_id = grid.cell_id(cell)
                begin = int(grid.starts[cell_id])
                end = begin + int(grid.counts[cell_id])
                candidates.extend(grid.indices[begin:end].tolist())
    pairs = _visible_candidates(
        points,
        directions,
        agent,
        candidates,
        social_radius=social_radius,
        blind_cosine=blind_cosine,
    )
    return tuple(stable_id for _, stable_id in pairs[:k])


__all__ = [
    "DenseGrid",
    "build_dense_grid",
    "brute_topological_neighbors",
    "grid_topological_neighbors",
]
