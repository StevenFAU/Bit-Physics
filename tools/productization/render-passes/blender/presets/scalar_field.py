"""Scalar-field volumetric preset (diagnostic Tier-2 category: scalar-field).

The eulerian-smoke canonical capture stores a 3D ``density`` scalar grid. This
preset wires a Principled Volume shader so Cycles integrates the VDB grid as a
smoke volume. All shader parameters are fixed constants (no RNG, no texture
fetch) so the material contributes nothing non-deterministic to the render.

``bpy`` is passed in by ``import_asset.py``.
"""

from __future__ import annotations

# Density multiplier applied to the (typically O(1)) capture density so the
# volume reads as an opaque puff rather than thin haze. Fixed → deterministic.
DENSITY_SCALE = 20.0
VOLUME_COLOR = (0.65, 0.75, 1.0)  # cool blue-grey smoke
EMISSION_STRENGTH = 0.0  # pure scattering; emission would wash out structure


def build_material(bpy, name: str = "scalar_field_smoke"):
    """Return a Principled-Volume material for a density VDB grid."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    principled = nt.nodes.new("ShaderNodeVolumePrincipled")
    output = nt.nodes.new("ShaderNodeOutputMaterial")

    principled.inputs["Density"].default_value = DENSITY_SCALE
    principled.inputs["Color"].default_value = (*VOLUME_COLOR, 1.0)
    principled.inputs["Emission Strength"].default_value = EMISSION_STRENGTH
    # Bind the shader's density input to the grid attribute named "density" (the
    # VDB grid name vdb_export.py writes). Blender maps the volume grid of the
    # same name automatically; the explicit attribute keeps it robust.
    principled.inputs["Density Attribute"].default_value = "density"

    nt.links.new(principled.outputs["Volume"], output.inputs["Volume"])
    return mat


PROVENANCE = {
    "preset": "scalar-field",
    "density_scale": DENSITY_SCALE,
    "volume_color": list(VOLUME_COLOR),
    "emission_strength": EMISSION_STRENGTH,
}
