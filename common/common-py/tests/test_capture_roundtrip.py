"""IC-2 capture round-trip tests."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pytest

from common_py.capture import (
    ConfigMeta,
    DeterminismMeta,
    Manifest,
    PayloadMeta,
    Reader,
    RunMeta,
    SimMeta,
    StackMeta,
    StepData,
    Writer,
)


def _make_manifest(descriptor: str = "ic2-test", seed: int = 0) -> Manifest:
    return Manifest(
        schema_version="1.0.0",
        sim=SimMeta(name="ic2-roundtrip", category="test", variant="reference"),
        stack=StackMeta(name="common-py", version="0.0.0", build_id="ic2-test"),
        config=ConfigMeta(
            tier="reference",
            dims=[8],
            dtype="f64",
            seed=seed,
            params={"k": 1.0},
        ),
        run=RunMeta(
            step_count=20,
            capture_interval=10,
            wall_clock_seconds=0.0,
            start_utc=datetime.now(UTC).isoformat(),
        ),
        payload=PayloadMeta(format="hdf5", path=Path(f"{descriptor}.h5"), checksum=""),
        determinism=DeterminismMeta(
            claimed="bit-exact-same-hw", atomic_ops=False, subgroup_ops=False
        ),
    )


def test_capture_writer_then_reader_roundtrips_step_arrays(tmp_path: Path) -> None:
    manifest = _make_manifest()
    writer = Writer(tmp_path / "ic2-test.json", manifest)
    field_a = np.arange(8, dtype=np.float64)
    field_b = np.linspace(-1.0, 1.0, 8)
    writer.write_step(0, StepData(fields={"u": field_a.copy(), "v": field_b.copy()}))
    writer.write_step(
        10,
        StepData(
            fields={"u": field_a * 2, "v": field_b * 2},
            diagnostics={"l2": 1.25},
        ),
    )
    writer.finalize()

    reader = Reader(tmp_path / "ic2-test.json")
    assert reader.step_count == 2
    assert reader.manifest.sim.name == "ic2-roundtrip"
    assert reader.manifest.config.dims == [8]

    step0 = reader.read_step(0)
    np.testing.assert_array_equal(step0.fields["u"], field_a)
    np.testing.assert_array_equal(step0.fields["v"], field_b)

    step1 = reader.read_step(1)
    np.testing.assert_array_equal(step1.fields["u"], field_a * 2)
    assert step1.diagnostics["l2"] == pytest.approx(1.25)


def test_reader_out_of_range_raises(tmp_path: Path) -> None:
    manifest = _make_manifest()
    writer = Writer(tmp_path / "ic2-test.json", manifest)
    writer.write_step(0, StepData(fields={"u": np.zeros(8)}))
    writer.finalize()

    reader = Reader(tmp_path / "ic2-test.json")
    with pytest.raises(IndexError):
        reader.read_step(1)


def test_writer_finalize_is_idempotent(tmp_path: Path) -> None:
    manifest = _make_manifest()
    writer = Writer(tmp_path / "ic2-test.json", manifest)
    writer.write_step(0, StepData(fields={"u": np.zeros(8)}))
    writer.finalize()
    writer.finalize()  # second call returns silently
    with pytest.raises(RuntimeError, match="after finalize"):
        writer.write_step(10, StepData(fields={"u": np.zeros(8)}))
