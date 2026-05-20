"""Surface tests for alembic, vdb, plotting, ggui, hotreload stubs."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from common_py.alembic import AlembicExportError, export_particles_to_alembic
from common_py.ggui import KEYS_TRAPPED_BY_GGUI, FKeyDispatcher
from common_py.plotting import plot_field_1d, plot_field_2d
from common_py.vdb import VdbExportError, export_volume_to_vdb


def test_alembic_export_raises_until_implementation(tmp_path: Path) -> None:
    with pytest.raises(AlembicExportError, match="surface stub"):
        export_particles_to_alembic(tmp_path, [np.zeros((4, 3))])


def test_vdb_export_raises_until_implementation(tmp_path: Path) -> None:
    with pytest.raises(VdbExportError, match="surface stub"):
        export_volume_to_vdb(tmp_path / "out.vdb", np.zeros((4, 4, 4)))


def test_fkey_dispatcher_rejects_non_fkey() -> None:
    d = FKeyDispatcher()
    with pytest.raises(ValueError, match="F-keys"):
        d.bind("A", lambda: None)


def test_fkey_dispatcher_edges_only() -> None:
    fired: list[str] = []
    d = FKeyDispatcher()
    d.bind("F5", lambda: fired.append("F5"))

    class _Window:
        pressed = False

        def is_pressed(self, key: str) -> bool:
            return self.pressed and key == "F5"

    w = _Window()
    d.poll(w)  # not pressed yet
    w.pressed = True
    d.poll(w)  # rising edge: fire
    d.poll(w)  # still held: do not refire
    w.pressed = False
    d.poll(w)  # released
    w.pressed = True
    d.poll(w)  # rising edge again: fire
    assert fired == ["F5", "F5"]


def test_keys_trapped_constant_lists_all_fkeys() -> None:
    assert tuple(f"F{i}" for i in range(1, 13)) == KEYS_TRAPPED_BY_GGUI


def test_plot_field_1d_writes_file(tmp_path: Path) -> None:
    pytest.importorskip("matplotlib")
    out = plot_field_1d(np.arange(16, dtype=float), tmp_path / "f1.png", title="ok")
    assert out.exists() and out.stat().st_size > 0


def test_plot_field_2d_writes_file(tmp_path: Path) -> None:
    pytest.importorskip("matplotlib")
    out = plot_field_2d(np.random.default_rng(0).random((8, 8)), tmp_path / "f2.png")
    assert out.exists() and out.stat().st_size > 0


def test_plot_field_1d_rejects_2d_input(tmp_path: Path) -> None:
    pytest.importorskip("matplotlib")
    with pytest.raises(ValueError, match="ndim"):
        plot_field_1d(np.zeros((4, 4)), tmp_path / "x.png")
