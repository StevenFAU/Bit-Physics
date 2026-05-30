# mypy: ignore-errors
"""``SparseVolume`` — Warp ``wp.Volume`` wrapper for sparse fields (plan § 4.2.B).

Loads a NanoVDB ``.nvdb`` grid (produced by the host-only C++
``bit_physics::nanovdb`` writer — see ``common/common-cpp/nanovdb/``) into a
Warp ``wp.Volume`` and exposes index-space lookups.

CPU/CUDA note (measured, Warp 1.13.0): the ``.nvdb`` *load* path
(``wp.Volume.load_from_nvdb``) works on CPU, but Warp grid *allocation*
(``allocate_by_voxels`` / ``load_from_numpy``) requires CUDA. So on a CPU-only
host the volume is built by the C++ host writer and *loaded* here; runtime
allocation from voxels (``from_voxels``) needs a CUDA device. This is the
Phase-4.2 sparse-sim runtime constraint (surfaced in the WU-B audit, mirrors
WU-D's Newton CUDA dependency).

``# mypy: ignore-errors`` per F-RB-3 (Warp ships partial type stubs).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import warp as wp

from ._kernels import lookup_f

wp.init()


class SparseVolume:
    """A loaded sparse float volume backed by a Warp ``wp.Volume``."""

    def __init__(self, volume: Any, *, background: float = 0.0, device: str = "cpu") -> None:
        self._volume = volume
        self._background = float(background)
        self._device = device

    # -- construction --------------------------------------------------------

    @classmethod
    def from_nvdb(
        cls,
        file_or_buffer: str | Path | bytes | Any,
        *,
        device: str = "cpu",
        background: float = 0.0,
    ) -> SparseVolume:
        """Load a ``.nvdb`` grid (path, bytes, or file object) into a wp.Volume."""
        if isinstance(file_or_buffer, str | Path):
            buf: bytes = Path(file_or_buffer).read_bytes()
        elif hasattr(file_or_buffer, "read"):
            buf = file_or_buffer.read()
        else:
            buf = file_or_buffer
        volume = wp.Volume.load_from_nvdb(buf, device=device)
        return cls(volume, background=background, device=device)

    @classmethod
    def from_voxels(cls, *_args: Any, **_kwargs: Any) -> SparseVolume:
        """Allocate a volume from explicit voxels — requires CUDA (Warp constraint).

        Warp's ``wp.Volume.allocate_by_voxels`` only supports CUDA devices, so on
        a CPU-only host build the volume with the C++ ``bit_physics::nanovdb``
        writer and load it via :meth:`from_nvdb` instead.
        """
        raise NotImplementedError(
            "SparseVolume.from_voxels requires a CUDA device (wp.Volume allocation is "
            "CUDA-only in Warp 1.13.0). On CPU, build the .nvdb with the C++ "
            "bit_physics::nanovdb writer and use SparseVolume.from_nvdb()."
        )

    # -- accessors -----------------------------------------------------------

    @property
    def wp_volume(self) -> Any:
        """Escape hatch: the underlying ``wp.Volume``."""
        return self._volume

    @property
    def background(self) -> float:
        return self._background

    @property
    def allocated_voxel_count(self) -> int:
        """Total *leaf-allocated* voxels (Warp ``get_voxel_count``).

        NOTE: this is NOT the active-voxel count. Warp exposes a loaded volume's
        leaf-allocated voxels (a full 8³ block per touched leaf), not NanoVDB's
        per-voxel active bitmask. The active-cell topology is a capture-manifest
        concept (the ``active_mask`` field, recorded by the C++
        ``bit_physics::nanovdb`` writer / the sim at write time) — see
        :class:`~common_warp.sparse.mask.ActiveMask`. Do not infer sparsity from
        this number.
        """
        return int(self._volume.get_voxel_count())

    def value_at(self, coords: NDArrayLike) -> np.ndarray:
        """Index-space lookup at integer ``coords`` (``(N, 3)``); background if inactive."""
        ijk = np.asarray(coords, dtype=np.int32).reshape(-1, 3)
        wp_coords = wp.array(ijk, dtype=wp.vec3i, device=self._device)
        out = wp.zeros(ijk.shape[0], dtype=wp.float32, device=self._device)
        wp.launch(
            lookup_f,
            dim=ijk.shape[0],
            inputs=[self._volume.id, wp_coords, out],
            device=self._device,
        )
        return out.numpy()


# Lightweight alias so the annotation reads cleanly without importing numpy.typing
# into the public signature (kept local to this Warp-ignored module).
NDArrayLike = Any
