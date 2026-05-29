"""Shared test fixtures for ``pinn-poisson``.

``golden_tolerance`` reads the locked ``[golden_tolerance.learned-dynamics.pinn-poisson]``
row from the canonical ``tools/testkit/equivalence/tolerance.toml`` (gate-4 sources
tolerances from the schema-validated table, never hard-codes them).

``train_cached`` is a session-scoped, ``(problem, config)``-keyed training cache:
PINN training is iteration-heavy on CPU, and several acceptance gates re-use the
SAME canonical training (e.g. training-convergence + inference-vs-analytic[A3] +
inference-vs-FD all use the default Anchor-3 run). Caching collapses those to one
training per distinct configuration, keeping the suite tractable.
"""

from __future__ import annotations

import tomllib
from collections.abc import Callable
from functools import cache
from pathlib import Path

import pytest

from pinn_poisson import PINNConfig, PoissonProblem, TrainResult, train_pinn

_REPO_ROOT = Path(__file__).resolve().parents[3]
_TOLERANCE_TOML = _REPO_ROOT / "tools" / "testkit" / "equivalence" / "tolerance.toml"


@pytest.fixture(scope="session")
def golden_tolerance() -> dict[str, float]:
    """The locked PINN-Poisson golden tolerances (``analytical_l2``, ``fd_l2``)."""
    data = tomllib.loads(_TOLERANCE_TOML.read_text())
    return data["golden_tolerance"]["learned-dynamics"]["pinn-poisson"]


@cache
def _train(problem: PoissonProblem, config: PINNConfig) -> TrainResult:
    return train_pinn(problem, config)


@pytest.fixture(scope="session")
def train_cached() -> Callable[[PoissonProblem, PINNConfig], TrainResult]:
    """Return a ``(problem, config)``-memoized ``train_pinn`` (frozen-dataclass keys)."""
    return _train
