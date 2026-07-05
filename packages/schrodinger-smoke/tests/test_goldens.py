"""Golden-table verification (spec-ref.md § 7) — runs each generator's
--verify path in-process so drift in either the committed tables or the
reference implementation fails the suite."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

_GEN_DIR = (
    Path(__file__).resolve().parents[3] / "tools" / "testkit" / "golden" / "generator"
)

GENERATORS = [
    "isf_unitary_norm",
    "isf_free_step_phase",
    "isf_clebsch_velocity",
    "isf_gaussian_dispersion",
    "isf_laplacian_eigenvalues",
    "isf_circulation_quantum",
]


def _load(name: str):
    spec = importlib.util.spec_from_file_location(name, _GEN_DIR / f"{name}.py")
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.mark.parametrize("name", GENERATORS)
def test_golden_verifies(name: str) -> None:
    mod = _load(name)
    assert mod.verify() == 0, f"{name} --verify failed"
