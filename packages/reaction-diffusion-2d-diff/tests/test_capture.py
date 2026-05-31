"""Gate-9/10: replayable inverse-solution capture with gradient_fields (schema 1.1.0)."""

from __future__ import annotations

import json
from pathlib import Path

from reaction_diffusion_2d_diff.capture import default_capture


def test_capture_has_gradient_fields(tmp_path: Path) -> None:
    manifest_path = default_capture(tmp_path)
    manifest = json.loads(manifest_path.read_text())
    # schema 1.1.0 (the gradient_fields addition)
    assert manifest["schema_version"] == "1.1.0"
    gfs = manifest["gradient_fields"]
    assert len(gfs) == 1
    gf = gfs[0]
    assert gf["name"] == "dLoss_dDu"
    assert gf["wrt"] == "Du"
    assert gf["dtype"] == "float64"
    assert gf["shape"] == [1]
    # the payload .h5 exists alongside (gate-9 replayable)
    assert manifest_path.with_suffix(".h5").exists()
    # determinism sidecar matches the registry claim (gate-10)
    assert manifest["determinism"]["claimed"] == "bit-exact-same-hw"


def test_capture_roundtrips(tmp_path: Path) -> None:
    from common_py.capture import Reader

    manifest_path = default_capture(tmp_path)
    reader = Reader(manifest_path)
    assert reader.manifest.schema_version == "1.1.0"
    assert reader.manifest.gradient_fields is not None
    # the recovered u field + gradient round-trip
    step0 = reader.read_step(0)
    assert "u" in step0.fields
    assert "dLoss_dDu" in step0.fields
