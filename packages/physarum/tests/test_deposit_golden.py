"""Code-verification tests for the physarum deposit-step golden (gate 4).

The first test is the unchanged 4-agent zero-trail deposit anchor;
the second test (``test_total_mass_after_decay``) was a Phase 1 stub
body (``raise NotImplementedError``) and is filled in by the
agent-based sub-phase Stage 1 (SHIFTED — parallels the closed-form
sub-phase Stage 1 audit S1; signatures, imports, and the imported
``step_to_deposit`` contract are preserved).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from physarum.reference import canonical_params, evolve, step_to_deposit

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
    """Sim's reference applies diffuse+decay correctly after one full step."""
    tp = golden["test_points"][0]
    # Override the JSON params with the canonical parameter dict (same
    # numeric values; ensures the reference is exercised through its
    # public-API entry point rather than the raw JSON shape).
    params = canonical_params()
    for key, value in tp["inputs"]["params"].items():
        params[key] = value
    state = evolve(
        grid_shape=tp["inputs"]["grid_shape"],
        agents=tp["inputs"]["agents"],
        params=params,
        n_steps=1,
    )
    total = float(state["final_T"].sum())
    assert total == pytest.approx(tp["expected"]["total_mass_after_decay"], abs=1e-12)
