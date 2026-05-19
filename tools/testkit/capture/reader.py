"""Capture reader (spec § 2.7).

Manifest + HDF5 payload load via `load_capture(manifest_path)`. The returned
`Capture` exposes `manifest`, `metadata`, `steps()`, `step(n)`, and
`field(step, name)` per `docs/phases/phase-0-plan.md` § 3.3.1.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import h5py
import numpy as np

from .manifest import CaptureManifest


@dataclass
class StepState:
    step: int
    state: dict[str, np.ndarray] = field(default_factory=dict)
    diagnostics: dict[str, float] = field(default_factory=dict)


class Capture:
    """Read-only view of a manifest + HDF5 payload pair."""

    def __init__(
        self,
        manifest: CaptureManifest,
        payload_path: Path,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.manifest: CaptureManifest = manifest
        self._payload_path: Path = Path(payload_path)
        self.metadata: dict[str, Any] = metadata or {}

    def _open(self) -> h5py.File:
        return h5py.File(self._payload_path, "r")

    def _step_numbers(self) -> list[int]:
        with self._open() as h:
            if "steps" not in h:
                return []
            return sorted(int(k) for k in h["steps"])

    def steps(self) -> Iterable[StepState]:
        for n in self._step_numbers():
            yield self.step(n)

    def __iter__(self) -> Iterator[StepState]:
        return iter(self.steps())

    def step(self, n: int) -> StepState:
        with self._open() as h:
            group = h[f"steps/{n}"]
            state: dict[str, np.ndarray] = {}
            if "state" in group:
                for fname, dset in group["state"].items():
                    state[fname] = np.asarray(dset[()])
            diagnostics: dict[str, float] = {}
            if "diagnostics" in group:
                for cname, dset in group["diagnostics"].items():
                    diagnostics[cname] = float(np.asarray(dset[()]).item())
        return StepState(step=n, state=state, diagnostics=diagnostics)

    def field(self, step: int, name: str) -> np.ndarray:
        with self._open() as h:
            dset = h[f"steps/{step}/state/{name}"]
            return np.asarray(dset[()])


def load_capture(manifest_path: Path) -> Capture:
    """Load a capture manifest + adjacent HDF5 payload.

    Manifest is schema-validated. Payload path is resolved relative to the
    manifest file when `manifest['payload']['path']` is relative.
    """
    manifest_path = Path(manifest_path)
    with manifest_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    manifest = CaptureManifest.from_dict(data)
    payload_raw = manifest.payload["path"]
    payload_path = Path(payload_raw)
    if not payload_path.is_absolute():
        payload_path = (manifest_path.parent / payload_raw).resolve()

    metadata: dict[str, Any] = {}
    with h5py.File(payload_path, "r") as h:
        if "metadata" in h:
            for k, v in h["metadata"].attrs.items():
                metadata[k] = v

    return Capture(manifest=manifest, payload_path=payload_path, metadata=metadata)
