"""Lenia growth function (bell curve around ``mu`` with width ``sigma``).

Stage 1a — shell. The body raises :class:`NotImplementedError`; Stage
1b lands the implementation cited against the vendored Chakazul source.

Mathematical form (Chan 2019, Complex Systems 28(3) § 2.2; subject to
Stage-1b grep-cite against Chakazul source):

    G(u) = 2 · exp(-((u - mu) / sigma)^2 / 2) - 1

The growth function maps the convolved field ``u`` (output of Quad4
convolution with the previous state) into the increment for the
Euler step.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

_STAGE_1A_SHELL = (
    "Lenia growth function Stage 1a scaffold: implementation lands at "
    "Stage 1b after grep-citing the formula from vendored Chakazul/Lenia. "
    "Expected closed form: G(u) = 2·exp(-((u-mu)/sigma)^2 / 2) - 1."
)


def growth_lenia(u: NDArray[np.floating], mu: float, sigma: float) -> NDArray[np.floating]:
    """Lenia bell-curve growth function.

    Parameters
    ----------
    u
        Convolved field (output of Quad4 convolution).
    mu
        Bell-curve center (preset parameter; Orbium unicaudatus has
        mu ≈ 0.15 per Chakazul ``animals.json``, subject to Stage-1b
        grep-cite).
    sigma
        Bell-curve width (preset parameter; Orbium unicaudatus has
        sigma ≈ 0.015 per Chakazul ``animals.json``, subject to
        Stage-1b grep-cite).

    Returns
    -------
    Growth increment, element-wise.

    Notes
    -----
    Stage 1a — shell only. Body raises :class:`NotImplementedError`.
    """
    raise NotImplementedError(_STAGE_1A_SHELL)
