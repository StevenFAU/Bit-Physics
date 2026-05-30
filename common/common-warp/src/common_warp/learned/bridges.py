"""``warp_to_torch`` / ``torch_to_warp`` — zero-copy Warp<->PyTorch bridges (§4.2.E).

Canonical-name wrappers over Warp's existing PyTorch interop (``wp.to_torch`` /
``wp.from_torch``) for cross-sim consistency. Zero-copy where the device + dtype
permit (Warp shares the underlying buffer); CPU tensors on the CPU-only host.
"""

from __future__ import annotations

from typing import Any

import warp as wp


def warp_to_torch(wp_array: wp.array[Any]) -> Any:
    """Bridge a Warp array to a PyTorch tensor (``wp.to_torch``)."""
    return wp.to_torch(wp_array)


def torch_to_warp(torch_tensor: Any) -> Any:
    """Bridge a PyTorch tensor to a Warp array (``wp.from_torch``)."""
    return wp.from_torch(torch_tensor)
