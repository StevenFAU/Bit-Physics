"""Gate-9/10: replayable Flow Lenia rollout capture (schema 1.0.0)."""

from __future__ import annotations

import json
from pathlib import Path

from flow_lenia.forward import FlowLeniaConfig
from flow_lenia.sim import FlowLeniaSim

_CANON = FlowLeniaConfig(grid=32, seed=42, steps=40)


def test_capture_roundtrips(tmp_path: Path) -> None:
    from capture import load_capture

    manifest_path = FlowLeniaSim(_CANON).capture(tmp_path)
    capture = load_capture(manifest_path)
    assert capture.manifest.schema_version == "1.0.0"
    step0 = next(iter(capture.steps()))
    assert "A" in step0.state
    assert step0.state["A"].shape == (32, 32)


def test_capture_manifest_fields(tmp_path: Path) -> None:
    manifest_path = FlowLeniaSim(_CANON).capture(tmp_path)
    manifest = json.loads(manifest_path.read_text())
    assert manifest["sim"]["name"] == "flow-lenia"
    assert manifest["sim"]["variant"] == "frontier-flow-lenia"
    assert manifest["config"]["params"]["scheme"] == "reintegration-tracking"
    assert manifest["determinism"]["claimed"] == "bit-exact-same-hw"
    assert manifest_path.with_suffix(".h5").exists()


def test_canonical_capture_committed(
    canonical_manifest_path: Path, canonical_payload_path: Path
) -> None:
    """The committed canonical capture exists (a Stage-1b deliverable; RED until authored)."""
    assert canonical_manifest_path.exists(), canonical_manifest_path
    assert canonical_payload_path.exists(), canonical_payload_path
    manifest = json.loads(canonical_manifest_path.read_text())
    assert manifest["sim"]["name"] == "flow-lenia"
