"""Import a VDB render asset and bind its category preset (phase plan § 6.4).

Runs inside Blender's bundled Python. Imports the ``.vdb`` produced by
``vdb_export.py`` as a Volume object, normalises it to a unit-ish cube centred at
the world origin (so the fixed camera in ``camera.py`` frames it deterministically
regardless of the grid's voxel count), and assigns the per-category preset
material. No RNG; the transform is a pure function of the grid dimensions.
"""

from __future__ import annotations

from presets import get_preset

# Target world-space extent of the asset's largest axis (Blender units). The
# fixed camera/lighting rig is tuned for this size.
TARGET_EXTENT = 2.0


def import_vdb_volume(bpy, vdb_path: str, *, dims, category: str):
    """Import ``vdb_path``, centre+scale it, attach the category preset material.

    ``dims`` is the (nx, ny, nz) voxel count from the asset metadata. Returns
    ``(volume_object, provenance_dict)``.
    """
    bpy.ops.object.volume_import(filepath=vdb_path)
    vol = bpy.context.view_layer.objects.active
    if vol is None or vol.type != "VOLUME":
        raise RuntimeError(f"volume_import did not yield a VOLUME object: {vol!r}")

    # The grid is written with voxel size 1.0 (index space), so it spans `dims`
    # world units. Scale the object so the largest axis becomes TARGET_EXTENT and
    # translate so the grid centre lands on the world origin.
    nx, ny, nz = (int(d) for d in dims)
    largest = max(nx, ny, nz)
    scale = TARGET_EXTENT / float(largest)
    vol.scale = (scale, scale, scale)
    vol.location = (
        -0.5 * nx * scale,
        -0.5 * ny * scale,
        -0.5 * nz * scale,
    )

    mat = get_preset(category).build_material(bpy)
    vol.data.materials.append(mat)

    return vol, {
        "dims": [nx, ny, nz],
        "object_scale": scale,
        "target_extent": TARGET_EXTENT,
        "category": category,
    }
