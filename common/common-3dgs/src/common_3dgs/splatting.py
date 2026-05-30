"""``common_3dgs.splatting`` — forward-rasterisation surface (§4.2.C).

Re-exports the Phase-3 landed ``Camera`` and ``render`` UNCHANGED so consumers
can use the ``common_3dgs.splatting`` import path named in the plan §4.2.C API
contract. The §0.3 landed reality keeps the implementations in ``camera.py`` /
``render.py`` (flat src-layout); this module is a thin re-export, not a
re-definition.
"""

from __future__ import annotations

from .camera import Camera
from .render import render

__all__ = ["Camera", "render"]
