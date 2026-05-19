"""Shared fixtures for diagnostic-tier tests.

Builds synthetic captures with controllable state arrays so each Tier 1
module exercises real reader paths.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pytest
from capture import Capture, CaptureManifest, StepState, load_capture, write_capture


def _manifest(
    payload_name: str,
    schema_version: str = "1.0.0",
    seed: int = 42,
    wall_clock_seconds: float = 1.0,
    step_count: int = 4,
    metadata_extras: dict[str, Any] | None = None,
) -> CaptureManifest:
    return CaptureManifest(
        schema_version=schema_version,
        sim={"name": "synth", "category": "continuous-ca", "variant": "stub"},
        stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "stub"},
        config={
            "tier": "test",
            "dims": [8, 8],
            "dtype": "f64",
            "seed": seed,
            "params": {},
        },
        run={
            "step_count": step_count,
            "capture_interval": 1,
            "wall_clock_seconds": wall_clock_seconds,
            "start_utc": "2026-05-19T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": payload_name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _write(
    tmp_path: Path,
    states: list[StepState],
    *,
    schema_version: str = "1.0.0",
    wall_clock_seconds: float = 1.0,
    payload_name: str = "synth.h5",
    metadata_extras: dict[str, Any] | None = None,
) -> Capture:
    manifest = _manifest(
        payload_name,
        schema_version=schema_version,
        wall_clock_seconds=wall_clock_seconds,
        step_count=len(states),
    )
    manifest_path = write_capture(states, manifest, tmp_path)
    capture = load_capture(manifest_path)
    if metadata_extras:
        capture.metadata.update(metadata_extras)
    return capture


@pytest.fixture
def healthy_capture(tmp_path: Path) -> Capture:
    states = [
        StepState(step=i, state={"U": np.full((8, 8), 0.5, dtype=np.float64)}, diagnostics={})
        for i in range(3)
    ]
    return _write(tmp_path, states)


@pytest.fixture
def nan_capture(tmp_path: Path) -> Capture:
    arr0 = np.full((8, 8), 0.5, dtype=np.float64)
    arr1 = arr0.copy()
    arr1[3, 4] = np.nan
    arr2 = arr1.copy()
    arr2[5, 1] = np.inf
    states = [
        StepState(step=0, state={"U": arr0}, diagnostics={}),
        StepState(step=1, state={"U": arr1}, diagnostics={}),
        StepState(step=2, state={"U": arr2}, diagnostics={}),
    ]
    return _write(tmp_path, states)


@pytest.fixture
def future_schema_capture(tmp_path: Path) -> Capture:
    states = [
        StepState(step=0, state={"U": np.zeros((4, 4))}, diagnostics={}),
    ]
    return _write(tmp_path, states, schema_version="2.0.0", payload_name="future.h5")


@pytest.fixture
def perf_capture(tmp_path: Path) -> Capture:
    states = [StepState(step=i, state={"U": np.zeros((4, 4))}, diagnostics={}) for i in range(10)]
    return _write(
        tmp_path,
        states,
        wall_clock_seconds=2.5,
        metadata_extras={
            "gpu_dispatch_count": 1234,
            "memory_high_water_bytes": 4 * 1024 * 1024,
        },
    )
