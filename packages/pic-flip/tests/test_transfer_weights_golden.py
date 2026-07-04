"""Gate-5 golden: quadratic B-spline weights + Dp closed form.

Tables:
- ``tools/testkit/golden/tables/particle-fluids/apic-transfer-weights.json``
- ``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json``
  (repo cross-anchor — FP-equivalence of the shared stencil).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pic_flip.reference import apic  # noqa: F401

_TABLES = (
    Path(__file__).resolve().parents[3] / "tools" / "testkit" / "golden" / "tables"
)
TABLE = _TABLES / "particle-fluids" / "apic-transfer-weights.json"
MLS_TABLE = _TABLES / "hybrid-pg" / "mls-mpm-shape-functions.json"


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def _weights(fp: float) -> tuple[float, float, float]:
    return (
        0.5 * (1.5 - fp) * (1.5 - fp),
        0.75 - (fp - 1.0) * (fp - 1.0),
        0.5 * (fp - 0.5) * (fp - 0.5),
    )


def test_shape_function_samples_match_golden(golden: dict[str, object]) -> None:
    tp = golden["test_points"][0]
    for key, expected in tp["expected"]["samples"].items():
        x = float(key.split("=")[1])
        assert apic.N(x) == pytest.approx(expected, abs=1e-15)


def test_shape_function_fp_matches_mls_mpm_golden() -> None:
    """Cross-anchor: identical stencil to the committed MLS-MPM golden."""
    with MLS_TABLE.open() as fh:
        mls = json.load(fh)
    tp = mls["test_points"][0]
    for key, expected in tp["expected"]["samples"].items():
        x = float(key.split("=")[1])
        assert apic.N(x) == pytest.approx(expected, abs=1e-15)
    for key, expected in tp["expected"]["partition_of_unity"].items():
        p = float(key.split("=")[1])
        assert apic.partition_of_unity_sum(p) == pytest.approx(expected, abs=1e-15)


def test_weight_moments_match_golden(golden: dict[str, object]) -> None:
    """sum w == 1, sum w r == 0, sum w r^2 == 1/4 at the table probes."""
    tp = golden["test_points"][0]
    for key, expected in tp["expected"]["moments"].items():
        fp = float(key.split("=")[1])
        w0, w1, w2 = _weights(fp)
        m0 = w0 + w1 + w2
        m1 = w0 * (0 - fp) + w1 * (1 - fp) + w2 * (2 - fp)
        m2 = w0 * (0 - fp) ** 2 + w1 * (1 - fp) ** 2 + w2 * (2 - fp) ** 2
        assert m0 == pytest.approx(expected["sum_w"], abs=1e-15)
        assert m1 == pytest.approx(expected["sum_w_r"], abs=1e-14)
        assert m2 == pytest.approx(expected["sum_w_r2"], abs=1e-14)


def test_dp_closed_form_match_golden(golden: dict[str, object]) -> None:
    tp = golden["test_points"][0]
    for key, expected in tp["expected"]["dp_diagonal"].items():
        dx = float(key.split("=")[1])
        assert 0.25 * dx * dx == pytest.approx(expected, abs=1e-16)
    assert tp["expected"]["dp_off_diagonal"] == 0.0
