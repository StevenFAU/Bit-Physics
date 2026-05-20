"""Phase 0 cubic-spline-kernel golden — sim-side cross-check (gate 5).

Phase 1 shipped these as ``raise NotImplementedError`` stub bodies;
the particle-fluids sph-water sub-phase Stage 1 fills in the bodies
(SHIFTED — parallels the closed-form sub-phase Stage 1 audit S1 +
agent-based S1: stub body cannot turn GREEN under the gate-4..gate-13
target; function signatures and the imported ``dfsph`` contract are
preserved).

The Phase 0 golden table at
``tools/testkit/golden/tables/cubic-spline-kernel.json`` pins the
kernel-evaluation values at 9 test points; the sim's reference must
reproduce W and grad_W_magnitude at each input ``(q, h)`` within the
table's declared ``tolerance.absolute = 1e-12`` (per spec § 2.6).
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
    """Sim's reference reproduces W + |∇W| at every Phase 0 fixture point."""
    tol_abs = float(golden["tolerance"]["absolute"])
    failures: list[str] = []
    for tp in golden["test_points"]:
        q = float(tp["inputs"]["q"])
        h = float(tp["inputs"]["h"])
        expected_W = float(tp["expected"]["W"])
        expected_grad_mag = float(tp["expected"]["grad_W_magnitude"])
        observed_W = dfsph.W(q, h)
        observed_grad_mag = dfsph.grad_W_magnitude(q, h)
        if abs(observed_W - expected_W) > tol_abs:
            failures.append(
                f"W(q={q}, h={h}): expected={expected_W} observed={observed_W} "
                f"diff={observed_W - expected_W:g}"
            )
        if abs(observed_grad_mag - expected_grad_mag) > tol_abs:
            failures.append(
                f"|∇W|(q={q}, h={h}): expected={expected_grad_mag} "
                f"observed={observed_grad_mag} diff={observed_grad_mag - expected_grad_mag:g}"
            )
    assert not failures, "\n".join(failures)
