"""Gate-9/10: replayable inverse-solution capture with gradient_fields (schema 1.1.0)."""

from __future__ import annotations

import json
from pathlib import Path

from lenia_diff.capture import default_capture


def test_capture_has_gradient_fields(tmp_path: Path) -> None:
    manifest_path = default_capture(tmp_path)
    manifest = json.loads(manifest_path.read_text())
    assert manifest["schema_version"] == "1.1.0"
    gfs = manifest["gradient_fields"]
    assert len(gfs) == 2
    by_name = {g["name"]: g for g in gfs}
    assert by_name["dLoss_dmu"]["wrt"] == "mu"
    assert by_name["dLoss_dsigma"]["wrt"] == "sigma"
    for g in gfs:
        assert g["dtype"] == "float64"
        assert g["shape"] == [1]
    assert manifest_path.with_suffix(".h5").exists()
    assert manifest["determinism"]["claimed"] == "bit-exact-same-hw"


def test_capture_roundtrips(tmp_path: Path) -> None:
    from common_py.capture import Reader

    manifest_path = default_capture(tmp_path)
    reader = Reader(manifest_path)
    assert reader.manifest.schema_version == "1.1.0"
    assert reader.manifest.gradient_fields is not None
    step0 = reader.read_step(0)
    assert "A" in step0.fields
    assert "dLoss_dmu" in step0.fields
    assert "dLoss_dsigma" in step0.fields
