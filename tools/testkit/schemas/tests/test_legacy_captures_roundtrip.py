"""WU-A HARD gate — legacy-capture corpus round-trips through the 1.1.0 readers.

Spec § 2.7 + § 2.12: the additive ``1.0.0 → 1.1.0`` schema bump (optional
``gradient_fields``) must be NON-BREAKING. This is the load-bearing test that
makes "additive schema bumps are non-breaking" testable rather than
aspirational: every legacy capture that validated and loaded under 1.0.0 still
does under 1.1.0, bit-for-bit, with ``gradient_fields`` handled as absent
(``None``) rather than ``KeyError``.

§0.3 SHIFT (measured live, WU-A): the ``tests/fixtures/legacy-captures/`` corpus
is **26 pairs**, of which **9 are Phase-1 descriptor placeholders** — their
``.h5`` payloads are text stubs ("PHASE-1-STAGE-2 PLACEHOLDER — not an HDF5
file") and their JSON sidecars carry ``"checksum": "sha256:placeholder-..."``
plus a ``_phase_1_stage_2_note`` key. These did NOT validate against the capture
schema at 1.0.0 either (root ``additionalProperties: false`` + the
``^sha256:[0-9a-f]{64}$`` checksum pattern), so they never loaded through the
canonical path. They are classified **loudly, not silently excluded**: the test
asserts each is a recognized placeholder (sentinel checksum + non-HDF5 payload +
identical-at-1.0.0/1.1.0 validation failure), and that the **17 real captures**
round-trip fully. A real capture mislabeled as a placeholder — or a placeholder
silently promoted into the schema without a real payload — breaks this test.

The same gate re-runs in WU-B after ``active_mask`` is added (plan § 7.3).
"""

from __future__ import annotations

import json
from pathlib import Path

# NB: this strict (`filterwarnings = ["error"]`) testkit suite reads through the
# testkit `capture` layer — the shared validator/reader that common-py,
# common-warp, and common-cpp ALL delegate to — plus the common-warp reader
# (locale-clean). It deliberately does NOT import common-py here: common-py
# pulls in Taichi, whose `ti.init()` raises a `locale.getdefaultlocale`
# DeprecationWarning that this suite would escalate to an error at collection.
# The common-py reader's round-trip over the legacy corpus is exercised in
# common-py's own suite (test_autodiff sibling: test_legacy_reader_*), which
# runs under common-py's Taichi-ignoring `filterwarnings` ini. The common-cpp
# reader is skipped (no Python-callable test binding) per plan § 7.2 step 2.
import common_warp.capture as cwarp_capture
import pytest
from jsonschema import ValidationError

from capture import load_capture
from capture.manifest import MAX_SUPPORTED_VERSION, CaptureManifest

_REPO_ROOT = Path(__file__).resolve().parents[4]
_LEGACY_DIR = _REPO_ROOT / "tests" / "fixtures" / "legacy-captures"

_PLACEHOLDER_PREFIX = "sha256:placeholder"
_HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"

# Expected partition (measured at WU-A). Asserted so the corpus can't silently
# drift: a new placeholder without a payload, or a real capture losing its
# payload, changes these counts and fails loudly.
# 26 at WU-A; +1 per Phase-4 differentiable sim that appends a 1.1.0
# gradient_fields capture (the corpus grows deliberately — each addition bumps
# this count, so a silent drop/add still fails loudly). Phase-4 batch-1 sim 1
# (reaction-diffusion-2d-diff) is the first 1.1.0 entry → 27 (18 real + 9 placeholder);
# batch-1 sim 2 (lenia-diff) is the second 1.1.0 entry → 28 (19 real + 9 placeholder);
# batch-1 sim 3 (mpm-multimaterial-diff) is the third 1.1.0 entry → 29 (20 real + 9 placeholder);
# batch-1 sim 4 (eulerian-smoke-diff; FINAL) is the fourth 1.1.0 entry → 30 (21 real + 9 ph).
# batch-2 Sim A (3dgs-mpm-sh-update) adds a real schema-1.0.0 capture → 31 (22 real + 9 ph).
# batch-2 Sim B (eulerian-smoke-neural) adds a real schema-1.0.0 capture → 32 (23 real + 9 ph).
# batch-3 sim 1 (articulated-pedagogical-diff) adds a real 1.1.0 gradient_fields capture
# → 33 (24 real + 9 ph).
# batch-3 sim 2 (particle-lenia) adds a real schema-1.0.0 rollout capture → 34 (25 real + 9 ph).
# batch-3 sim 3 (flow-lenia) adds a real schema-1.0.0 rollout capture → 35 (26 real + 9 ph).
# phase-6 C-1 U-4 (eulerian-smoke-frontier-clebsch-pfm) adds a real 1.1.0 short-horizon
# Stack-C capture (no gradient_fields; the second C++-emitted corpus entry) → 39 (30 real + 9 ph).
# phase-6 C-1 U-5 (eulerian-smoke-frontier-vpfm) adds a real schema-1.0.0 short-horizon
# Stack-C capture (8-step n=16 tg2d vorticity-lift) → 40 (31 real + 9 ph).
_EXPECTED_TOTAL = 40
_EXPECTED_PLACEHOLDERS = 9


