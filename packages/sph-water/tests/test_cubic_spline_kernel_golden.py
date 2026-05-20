"""Phase 0 cubic-spline-kernel golden — sim-side cross-check.

The Phase 0 golden table at `tools/testkit/golden/tables/cubic-spline-kernel.json`
already pins the kernel-evaluation values. The sim's reference must
reproduce these at the same input points.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from sph_water.reference import dfsph  # type: ignore[import-not-found]  # noqa: F401

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "cubic-spline-kernel.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def test_W_matches_phase0_pin(golden: dict[str, object]) -> None:
    raise NotImplementedError("Phase 2+ contract.")
