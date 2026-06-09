"""h5 → render-asset field extraction (R4 conversion step, uv/h5py half).

The R4 reconciliation relaxed the § 6.4 render-canonical criterion from "committed
Alembic/VDB/USD asset" to "committed ``.h5`` canonical capture + an h5→render-asset
conversion step". This module is the first half of that step: it reads the
committed canonical capture (HDF5, needs ``h5py`` — not available in Blender's
bundled Python) and extracts the single field/step to be rendered into a plain
``.npy`` plus an ``asset-meta.json``. The second half (``blender/vdb_export.py``)
turns the ``.npy`` into the actual VDB render asset inside Blender's Python.

The field is the ``density`` scalar grid; the step is chosen as the one with the
greatest spatial structure (max standard deviation) — for the eulerian-smoke
canonical capture that selects step 0 (the smoke blob; the passive scalar
homogenises to a uniform field by step 50, MEASURED). Selection is deterministic.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import h5py
import numpy as np

RENDER_FIELD = "density"


def load_manifest(manifest_json: Path) -> dict[str, Any]:
    """Read the capture manifest (.json sidecar) next to the .h5."""
    return json.loads(Path(manifest_json).read_text(encoding="utf-8"))


def _select_structured_step(h5: h5py.File, field: str) -> str:
    """Return the step key whose ``field`` has the greatest spatial std.

    Deterministic tie-break: lowest integer step. A flat (std==0) field anywhere
    does not win unless every step is flat.
    """
    best_key: str | None = None
    best_std = -1.0
    for key in sorted(h5["steps"].keys(), key=int):
        arr = h5[f"steps/{key}/state/{field}"][...]
        std = float(np.std(arr))
        if std > best_std:
            best_std, best_key = std, key
    if best_key is None:
        raise RuntimeError("no steps in capture")
    return best_key


def extract_field(
    h5_path: Path,
    out_npy: Path,
    out_meta: Path,
    *,
    manifest: dict[str, Any],
    field: str = RENDER_FIELD,
) -> dict[str, Any]:
    """Extract the structured ``field`` step → ``out_npy`` + ``out_meta`` JSON.

    Returns the metadata dict (also written to ``out_meta``).
    """
    out_npy = Path(out_npy)
    out_meta = Path(out_meta)
    out_npy.parent.mkdir(parents=True, exist_ok=True)

    with h5py.File(h5_path, "r") as h5:
        step = _select_structured_step(h5, field)
        arr = np.ascontiguousarray(
            h5[f"steps/{step}/state/{field}"][...], dtype=np.float64
        )
        sim_meta = dict(h5["metadata"].attrs)

    np.save(out_npy, arr)

    category = str(
        sim_meta.get("sim_category", manifest.get("sim", {}).get("category", ""))
    )
    meta = {
        "sim": str(sim_meta.get("sim_name", manifest.get("sim", {}).get("name", ""))),
        "sim_variant": str(sim_meta.get("sim_variant", "")),
        "render_category": category,
        "field": field,
        "step": int(step),
        "dims": [int(x) for x in arr.shape],
        "source_capture_path": str(manifest.get("payload", {}).get("path", "")),
        "source_capture_sha256": str(manifest.get("payload", {}).get("checksum", "")),
        "build_id": str(manifest.get("stack", {}).get("build_id", "")),
        "field_min": float(arr.min()),
        "field_max": float(arr.max()),
        "field_std": float(arr.std()),
    }
    out_meta.write_text(json.dumps(meta, indent=2, sort_keys=True), encoding="utf-8")
    return meta
