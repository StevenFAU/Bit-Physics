"""Code-verification test for the D3Q19 equilibrium-distribution golden."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from lattice_boltzmann_d3q19.reference import equilibrium  # type: ignore[import-not-found]  # noqa: F401

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
    """Sim's reference reproduces all 19 f_i^eq values."""
    tp = golden["test_points"][0]
    f = equilibrium.feq(rho=tp["inputs"]["rho"], u=tp["inputs"]["u"])
    for i, expected in enumerate(tp["expected"]["f_eq"]):
        assert f[i] == pytest.approx(expected, abs=1e-15)


def test_density_moment_recovers_rho(golden: dict[str, object]) -> None:
    """sum(f_eq) = rho identically."""
    tp = golden["test_points"][0]
    f = equilibrium.feq(rho=tp["inputs"]["rho"], u=tp["inputs"]["u"])
    assert sum(f) == pytest.approx(tp["expected"]["density_moment"], abs=1e-14)


def test_momentum_moment_recovers_rho_u(golden: dict[str, object]) -> None:
    """sum(c_i * f_eq_i) = rho * u."""
    tp = golden["test_points"][0]
    f = equilibrium.feq(rho=tp["inputs"]["rho"], u=tp["inputs"]["u"])
    mom = equilibrium.momentum_moment(f)
    assert mom[0] == pytest.approx(tp["expected"]["momentum_x"], abs=1e-14)
    assert mom[1] == pytest.approx(tp["expected"]["momentum_y"], abs=1e-14)
    assert mom[2] == pytest.approx(tp["expected"]["momentum_z"], abs=1e-14)
