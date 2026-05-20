"""Code-verification test for the Lorenz structural-invariants golden table.

Loads ``tools/testkit/golden/tables/closed-form/lorenz-structural.json``
and asserts that the sim's NumPy reference implementation of the
Lorenz vector field produces:

- the same fixed points as the golden table;
- the same eigenvalues of the Jacobian at the origin; and
- the same divergence (constant in x).

Phase 1 state: ``strange_attractors.reference`` does not exist; the
test fails with ``ModuleNotFoundError``. Phase 2+ implements the
reference and the test goes GREEN.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from strange_attractors.reference import lorenz  # type: ignore[import-not-found]  # noqa: F401

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "closed-form"
    / "lorenz-structural.json"
)


def _load_table() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    return _load_table()


def test_fixed_points(golden: dict[str, object]) -> None:
    """Sim's NumPy reference reproduces the golden-table fixed points."""
    expected_block = next(
        tp
        for tp in golden["test_points"]
        if tp["inputs"]["quantity"] == "fixed_points"  # type: ignore[index]
    )
    expected = expected_block["expected"]
    # Phase 2+ implementation contract:
    computed = lorenz.fixed_points(sigma=10.0, rho=28.0, beta=8.0 / 3.0)
    for key in ("P0", "C_plus", "C_minus"):
        assert computed[key] == pytest.approx(expected[key], abs=1e-10)


def test_origin_jacobian_eigenvalues(golden: dict[str, object]) -> None:
    """Sim reproduces the eigenvalues of J(P_0) at canonical params."""
    expected_block = next(
        tp
        for tp in golden["test_points"]
        if tp["inputs"]["quantity"] == "origin_jacobian_eigenvalues"  # type: ignore[index]
    )
    expected_eigs = sorted(expected_block["expected"]["eigenvalues"])
    computed = sorted(
        lorenz.origin_jacobian_eigenvalues(sigma=10.0, rho=28.0, beta=8.0 / 3.0),
    )
    for got, want in zip(computed, expected_eigs, strict=True):
        assert got == pytest.approx(want, abs=1e-9)


def test_divergence_constant_in_x(golden: dict[str, object]) -> None:
    """Sim reproduces the Lorenz vector field divergence at canonical params."""
    expected_block = next(
        tp
        for tp in golden["test_points"]
        if tp["inputs"]["quantity"] == "divergence"  # type: ignore[index]
    )
    expected_div = expected_block["expected"]["divergence"]
    computed = lorenz.divergence(sigma=10.0, rho=28.0, beta=8.0 / 3.0)
    assert computed == pytest.approx(expected_div, abs=1e-12)
