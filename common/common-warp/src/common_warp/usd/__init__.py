"""``common_warp.usd`` — OpenUSD scene template + capture-to-USD export (§4.2.D).

CPU-only (no CUDA). Requires the ``usd-core`` pip package (common-warp's ``usd``
extra); both functions lazy-import ``pxr`` and raise a clear ``RuntimeError`` if
it is absent.
"""

from __future__ import annotations

from .export import export_capture_to_usd
from .scene_template import create_scene_template

__all__ = ["create_scene_template", "export_capture_to_usd"]
