"""Capture writer (Subsystem 2) — §1.9.1 ``write_capture``.

Delegates HDF5 + manifest emission to the Phase-0 testkit ``capture``
flat-module (`write_capture(state_iter, manifest_meta, out_dir)`), so the
on-disk format is byte-for-byte the canonical capture-v1 layout that
`tools/testkit/equivalence/harness.py:compare_captures` reads via
``load_capture`` — this is the W-5 format-interoperability guarantee
(Stage-0 Task 0.5). common-warp does NOT hand-roll h5py.

**Warp -> NumPy -> h5py marshalling.** Warp arrays do not natively
serialize to HDF5; callers populate ``Capture.payload`` with NumPy arrays
(``wp.array.numpy()`` at the call site — see the Particles/Grids
``to_capture_payload`` helpers). This writer treats every payload value as
a NumPy array and hands it to the testkit writer.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from capture import CaptureManifest as _CaptureManifest
from capture import write_capture as _testkit_write_capture
from capture.reader import StepState as _StepState

from .model import DIAGNOSTICS, STATE, Capture, parse_payload_key

#: Valid-format placeholder; the testkit writer recomputes the real
#: payload sha256 over the written HDF5 file.
_PLACEHOLDER_CHECKSUM = "sha256:" + "0" * 64

#: Highest capture-schema version this writer emits / accepts. Phase 4.0 WU-A
#: bumped the default 1.0.0 → 1.1.0 (optional ``gradient_fields``); WU-B adds
#: optional ``active_mask`` without a further bump. Future schema versions:
#: bump max_supported in this module-level constant.
MAX_SUPPORTED_VERSION = "1.1.0"


def _version_tuple(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))


def write_capture(
    capture: Capture, path: str | Path, *, schema_version: str = MAX_SUPPORTED_VERSION
) -> None:
    """Write ``capture`` to ``<path>.h5`` + ``<path>.json`` (§1.9.1).

    ``path`` is a base path; ``.h5`` / ``.json`` suffixes are added
    automatically (a ``.h5``/``.json`` suffix on ``path`` is treated as the
    base stem). ``schema_version`` defaults to :data:`MAX_SUPPORTED_VERSION`
    and must not exceed it (spec § 2.7 additive-compatibility policy — a writer
    never emits a schema it cannot itself read back). Raises ``ValueError`` if
    the requested version is unsupported or if the manifest fails schema
    validation (surfaced by the testkit writer).
    """
    if _version_tuple(schema_version) > _version_tuple(MAX_SUPPORTED_VERSION):
        raise ValueError(
            f"schema_version {schema_version!r} exceeds MAX_SUPPORTED_VERSION "
            f"{MAX_SUPPORTED_VERSION!r}"
        )
    base = Path(path)
    stem = base.stem if base.suffix in (".h5", ".json") else base.name
    out_dir = base.parent

    # Regroup the flat payload into per-step testkit StepState rows.
    buckets: dict[int, dict[str, dict[str, Any]]] = {}
    for key, arr in capture.payload.items():
        step, kind, name = parse_payload_key(key)
        bucket = buckets.setdefault(step, {STATE: {}, DIAGNOSTICS: {}})
        bucket[kind][name] = np.asarray(arr)
    rows = [
        _StepState(
            step=step,
            state={k: np.asarray(v) for k, v in buckets[step][STATE].items()},
            diagnostics={
                k: float(np.asarray(v).item()) for k, v in buckets[step][DIAGNOSTICS].items()
            },
        )
        for step in sorted(buckets)
    ]

    # The testkit writer derives the on-disk filename from payload['path']
    # and recomputes payload['checksum'] over the written file.
    manifest = dict(capture.manifest)
    manifest.setdefault("schema_version", schema_version)
    payload_meta = dict(manifest.get("payload", {}))
    payload_meta["path"] = f"{stem}.h5"
    payload_meta.setdefault("format", "hdf5")
    payload_meta.setdefault("checksum", _PLACEHOLDER_CHECKSUM)
    manifest["payload"] = payload_meta

    _testkit_write_capture(rows, _CaptureManifest.from_dict(manifest), out_dir)
