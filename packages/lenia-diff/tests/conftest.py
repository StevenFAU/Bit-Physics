"""Shared fixtures for lenia-diff acceptance tests.

A fresh deterministic Taichi runtime is initialised per test (Taichi forbids new
``ti.field`` allocation after the runtime materialises, so each test that builds an
inverse problem needs its own runtime). The landed ``lenia`` reference uses
``ti.types.ndarray`` kernels (no pre-allocated fields), so it shares this runtime cleanly
once its per-instance lazy-init flag is set (see ``test_forward_equivalence``).
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
GRADIENT_TABLE = REPO_ROOT / "tools" / "testkit" / "golden" / "tables" / "lenia-diff-gradient.json"


@pytest.fixture(autouse=True)
def _taichi_runtime() -> None:
    """Fresh deterministic Taichi runtime per test."""
    ti.init(arch=ti.cpu, default_fp=ti.f64, cpu_max_num_threads=1, random_seed=0)


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def gradient_table() -> Path:
    return GRADIENT_TABLE
