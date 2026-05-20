"""Code-verification test for the physarum 4-agent deposit-step golden."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from physarum.reference import step_to_deposit  # type: ignore[import-not-found]  # noqa: F401

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "agent-based"
    / "physarum-deposit-step1.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


def test_deposit_cells_exact(golden: dict[str, object]) -> None:
    """Sim's NumPy reference reproduces the deposit cells exactly."""
    tp = golden["test_points"][0]
    grid = step_to_deposit(
        grid_shape=tp["inputs"]["grid_shape"],
        agents=tp["inputs"]["agents"],
        params=tp["inputs"]["params"],
    )
    for dep in tp["expected"]["deposits"]:
        assert grid[dep["x"]][dep["y"]] == pytest.approx(dep["value"], abs=1e-15)


def test_total_mass_after_decay(golden: dict[str, object]) -> None:
    """Sim's reference applies decay correctly."""
    _ = golden  # consumed by Phase 2+ implementation
    raise NotImplementedError(
        "Phase 2+ — uses physarum.reference.evolve(...) which is deferred.",
    )
