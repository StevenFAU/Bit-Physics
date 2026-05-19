"""Geometry invariants (no-overlap, etc.)."""

from __future__ import annotations

import numpy as np

from capture import Capture

from ..harness import Fail, Invariant, InvariantOutcome, Pass


def no_particle_overlap_within_epsilon(
    positions_field: str = "X", epsilon: float = 1e-6
) -> Invariant:
    """No pair of particles has separation below `epsilon` at any step.

    `positions_field` is an `(N, D)` array on each step. The check is O(N^2)
    per step; only meaningful at small N (Phase-0 PBT sims keep N <= 32).
    """

    def check_fn(capture: Capture) -> InvariantOutcome:
        for s in capture.steps():
            if positions_field not in s.state:
                return Fail(
                    detail=(
                        f"no_particle_overlap_within_epsilon: missing field "
                        f"{positions_field!r} at step {s.step}"
                    ),
                    counter_example={"step": s.step},
                )
            x = s.state[positions_field]
            if x.ndim != 2:
                return Fail(
                    detail=(
                        f"no_particle_overlap_within_epsilon: field must be 2-D "
                        f"(N, D), got shape {x.shape} at step {s.step}"
                    ),
                    counter_example={"step": s.step, "shape": x.shape},
                )
            n = x.shape[0]
            if n < 2:
                continue
            diff = x[:, None, :] - x[None, :, :]
            dist_sq = np.einsum("ijd,ijd->ij", diff, diff)
            iu = np.triu_indices(n, k=1)
            pair_distances = np.sqrt(dist_sq[iu])
            min_dist = float(pair_distances.min()) if pair_distances.size else float("inf")
            if min_dist < epsilon:
                return Fail(
                    detail=(
                        f"no_particle_overlap_within_epsilon: min separation "
                        f"{min_dist:g} < {epsilon:g} at step {s.step}"
                    ),
                    counter_example={"step": s.step, "min_distance": min_dist},
                )
        return Pass(detail=f"no_particle_overlap_within_epsilon: min separation >= {epsilon}")

    return Invariant(
        name=f"no_particle_overlap_within_epsilon:{positions_field}:{epsilon}",
        applies_to_category="particle-fluid",
        check_fn=check_fn,
    )
