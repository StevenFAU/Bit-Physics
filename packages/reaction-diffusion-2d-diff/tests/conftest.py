"""Shared fixtures for reaction-diffusion-2d-diff acceptance tests.

A fresh deterministic Taichi runtime is initialised per test (Taichi forbids new
``ti.field`` allocation after the runtime materialises, so each test that builds an
inverse problem needs its own runtime). The landed reference sibling's lazy-init
sentinel is set so ``reaction_diffusion_2d_stack_d.reference`` shares this runtime
(same deterministic ``cpu`` / ``f64`` / single-thread config).
"""

from __future__ import annotations

from pathlib import Path

import pytest
import reaction_diffusion_2d_stack_d.reference.gray_scott_taichi as _ref
import taichi as ti


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "pyproject.toml").exists() and (parent / "tools" / "testkit").is_dir():
            return parent
    raise RuntimeError(f"could not locate repo root above {here}")


REPO_ROOT = _repo_root()
GRADIENT_TABLE = (
    REPO_ROOT
    / "tools"
    / "testkit"
    / "golden"
    / "tables"
    / ("reaction-diffusion-2d-diff-gradient.json")
)


@pytest.fixture(autouse=True)
def _taichi_runtime() -> None:
    """Fresh deterministic Taichi runtime per test; share it with the reference."""
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)
    _ref._TAICHI_INITIALIZED = True


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def gradient_table() -> Path:
    return GRADIENT_TABLE
