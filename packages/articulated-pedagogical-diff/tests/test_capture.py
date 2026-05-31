"""Gate-9/10: replayable inverse-solution capture with gradient_fields (schema 1.1.0)."""

from __future__ import annotations

import json
from pathlib import Path

from articulated_pedagogical_diff.capture import default_capture


def test_capture_has_gradient_fields(tmp_path: Path) -> None:
    manifest_path = default_capture(tmp_path)
    manifest = json.loads(manifest_path.read_text())
    assert manifest["schema_version"] == "1.1.0"
    gfs = {gf["name"]: gf for gf in manifest["gradient_fields"]}
    assert set(gfs) == {"dLoss_dq0", "dLoss_dqd0"}
    assert gfs["dLoss_dq0"]["wrt"] == "q0"
    assert gfs["dLoss_dqd0"]["wrt"] == "qd0"
    assert all(gf["dtype"] == "float64" for gf in gfs.values())
    assert manifest_path.with_suffix(".h5").exists()
    assert manifest["determinism"]["claimed"] == "bit-exact-same-hw"
    assert manifest["sim"]["name"] == "articulated-pedagogical-diff"


def test_capture_roundtrips(tmp_path: Path) -> None:
    from capture import load_capture

    manifest_path = default_capture(tmp_path)
    capture = load_capture(manifest_path)
    assert capture.manifest.schema_version == "1.1.0"
    assert capture.manifest.gradient_fields is not None
    step0 = next(iter(capture.steps()))
    assert "recovered_q0" in step0.state
    assert "dLoss_dq0" in step0.state


def test_canonical_capture_committed(
    canonical_manifest_path: Path, canonical_payload_path: Path
) -> None:
    """The committed canonical capture exists (a Stage-1b deliverable; RED until authored)."""
    assert canonical_manifest_path.exists(), canonical_manifest_path
    assert canonical_payload_path.exists(), canonical_payload_path
    manifest = json.loads(canonical_manifest_path.read_text())
    assert manifest["schema_version"] == "1.1.0"
    assert manifest["sim"]["name"] == "articulated-pedagogical-diff"
