"""Gate-4a code-verification: D3Q19 equilibrium-distribution golden (Stack-E).

The FIRST arm of the LBM dual-arm gate-4 (D17; 4a equilibrium golden + 4b NS-2D
MMS -- NEW vs smoke's MMS-only). Mirrors the Phase-1 / Stack-D
``test_d3q19_equilibrium_golden`` against the same golden table
(``tools/testkit/golden/tables/lattice/d3q19-equilibrium.json``); the Stack-E
Warp reference's point-eval ``feq`` / ``momentum_moment`` MUST reproduce the table
at abs 1e-15 (gate-4a contract). Stage-0 Task 0.2 measured the Warp f64 collision
(which composes the same feq polynomial) reproduces the NumPy reference
byte-for-byte (``max_abs_err=0.0``), so the feq point-eval is bit-exact-achievable.

The Stack-E reference submodule ``lattice_boltzmann_d3q19_stack_e.reference`` does
NOT exist at the failing-tests commit (Stage 1a) -- collection fails with
ModuleNotFoundError cleanly until Stage 1b implements it.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lattice_boltzmann_d3q19_stack_e.reference import (  # type: ignore[import-not-found]
    feq,
    momentum_moment,
)

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "lattice"
    / "d3q19-equilibrium.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def test_19_f_eq_values_match_golden(golden: dict[str, object]) -> None:
    """Stack-E reference reproduces all 19 f_i^eq values at abs 1e-15."""
    tp = golden["test_points"][0]
    f = feq(rho=tp["inputs"]["rho"], u=tp["inputs"]["u"])
    for i, expected in enumerate(tp["expected"]["f_eq"]):
        assert f[i] == pytest.approx(expected, abs=1e-15)


def test_density_moment_recovers_rho(golden: dict[str, object]) -> None:
    """sum(f_eq) = rho identically."""
    tp = golden["test_points"][0]
    f = feq(rho=tp["inputs"]["rho"], u=tp["inputs"]["u"])
    assert sum(f) == pytest.approx(tp["expected"]["density_moment"], abs=1e-14)


def test_momentum_moment_recovers_rho_u(golden: dict[str, object]) -> None:
    """sum(c_i * f_eq_i) = rho * u per component."""
    tp = golden["test_points"][0]
    f = feq(rho=tp["inputs"]["rho"], u=tp["inputs"]["u"])
    mom = momentum_moment(f)
    assert mom[0] == pytest.approx(tp["expected"]["momentum_x"], abs=1e-14)
    assert mom[1] == pytest.approx(tp["expected"]["momentum_y"], abs=1e-14)
    assert mom[2] == pytest.approx(tp["expected"]["momentum_z"], abs=1e-14)
