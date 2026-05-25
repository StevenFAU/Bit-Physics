"""MLS-MPM quadratic B-spline shape function (1D + 3-node partition).

Pure-Python reference (stack-agnostic; identical to the Phase-1
``mpm_multimaterial.reference.shape_functions`` surface). Consumed by the
gate-4 quadratic-B-spline golden test + the ``partition_of_unity_b_spline``
PBT invariant. NOT a Warp kernel — sub-microsecond per call.

Anchors:

- ``tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md`` § 1
  (closed-form piecewise definition).
- ``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json``
  (gate-4 golden; absolute 1e-15).
"""

from __future__ import annotations

import math


def N(x: float) -> float:
    """MLS-MPM quadratic B-spline shape function in 1D.

    Piecewise quadratic:

    - ``|x| < 1/2``        : ``3/4 - x**2``
    - ``1/2 <= |x| < 3/2`` : ``(1/2) * (3/2 - |x|)**2``
    - ``|x| >= 3/2``       : ``0``
    """
    ax = abs(float(x))
    if ax < 0.5:
        return 0.75 - x * x
    if ax < 1.5:
        return 0.5 * (1.5 - ax) ** 2
    return 0.0


def partition_of_unity_sum(p: float) -> float:
    """Partition-of-unity sum across the 3 neighboring grid nodes.

    MLS-MPM convention: ``base = floor(p + 0.5) - 1``; the particle interacts
    with grid nodes ``base``, ``base + 1``, ``base + 2``. Returns
    ``sum_{k in (0, 1, 2)} N(p - (base + k))`` = 1.0 exactly for any real ``p``.
    """
    p_f = float(p)
    base = math.floor(p_f + 0.5) - 1
    return sum(N(p_f - (base + k)) for k in (0, 1, 2))


__all__ = ["N", "partition_of_unity_sum"]
