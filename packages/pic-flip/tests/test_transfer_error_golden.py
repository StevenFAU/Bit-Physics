"""Gate-5 golden: the 1/9 PIC transfer-error coefficient (Zhu eq. 3.8).

Independently re-derives the discrete midpoint-particle ladder of
``tools/testkit/golden/tables/particle-fluids/pic-flip-transfer-error.json``
in binary64 (the committed values are exact rationals) and checks
convergence toward the continuum value ``f(x0) + (1/9) f'' dx^2``.
The coefficient is scoped to exactly the tent/half-cell kernel pair
(spec-ref § 7) — it is an analysis anchor for classic PIC, not the
package's quadratic-B-spline transfer.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "particle-fluids"
    / "pic-flip-transfer-error.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def _interp(a: float, b: float, c: float, y: float) -> float:
    f0 = a
    if y >= 0.0:
        f1 = a + b + c
        return (1.0 - y) * f0 + y * f1
    fm1 = a - b + c
    return (1.0 + y) * f0 + (-y) * fm1


def _discrete_roundtrip(a: float, b: float, c: float, n: int) -> float:
    num = 0.0
    den = 0.0
    for k in range(n):
        y = -0.5 + (2 * k + 1) / (2.0 * n)
        w = 1.0 - abs(y)
        num += w * _interp(a, b, c, y)
        den += w
    return num / den


@pytest.mark.parametrize("idx", [0, 1, 2])
def test_ladder_replay_and_coefficient(golden: dict[str, object], idx: int) -> None:
    tp = golden["test_points"][idx]
    a = float(tp["inputs"]["a"])
    b = float(tp["inputs"]["b"])
    c = float(tp["inputs"]["c"])
    exp = tp["expected"]
    assert exp["coefficient"] == pytest.approx(1.0 / 9.0, abs=1e-16)
    cont = float(exp["f_tilde_continuum"])
    # Continuum identity: f_tilde - f(0) == (1/9) f''.
    assert cont - a == pytest.approx((1.0 / 9.0) * 2.0 * c, rel=1e-14)
    prev = None
    for key, row in exp["particle_ladder"].items():
        n = int(key.split("=")[1])
        got = _discrete_roundtrip(a, b, c, n)
        assert got == pytest.approx(row["f_tilde"], rel=1e-13)
        resid = abs(got - cont)
        assert resid == pytest.approx(
            row["abs_residual_vs_continuum"], rel=1e-10, abs=1e-15
        )
        if prev is not None:
            assert resid < prev, "ladder must converge monotonically"
        prev = resid


def test_b_independence(golden: dict[str, object]) -> None:
    """The linear coefficient must not contribute (both rows same error)."""
    rows = golden["test_points"]
    e0 = rows[0]["expected"]
    e1 = rows[1]["expected"]
    err0 = float(e0["f_tilde_continuum"]) - float(rows[0]["inputs"]["a"])
    err1 = float(e1["f_tilde_continuum"]) - float(rows[1]["inputs"]["a"])
    assert err0 == pytest.approx(err1, rel=1e-14)
