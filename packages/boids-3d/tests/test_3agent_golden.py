"""Code-verification test for the boids 3-agent step-1 golden table."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from boids_3d.reference import step_one  # type: ignore[import-not-found]  # noqa: F401

TABLE = (
    Path(__file__).resolve().parents[3]
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / "agent-based"
    / "boids-3agent-step1.json"
)


@pytest.fixture(scope="module")
def golden() -> dict[str, object]:
    with TABLE.open() as fh:
        return json.load(fh)  # type: ignore[no-any-return]


@pytest.mark.parametrize("agent", ["A", "B", "C"])
def test_3agent_step1_velocity_position(golden: dict[str, object], agent: str) -> None:
    """Sim's NumPy reference reproduces the golden v^{n+1} and p^{n+1}."""
    tp = golden["test_points"][0]
    inputs = tp["inputs"]
    expected = tp["expected"][agent]
    new_state = step_one(
        agents=inputs["agents"],
        params=inputs["params"],
    )
    assert new_state[agent]["v_new"] == pytest.approx(expected["v_new"], abs=1e-12)
    assert new_state[agent]["p_new"] == pytest.approx(expected["p_new"], abs=1e-12)
