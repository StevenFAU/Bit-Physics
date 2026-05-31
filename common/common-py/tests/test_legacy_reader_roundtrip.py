"""common-py IC-2 Reader round-trips the legacy capture corpus under 1.1.0.

Companion to the testkit HARD gate
(``tools/testkit/schemas/tests/test_legacy_captures_roundtrip.py``): that suite
reads through the testkit + common-warp layers (it cannot import common-py
without escalating Taichi's locale DeprecationWarning under its strict
``filterwarnings``). This module covers the common-py reader specifically,
under common-py's Taichi-ignoring ini — confirming the 1.0.0 → 1.1.0 bump is
non-breaking for the Taichi-stack reader too (``gradient_fields`` → None).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import common_py.capture as cpy_capture

_REPO_ROOT = Path(__file__).resolve().parents[3]
_LEGACY_DIR = _REPO_ROOT / "tests" / "fixtures" / "legacy-captures"


def _real_sidecars() -> list[Path]:
    out = []
    for p in sorted(_LEGACY_DIR.glob("*.json")):
        data = json.loads(p.read_text(encoding="utf-8"))
        if not str(data.get("payload", {}).get("checksum", "")).startswith("sha256:placeholder"):
            out.append(p)
    return out


def test_max_supported_version_is_1_1_0():
    assert cpy_capture.MAX_SUPPORTED_VERSION == "1.1.0"


@pytest.mark.parametrize("sidecar", _real_sidecars(), ids=[p.stem for p in _real_sidecars()])
def test_common_py_reader_round_trips_legacy(sidecar: Path):
    data = json.loads(sidecar.read_text(encoding="utf-8"))
    reader = cpy_capture.Reader(sidecar)
    manifest = reader.manifest
    if data["schema_version"] == "1.1.0":
        # Phase-4 differentiable captures carry gradient_fields through the
        # Taichi-stack reader too (the 1.1.0 forward direction).
        assert manifest.gradient_fields is not None
    else:
        assert manifest.gradient_fields is None  # 1.0.0: absent → None under 1.1.0
    assert manifest.schema_version == data["schema_version"]
    assert reader.step_count >= 1
    # Every state array reads back without error.
    first = reader.read_step(0)
    assert first.fields
