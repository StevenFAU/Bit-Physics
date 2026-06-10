"""Gate 4a — Phase-0 cubic-spline-kernel golden (Stack-D port).

Code verification for sph-water is **golden-table-based, NOT MMS** (spec-ref
§ 7: "No MMS — SPH is a particle method without a manufactured-solution gate").
This is the single largest gate-level delta from the RD-2D Stack-D template
(which used an MMS observed-order gate at gate 4). Mirrors the Stack-B test at
``packages/sph-water/tests/test_cubic_spline_kernel_golden.py``.

The Phase-0 golden table at
``tools/testkit/golden/tables/cubic-spline-kernel.json`` pins the
kernel-evaluation values at 9 test points; the Stack-D Taichi reference must
reproduce ``W`` and ``grad_W_magnitude`` at each input ``(q, h)`` within the
table's declared ``tolerance.absolute = 1e-12`` (per spec § 2.6). Stage-0
Task 0.5 confirmed this is achievable in Taichi-cpu only with
``default_fp=ti.f64`` (an f32 default leaks ~1e-8 error).

The Stack-D reference module ``sph_water_stack_d.reference.dfsph_taichi`` does
NOT exist at the failing-tests commit — collection fails with
``ModuleNotFoundError`` cleanly until Stage 1b implements the module.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from sph_water_stack_d.reference import dfsph_taichi  # type: ignore[import-not-found]

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
    """Stack-D reference reproduces W + |grad W| at every Phase-0 fixture point."""
    tol_abs = float(golden["tolerance"]["absolute"])
    failures: list[str] = []
    for tp in golden["test_points"]:
        q = float(tp["inputs"]["q"])
        h = float(tp["inputs"]["h"])
        expected_W = float(tp["expected"]["W"])
        expected_grad_mag = float(tp["expected"]["grad_W_magnitude"])
        observed_W = dfsph_taichi.W(q, h)
        observed_grad_mag = dfsph_taichi.grad_W_magnitude(q, h)
        if abs(observed_W - expected_W) > tol_abs:
            failures.append(
                f"W(q={q}, h={h}): expected={expected_W} observed={observed_W} "
                f"diff={observed_W - expected_W:g}"
            )
        if abs(observed_grad_mag - expected_grad_mag) > tol_abs:
            failures.append(
                f"|grad W|(q={q}, h={h}): expected={expected_grad_mag} "
                f"observed={observed_grad_mag} diff={observed_grad_mag - expected_grad_mag:g}"
            )
    assert not failures, "\n".join(failures)
