"""``common_warp.usd`` tests — scene template + capture-to-USD export round-trip.

USD is CPU-only (no CUDA); these run wherever ``usd-core`` (``pxr``) is installed
(common-warp's ``usd`` extra). They are the "USD export validates" half of the
operator-ratified WU-D CPU-fallback acceptance (plan §7.5 v9 addendum).
"""

from __future__ import annotations

import numpy as np
import pytest

from common_warp.capture import write_frames_capture
from common_warp.usd import create_scene_template, export_capture_to_usd

pytest.importorskip("pxr", reason="usd-core (pxr) not installed")


def _manifest(descriptor: str, step_count: int) -> dict:
    return {
        "schema_version": "1.1.0",
        "sim": {"name": "newton-usd-smoke", "category": "test", "variant": "ref"},
        "stack": {"name": "numpy-reference", "version": "0.0.0", "build_id": "wu-d-test"},
        "config": {"tier": "test", "dims": [2], "dtype": "f64", "seed": 0, "params": {}},
        "run": {
            "step_count": step_count,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-30T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }


def test_create_scene_template_defaults(tmp_path) -> None:
    from pxr import Usd, UsdGeom

    out = tmp_path / "scene.usda"
    create_scene_template(output_path=str(out))
    assert out.exists()
    stage = Usd.Stage.Open(str(out))
    assert UsdGeom.GetStageUpAxis(stage) == UsdGeom.Tokens.y
    assert UsdGeom.GetStageMetersPerUnit(stage) == 1.0
    assert stage.GetPrimAtPath("/World/physicsScene").IsValid()
    assert stage.GetPrimAtPath("/World/groundPlane").IsValid()
    mag = stage.GetPrimAtPath("/World/physicsScene").GetAttribute("physics:gravityMagnitude").Get()
    assert mag == pytest.approx(9.81, abs=1e-4)


def test_create_scene_template_no_ground_and_zero_gravity(tmp_path) -> None:
    from pxr import Usd

    out = tmp_path / "empty.usda"
    create_scene_template(output_path=str(out), ground_plane=False, gravity=(0.0, 0.0, 0.0))
    stage = Usd.Stage.Open(str(out))
    assert not stage.GetPrimAtPath("/World/groundPlane").IsValid()
    mag = stage.GetPrimAtPath("/World/physicsScene").GetAttribute("physics:gravityMagnitude").Get()
    assert mag == pytest.approx(0.0)


def test_create_scene_template_validates_args(tmp_path) -> None:
    with pytest.raises(ValueError, match="up_axis"):
        create_scene_template(output_path=str(tmp_path / "a.usda"), up_axis="X")
    with pytest.raises(ValueError, match="meters"):
        create_scene_template(output_path=str(tmp_path / "b.usda"), units="feet")


def test_export_capture_to_usd_round_trip_preserves_pose(tmp_path) -> None:
    """usd_round_trip_preserves_pose: capture positions survive USD export."""
    from pxr import Usd, UsdGeom

    rng = np.random.default_rng(0)
    n_bodies, n_steps = 2, 3
    positions = {k: rng.uniform(-1, 1, (n_bodies, 3)).astype(np.float64) for k in range(n_steps)}
    quats = np.tile([1.0, 0.0, 0.0, 0.0], (n_bodies, 1))
    frames = [(k, {"positions": positions[k], "orientations": quats}, {}) for k in range(n_steps)]
    json_path = write_frames_capture(frames, _manifest("usd-rt-seed0-step3", n_steps), tmp_path)

    out = tmp_path / "anim.usda"
    export_capture_to_usd(str(json_path), str(out), fps=60.0)
    assert out.exists()

    stage = Usd.Stage.Open(str(out))
    assert stage.GetTimeCodesPerSecond() == 60.0
    for i in range(n_bodies):
        xf = UsdGeom.Xformable(stage.GetPrimAtPath(f"/World/body_{i}"))
        op = next(o for o in xf.GetOrderedXformOps() if "translate" in o.GetOpName())
        for k in range(n_steps):
            got = np.array(op.Get(Usd.TimeCode(float(k))))
            np.testing.assert_allclose(got, positions[k][i], atol=1e-6)


def test_export_rejects_capture_without_position_field(tmp_path) -> None:
    frames = [(0, {"scalar": np.array([1.0, 2.0])}, {})]
    json_path = write_frames_capture(frames, _manifest("usd-noposition-seed0-step1", 1), tmp_path)
    with pytest.raises(ValueError, match="position field"):
        export_capture_to_usd(str(json_path), str(tmp_path / "x.usda"))
