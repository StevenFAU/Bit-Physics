"""Shared test fixtures for ``pinn-poisson``.

``golden_tolerance`` reads the locked ``[golden_tolerance.learned-dynamics.pinn-poisson]``
row from the canonical ``tools/testkit/equivalence/tolerance.toml`` (gate-4 sources
tolerances from the schema-validated table, never hard-codes them).
"""

from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_TOLERANCE_TOML = _REPO_ROOT / "tools" / "testkit" / "equivalence" / "tolerance.toml"


@pytest.fixture(scope="session")
def golden_tolerance() -> dict[str, float]:
    """The locked PINN-Poisson golden tolerances (``analytical_l2``, ``fd_l2``)."""
    data = tomllib.loads(_TOLERANCE_TOML.read_text())
    return data["golden_tolerance"]["learned-dynamics"]["pinn-poisson"]
