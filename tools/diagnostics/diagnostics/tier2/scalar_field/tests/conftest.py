"""Synthetic captures for scalar-field diagnostic tests."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from capture import Capture, CaptureManifest, StepState, load_capture, write_capture


def _manifest(payload_name: str, step_count: int) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "rd-2d", "category": "continuous-ca", "variant": "stub"},
        stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "stub"},
        config={
            "tier": "test",
            "dims": [16, 16],
            "dtype": "f64",
            "seed": 42,
            "params": {},
        },
        run={
            "step_count": step_count,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
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


def _write(tmp_path: Path, states: list[StepState], payload_name: str = "scalar.h5") -> Capture:
    manifest = _manifest(payload_name, step_count=len(states))
    manifest_path = write_capture(states, manifest, tmp_path)
    return load_capture(manifest_path)


@pytest.fixture
def bounded_capture(tmp_path: Path) -> Capture:
    """All values in [0, 1]."""
    states = [
        StepState(step=i, state={"U": np.full((16, 16), 0.5, dtype=np.float64)}, diagnostics={})
        for i in range(3)
    ]
    return _write(tmp_path, states)


@pytest.fixture
def violating_capture(tmp_path: Path) -> Capture:
    """Step 1 has a value below 0.0; step 2 has a value above 1.0."""
    a0 = np.full((16, 16), 0.5, dtype=np.float64)
    a1 = a0.copy()
    a1[2, 3] = -0.5
    a2 = a0.copy()
    a2[4, 5] = 1.5
    states = [
        StepState(step=0, state={"U": a0}, diagnostics={}),
        StepState(step=1, state={"U": a1}, diagnostics={}),
        StepState(step=2, state={"U": a2}, diagnostics={}),
    ]
    return _write(tmp_path, states, payload_name="viol.h5")


@pytest.fixture
def low_spectrum_capture(tmp_path: Path) -> Capture:
    """Smooth field: a low-wavenumber sinusoid."""
    n = 32
    x = np.arange(n)
    y = np.arange(n)
    xx, _yy = np.meshgrid(x, y, indexing="ij")
    f0 = np.sin(2 * np.pi * xx / n)
    states = [
        StepState(step=i, state={"U": (f0 * (1.0 - 0.1 * i)).astype(np.float64)}, diagnostics={})
        for i in range(3)
    ]
    return _write(tmp_path, states, payload_name="lowspec.h5")


@pytest.fixture
def high_spectrum_capture(tmp_path: Path) -> Capture:
    """Random white-noise field: nearly uniform spectrum -> heavy high band."""
    rng = np.random.default_rng(0)
    n = 32
    states = [
        StepState(
            step=i,
            state={"U": rng.standard_normal((n, n)).astype(np.float64)},
            diagnostics={},
        )
        for i in range(3)
    ]
    return _write(tmp_path, states, payload_name="hispec.h5")


@pytest.fixture
def conserving_capture(tmp_path: Path) -> Capture:
    """sum(U) == constant across steps."""
    base = np.full((16, 16), 0.25, dtype=np.float64)
    states = [StepState(step=i, state={"U": base.copy()}, diagnostics={}) for i in range(4)]
    return _write(tmp_path, states, payload_name="cons.h5")


@pytest.fixture
def leaky_capture(tmp_path: Path) -> Capture:
    """sum(U) drifts upward at each step."""
    states = []
    arr = np.full((16, 16), 0.25, dtype=np.float64)
    for i in range(4):
        states.append(StepState(step=i, state={"U": (arr + 0.001 * i).copy()}, diagnostics={}))
    return _write(tmp_path, states, payload_name="leaky.h5")
