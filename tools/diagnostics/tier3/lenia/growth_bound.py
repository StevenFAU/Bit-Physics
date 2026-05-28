"""Tier-3 Lenia: per-step change bound diagnostic.

Verifies the spec-ref §6 invariant 2 bound:

    |A_{n+1}(x) - A_n(x)| ≤ dt    for all cells x

Holds because the Chakazul gn=1 polynomial growth satisfies
``G ∈ [-1, 1]`` (see derivation in
``tools/testkit/golden/derivations/lenia-kernel.md`` § 2.3) and the
clip-Euler step can only shrink the per-cell change.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class GrowthBoundReport:
    """Report for :func:`check_growth_bound`."""

    max_abs_delta: float
    dt: float
    eps: float
    ok: bool


def check_growth_bound(
    prev: NDArray[np.floating],
    curr: NDArray[np.floating],
    dt: float,
    *,
    eps: float = 1e-12,
) -> GrowthBoundReport:
    """Verify ``|curr - prev| ≤ dt + eps`` element-wise."""
    delta = np.abs(np.asarray(curr, dtype=np.float64) - np.asarray(prev, dtype=np.float64))
    max_delta = float(np.max(delta))
    return GrowthBoundReport(
        max_abs_delta=max_delta,
        dt=float(dt),
        eps=float(eps),
        ok=max_delta <= float(dt) + float(eps),
    )
