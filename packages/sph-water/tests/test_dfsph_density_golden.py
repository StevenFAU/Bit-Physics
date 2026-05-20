"""Code-verification test for the DFSPH density-evolution two-particle golden."""

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
    / "particle-fluids"
    / "dfsph-density-evolution.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def test_density_at_two_particle_fixture(golden: dict[str, object]) -> None:
    """Sim's reference reproduces rho_0 at the two-particle fixture."""
    tp = golden["test_points"][0]
    rho = dfsph.density(
        particles=tp["inputs"]["particles"],
        h=tp["inputs"]["h"],
    )
    assert rho[0] == pytest.approx(tp["expected"]["rho_0"], abs=1e-15)


def test_density_evolution_at_two_particle_fixture(golden: dict[str, object]) -> None:
    """Sim's reference reproduces drho_dt at particle 0."""
    tp = golden["test_points"][0]
    drhodt = dfsph.density_evolution(
        particles=tp["inputs"]["particles"],
        h=tp["inputs"]["h"],
    )
    assert drhodt[0] == pytest.approx(tp["expected"]["drho_dt_0"], abs=1e-15)
