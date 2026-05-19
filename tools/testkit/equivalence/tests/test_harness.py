"""Cross-stack equivalence harness tests.

Three stub stacks evaluate scalar functions on a shared 1D grid:

  - `stack_a`: evaluates p(x) = x^2 - 0.25x + 1.
  - `stack_b`: evaluates the SAME polynomial via a slightly different
    factorization; bit-different but tolerance-close.
  - `stack_wrong`: evaluates a DIFFERENT polynomial (p(x) + 1e-2 * x);
    fails the equivalence gate by a healthy margin.

Captures use the `reaction-diffusion` category (rtol = 1e-4 per the
tolerance table). Stacks B and A differ by floating-point reordering
(~1e-15) so within_tolerance must be True; stack_wrong's perturbation
(~1e-2) is four orders of magnitude above rtol and must fail.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from jsonschema import ValidationError

from capture import CaptureManifest, StepState, write_capture
from equivalence import compare_captures, load_tolerance_table


def _grid() -> np.ndarray:
    return np.linspace(0.0, 1.0, 32, dtype=np.float64)


def _manifest(stack_name: str, payload_name: str) -> CaptureManifest:
    return CaptureManifest(
        schema_version="1.0.0",
        sim={"name": "poly-eq-1d", "category": "reaction-diffusion", "variant": "stub"},
        stack={"name": stack_name, "version": "0.0.1", "build_id": stack_name},
        config={
            "tier": "test",
            "dims": [32],
            "dtype": "f64",
            "seed": 0,
            "params": {},
        },
        run={
            "step_count": 1,
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
            "claimed": "epsilon",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def stack_a(out_dir: Path) -> Path:
    x = _grid()
    u = x * x - 0.25 * x + 1.0
    return write_capture(
        [StepState(step=0, state={"U": u}, diagnostics={})],
        _manifest("stack-a", "stack-a.h5"),
        out_dir,
    )


def stack_b(out_dir: Path) -> Path:
    x = _grid()
    # Same polynomial, factored / reordered: introduces ~1e-16 round-off.
    u = x * (x - 0.25) + 1.0
    return write_capture(
        [StepState(step=0, state={"U": u}, diagnostics={})],
        _manifest("stack-b", "stack-b.h5"),
        out_dir,
    )


def stack_wrong(out_dir: Path) -> Path:
    x = _grid()
    # Different polynomial: extra +1e-2 * x linear term.
    u = x * x - 0.25 * x + 1.0 + 1e-2 * x
    return write_capture(
        [StepState(step=0, state={"U": u}, diagnostics={})],
        _manifest("stack-wrong", "stack-wrong.h5"),
        out_dir,
    )


def test_stack_b_within_tolerance_of_stack_a(tmp_path: Path) -> None:
    left = stack_a(tmp_path / "a")
    right = stack_b(tmp_path / "b")
    verdict = compare_captures(left, right)
    assert verdict.within_tolerance, verdict.per_field_diff
    assert verdict.tolerance_table_used["category"] == "reaction-diffusion"
    assert verdict.tolerance_table_used["relative"] == 1e-4


def test_stack_wrong_fails_the_gate(tmp_path: Path) -> None:
    left = stack_a(tmp_path / "a")
    right = stack_wrong(tmp_path / "w")
    verdict = compare_captures(left, right)
    assert not verdict.within_tolerance
    field_diff = verdict.per_field_diff["step:0:U"]
    assert field_diff["max_abs_err"] > 1e-3


def test_load_tolerance_table_validates_against_schema() -> None:
    table = load_tolerance_table(Path(__file__).resolve().parents[1] / "tolerance.toml")
    assert "defaults" in table
    assert "reaction-diffusion" in table["defaults"]


def test_load_tolerance_table_rejects_malformed_table(tmp_path: Path) -> None:
    bad = tmp_path / "bad.toml"
    bad.write_text("[defaults.x]\nrelative = -1.0\nabsolute = 0.0\n", encoding="utf-8")
    import pytest

    with pytest.raises(ValidationError):
        load_tolerance_table(bad)
