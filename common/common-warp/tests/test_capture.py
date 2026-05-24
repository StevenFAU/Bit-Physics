"""Capture I/O subsystem (Subsystem 2) tests — W-1 mechanism + W-5 contract."""

from __future__ import annotations

from typing import Any

import numpy as np
import pytest

pytest.importorskip("warp")  # common-warp's hard dep; skip cleanly if absent in CI.

import warp as wp
from equivalence.harness import compare_captures  # type: ignore[import-not-found]

import common_warp


def _manifest(name: str = "hello-warp-smoke", category: str = "smoke") -> dict[str, Any]:
    """A complete capture-v1 manifest (writer overrides payload path/checksum)."""
    return {
        "schema_version": "1.0.0",
        "sim": {"name": name, "category": category, "variant": "common-warp"},
        "stack": {"name": "common-warp", "version": "0.1.0", "build_id": "stage-1b"},
        "config": {"tier": "diagnostic", "dims": [4], "dtype": "f64", "seed": 42, "params": {}},
        "run": {
            "step_count": 2,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-24T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": "x.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }


def test_capture_write_creates_hdf5_and_manifest(tmp_path) -> None:
    base = tmp_path / "cap"
    cap = common_warp.Capture(
        manifest=_manifest(),
        payload={"steps/0/state/density": np.arange(4, dtype=np.float64)},
    )
    common_warp.write_capture(cap, base)
    assert (tmp_path / "cap.h5").exists()
    assert (tmp_path / "cap.json").exists()


def test_capture_read_round_trips(tmp_path) -> None:
    base = tmp_path / "cap"
    arr = np.array([1.5, 2.5, 3.5, 4.5], dtype=np.float64)
    cap = common_warp.Capture(manifest=_manifest(), payload={"steps/0/state/density": arr})
    common_warp.write_capture(cap, base)
    back = common_warp.read_capture(base)
    np.testing.assert_array_equal(back.payload["steps/0/state/density"], arr)
    assert back.manifest["sim"]["name"] == "hello-warp-smoke"


def test_capture_schema_v1_compliance(tmp_path) -> None:
    base = tmp_path / "cap"
    cap = common_warp.Capture(
        manifest=_manifest(), payload={"steps/0/state/density": np.zeros(4, dtype=np.float64)}
    )
    common_warp.write_capture(cap, base)
    from common_warp.capture import read_manifest

    man = read_manifest(base)
    for key in ("schema_version", "sim", "stack", "config", "run", "payload", "determinism"):
        assert key in man
    assert man["schema_version"] == "1.0.0"
    assert man["payload"]["checksum"].startswith("sha256:")


def test_capture_warp_array_numpy_marshalling(tmp_path) -> None:
    """A Warp array round-trips through .numpy() -> HDF5 -> read."""
    base = tmp_path / "cap"
    with wp.ScopedDevice("cpu"):
        warr = wp.array(np.array([0.25, 0.5, 0.75, 1.0], dtype=np.float64), dtype=wp.float64)
        payload = {"steps/0/state/density": warr.numpy()}
    cap = common_warp.Capture(manifest=_manifest(), payload=payload)
    common_warp.write_capture(cap, base)
    back = common_warp.read_capture(base)
    np.testing.assert_array_equal(
        back.payload["steps/0/state/density"], np.array([0.25, 0.5, 0.75, 1.0])
    )


def test_capture_satisfies_compare_captures_contract(tmp_path) -> None:
    """W-5 mechanism: a common-warp capture pair feeds compare_captures and
    yields a verdict WITHOUT a HARD_FAIL on sim.{name,category}/step-set/shape/dtype.
    (Full W-5 gate completes at Stage 1c via the Subsystem-7 smoke capture.)"""
    payload = {
        "steps/0/state/density": np.linspace(0.0, 1.0, 4, dtype=np.float64),
        "steps/1/state/density": np.linspace(0.0, 0.5, 4, dtype=np.float64),
    }
    left = tmp_path / "left"
    right = tmp_path / "right"
    common_warp.write_capture(common_warp.Capture(manifest=_manifest(), payload=payload), left)
    common_warp.write_capture(common_warp.Capture(manifest=_manifest(), payload=payload), right)

    verdict = compare_captures(left.with_suffix(".json"), right.with_suffix(".json"))

    assert isinstance(verdict.within_tolerance, bool)
    hard_fail_markers = {"sim:category-mismatch", "step:set-mismatch"}
    assert not (hard_fail_markers & set(verdict.per_field_diff))
    assert not any(k.endswith((":missing", ":shape-mismatch")) for k in verdict.per_field_diff)
    # identical captures -> within tolerance
    assert verdict.within_tolerance is True
