"""Gate-9/10: replayable inverse-solution capture with gradient_fields (schema 1.1.0)."""

from __future__ import annotations

import json
from pathlib import Path

from eulerian_smoke_diff.capture import default_capture


def test_capture_has_gradient_fields(tmp_path: Path) -> None:
    manifest_path = default_capture(tmp_path)
    manifest = json.loads(manifest_path.read_text())
    assert manifest["schema_version"] == "1.1.0"
    gfs = manifest["gradient_fields"]
    assert len(gfs) == 1
    gf = gfs[0]
    assert gf["name"] == "dLoss_du0"
    assert gf["wrt"] == "u0"
    assert gf["dtype"] == "float64"
    assert gf["shape"] == [16, 16]
    assert manifest_path.with_suffix(".h5").exists()
    assert manifest["determinism"]["claimed"] == "bit-exact-same-hw"
    assert manifest["determinism"]["atomic_ops"] is True


def test_capture_roundtrips(tmp_path: Path) -> None:
    from capture import load_capture

    manifest_path = default_capture(tmp_path)
    capture = load_capture(manifest_path)
    assert capture.manifest.schema_version == "1.1.0"
    assert capture.manifest.gradient_fields is not None
    step0 = next(iter(capture.steps()))
    assert "smoke_density" in step0.state
    assert "dLoss_du0" in step0.state
