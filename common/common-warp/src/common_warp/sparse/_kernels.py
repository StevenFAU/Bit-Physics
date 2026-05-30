# mypy: ignore-errors
"""Warp sparse-volume kernels (F-RB-3: Warp partial typing -> scoped mypy ignore)."""

import warp as wp


@wp.kernel
def lookup_f(vol: wp.uint64, coords: wp.array(dtype=wp.vec3i), out: wp.array(dtype=wp.float32)):
    """Index-space point lookup: ``out[t] = volume(coords[t])`` (background if inactive)."""
    t = wp.tid()
    c = coords[t]
    out[t] = wp.volume_lookup_f(vol, c[0], c[1], c[2])