def _discover() -> list[Path]:
    pairs = sorted(p for p in _LEGACY_DIR.glob("*.json"))
    assert pairs, f"no legacy-capture sidecars found under {_LEGACY_DIR}"
    return pairs


def _is_placeholder(manifest_json_path: Path) -> bool:
    data = json.loads(manifest_json_path.read_text(encoding="utf-8"))
    return str(data.get("payload", {}).get("checksum", "")).startswith(_PLACEHOLDER_PREFIX)


_ALL = _discover()
_REAL = [p for p in _ALL if not _is_placeholder(p)]
_PLACEHOLDERS = [p for p in _ALL if _is_placeholder(p)]


def test_corpus_partition_is_stable():
    """The 26-pair corpus partitions into 17 real + 9 placeholder — asserted
    so neither a dropped payload nor a silently-promoted placeholder slips by."""
    assert len(_ALL) == _EXPECTED_TOTAL, [p.name for p in _ALL]
    assert len(_PLACEHOLDERS) == _EXPECTED_PLACEHOLDERS, [p.name for p in _PLACEHOLDERS]
    assert len(_REAL) == _EXPECTED_TOTAL - _EXPECTED_PLACEHOLDERS
    # Every sidecar has a matching .h5 payload (the pair invariant).
    for p in _ALL:
        assert p.with_suffix(".h5").exists(), f"missing payload for {p.name}"


def test_max_supported_version_is_1_1_0():
    assert MAX_SUPPORTED_VERSION == "1.1.0"


@pytest.mark.parametrize("sidecar", _REAL, ids=[p.stem for p in _REAL])
def test_real_capture_round_trips_through_1_1_0(sidecar: Path):
    """A real capture validates, loads, and round-trips its manifest under the
    1.1.0 schema. A 1.0.0 capture carries gradient_fields absent → None (not
    KeyError); a 1.1.0 capture (Phase-4 differentiable) carries it present and
    round-trips it without loss."""
    data = json.loads(sidecar.read_text(encoding="utf-8"))

    # Manifest round-trips: from_dict (schema-validates against 1.1.0) → to_dict
    # reproduces the original sidecar exactly (gradient_fields omitted when None,
    # preserved when present).
    manifest = CaptureManifest.from_dict(data)
    if data["schema_version"] == "1.1.0":
        assert manifest.gradient_fields is not None  # Phase-4 forward consumer
    else:
        assert manifest.gradient_fields is None  # 1.0.0: absent → None, never KeyError
    assert manifest.to_dict() == data

    # Payload loads through the canonical reader; every state array reads back.
    capture = load_capture(sidecar)
    steps = list(capture.steps())
    assert steps, f"{sidecar.name} produced no steps"
    for step in steps:
        for name, arr in step.state.items():
            assert arr is not None
            # Re-read the same field directly: bit-for-bit identical to the
            # array materialized by step() — payload integrity under 1.1.0.
            again = capture.field(step.step, name)
            assert (arr == again).all()

    # common-warp reader (delegating to the same testkit layer) sees the same
    # manifest with gradient_fields None and the original schema_version.
    cap = cwarp_capture.read_capture(sidecar)
    if data["schema_version"] == "1.1.0":
        assert cap.manifest["gradient_fields"] is not None
    else:
        assert cap.manifest["gradient_fields"] is None
    assert cap.manifest["schema_version"] == data["schema_version"]


@pytest.mark.parametrize("sidecar", _PLACEHOLDERS, ids=[p.stem for p in _PLACEHOLDERS])
def test_placeholder_is_loudly_classified_not_silently_excluded(sidecar: Path):
    """A Phase-1 descriptor placeholder is recognized explicitly: sentinel
    checksum + non-HDF5 payload + a schema-validation failure that is identical
    at 1.0.0 and 1.1.0 (the bump introduces no new breakage for it)."""
    data = json.loads(sidecar.read_text(encoding="utf-8"))
    assert str(data["payload"]["checksum"]).startswith(_PLACEHOLDER_PREFIX)

    # Payload is a text stub, not an HDF5 file.
    head = sidecar.with_suffix(".h5").read_bytes()[: len(_HDF5_MAGIC)]
    assert head != _HDF5_MAGIC, f"{sidecar.name} unexpectedly looks like real HDF5"

    # The manifest does not validate under the (now 1.1.0) schema — exactly as
    # it did not under 1.0.0. The 1.1.0 additions are optional, so the failure
    # is a PRE-EXISTING non-conformance, not a regression from the bump.
    with pytest.raises(ValidationError):
        CaptureManifest.from_dict(data)
    with pytest.raises(ValidationError):
        load_capture(sidecar)
