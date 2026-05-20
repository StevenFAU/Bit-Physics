"""Smoke sim determinism + capture-roundtrip integration test."""

from __future__ import annotations

from pathlib import Path

import numpy as np

from common_py.capture import Reader
from common_py.determinism import Config
from smoke.advection_1d import run


def test_smoke_advection_runs_and_captures(tmp_path: Path) -> None:
    cfg = Config(deterministic=True, seed=42)
    manifest_path = run(tmp_path, cfg)
    reader = Reader(manifest_path)
    assert reader.step_count == 11  # steps 0, 10, 20, ..., 100
    step0 = reader.read_step(0)
    assert step0.fields["u"].shape == (64,)
    # The pulse mass is conserved by upwind on a periodic grid up to
    # numerical diffusion; the integral of u stays positive.
    total0 = float(step0.fields["u"].sum())
    step_last = reader.read_step(10)
    total_last = float(step_last.fields["u"].sum())
    assert total_last > 0.0
    assert abs(total_last - total0) / total0 < 0.05


def test_smoke_advection_is_deterministic(tmp_path: Path) -> None:
    cfg = Config(deterministic=True, seed=42)
    path_a = run(tmp_path / "a", cfg)
    path_b = run(tmp_path / "b", cfg)
    ra = Reader(path_a)
    rb = Reader(path_b)
    for i in range(ra.step_count):
        np.testing.assert_array_equal(ra.read_step(i).fields["u"], rb.read_step(i).fields["u"])
