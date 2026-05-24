"""Capture reader (Subsystem 2) — §1.9.1 ``read_capture`` + ``read_manifest``.

Delegates to the Phase-0 testkit ``capture`` flat-module's
``load_capture`` (schema-validating + payload-path-resolving), then
re-projects the per-step ``StepState`` rows into the flat
``Capture.payload`` dict (`steps/{N}/state/{field}` /
`steps/{N}/diagnostics/{check}` keys).
"""

from __future__ import annotations

import dataclasses
import json
from pathlib import Path
from typing import Any

import numpy as np
from capture import load_capture as _load_capture

from .model import Capture, diagnostics_key, state_key


def _manifest_path(path: str | Path) -> Path:
    """Resolve the ``.json`` manifest path from a base/``.h5``/``.json`` path."""
    base = Path(path)
    if base.suffix == ".json":
        return base
    stem = base.stem if base.suffix == ".h5" else base.name
    return base.parent / f"{stem}.json"


def read_capture(path: str | Path) -> Capture:
    """Read a capture from ``<path>.h5`` + ``<path>.json`` (§1.9.1).

    ``path`` is a base path; ``.h5`` / ``.json`` are auto-resolved. Raises
    ``FileNotFoundError`` if the manifest/payload is missing and
    ``ValueError`` if the manifest fails schema validation (surfaced by the
    testkit loader).
    """
    capture = _load_capture(_manifest_path(path))
    payload: dict[str, np.ndarray] = {}
    for step_state in capture.steps():
        for field_name, arr in step_state.state.items():
            payload[state_key(step_state.step, field_name)] = np.asarray(arr)
        for check_name, value in step_state.diagnostics.items():
            payload[diagnostics_key(step_state.step, check_name)] = np.asarray(value)
    manifest: dict[str, Any] = dataclasses.asdict(capture.manifest)
    return Capture(manifest=manifest, payload=payload)


def read_manifest(path: str | Path) -> dict[str, Any]:
    """Read just the JSON manifest sidecar (no payload load)."""
    with _manifest_path(path).open("r", encoding="utf-8") as fh:
        data: dict[str, Any] = json.load(fh)
    return data
