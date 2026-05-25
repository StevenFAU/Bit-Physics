"""Gate 4 — code verification (GOLDEN-ONLY; NO MMS arm).

The Stack-E reference reproduces the MLS-MPM quadratic B-spline N(x) +
partition-of-unity at the canonical sample points within the golden table's
``abs=1e-15`` tolerance. Mirrors the Stack-D gate-4 (golden-only, opposite of
the LBM/smoke MMS-bearing ports; MPM gate-4 has no convergence arm).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mpm_multimaterial_stack_e.reference import shape_functions

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "hybrid-pg"
    / "mls-mpm-shape-functions.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)


def test_sample_values_match_golden(golden: dict[str, object]) -> None:
    tp = golden["test_points"][0]  # type: ignore[index]
    for key, expected in tp["expected"]["samples"].items():
        x = float(key.split("=")[1])
        assert shape_functions.N(x) == pytest.approx(expected, abs=1e-15)


def test_partition_of_unity_match_golden(golden: dict[str, object]) -> None:
    tp = golden["test_points"][0]  # type: ignore[index]
    for key, expected in tp["expected"]["partition_of_unity"].items():
        p = float(key.split("=")[1])
        s = shape_functions.partition_of_unity_sum(p)
        assert s == pytest.approx(expected, abs=1e-15)
