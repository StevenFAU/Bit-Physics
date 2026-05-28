"""Lenia PBT invariants (shared module form for per-sim consumption).

The in-package witness tests at ``packages/lenia/tests/test_pbt_invariants.py``
exercise these invariants on a fixed seed; this shared module hosts
the canonical predicate forms so that downstream consumers (and the
Stage-2 landing audit) can route a single declaration.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def monotone_bounds_invariant(field: NDArray[np.floating]) -> bool:
    """Check ``field`` is element-wise in ``[0, 1]``."""
    arr = np.asarray(field, dtype=np.float64)
    return bool(float(np.min(arr)) >= 0.0 and float(np.max(arr)) <= 1.0)


def per_step_change_bounded_by_dt_invariant(
    prev: NDArray[np.floating],
    curr: NDArray[np.floating],
    dt: float,
    *,
    eps: float = 1e-12,
) -> bool:
    """Check ``|curr - prev| ≤ dt + eps`` element-wise."""
    delta = np.abs(np.asarray(curr, dtype=np.float64) - np.asarray(prev, dtype=np.float64))
    return bool(float(np.max(delta)) <= float(dt) + float(eps))
