"""Deterministic camera placement (phase plan § 6.4 render scripts).

The camera is fully data-driven: a fixed world-space location looking at the
asset's world-space centre. No RNG, no view-layer-dependent framing — the same
asset always yields the same camera matrix, a precondition for the bit-exact
determinism gate. ``bpy``/``mathutils`` are passed in by ``render.py``.
"""

from __future__ import annotations

# Asset is normalised by import_asset.py to a unit-ish cube centred at the world
# origin; this 3/4 view frames it with the smoke puff centred.
CANONICAL_LOCATION = (3.2, -3.2, 2.2)
CANONICAL_TARGET = (0.0, 0.0, 0.0)
CANONICAL_LENS_MM = 50.0


def add_camera(bpy, mathutils, *, location=CANONICAL_LOCATION, target=CANONICAL_TARGET):
    """Create the scene camera at a fixed pose looking at ``target``.

    Returns ``(camera_object, provenance_dict)``.
    """
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("render_cam")
    cam_data.lens = CANONICAL_LENS_MM
    cam = bpy.data.objects.new("render_cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    cam.location = location
    direction = mathutils.Vector(target) - mathutils.Vector(location)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    return cam, {
        "location": list(location),
        "target": list(target),
        "lens_mm": CANONICAL_LENS_MM,
    }
