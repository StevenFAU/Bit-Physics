"""Schema-version backward-compat regression corpus (spec § 2.12).

Activates the legacy-captures corpus replay at Block 9 LANDING. Block 8
seeded the first corpus entry (`phase-0-rd-2d-ref.{h5,json}`); every
subsequent schema bump must keep round-tripping it through the new
reader. Phase 4 WU-A is the first schema bump; Phase 0 LANDING's
contract is "the seed loads cleanly through today's reader."
"""

from __future__ import annotations

from pathlib import Path

import pytest

from capture import Capture, load_capture
from capture.manifest import validate_capture_manifest

_CORPUS_DIR = Path(__file__).resolve().parents[4] / "tests" / "fixtures" / "legacy-captures"


def _corpus_entries() -> list[Path]:
    return sorted(_CORPUS_DIR.glob("phase-*.json"))


@pytest.mark.parametrize("manifest_path", _corpus_entries(), ids=lambda p: p.stem)
def test_legacy_capture_round_trips(manifest_path: Path) -> None:
    """Every corpus manifest loads + payload reads without error."""
    capture = load_capture(manifest_path)
    assert isinstance(capture, Capture)
    assert capture.manifest.schema_version
    steps = list(capture.steps())
    assert len(steps) >= 1
    for step in steps:
        assert step.step >= 0
        for arr in step.state.values():
            assert arr.size > 0


@pytest.mark.parametrize("manifest_path", _corpus_entries(), ids=lambda p: p.stem)
def test_legacy_capture_manifest_schema_valid(manifest_path: Path) -> None:
    """The manifest validates against the current schema (forward-compat)."""
    import json

    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    validate_capture_manifest(payload)


def test_corpus_has_phase_0_seed() -> None:
    """Block 8 seeded the RD-2D capture as the first corpus entry."""
    seed = _CORPUS_DIR / "phase-0-rd-2d-ref.json"
    assert seed.exists(), (
        f"Block 8 RD-2D seed missing at {seed}; the corpus is supposed to be "
        "append-only and Block 8 was the first entry."
    )
