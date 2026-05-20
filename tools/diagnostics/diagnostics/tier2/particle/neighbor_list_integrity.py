"""Particle neighbor-list integrity check (IC-5).

For a positions array and a per-particle list of declared neighbor
indices, verify three invariants:

  1. **Self-exclusion** — particle i does not appear in its own list.
  2. **In-cutoff** — every declared neighbor j of i satisfies
     ``|x_i - x_j| <= cutoff_radius``.
  3. **Symmetry** — if j ∈ list[i] then i ∈ list[j].

Any failed invariant means the neighbor lists are stale or
corrupted, which would propagate silently into a particle sim's
force-accumulation step.
"""

from __future__ import annotations

import numpy as np

from .._types import CheckResult


def check_neighbor_list_integrity(
    positions: np.ndarray,
    neighbor_lists: list[list[int]],
    cutoff_radius: float,
) -> CheckResult:
    """See module docstring."""
    p = np.asarray(positions, dtype=np.float64)
    if p.ndim != 2:
        raise ValueError(f"expected positions of shape (N, D), got ndim={p.ndim}")
    n = int(p.shape[0])
    if len(neighbor_lists) != n:
        raise ValueError(f"neighbor_lists length {len(neighbor_lists)} != positions count {n}")
    if cutoff_radius < 0.0:
        raise ValueError(f"cutoff_radius={cutoff_radius!r} must be non-negative")

    n_self_inclusion = 0
    n_out_of_cutoff = 0
    n_asymmetric = 0

    as_sets = [set(nl) for nl in neighbor_lists]
    cutoff_sq = cutoff_radius * cutoff_radius
    for i, nl in enumerate(neighbor_lists):
        for j in nl:
            if j == i:
                n_self_inclusion += 1
                continue
            if j < 0 or j >= n:
                raise ValueError(f"neighbor index {j} out of range [0, {n})")
            diff = p[i] - p[j]
            if float(diff @ diff) > cutoff_sq:
                n_out_of_cutoff += 1
            if i not in as_sets[j]:
                n_asymmetric += 1

    n_violations = n_self_inclusion + n_out_of_cutoff + n_asymmetric
    return CheckResult(
        passed=n_violations == 0,
        value=float(n_violations),
        tolerance=0.0,
        details={
            "n_particles": n,
            "n_self_inclusion": n_self_inclusion,
            "n_out_of_cutoff": n_out_of_cutoff,
            "n_asymmetric": n_asymmetric,
            "cutoff_radius": float(cutoff_radius),
        },
    )
