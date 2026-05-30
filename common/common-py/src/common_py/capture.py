"""Capture I/O (IC-2, charter § 3.2).

Wraps Phase 0's testkit ``capture`` flat-module (HDF5 payload + JSON
manifest per spec § 2.7) behind the IC-2 ``Reader`` / ``Writer``
classes. The on-disk format is identical to common-ts's output, so a
single capture file can be read by any stack.

INFERENCE — name shift from charter IC-2:
    The charter spells the IC-2 dataclass ``Manifest`` and types it
    independently. Phase 0's existing testkit type is
    ``capture.CaptureManifest`` (per
    ``tools/testkit/capture/__init__.py``). This module re-exports the
    Phase-0 type as ``Manifest`` to match IC-2 while avoiding a parallel
    definition that would silently drift. Same rationale for
    ``SimMeta`` / ``StackMeta`` / etc. — Phase 0 ships the canonical
    schema; common-py adopts it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
from capture import Capture as _CaptureRow
from capture import CaptureManifest as _CaptureManifest
from capture import load_capture as _load_capture
from capture import write_capture as _write_capture
from capture.reader import StepState as _StepState

__all__ = [
    "MAX_SUPPORTED_VERSION",
    "ConfigMeta",
    "DeterminismMeta",
    "Manifest",
    "PayloadMeta",
    "Reader",
    "RunMeta",
    "SimMeta",
    "StackMeta",
    "StepData",
    "Writer",
]

#: Highest capture-schema version this module reads / writes. Phase 4.0 WU-A
#: bumped 1.0.0 → 1.1.0 (optional ``gradient_fields``); WU-B adds optional
#: ``active_mask`` without a further bump. The schema-version surface in
#: common-py is the :class:`Manifest` dataclass field ``schema_version`` (the
#: testkit ``write_capture`` does the emission); this constant documents the
#: ceiling. Future schema versions: bump this module-level constant.
MAX_SUPPORTED_VERSION = "1.1.0"


# IC-2 dataclass aliases — wrap Phase 0's nested schema, exposed as
# flat dataclasses to match charter signatures.
@dataclass
class SimMeta:
    name: str
    category: str
    variant: str


@dataclass
class StackMeta:
    name: str
    version: str
    build_id: str


@dataclass
class ConfigMeta:
    tier: str
    dims: list[int]
    dtype: str
    seed: int
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class RunMeta:
    step_count: int
    capture_interval: int
    wall_clock_seconds: float
    start_utc: str


@dataclass
class PayloadMeta:
    format: str
    path: Path
    checksum: str


@dataclass
class DeterminismMeta:
    claimed: str
    atomic_ops: bool
    subgroup_ops: bool


@dataclass
class Manifest:
    schema_version: str
    sim: SimMeta
    stack: StackMeta
    config: ConfigMeta
    run: RunMeta
    payload: PayloadMeta
    determinism: DeterminismMeta
    #: Optional 1.1.0 addition (WU-A). ``None`` for 1.0.0 captures.
    gradient_fields: list[dict[str, Any]] | None = None


@dataclass
class StepData:
    fields: dict[str, np.ndarray]
    diagnostics: dict[str, float] = field(default_factory=dict)


def _to_phase0_manifest(m: Manifest) -> _CaptureManifest:
    return _CaptureManifest(
        schema_version=m.schema_version,
        sim={"name": m.sim.name, "category": m.sim.category, "variant": m.sim.variant},
        stack={
            "name": m.stack.name,
            "version": m.stack.version,
            "build_id": m.stack.build_id,
        },
        config={
            "tier": m.config.tier,
            "dims": list(m.config.dims),
            "dtype": m.config.dtype,
            "seed": int(m.config.seed),
            "params": dict(m.config.params),
        },
        run={
            "step_count": int(m.run.step_count),
            "capture_interval": int(m.run.capture_interval),
            "wall_clock_seconds": float(m.run.wall_clock_seconds),
            "start_utc": m.run.start_utc,
        },
        payload={
            "format": m.payload.format,
            "path": str(m.payload.path),
            "checksum": m.payload.checksum,
        },
        determinism={
            "claimed": m.determinism.claimed,
            "atomic_ops": bool(m.determinism.atomic_ops),
            "subgroup_ops": bool(m.determinism.subgroup_ops),
        },
        gradient_fields=m.gradient_fields,
    )


def _from_phase0_manifest(m: _CaptureManifest) -> Manifest:
    return Manifest(
        schema_version=m.schema_version,
        sim=SimMeta(**m.sim),
        stack=StackMeta(**m.stack),
        config=ConfigMeta(**m.config),
        run=RunMeta(**m.run),
        payload=PayloadMeta(
            format=m.payload["format"],
            path=Path(m.payload["path"]),
            checksum=m.payload["checksum"],
        ),
        determinism=DeterminismMeta(**m.determinism),
        gradient_fields=m.gradient_fields,
    )


class Reader:
    """IC-2 ``Reader``. Loads a capture via Phase 0's testkit ``capture``."""

    def __init__(self, manifest_path: Path) -> None:
        self._capture: _CaptureRow = _load_capture(Path(manifest_path))
        # Phase 0's `Capture._step_numbers` is private; iterate
        # `steps()` once and cache the integer keys so IC-2's
        # positional `read_step(idx)` can resolve to the right
        # underlying step number.
        self._step_numbers: list[int] = [s.step for s in self._capture.steps()]

    @property
    def manifest(self) -> Manifest:
        return _from_phase0_manifest(self._capture.manifest)

    @property
    def step_count(self) -> int:
        return len(self._step_numbers)

    def read_step(self, idx: int) -> StepData:
        if idx < 0 or idx >= len(self._step_numbers):
            raise IndexError(f"step index {idx} out of range [0, {len(self._step_numbers)})")
        step_n = self._step_numbers[idx]
        state: _StepState = self._capture.step(step_n)
        # Phase 0's StepState exposes `.state` (the per-field dict);
        # IC-2 calls it `fields` (charter § 3.2).
        return StepData(
            fields={k: np.asarray(v) for k, v in state.state.items()},
            diagnostics=dict(state.diagnostics),
        )


class Writer:
    """IC-2 ``Writer``. Buffers steps in memory and writes via Phase 0's testkit."""

    def __init__(self, manifest_path: Path, manifest: Manifest) -> None:
        self._manifest_path = Path(manifest_path)
        self._manifest = manifest
        self._buffer: dict[int, StepData] = {}
        self._finalized = False

    def write_step(self, idx: int, data: StepData) -> None:
        if self._finalized:
            raise RuntimeError("Writer.write_step called after finalize()")
        self._buffer[int(idx)] = data

    def finalize(self) -> None:
        if self._finalized:
            return
        # Phase 0's `write_capture(state_iter, manifest_meta, out_dir)`
        # iterates over `capture.StepState(step, state, diagnostics)`
        # rows. Adapt our buffer accordingly.
        rows = [
            _StepState(
                step=int(step),
                state={k: np.asarray(v) for k, v in self._buffer[step].fields.items()},
                diagnostics=dict(self._buffer[step].diagnostics),
            )
            for step in sorted(self._buffer)
        ]
        _write_capture(
            rows,
            _to_phase0_manifest(self._manifest),
            out_dir=self._manifest_path.parent,
        )
        self._finalized = True
