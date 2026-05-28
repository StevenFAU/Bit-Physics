"""Quad4 polynomial growth function (Chakazul gn=1).

Stage 1b implementation. Closed form grep-cited from the vendored
Chakazul source at SHA ``adfc542939266de7f4bb7ebb552e8499701ee107``
(Convention #8, NOT from memory):

- ``references/Chakazul-Lenia/Python/LeniaF.py:500`` —
  ``1: lambda n, m, s: np.maximum(0, 1 - (n-m)**2 / (9 * s**2) )**4 * 2 - 1``
- ``references/Chakazul-Lenia/Python/LeniaND.py:279`` — sibling
  ``0:`` form (same closed expression).

The Orbium unicaudatus preset at
``references/Chakazul-Lenia/Python/animals.json:5`` carries
``"gn": 1`` — i.e., Orbium uses the **Quad4 polynomial growth** form
(NOT the bell-curve exp form some Lenia variants use). Anchors:

    G(mu)              = 2·(1 - 0)^4 - 1  = 1   (PEAK at u = mu)
    G(|u-mu| >> sigma) = 2·0^4 - 1        = -1  (saturation, the max(0, …) clamps the polynomial)
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def growth_lenia(u: NDArray[np.floating], mu: float, sigma: float) -> NDArray[np.floating]:
    """Quad4 polynomial growth function ``G(u; mu, sigma)``.

    Parameters
    ----------
    u
        Convolved field (output of Quad4 convolution); any NumPy shape.
    mu
        Bell-curve center (the Orbium unicaudatus preset has
        ``mu = 0.15`` per Chakazul ``animals.json:5``).
    sigma
        Width parameter (the Orbium unicaudatus preset has
        ``sigma = 0.015`` per Chakazul ``animals.json:5``).

    Returns
    -------
    Growth increment, element-wise; in ``[-1, 1]``.
    """
    u_arr = np.asarray(u, dtype=np.float64)
    base = 1.0 - (u_arr - mu) ** 2 / (9.0 * sigma * sigma)
    clipped = np.maximum(0.0, base)
    return clipped**4 * 2.0 - 1.0
