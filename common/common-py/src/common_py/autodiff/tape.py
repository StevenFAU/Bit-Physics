"""Backend-tape escape hatch for the Taichi autodiff surface (plan § 4.2.A).

:class:`~common_py.autodiff.inverse_problem.InverseProblem` exposes the
underlying tape via its ``.tape`` property so sims that prefer the imperative
DiffTaichi idiom (``with ti.ad.Tape(loss=L): forward()``) can sidestep the OO
``fit`` loop entirely. This module is the single place the Taichi tape is
constructed, mirroring :mod:`common_warp.autodiff.tape` (Warp ``wp.Tape``).
"""

from __future__ import annotations

from typing import Any

import taichi as ti


def new_tape(*, loss: Any) -> Any:
    """Return a ``ti.ad.Tape`` context manager bound to the scalar ``loss`` field.

    Usage (imperative escape hatch)::

        with problem.tape(loss=problem.loss_field):
            problem.forward(params, state)
            problem.loss(predicted, target)
    """
    return ti.ad.Tape(loss=loss)
