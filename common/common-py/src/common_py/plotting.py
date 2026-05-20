"""Matplotlib plotting helpers (charter § 7.1 deliverable D).

Phase 1 Stage 1 ships two thin helpers used by the smoke sim and by
downstream debugging notebooks:

- :func:`plot_field_1d` — quick line plot of a 1D field over the grid.
- :func:`plot_field_2d` — quick imshow of a 2D field.

Both helpers import ``matplotlib`` lazily so that headless consumers
(CI, the smoke sim's deterministic mode) do not pay the import cost
unless they actually want a plot.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

__all__ = ["plot_field_1d", "plot_field_2d"]


def _lazy_plt() -> Any:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError as exc:
        raise ImportError(
            "common_py.plotting requires matplotlib. Install via "
            "`pip install bit-physics-common-py[plotting]`."
        ) from exc
    return plt


def plot_field_1d(
    field: np.ndarray,
    out_path: Path,
    title: str = "",
    xlabel: str = "x",
    ylabel: str = "value",
) -> Path:
    """Save a 1D field to ``out_path``. Returns the path."""
    arr = np.asarray(field)
    if arr.ndim != 1:
        raise ValueError(f"plot_field_1d expects a 1D field, got ndim={arr.ndim}")
    plt = _lazy_plt()
    fig, ax = plt.subplots()
    ax.plot(arr)
    if title:
        ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    fig.tight_layout()
    fig.savefig(out_path)
    plt.close(fig)
    return Path(out_path)


def plot_field_2d(
    field: np.ndarray,
    out_path: Path,
    title: str = "",
    cmap: str = "viridis",
) -> Path:
    """Save a 2D field to ``out_path``. Returns the path."""
    arr = np.asarray(field)
    if arr.ndim != 2:
        raise ValueError(f"plot_field_2d expects a 2D field, got ndim={arr.ndim}")
    plt = _lazy_plt()
    fig, ax = plt.subplots()
    im = ax.imshow(arr, cmap=cmap, origin="lower")
    fig.colorbar(im, ax=ax)
    if title:
        ax.set_title(title)
    fig.tight_layout()
    fig.savefig(out_path)
    plt.close(fig)
    return Path(out_path)
