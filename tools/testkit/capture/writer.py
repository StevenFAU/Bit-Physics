"""Capture writer (spec § 2.7).

`write_capture(state_iter, manifest_meta, out_dir)` writes both:

  - `<out_dir>/<descriptor>.h5` — HDF5 payload with the canonical layout
    (`/steps/{N}/state/{field_name}`, `/steps/{N}/diagnostics/{check_name}`,
    `/metadata/`).
  - `<out_dir>/<descriptor>.json` — manifest JSON, schema-validated.

Returns the path to the manifest JSON. The descriptor is derived from
`manifest_meta.payload['path']` (its stem).
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from dataclasses import asdict
from pathlib import Path

import h5py
import numpy as np

from .manifest import CaptureManifest, validate_capture_manifest
from .reader import StepState


def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_capture(
    state_iter: Iterable[StepState],
    manifest_meta: CaptureManifest,
    out_dir: Path,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    payload_rel = manifest_meta.payload.get("path")
    if not payload_rel:
        raise ValueError("manifest_meta.payload['path'] must be set before write_capture")
    payload_path = out_dir / Path(payload_rel).name
    manifest_path = payload_path.with_suffix(".json")

    # Defense-in-depth determinism (sub-phase-capture-determinism-contract):
    # ``libver="earliest"`` + ``track_order=False`` on every create_group +
    # ``track_times=False`` on every create_dataset suppress the wall-clock-
    # influenced metadata (HDF5 H5O_MTIME_NEW object-header messages) that
    # would otherwise vary across writes at different Unix instants. The
    # harness-based determinism contract makes this non-load-bearing — the
    # harness compares parsed Capture arrays, not raw file bytes — but
    # suppressing the variance at the source eliminates the latent flake
    # mechanically for any downstream consumer that does compare bytes
    # (e.g., `payload.checksum` round-tripping for forensic purposes).
    with h5py.File(payload_path, "w", libver="earliest") as h:
        steps_group = h.create_group("steps", track_order=False)
        for step_state in state_iter:
            sg = steps_group.create_group(str(step_state.step), track_order=False)
            state_g = sg.create_group("state", track_order=False)
            for fname, arr in step_state.state.items():
                state_g.create_dataset(fname, data=np.asarray(arr), track_times=False)
            diag_g = sg.create_group("diagnostics", track_order=False)
            for cname, value in step_state.diagnostics.items():
                diag_g.create_dataset(cname, data=np.asarray(value), track_times=False)
        meta_g = h.create_group("metadata", track_order=False)
        meta_g.attrs["schema_version"] = manifest_meta.schema_version
        meta_g.attrs["sim_name"] = manifest_meta.sim.get("name", "")
        meta_g.attrs["sim_category"] = manifest_meta.sim.get("category", "")
        meta_g.attrs["sim_variant"] = manifest_meta.sim.get("variant", "")
        meta_g.attrs["stack_name"] = manifest_meta.stack.get("name", "")
        meta_g.attrs["seed"] = int(manifest_meta.config.get("seed", 0))

    checksum = "sha256:" + _sha256_of_file(payload_path)
    manifest_dict = asdict(manifest_meta)
    manifest_dict["payload"] = dict(manifest_dict["payload"])
    manifest_dict["payload"]["path"] = payload_path.name
    manifest_dict["payload"]["checksum"] = checksum

    validate_capture_manifest(manifest_dict)
    with manifest_path.open("w", encoding="utf-8") as fh:
        json.dump(manifest_dict, fh, indent=2, sort_keys=True)

    return manifest_path
