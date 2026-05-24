"""Gate 4b — DFSPH density-evolution two-particle golden (Stack-D port).

Golden-table code verification (NOT MMS). Mirrors the Stack-B test at
``packages/sph-water/tests/test_dfsph_density_golden.py``. The Phase-1 golden
table at ``tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json``
pins rho_0 = 0.5470951168783902 and drho/dt_0 = -0.2984155182973038 at the
two-particle (h=1) fixture; the Stack-D Taichi reference must reproduce both
within ``abs = 1e-15``.

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
    / "particle-fluids"
    / "dfsph-density-evolution.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def test_density_at_two_particle_fixture(golden: dict[str, object]) -> None:
    """Stack-D reference reproduces rho_0 at the two-particle fixture."""
    tp = golden["test_points"][0]
    rho = dfsph_taichi.density(
        particles=tp["inputs"]["particles"],
        h=tp["inputs"]["h"],
    )
    assert rho[0] == pytest.approx(tp["expected"]["rho_0"], abs=1e-15)


def test_density_evolution_at_two_particle_fixture(golden: dict[str, object]) -> None:
    """Stack-D reference reproduces drho_dt at particle 0."""
    tp = golden["test_points"][0]
    drhodt = dfsph_taichi.density_evolution(
        particles=tp["inputs"]["particles"],
        h=tp["inputs"]["h"],
    )
    assert drhodt[0] == pytest.approx(tp["expected"]["drho_dt_0"], abs=1e-15)
