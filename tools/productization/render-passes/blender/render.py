"""Blender headless render entry point (phase plan § 6.4 render scripts).

Invoked as::

    blender -b --factory-startup -noaudio -P render.py -- \
        --vdb ASSET.vdb --meta ASSET-META.json --out FRAME.png \
        [--seed N] [--samples N] [--resolution N] [--provenance PROV.json]

Orchestrates the named § 6.4 render modules (scene_setup → cycles_config →
import_asset → camera → lighting → render) and writes a single PNG frame plus an
optional provenance JSON sidecar. Determinism is owned by ``cycles_config``; this
script adds no RNG. The PNG *container* still carries run-varying ancillary
chunks (eXIf timestamp, tEXt render-time); the pipeline harness compares the
DECODED pixel buffer (the bit-exact gate) and strips those chunks for the
committed canonical frame.
"""

from __future__ import annotations

import json
import os
import sys

import bpy  # provided by Blender
import mathutils  # provided by Blender

# Make the sibling § 6.4 modules importable when Blender runs this file by path.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import camera as _camera  # noqa: E402
import cycles_config as _cycles  # noqa: E402
import import_asset as _import_asset  # noqa: E402
import lighting as _lighting  # noqa: E402
import scene_setup as _scene_setup  # noqa: E402


def _parse_args(argv: list[str]) -> dict[str, str]:
    after = argv[argv.index("--") + 1 :] if "--" in argv else []
    out: dict[str, str] = {}
    i = 0
    while i < len(after):
        key = after[i].lstrip("-")
        out[key] = after[i + 1]
        i += 2
    return out


def main() -> None:
    args = _parse_args(sys.argv)
    vdb_path = args["vdb"]
    out_path = args["out"]
    meta = json.loads(open(args["meta"], encoding="utf-8").read())
    seed = int(args.get("seed", _cycles.CANONICAL_SEED))
    samples = int(args.get("samples", _cycles.CANONICAL_SAMPLES))
    resolution = int(args.get("resolution", _cycles.CANONICAL_RES))

    scene = bpy.context.scene
    _scene_setup.reset_scene(bpy)
    cycles_prov = _cycles.apply_deterministic_cycles(
        scene, seed=seed, samples=samples, resolution=resolution
    )
    _, asset_prov = _import_asset.import_vdb_volume(
        bpy, vdb_path, dims=meta["dims"], category=meta["render_category"]
    )
    _, cam_prov = _camera.add_camera(bpy, mathutils)
    light_prov = _lighting.add_lighting(bpy, mathutils)

    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)

    if "provenance" in args:
        provenance = {
            "blender_version": bpy.app.version_string,
            "cycles": cycles_prov,
            "asset": asset_prov,
            "camera": cam_prov,
            "lighting": light_prov,
            "source_capture_sha256": meta.get("source_capture_sha256"),
            "render_asset_sha256": meta.get("render_asset_sha256"),
            "sim": meta.get("sim"),
            "step": meta.get("step"),
        }
        with open(args["provenance"], "w", encoding="utf-8") as fh:
            json.dump(provenance, fh, indent=2, sort_keys=True)


if __name__ == "__main__":
    main()
