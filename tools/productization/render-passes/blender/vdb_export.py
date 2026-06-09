"""npy → OpenVDB render-asset export + asset-integrity check (R4 conversion step).

Runs inside Blender's bundled Python (which ships the ``openvdb`` module). The
field array extracted from the canonical ``.h5`` by ``convert.py`` is written as a
single named VDB grid — the render asset. A DoubleGrid (float64) is used so the
conversion is LOSSLESS / bit-exact w.r.t. the f64 capture field; the asset then
round-trips the capture's field data exactly (the § asset-integrity criterion).
Cycles casts to f32 at render time, but that is a render-engine detail downstream
of the asset and is covered by the separate render determinism gate.

Invoked as::

    blender -b --factory-startup -noaudio -P vdb_export.py -- \
        --npy FIELD.npy --out-vdb ASSET.vdb --integrity INTEGRITY.json \
        [--grid-name density]
"""

from __future__ import annotations

import hashlib
import json
import sys

import numpy as np
import openvdb  # provided by Blender's bundled Python


def _parse_args(argv: list[str]) -> dict[str, str]:
    after = argv[argv.index("--") + 1 :] if "--" in argv else []
    out: dict[str, str] = {}
    i = 0
    while i < len(after):
        out[after[i].lstrip("-")] = after[i + 1]
        i += 2
    return out


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def main() -> None:
    args = _parse_args(sys.argv)
    grid_name = args.get("grid-name", "density")

    field = np.load(args["npy"])
    field64 = np.ascontiguousarray(field, dtype=np.float64)

    grid = openvdb.DoubleGrid()
    grid.copyFromArray(field64)
    grid.name = grid_name
    openvdb.write(args["out-vdb"], grids=[grid])

    # Round-trip integrity: read the asset back and compare to the source field.
    grid_back = openvdb.read(args["out-vdb"], grid_name)
    back = np.zeros(field64.shape, dtype=np.float64)
    grid_back.copyToArray(back)

    diff = np.abs(field64 - back)
    denom = np.abs(field64)
    nz = denom > 0
    max_abs = float(diff.max()) if diff.size else 0.0
    max_rel = float((diff[nz] / denom[nz]).max()) if np.any(nz) else 0.0
    bit_exact = bool(np.array_equal(field64, back))

    report = {
        "grid_name": grid_name,
        "grid_dtype": "double",
        "dims": [int(x) for x in field64.shape],
        "source_field_sha256": "sha256:"
        + hashlib.sha256(field64.tobytes()).hexdigest(),
        "render_asset_sha256": _sha256_file(args["out-vdb"]),
        "roundtrip_max_abs": max_abs,
        "roundtrip_max_rel": max_rel,
        "roundtrip_bit_exact": bit_exact,
        "openvdb_version": getattr(openvdb, "version", lambda: "unknown")()
        if callable(getattr(openvdb, "version", None))
        else str(getattr(openvdb, "version", "unknown")),
    }
    with open(args["integrity"], "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, sort_keys=True)


if __name__ == "__main__":
    main()
