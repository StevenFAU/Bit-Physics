"""Tests for the canonical capture-format module (Block 1)."""

from __future__ import annotations

import json
from pathlib import Path

import h5py
import numpy as np
import pytest
from jsonschema import ValidationError

from capture import (
    Capture,
    CaptureManifest,
    StepState,
    diff_captures,
    load_capture,
    load_reference_manifest,
    write_capture,
)
from capture.manifest import validate_capture_manifest


def _base_manifest(payload_name: str = "demo.h5") -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "demo", "category": "continuous-ca", "variant": "ref"},
        stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "deadbeef"},
        config={
            "tier": "test",
            "dims": [4],
            "dtype": "f64",
            "seed": 42,
            "params": {},
        },
        run={
            "step_count": 2,
            "capture_interval": 1,
            "wall_clock_seconds": 0.01,
            "start_utc": "2026-05-18T00:00:00Z",
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


def _two_step_iter() -> list[StepState]:
    return [
        StepState(
            step=0,
            state={"U": np.array([0.0, 1.0, 2.0, 3.0], dtype=np.float64)},
            diagnostics={"mass": 6.0},
        ),
        StepState(
            step=1,
            state={"U": np.array([0.1, 1.1, 2.1, 3.1], dtype=np.float64)},
            diagnostics={"mass": 6.4},
        ),
    ]


def test_schema_validates_canonical_manifest() -> None:
    m = _base_manifest().to_dict()
    validate_capture_manifest(m)


def test_schema_rejects_bad_version() -> None:
    m = _base_manifest().to_dict()
    m["schema_version"] = "1.0"
    with pytest.raises(ValidationError):
        validate_capture_manifest(m)


def test_schema_rejects_unknown_field() -> None:
    m = _base_manifest().to_dict()
    m["mystery"] = True
    with pytest.raises(ValidationError):
        validate_capture_manifest(m)


def test_write_then_read_round_trip(tmp_path: Path) -> None:
    out_dir = tmp_path / "cap"
    manifest_path = write_capture(_two_step_iter(), _base_manifest(), out_dir)
    assert manifest_path.exists()

    # Manifest JSON is well-formed and schema-clean post-write.
    with manifest_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    validate_capture_manifest(data)
    assert data["payload"]["checksum"].startswith("sha256:")
    assert len(data["payload"]["checksum"]) == len("sha256:") + 64

    cap = load_capture(manifest_path)
    assert isinstance(cap, Capture)
    steps = list(cap.steps())
    assert [s.step for s in steps] == [0, 1]
    np.testing.assert_array_equal(cap.field(0, "U"), np.array([0.0, 1.0, 2.0, 3.0]))
    assert cap.step(1).diagnostics["mass"] == pytest.approx(6.4)


def test_hdf5_layout_matches_spec(tmp_path: Path) -> None:
    out_dir = tmp_path / "cap"
    manifest_path = write_capture(_two_step_iter(), _base_manifest(), out_dir)
    payload_path = out_dir / "demo.h5"
    assert payload_path.exists()

    with h5py.File(payload_path, "r") as h:
        assert "steps" in h
        assert "0" in h["steps"]
        assert "1" in h["steps"]
        assert "state" in h["steps/0"]
        assert "U" in h["steps/0/state"]
        assert "diagnostics" in h["steps/0"]
        assert "mass" in h["steps/0/diagnostics"]
        assert "metadata" in h
        assert h["metadata"].attrs["schema_version"] == "1.0.0"

    _ = manifest_path  # ensure write also produced manifest


def test_diff_bit_exact_same(tmp_path: Path) -> None:
    a_dir = tmp_path / "a"
    b_dir = tmp_path / "b"
    a_path = write_capture(_two_step_iter(), _base_manifest(), a_dir)
    b_path = write_capture(_two_step_iter(), _base_manifest(), b_dir)
    diff = diff_captures(a_path, b_path, mode="bit-exact")
    assert diff.bit_exact is True
    assert diff.max_abs_err == 0.0
    assert diff.mismatched_fields == []


def test_diff_epsilon_equal(tmp_path: Path) -> None:
    a_dir = tmp_path / "a"
    b_dir = tmp_path / "b"
    a_path = write_capture(_two_step_iter(), _base_manifest(), a_dir)
    perturbed = [
        StepState(
            step=s.step,
            state={k: v + 1e-9 for k, v in s.state.items()},
            diagnostics=dict(s.diagnostics),
        )
        for s in _two_step_iter()
    ]
    b_path = write_capture(perturbed, _base_manifest(), b_dir)
    diff = diff_captures(a_path, b_path, mode="epsilon", rtol=1e-6, atol=1e-6)
    assert diff.bit_exact is False
    assert diff.max_abs_err < 1e-6
    assert diff.mismatched_fields == []


def test_diff_fails_on_mismatch(tmp_path: Path) -> None:
    a_dir = tmp_path / "a"
    b_dir = tmp_path / "b"
    a_path = write_capture(_two_step_iter(), _base_manifest(), a_dir)
    wrong = [
        StepState(
            step=0,
            state={"U": np.array([99.0, 1.0, 2.0, 3.0], dtype=np.float64)},
            diagnostics={"mass": 105.0},
        ),
        StepState(
            step=1,
            state={"U": np.array([99.0, 1.1, 2.1, 3.1], dtype=np.float64)},
            diagnostics={"mass": 105.0},
        ),
    ]
    b_path = write_capture(wrong, _base_manifest(), b_dir)
    diff = diff_captures(a_path, b_path, mode="bit-exact")
    assert diff.bit_exact is False
    assert diff.max_abs_err > 0


def test_diff_raises_on_dtype_mismatch(tmp_path: Path) -> None:
    a_dir = tmp_path / "a"
    b_dir = tmp_path / "b"
    a_steps = [
        StepState(step=0, state={"U": np.array([1, 2, 3], dtype=np.float64)}, diagnostics={})
    ]
    b_steps = [
        StepState(step=0, state={"U": np.array([1, 2, 3], dtype=np.float32)}, diagnostics={})
    ]
    a_manifest = _base_manifest("a.h5")
    a_manifest.run = dict(a_manifest.run)
    a_manifest.run["step_count"] = 1
    b_manifest = _base_manifest("b.h5")
    b_manifest.run = dict(b_manifest.run)
    b_manifest.run["step_count"] = 1
    a_path = write_capture(a_steps, a_manifest, a_dir)
    b_path = write_capture(b_steps, b_manifest, b_dir)
    with pytest.raises(TypeError):
        diff_captures(a_path, b_path, mode="bit-exact")


def test_load_reference_manifest_validates(tmp_path: Path) -> None:
    manifest = """
[upstream]
name = "DemoUpstream"
version = "1.0.0"
sha = "0123456789abcdef0123456789abcdef01234567"
url = "https://example.invalid/demo"
license = "MIT"
license_file = "LICENSE"

[scope]
purpose = "demo only"
used_by_sims = []
used_by_checks = []

[vendoring]
fetched_utc = "2026-05-18T00:00:00Z"
fetched_by = "phase-0-block-1-agent"
fetch_command = "git clone https://example.invalid/demo"
"""
    p = tmp_path / "MANIFEST.toml"
    p.write_text(manifest, encoding="utf-8")
    parsed = load_reference_manifest(p)
    assert parsed["upstream"]["name"] == "DemoUpstream"
    assert parsed["upstream"]["license"] == "MIT"


def test_load_reference_manifest_rejects_missing_field(tmp_path: Path) -> None:
    manifest = """
[upstream]
name = "DemoUpstream"
version = "1.0.0"
# missing sha / url / license / license_file

[scope]
purpose = "demo"
used_by_sims = []
used_by_checks = []

[vendoring]
fetched_utc = "2026-05-18T00:00:00Z"
fetched_by = "phase-0-block-1-agent"
fetch_command = "git clone"
"""
    p = tmp_path / "MANIFEST.toml"
    p.write_text(manifest, encoding="utf-8")
    with pytest.raises(ValidationError):
        load_reference_manifest(p)
