"""Tests for common_warp.capture.write_frames_capture (WU-A additive helper)."""

from __future__ import annotations

import numpy as np

import common_warp
from common_warp.capture import read_capture, write_frames_capture


def _manifest(descriptor: str) -> dict:
    return {
        "schema_version": "1.1.0",
        "sim": {"name": "frames-smoke", "category": "test", "variant": "ref"},
        "stack": {"name": "numpy-reference", "version": "0.0.0", "build_id": "wu-a-test"},
        "config": {"tier": "test", "dims": [4], "dtype": "f64", "seed": 0, "params": {}},
        "run": {
            "step_count": 2,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-30T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }


def test_write_frames_capture_round_trips(tmp_path):
    frames = [
        (0, {"u": np.array([1.0, 2.0, 3.0, 4.0])}, {"energy": 10.0}),
        (1, {"u": np.array([1.5, 2.5, 3.5, 4.5])}, {"energy": 12.0}),
    ]
    descriptor = "frames-smoke-seed0-step2"
    json_path = write_frames_capture(frames, _manifest(descriptor), tmp_path)
    assert json_path.exists()
    assert json_path.name == f"{descriptor}.json"

    cap = read_capture(json_path)
    assert cap.manifest["schema_version"] == "1.1.0"
    assert cap.manifest["gradient_fields"] is None
    np.testing.assert_array_equal(cap.payload["steps/1/state/u"], np.array([1.5, 2.5, 3.5, 4.5]))
    assert float(cap.payload["steps/0/diagnostics/energy"]) == 10.0


def test_write_frames_capture_exported_at_top_level():
    assert hasattr(common_warp, "write_frames_capture")


def test_write_frames_capture_requires_payload_path(tmp_path):
    m = _manifest("x")
    m["payload"]["path"] = ""
    import pytest

    with pytest.raises(ValueError, match="payload"):
        write_frames_capture([(0, {"u": np.array([1.0])}, {})], m, tmp_path)
