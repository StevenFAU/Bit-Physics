"""Scene reset helper (phase plan § 6.4 render scripts).

A clean, deterministic starting scene: remove every object the factory startup
left behind so the render contains exactly the asset + camera + light this run
adds. ``bpy`` is passed in by ``render.py``.
"""

from __future__ import annotations


def reset_scene(bpy) -> None:
    """Delete all objects so the render is built from a known-empty scene."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
