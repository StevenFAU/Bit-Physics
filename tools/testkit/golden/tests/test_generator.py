"""Idempotency + correctness tests for the cubic-spline table generator."""

from __future__ import annotations

import json
from pathlib import Path

from golden.generator import cubic_spline as generator

_TABLE_PATH = Path(__file__).resolve().parent.parent / "tables" / "cubic-spline-kernel.json"


def test_committed_table_validates_against_schema() -> None:
    """The committed JSON file is well-formed under `golden-v1.json`."""
    from jsonschema import Draft202012Validator

    schema_path = Path(__file__).resolve().parent.parent.parent / "schemas" / "golden-v1.json"
    with schema_path.open("r", encoding="utf-8") as fh:
        schema = json.load(fh)
    with _TABLE_PATH.open("r", encoding="utf-8") as fh:
        table = json.load(fh)
    Draft202012Validator(schema).validate(table)


def test_generator_is_idempotent(tmp_path: Path) -> None:
    """Running the generator must reproduce the committed table byte-for-byte."""
    out = tmp_path / "cubic-spline-kernel.json"
    generator.write_table(generator.build_table(), out)
    committed = _TABLE_PATH.read_bytes()
    regenerated = out.read_bytes()
    assert regenerated == committed, (
        "generator drifted from committed table; either re-run "
        "`python -m golden.generator.cubic_spline` and review the diff, "
        "or fix the symbolic definition."
    )


def test_table_has_at_least_three_independent_anchors() -> None:
    """Spec § 2.4 mandates ≥3 independent_reference anchors per kernel table."""
    with _TABLE_PATH.open("r", encoding="utf-8") as fh:
        table = json.load(fh)
    anchored = [p for p in table["test_points"] if "independent_reference" in p]
    assert len(anchored) >= 3, f"only {len(anchored)} anchored points; spec § 2.4 requires ≥ 3"


def test_anchor_at_q0_is_peak() -> None:
    """The q=0 anchor encodes W(0, h=1) = 1/π — the analytic 3D peak."""
    import math

    with _TABLE_PATH.open("r", encoding="utf-8") as fh:
        table = json.load(fh)
    point = next(p for p in table["test_points"] if p["inputs"]["q"] == 0.0)
    anchor = point["independent_reference"]
    assert anchor["expected"]["W"] == 1.0 / math.pi
    assert anchor["expected"]["grad_W_magnitude"] == 0.0


def test_anchor_at_q2_is_compact_support_zero() -> None:
    """The q=2 anchor encodes W = 0 — compact-support boundary."""
    with _TABLE_PATH.open("r", encoding="utf-8") as fh:
        table = json.load(fh)
    point = next(p for p in table["test_points"] if p["inputs"]["q"] == 2.0)
    anchor = point["independent_reference"]
    assert anchor["expected"]["W"] == 0.0
    assert anchor["expected"]["grad_W_magnitude"] == 0.0
