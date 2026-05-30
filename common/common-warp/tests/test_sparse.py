# mypy: ignore-errors
"""Tests for common_warp.sparse — SparseVolume (wp.Volume load) + ActiveMask.

Loads the committed .nvdb fixture (produced by the C++ bit_physics::nanovdb
writer) since Warp grid allocation is CUDA-only — the CPU path is load+sample.
The write->read property invariants live in the C++ ctest (where the write
happens); here we cover the load/query surface, the ActiveMask manifest
projection, the cross-language topology-hash agreement, and Python-side PBT.
"""

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

import common_warp
from common_warp.sparse import ActiveMask, SparseVolume, topology_hash

_FIXTURE = "tests/fixtures/sparse/smoke-4voxel-density.nvdb"
# The C++ writer's topology hash for the fixture's 4 active voxels
# {(0,0,0),(1,0,0),(0,1,0),(4,4,4)} — cross-language agreement anchor.
_CPP_FIXTURE_HASH = "4c0b14df1df7718d0e3d196be69a44df763e5f6ed342f3d513d07f19e16418de"


def _fixture_path():
    from pathlib import Path

    return Path(__file__).resolve().parent / "fixtures" / "sparse" / "smoke-4voxel-density.nvdb"


def test_sparse_registered_at_top_level():
    assert hasattr(common_warp, "sparse")


def test_load_nvdb_and_lookup_on_cpu():
    sv = SparseVolume.from_nvdb(_fixture_path(), device="cpu")
    assert sv.background == 0.0
    vals = sv.value_at([[0, 0, 0], [1, 0, 0], [0, 1, 0], [4, 4, 4], [9, 9, 9]])
    np.testing.assert_allclose(vals, [1.0, 2.0, 3.0, -5.0, 0.0], atol=1e-6)
    # Escape hatch exposes the underlying wp.Volume.
    assert sv.wp_volume is not None
    # Leaf-allocated count (NOT active) — the 4 active voxels sit in one 8^3 leaf.
    assert sv.allocated_voxel_count == 512


def test_from_voxels_requires_cuda():
    with pytest.raises(NotImplementedError, match="CUDA"):
        SparseVolume.from_voxels()


def test_active_mask_dense_properties():
    mask = np.zeros((5, 5, 5), dtype=bool)
    for c in [(0, 0, 0), (1, 0, 0), (0, 1, 0), (4, 4, 4)]:
        mask[c] = True
    am = ActiveMask.from_dense(mask)
    assert am.active_count == 4
    assert am.shape == (5, 5, 5)
    assert am.sparsity_ratio == pytest.approx(4 / 125)
    entry = am.to_manifest_entry(encoding="dense")
    assert entry == {
        "encoding": "dense",
        "dtype": "uint8",
        "shape": [5, 5, 5],
        "topology_hash": am.topology_hash(),
    }


def test_topology_hash_matches_cpp_writer():
    # The Python ActiveMask hash equals the C++ bit_physics::nanovdb hash for the
    # same active set — sorted int32 ijk triples, little-endian, sha256.
    mask = np.zeros((5, 5, 5), dtype=bool)
    for c in [(0, 0, 0), (1, 0, 0), (0, 1, 0), (4, 4, 4)]:
        mask[c] = True
    assert ActiveMask.from_dense(mask).topology_hash() == _CPP_FIXTURE_HASH


def test_invalid_encoding_rejected():
    am = ActiveMask.from_dense(np.zeros((2, 2, 2), dtype=bool))
    with pytest.raises(ValueError, match="encoding"):
        am.to_manifest_entry(encoding="rle")


def test_nanovdb_encoding_accepted():
    am = ActiveMask.from_dense(np.ones((2, 2, 2), dtype=bool))
    assert am.to_manifest_entry(encoding="nanovdb")["encoding"] == "nanovdb"


def test_default_origin_is_grid_origin():
    mask = np.zeros((3, 3, 3), dtype=bool)
    mask[1, 2, 0] = True
    # The module-level default origin is (0, 0, 0): no-origin == explicit-(0,0,0).
    assert topology_hash(mask) == topology_hash(mask, (0, 0, 0))
    # The dataclass default origin is also the grid origin.
    assert ActiveMask(mask=mask).origin == (0, 0, 0)


def test_origin_shifts_absolute_coords():
    # A voxel at index (0,0,0) under origin (5,0,0) has the SAME topology hash as
    # a voxel at index (5,0,0) under origin (0,0,0) — proving coords = idx + origin
    # (a minus would shift the wrong way and break this equality).
    a = np.zeros((1, 1, 1), dtype=bool)
    a[0, 0, 0] = True
    b = np.zeros((6, 1, 1), dtype=bool)
    b[5, 0, 0] = True
    assert topology_hash(a, (5, 0, 0)) == topology_hash(b, (0, 0, 0))
    # A non-zero origin changes the hash relative to the grid origin.
    assert topology_hash(a, (5, 0, 0)) != topology_hash(a, (0, 0, 0))


# -- PBT (spec § 2.14) — Python-side ActiveMask invariants -------------------

_dims = st.integers(min_value=1, max_value=6)


@settings(max_examples=60, deadline=None)
@given(seed=st.integers(0, 2**31 - 1), nx=_dims, ny=_dims, nz=_dims)
def test_pbt_active_count_equals_mask_sum(seed, nx, ny, nz):
    rng = np.random.default_rng(seed)
    mask = rng.random((nx, ny, nz)) < 0.5
    am = ActiveMask.from_dense(mask)
    assert am.active_count == int(mask.sum())
    assert 0.0 <= am.sparsity_ratio <= 1.0


@settings(max_examples=60, deadline=None)
@given(seed=st.integers(0, 2**31 - 1), nx=_dims, ny=_dims, nz=_dims)
def test_pbt_topology_hash_depends_only_on_active_set(seed, nx, ny, nz):
    # The hash is a function of the active SET, not of mask dtype identity or
    # the order a producer happened to activate voxels. Building the same mask
    # twice (independently) yields the same hash.
    rng = np.random.default_rng(seed)
    base = rng.random((nx, ny, nz)) < 0.5
    h1 = topology_hash(base.copy())
    h2 = topology_hash(np.array(base, dtype=bool))
    assert h1 == h2
    # Flipping any single voxel changes the topology hash (collision-resistance
    # sanity: different active sets -> different hashes).
    flipped = base.copy()
    flipped[0, 0, 0] = not flipped[0, 0, 0]
    assert topology_hash(flipped) != h1
