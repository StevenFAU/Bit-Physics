"""Code-verification test for the MLS-MPM quadratic B-spline golden (gate 4).

GOLDEN-only gate-4 (NO MMS arm -- the sph-water/MPM pattern; cf. probe S-M6).
The Stack-D port's ``reference.shape_functions`` reproduces the canonical
quadratic-B-spline N(x) sample values + partition-of-unity sums pinned in
``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json`` (4
independent-reference anchors) at ``abs = 1e-15``.

The Stack-D reference module ``mpm_multimaterial_stack_d.reference`` does NOT
exist at the failing-tests commit -- collection fails with ModuleNotFoundError
cleanly until Stage 1b implements it.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mpm_multimaterial_stack_d.reference import (
    shape_functions,  # type: ignore[import-not-found]
)

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
    """Stack-D reference reproduces N(x) at the canonical sample points."""
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
