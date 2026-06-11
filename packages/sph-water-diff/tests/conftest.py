"""Shared fixtures for sph-water-diff acceptance tests.

A fresh deterministic Taichi runtime is initialised per test (Taichi forbids new
``ti.field`` allocation after the runtime materialises, so each test that builds an inverse
problem needs its own runtime). ``cpu_max_num_threads=1`` serialises the loss/density
``+=`` accumulations (the determinism-sensitive surface). The landed ``sph-water-stack-d``
parent uses ``ti.types.ndarray`` kernels and lazily inits its own runtime via
``_ensure_taichi`` (idempotent), so the forward-equivalence test runs the diff FIRST under
this f64 runtime (the mpm-diff runtime-ordering precedent).
"""

from __future__ import annotations

from pathlib import Path

import pytest
import taichi as ti


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "pyproject.toml").exists() and (parent / "tools" / "testkit").is_dir():
            return parent
    raise RuntimeError(f"could not locate repo root above {here}")


REPO_ROOT = _repo_root()
GRADIENT_TABLE = (
    REPO_ROOT / "tools" / "testkit" / "golden" / "tables" / "sph-water-diff-gradient.json"
)


@pytest.fixture(autouse=True)
def _taichi_runtime() -> None:
    """Fresh deterministic single-thread Taichi runtime per test (serialised accumulation)."""
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def gradient_table() -> Path:
    return GRADIENT_TABLE
