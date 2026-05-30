"""``ActiveMask`` — dense active-cell mask for sparse volumes (plan § 4.2.B / § 4.3).

The capture-manifest ``active_mask`` field (schema 1.1.0, spec § 4.3) records the
active-cell topology of a sparse-encoded volume. This dataclass is the in-memory
handle: a dense boolean mask plus its index-space origin, with a content-addressed
``topology_hash`` and the manifest-entry projection. Tier-2 sparse diagnostics
(:mod:`diagnostics.tier2`) operate on these masks.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

_SPARSE_DEFAULT_ENCODINGS = ("dense", "nanovdb")


def topology_hash(mask: NDArray[np.bool_], origin: tuple[int, int, int] = (0, 0, 0)) -> str:
    """sha256 hex of the sorted active (i,j,k) coords (origin-relative → absolute).

    Stable content hash of the active-cell topology; matches the C++
    ``bit_physics::nanovdb::ActiveMask::topology_hash`` construction (sorted
    int32 ijk triples, little-endian).
    """
    idx = np.argwhere(mask)  # (N,3), already sorted ascending by np.argwhere
    coords = (idx + np.asarray(origin, dtype=np.int64)).astype("<i4")
    return hashlib.sha256(coords.tobytes(order="C")).hexdigest()


@dataclass
class ActiveMask:
    """Dense active-cell mask of a sparse volume.

    Fields
    ------
    mask:   boolean ndarray, shape ``(X, Y, Z)`` — True at active voxels.
    origin: index-space ijk of ``mask[0, 0, 0]`` (default the grid origin).
    """

    mask: NDArray[np.bool_]
    origin: tuple[int, int, int] = (0, 0, 0)

    @classmethod
    def from_dense(
        cls, mask: NDArray[np.bool_], origin: tuple[int, int, int] = (0, 0, 0)
    ) -> ActiveMask:
        o = (int(origin[0]), int(origin[1]), int(origin[2]))
        return cls(mask=np.asarray(mask, dtype=bool), origin=o)

    @property
    def active_count(self) -> int:
        return int(self.mask.sum())

    @property
    def shape(self) -> tuple[int, ...]:
        return tuple(int(d) for d in self.mask.shape)

    @property
    def sparsity_ratio(self) -> float:
        """Fraction of voxels that are active (0.0 = empty, 1.0 = fully dense)."""
        total = int(self.mask.size)
        return self.active_count / total if total else 0.0

    def topology_hash(self) -> str:
        return topology_hash(self.mask, self.origin)

    def to_manifest_entry(self, *, encoding: str = "dense") -> dict[str, object]:
        """Project to the capture-manifest ``active_mask`` schema entry (§ 4.3)."""
        if encoding not in _SPARSE_DEFAULT_ENCODINGS:
            raise ValueError(
                f"encoding must be one of {_SPARSE_DEFAULT_ENCODINGS}; got {encoding!r}"
            )
        return {
            "encoding": encoding,
            "dtype": "uint8",
            "shape": list(self.shape),
            "topology_hash": self.topology_hash(),
        }
