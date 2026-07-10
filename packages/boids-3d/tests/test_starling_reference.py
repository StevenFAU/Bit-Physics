"""Proof tests for the flagship WebGPU neighbor contract."""

from __future__ import annotations

import numpy as np
import pytest

from boids_3d.starling_reference import (
    brute_topological_neighbors,
    build_dense_grid,
    grid_topological_neighbors,
)


@pytest.mark.parametrize("seed", [3, 17, 42, 991])
def test_dense_grid_matches_brute_and_is_scatter_order_invariant(seed: int) -> None:
    rng = np.random.default_rng(seed)
    positions = rng.uniform((-14, -8, -14), (14, 8, 14), size=(96, 3))
    headings = rng.normal(size=(96, 3))
    headings /= np.linalg.norm(headings, axis=1)[:, None]
    orders = [np.arange(96), rng.permutation(96)]
    grids = [build_dense_grid(positions, scatter_order=order) for order in orders]
    for agent in range(96):
        expected = brute_topological_neighbors(positions, headings, agent)
        assert (
            grid_topological_neighbors(positions, headings, grids[0], agent) == expected
        )
        assert (
            grid_topological_neighbors(positions, headings, grids[1], agent) == expected
        )


def test_distance_ties_resolve_by_stable_id() -> None:
    positions = np.array([[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1]], dtype=float)
    headings = np.tile([0, 0, 1], (4, 1))
    assert brute_topological_neighbors(
        positions,
        headings,
        0,
        k=3,
        blind_cosine=-1,
    ) == (1, 2, 3)


def test_scatter_rejects_non_permutation() -> None:
    with pytest.raises(ValueError, match="permutation"):
        build_dense_grid(np.zeros((3, 3)), scatter_order=[0, 0, 2])
