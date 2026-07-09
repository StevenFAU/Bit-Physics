"""Shared fixtures — the 96^2 gate scene runs ONCE per session (it is the
heavy run: ~1 min with the internal run-twice witness) and every SENT gate
test reads from it."""

from __future__ import annotations

import pytest
from phase_field_fracture.sim import gate_config, run_canonical
from phase_field_fracture.solver import TraceResult


@pytest.fixture(scope="session")
def gate_run() -> tuple[TraceResult, str]:
    return run_canonical(gate_config())
