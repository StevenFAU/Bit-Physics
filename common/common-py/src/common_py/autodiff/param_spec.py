"""``ParamSpec`` — the structured-parameters ↔ flat-tensor bridge (plan § 4.2.A).

The optimizer in :class:`~common_py.autodiff.inverse_problem.InverseProblem`
operates on a *flat* backend tensor; callbacks and :class:`History` entries
use the *structured* per-sim form. ``ParamSpec`` carries the two callables
(``pack`` / ``unpack``) that translate between them, plus a human-readable
``structure`` schema used for per-parameter logging.

This is the JAX-Pytree / PyTorch-Parameter pattern adapted for the
Taichi backend; :mod:`common_warp.autodiff` ships a byte-identical surface
for the Warp backend.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass
class ParamSpec:
    """Bridge between structured per-sim parameters and a flat optimization tensor.

    Fields
    ------
    flat:
        Backend-native flat tensor. For the Taichi backend this is a 1-D
        ``ti.field`` (``dtype=ti.f64``, ``needs_grad=True``); for the Warp
        backend a ``wp.array`` with ``requires_grad=True``.
    pack:
        ``callable(structured) -> flat tensor`` — writes the structured
        parameters into ``flat`` and returns it.
    unpack:
        ``callable(flat tensor) -> structured`` — reconstructs the structured
        parameters from ``flat``.
    structure:
        Human-readable schema dict describing what lives in ``flat`` (field
        names, shapes, flat indices). Consumed by callbacks for per-parameter
        logging and by :class:`History` for trajectory rendering.

    Example (RD diff sim with 2 scalar parameters ``F``, ``k``)::

        structure = {"F": {"index": 0, "shape": ()}, "k": {"index": 1, "shape": ()}}
        pack   = lambda d: backend.array([d["F"], d["k"]])
        unpack = lambda a: {"F": float(a[0]), "k": float(a[1])}
    """

    flat: Any
    pack: Callable[[Any], Any]
    unpack: Callable[[Any], Any]
    structure: dict[str, Any]
