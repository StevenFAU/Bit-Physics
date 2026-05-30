"""``equivalence.variant.compare_captures`` tests — matched-time variant comparison."""

from __future__ import annotations

import numpy as np
import pytest
from common_warp.capture import write_frames_capture  # test-only: build real captures

from equivalence.variant import VariantToleranceSpec, compare_captures


def _manifest(descriptor: str, n: int, schema: str = "1.1.0") -> dict:
    return {
        "schema_version": schema,
        "sim": {"name": "variant-smoke", "category": "test", "variant": "ref"},
        "stack": {"name": "numpy-reference", "version": "0.0.0", "build_id": "wu-f"},
        "config": {"tier": "test", "dims": [4], "dtype": "f64", "seed": 0, "params": {}},
        "run": {
            "step_count": n,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-30T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": f"{descriptor}.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }


def _write(tmp_path, name, fields_fn, n=5, schema="1.1.0"):
    frames = [(k, fields_fn(k), {}) for k in range(n)]
    return str(write_frames_capture(frames, _manifest(name, n, schema), tmp_path))


def _density(k):
    return {"density": np.full((4,), float(k))}


def test_identical_captures_pass(tmp_path) -> None:
    ref = _write(tmp_path / "r", "ref", _density)
    var = _write(tmp_path / "v", "var", _density)
    spec = VariantToleranceSpec(
        output_name="density", absolute_tol=1e-9, relative_tol=0.0, norm="L2"
    )
    report = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=2.0
    )
    assert report.passed
    assert report.per_output_errors["density"] == 0.0
    assert report.at_sim_time == 2.0


def test_perturbation_beyond_tolerance_fails(tmp_path) -> None:
    ref = _write(tmp_path / "r", "ref", _density)
    var = _write(tmp_path / "v", "var", lambda k: {"density": np.full((4,), float(k) + 0.5)})
    spec = VariantToleranceSpec(
        output_name="density", absolute_tol=1e-6, relative_tol=0.0, norm="Linf"
    )
    report = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=3.0
    )
    assert not report.passed
    assert report.per_output_errors["density"] == pytest.approx(0.5)
    assert report.per_output_passed["density"] is False


def test_norm_choices(tmp_path) -> None:
    ref = _write(tmp_path / "r", "ref", lambda k: {"f": np.array([0.0, 0.0, 0.0, 4.0])})
    var = _write(tmp_path / "v", "var", lambda k: {"f": np.array([0.0, 0.0, 0.0, 0.0])})
    for norm, expected in (("L2", 4.0), ("Linf", 4.0)):
        spec = VariantToleranceSpec(output_name="f", absolute_tol=0.0, relative_tol=0.0, norm=norm)
        rep = compare_captures(
            reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=0.0
        )
        assert rep.per_output_errors["f"] == pytest.approx(expected)


def test_mixed_schema_versions_and_skipped_fields(tmp_path) -> None:
    ref = _write(
        tmp_path / "r",
        "ref",
        lambda k: {"density": np.zeros(4), "extra": np.zeros(2)},
        schema="1.0.0",
    )
    var = _write(tmp_path / "v", "var", _density, schema="1.1.0")
    spec = VariantToleranceSpec(
        output_name="density", absolute_tol=1e-9, relative_tol=0.0, norm="L2"
    )
    rep = compare_captures(
        reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=1.0
    )
    assert rep.reference_schema_version == "1.0.0"
    assert rep.variant_schema_version == "1.1.0"
    assert rep.skipped_fields == ["extra"]  # present only in reference, not named


def test_named_field_missing_in_reference_raises(tmp_path) -> None:
    ref = _write(tmp_path / "r", "ref", _density)
    var = _write(tmp_path / "v", "var", _density)
    spec = VariantToleranceSpec(
        output_name="velocity", absolute_tol=1e-3, relative_tol=0.0, norm="L2"
    )
    with pytest.raises(ValueError, match="absent from the reference"):
        compare_captures(
            reference_capture=ref, variant_capture=var, tolerances=[spec], at_sim_time=0.0
        )
