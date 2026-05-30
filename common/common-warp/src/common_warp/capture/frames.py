"""``write_frames_capture`` — frame-list capture helper (plan § 7.2 additive helper).

Generalizes the de-facto ``_write_capture`` tail duplicated across the landed
Warp-backed sims (``mpm-multimaterial-stack-e`` is the closest template): a
per-frame ``(step, state, diagnostics)`` loop assembling the flat
``Capture.payload`` keyed by :func:`state_key` / :func:`diagnostics_key`,
followed by :func:`write_capture`. Phase 4 Run-2 sims consume this from birth.

Additive only — the 6 existing consumers are NOT migrated this run (deferred
refactor; each spans a slightly different call-site layer per the WU-A probe).
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
from typing import Any

import numpy as np

from .model import Capture, diagnostics_key, state_key
from .writer import MAX_SUPPORTED_VERSION, write_capture

#: A single captured frame: ``(step, state, diagnostics)`` where ``state`` maps
#: field name → array and ``diagnostics`` maps check name → scalar.
Frame = tuple[int, dict[str, Any], dict[str, Any]]


def write_frames_capture(
    frames: Iterable[Frame],
    manifest: dict[str, Any],
    out_dir: str | Path,
    *,
    schema_version: str = MAX_SUPPORTED_VERSION,
) -> Path:
    """Assemble a :class:`Capture` from ``frames`` and write it under ``out_dir``.

    ``manifest`` is the capture-v1 manifest dict; its ``payload['path']`` stem is
    the descriptor used for the ``.h5`` / ``.json`` filenames. ``frames`` yields
    ``(step, state, diagnostics)`` tuples (``diagnostics`` may be empty). State
    arrays are stored as-is; diagnostic scalars are coerced to ``float64``.
    Returns the written manifest ``.json`` path.
    """
    payload: dict[str, np.ndarray] = {}
    for step, state, diagnostics in frames:
        for name, arr in state.items():
            payload[state_key(int(step), name)] = np.asarray(arr)
        for check, value in (diagnostics or {}).items():
            payload[diagnostics_key(int(step), check)] = np.asarray(value, dtype=np.float64)

    payload_path = manifest.get("payload", {}).get("path")
    if not payload_path:
        raise ValueError("manifest['payload']['path'] must be set before write_frames_capture")
    descriptor = Path(payload_path).stem

    capture = Capture(manifest=dict(manifest), payload=payload)
    base = Path(out_dir) / descriptor
    write_capture(capture, base, schema_version=schema_version)
    return base.with_suffix(".json")
