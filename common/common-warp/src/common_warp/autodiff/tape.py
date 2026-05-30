# mypy: ignore-errors
"""Backend-tape escape hatch for the Warp autodiff surface (plan § 4.2.A).

:class:`~common_warp.autodiff.inverse_problem.InverseProblem` exposes a fresh
``wp.Tape`` via its ``.tape`` property so sims that prefer the imperative idiom
(``tape = wp.Tape(); with tape: forward(); tape.backward(loss=L)``) can sidestep
the OO ``fit`` loop. Mirrors :mod:`common_py.autodiff.tape` (Taichi ``ti.ad.Tape``).
"""

from __future__ import annotations

from typing import Any

import warp as wp


def new_tape() -> Any:
    """Return a fresh ``wp.Tape`` (imperative escape hatch)."""
    return wp.Tape()
