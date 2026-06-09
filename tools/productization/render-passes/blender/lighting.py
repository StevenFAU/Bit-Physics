"""Deterministic lighting rig (phase plan § 6.4 render scripts).

A single fixed-pose area key light plus a dim, fixed world ambient. No HDRI fetch
(would be a non-reproducible external dependency), no RNG. Pure function of the
hard-coded constants → reproducible illumination for the determinism gate.
``bpy``/``mathutils`` are passed in by ``render.py``.
"""

from __future__ import annotations

KEY_LOCATION = (4.0, -3.0, 6.0)
KEY_TARGET = (0.0, 0.0, 0.0)
KEY_ENERGY = 3000.0
KEY_SIZE = 3.0
WORLD_COLOR = (0.02, 0.02, 0.03)
WORLD_STRENGTH = 0.3


def add_lighting(bpy, mathutils):
    """Add the canonical key light + world ambient. Returns a provenance dict."""
    scene = bpy.context.scene

    light_data = bpy.data.lights.new("key", "AREA")
    light_data.energy = KEY_ENERGY
    light_data.size = KEY_SIZE
    key = bpy.data.objects.new("key", light_data)
    scene.collection.objects.link(key)
    key.location = KEY_LOCATION
    direction = mathutils.Vector(KEY_TARGET) - mathutils.Vector(KEY_LOCATION)
    key.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs[0].default_value = (*WORLD_COLOR, 1.0)
        bg.inputs[1].default_value = WORLD_STRENGTH

    return {
        "key_location": list(KEY_LOCATION),
        "key_energy": KEY_ENERGY,
        "key_size": KEY_SIZE,
        "world_color": list(WORLD_COLOR),
        "world_strength": WORLD_STRENGTH,
    }
