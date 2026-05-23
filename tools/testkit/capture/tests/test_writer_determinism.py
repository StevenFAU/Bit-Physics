"""Source-level determinism tests for ``capture.writer.write_capture``.

Per ``sub-phase-capture-determinism-contract`` Stage 1 deliverable 5:
``write_capture`` MUST produce byte-identical HDF5 payloads when invoked
with identical state at different Unix instants. The pre-amendment
implementation embedded the wall-clock-influenced HDF5 H5O_MTIME_NEW
object-header messages, which made the payload's raw-file sha256 unstable
across second boundaries. The post-amendment implementation passes
``libver="earliest"`` + ``track_order=False`` on every ``create_group`` +
``track_times=False`` on every ``create_dataset`` to suppress that
metadata at the source.

These tests defend against regression. They also intentionally cross a
~1.5s wall-clock boundary so that any future caller who DOES compare
raw file bytes (e.g., for forensic round-tripping of ``payload.checksum``)
gets a stable result — even though the canonical determinism contract
lives at the harness rather than the byte level.
"""

from __future__ import annotations

import hashlib
import time
from pathlib import Path

import numpy as np

from capture import CaptureManifest, StepState, write_capture


def _manifest(payload_name: str) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "writer-det", "category": "continuous-ca", "variant": "stub"},
        stack={"name": "numpy-stub", "version": "0.0.1", "build_id": "stub"},
        config={
            "tier": "test",
            "dims": [4],
            "dtype": "f64",
            "seed": 7,
            "params": {},
        },
        run={
            "step_count": 2,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-19T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": payload_name,
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _make_states() -> list[StepState]:
    arr = np.arange(4, dtype=np.float64)
    return [
        StepState(step=0, state={"U": arr.copy()}, diagnostics={"mass": float(arr.sum())}),
        StepState(
            step=1, state={"U": (arr * 0.5).copy()}, diagnostics={"mass": float((arr * 0.5).sum())}
        ),
    ]


def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def test_write_capture_byte_identical_across_seconds(tmp_path: Path) -> None:
    """Two write_capture calls separated by 1.5s produce byte-identical .h5.

    Pre-amendment this assertion was unstable across second boundaries
    because HDF5 object headers embedded the Unix epoch in every group /
    dataset OHDR. Post-amendment (libver=earliest + track_order=False on
    groups + track_times=False on datasets) the .h5 payload is fully
    wall-clock-independent.
    """
    a_dir = tmp_path / "run-a"
    b_dir = tmp_path / "run-b"
    a_dir.mkdir()
    b_dir.mkdir()

    a_manifest = write_capture(_make_states(), _manifest("a.h5"), a_dir)
    time.sleep(1.5)
    b_manifest = write_capture(_make_states(), _manifest("b.h5"), b_dir)

    # Payload paths differ by sidecar name; we hash the actual payloads.
    a_payload = a_dir / "a.h5"
    b_payload = b_dir / "b.h5"
    assert a_payload.exists()
    assert b_payload.exists()

    a_sha = _sha256_of_file(a_payload)
    b_sha = _sha256_of_file(b_payload)
    assert a_sha == b_sha, (
        f"write_capture is NOT byte-deterministic across 1.5s wall-clock: "
        f"run-a sha256={a_sha} run-b sha256={b_sha} — "
        f"the libver=earliest + track_times=False + track_order=False defense "
        f"has regressed. Investigate before relaxing the test."
    )

    # Also touch the manifests so pytest accepts the fixture as used.
    assert Path(a_manifest).exists()
    assert Path(b_manifest).exists()
