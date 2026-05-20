"""Code-verification test for the mandelbulb DE sample golden table.

Loads ``tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json``
and asserts that the sim's Python reference DE implementation produces
the same value at the three independent-anchor sample points.

Phase 1 state: ``mandelbulb_explorer.reference`` does not exist; the
test fails with ``ModuleNotFoundError``.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mandelbulb_explorer.reference import quilez  # type: ignore[import-not-found]  # noqa: F401

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "closed-form"
    / "mandelbulb-de-samples.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


@pytest.mark.parametrize(
    "anchor_name", ["origin", "bounding-sphere-x-axis", "far-field-x-axis-10"]
)
def test_de_at_anchor(golden: dict[str, object], anchor_name: str) -> None:
    """DE at each anchor point matches the golden table."""
    tp = next(
        p
        for p in golden["test_points"]
        if p["inputs"]["name"] == anchor_name  # type: ignore[index]
    )
    inputs = tp["inputs"]
    expected_de = tp["expected"]["DE"]
    de = quilez.distance_estimator(
        c=inputs["c"],
        p=inputs["p"],
        escape_radius=inputs["escape_radius"],
        n_max=inputs["n_max"],
    )
    assert de == pytest.approx(expected_de, abs=1e-12, rel=1e-13)
