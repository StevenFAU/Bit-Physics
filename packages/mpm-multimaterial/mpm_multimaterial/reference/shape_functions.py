"""MLS-MPM quadratic B-spline shape function (1D + 3-node partition).

Pure Python reference. NOT decorated with ``@njit``: the kernel is
sub-microsecond per call; numba JIT overhead would dominate when
invoked from the gate-5 golden test at single sample points
(plan § 4.2 step 2; Task 0.4 routing).

Anchors:

- ``tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md`` § 1
  (closed-form piecewise definition).
- ``tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json``
  (gate-5 golden; absolute 1e-15).
- ``tools/testkit/golden/generator/mls_mpm_quadratic_bspline.py``
  (Python re-derivation; Stage 0 ``--verify`` GREEN).

The companion ``mls_mpm.py`` module ships the numba-jitted hot kernels
(P2G + G2P + deformation-gradient update) for canonical-scale
captures.
"""

from __future__ import annotations

import math


def N(x: float) -> float:
    """MLS-MPM quadratic B-spline shape function in 1D.

    Piecewise quadratic:

    - ``|x| < 1/2``    : ``3/4 - x**2``
    - ``1/2 <= |x| < 3/2`` : ``(1/2) * (3/2 - |x|)**2``
    - ``|x| >= 3/2``    : ``0``

    Continuous + has continuous first derivative on the support
    ``[-3/2, 3/2]`` (the value 1/2 at the inner boundaries agrees
    across both branches; partition-of-unity is exact).
    """
    ax = abs(float(x))
    if ax < 0.5:
        return 0.75 - x * x
    if ax < 1.5:
        return 0.5 * (1.5 - ax) ** 2
    return 0.0


def partition_of_unity_sum(p: float) -> float:
    """Partition-of-unity sum across the 3 neighboring grid nodes.

    MLS-MPM convention: ``base = floor(p + 0.5) - 1``; the particle
    interacts with grid nodes ``base``, ``base + 1``, ``base + 2``.

    Returns ``sum_{k in (0, 1, 2)} N(p - (base + k))``, which equals
    1.0 exactly for any real ``p`` (closed-form partition-of-unity
    of the quadratic B-spline at unit grid spacing).
    """
    p_f = float(p)
    base = math.floor(p_f + 0.5) - 1
    return sum(N(p_f - (base + k)) for k in (0, 1, 2))


__all__ = ["N", "partition_of_unity_sum"]
