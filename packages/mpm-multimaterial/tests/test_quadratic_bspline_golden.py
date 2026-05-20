"""Code-verification test for the MLS-MPM quadratic B-spline golden."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mpm_multimaterial.reference import shape_functions  # type: ignore[import-not-found]  # noqa: F401

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
        return json.load(fh)  # type: ignore[no-any-return]


def test_sample_values_match_golden(golden: dict[str, object]) -> None:
    """Sim's reference reproduces N(x) at the canonical sample points."""
    tp = golden["test_points"][0]
    for key, expected in tp["expected"]["samples"].items():
        # key looks like "x=+0.0000"; parse the x value
        x = float(key.split("=")[1])
        assert shape_functions.N(x) == pytest.approx(expected, abs=1e-15)


def test_partition_of_unity_match_golden(golden: dict[str, object]) -> None:
    tp = golden["test_points"][0]
    for key, expected in tp["expected"]["partition_of_unity"].items():
        p = float(key.split("=")[1])
        s = shape_functions.partition_of_unity_sum(p)
        assert s == pytest.approx(expected, abs=1e-15)
