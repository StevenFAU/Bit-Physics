"""Particle no-overlap check (IC-5).

For a positions array of shape ``(N, D)``, verify that every pair of
distinct particles is separated by at least ``epsilon`` in Euclidean
distance.

The implementation uses an O(N log N) kd-tree query (via
``scipy.spatial.cKDTree`` if available, otherwise an O(N^2) fallback)
to find the minimum pair distance. For Phase 1 Stage 1 a numpy-only
O(N^2) implementation is used; particle counts in the Stage 2 test
fixtures stay small (< 1024) so the quadratic cost is bounded.
"""

from __future__ import annotations

import numpy as np

from .._types import CheckResult


def check_no_overlap(positions: np.ndarray, epsilon: float) -> CheckResult:
    """See module docstring."""
    p = np.asarray(positions, dtype=np.float64)
    if p.ndim != 2:
        raise ValueError(f"expected positions of shape (N, D), got ndim={p.ndim}")
    if epsilon < 0.0:
        raise ValueError(f"epsilon={epsilon!r} must be non-negative")
    n = int(p.shape[0])
    if n < 2:
        return CheckResult(
            passed=True,
            value=float("inf"),
            tolerance=float(epsilon),
            details={"n_particles": n, "n_violating_pairs": 0},
        )

    # Pairwise distance via broadcasting; mask the diagonal.
    diff = p[:, None, :] - p[None, :, :]
    d2 = np.einsum("ijk,ijk->ij", diff, diff)
    np.fill_diagonal(d2, np.inf)
    d = np.sqrt(d2)
    min_d = float(d.min())
    violations = np.argwhere(np.triu(d < epsilon, k=1))
    return CheckResult(
        passed=min_d >= epsilon,
        value=min_d,
        tolerance=float(epsilon),
        details={
            "n_particles": n,
            "n_violating_pairs": int(violations.shape[0]),
            "min_pair_distance": min_d,
        },
    )
