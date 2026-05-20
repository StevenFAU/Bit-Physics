"""Reynolds 1987 / 1999 3D boids — NumPy reference.

Per ``docs/sim-specs/agent-based/boids-3d/algebraic.md`` §§ 2–3:
the per-step velocity update is a weighted sum of three steering
forces (separation, alignment, cohesion) computed over each agent's
in-perception-radius neighbor set, followed by an explicit-Euler
velocity update with max-speed clamp and a position update.

Citations:

- Reynolds, C. W. (1987). "Flocks, herds and schools: A distributed
  behavioral model." SIGGRAPH '87. DOI 10.1145/37401.37406.
- Reynolds, C. W. (1999). "Steering Behaviors for Autonomous
  Characters." GDC 1999. https://www.red3d.com/cwr/steer/.

Public surface (probe report § 5):

- :func:`canonical_params` — Reynolds-1999 canonical weight/parameter set.
- :func:`step_one` — single-step update on the named-agent fixture used
  by the gate-4 golden test.
- :func:`evolve` — array-shape flock evolution used by ``sim.py``.
"""

from __future__ import annotations

from typing import Any, Final

import numpy as np

_CANONICAL_PARAMS: Final[dict[str, float]] = {
    "w_sep": 1.5,
    "w_align": 1.0,
    "w_cohere": 1.0,
    "perception_radius": 5.0,
    "v_max": 3.0,
    "dt": 0.05,
}


def canonical_params() -> dict[str, float]:
    """Return a fresh copy of the Reynolds-1999 canonical parameter set."""
    return dict(_CANONICAL_PARAMS)


def _flock_step(
    positions: np.ndarray,
    velocities: np.ndarray,
    params: dict[str, float],
) -> tuple[np.ndarray, np.ndarray]:
    """Single explicit-Euler boids step on the (N, 3) flock arrays.

    Reductions are written as BLAS-friendly mask-matmuls so the
    per-step cost scales with NumPy's dgemm rather than O(N^2 D)
    Python-level broadcasting (which would allocate temporary
    ``(N, N, 3)`` tensors per step). The algebraic identities below
    are derived directly from the Reynolds 1987 sums:

    - separation: ``sum_j (p_i - p_j) / d_ij^2 = p_i * W_sum_i - W @ p``
      where ``W = mask / d_ij^2`` (zero on the diagonal and outside the
      perception ball).
    - alignment: ``(1/|N_i|) sum_j v_j - v_i = (mask @ v)_i / |N_i| - v_i``.
    - cohesion: ``(1/|N_i|) sum_j p_j - p_i = (mask @ p)_i / |N_i| - p_i``.

    Determinism strategy clause 4 (see :mod:`boids_3d.sim`): mask, W
    and the per-row reductions are all sorted-by-index left-to-right
    NumPy traversals; no scatter, no atomic update, no parallel
    reduction tree.
    """
    n = positions.shape[0]
    # d2[i, j] = |p_i - p_j|^2 via the dot-product expansion
    # ||p_i||^2 + ||p_j||^2 - 2 p_i . p_j; self-distance forced to +inf.
    sq_norm = (positions * positions).sum(axis=1)
    d2 = sq_norm[:, None] + sq_norm[None, :] - 2.0 * (positions @ positions.T)
    # Numerical noise can drive the (now-supposed-zero) diagonal slightly
    # negative under the dot-product expansion; mask it out cleanly.
    np.maximum(d2, 0.0, out=d2)
    self_idx = np.arange(n)
    d2[self_idx, self_idx] = np.inf
    d = np.sqrt(d2)
    perception = float(params["perception_radius"])
    mask = (d <= perception).astype(np.float64)
    n_neighbors = mask.sum(axis=1)
    n_safe = np.where(n_neighbors > 0.0, n_neighbors, 1.0)
    # Separation via mask @ matrix product (no N×N×3 temporary).
    inv_d2 = np.where(np.isfinite(d2), 1.0 / d2, 0.0)
    weights = mask * inv_d2
    w_sum = weights.sum(axis=1)
    sep = positions * w_sum[:, None] - weights @ positions
    # Alignment.
    v_sum = mask @ velocities
    align = np.where(
        n_neighbors[:, None] > 0.0,
        v_sum / n_safe[:, None] - velocities,
        0.0,
    )
    # Cohesion.
    p_sum = mask @ positions
    cohere = np.where(
        n_neighbors[:, None] > 0.0,
        p_sum / n_safe[:, None] - positions,
        0.0,
    )
    accel = (
        float(params["w_sep"]) * sep
        + float(params["w_align"]) * align
        + float(params["w_cohere"]) * cohere
    )
    dt = float(params["dt"])
    v_new = velocities + dt * accel
    v_mag = np.linalg.norm(v_new, axis=-1, keepdims=True)
    v_max = float(params["v_max"])
    scale = np.where(
        v_mag > v_max,
        v_max / np.where(v_mag > 0.0, v_mag, 1.0),
        1.0,
    )
    v_new = v_new * scale
    p_new = positions + dt * v_new
    return p_new, v_new


def step_one(
    *,
    agents: dict[str, dict[str, Any]],
    params: dict[str, float],
) -> dict[str, dict[str, list[float]]]:
    """Single boids step on the named-agent fixture used by the golden test.

    Args:
        agents: ``{name: {"p": [x, y, z], "v": [vx, vy, vz]}}``.
        params: ``canonical_params()``-shaped dict.

    Returns:
        ``{name: {"v_new": [...], "p_new": [...]}}`` with the same key set
        as ``agents``. Names are processed in sorted order so the
        per-agent reduction is bit-stable across Python dict iteration
        orderings (determinism strategy clause 1 in
        :mod:`boids_3d.sim`).
    """
    names = sorted(agents.keys())
    positions = np.array(
        [list(map(float, agents[n]["p"])) for n in names], dtype=np.float64
    )
    velocities = np.array(
        [list(map(float, agents[n]["v"])) for n in names], dtype=np.float64
    )
    p_new, v_new = _flock_step(positions, velocities, params)
    return {
        names[i]: {
            "v_new": v_new[i].tolist(),
            "p_new": p_new[i].tolist(),
        }
        for i in range(len(names))
    }


def evolve(
    positions: np.ndarray,
    velocities: np.ndarray,
    params: dict[str, float],
    n_steps: int,
    *,
    capture_interval: int | None = None,
) -> tuple[np.ndarray, np.ndarray, list[int]]:
    """Evolve a flock for ``n_steps`` boids steps.

    Returns
    -------
    positions_history, velocities_history, step_indices
        Arrays of shape ``(K, N, 3)`` where ``K`` is the number of
        captured frames (including step 0 and step ``n_steps``);
        ``step_indices`` lists the global step number for each frame.
    """
    if capture_interval is None or capture_interval <= 0:
        capture_interval = max(1, int(n_steps))
    p = np.asarray(positions, dtype=np.float64).copy()
    v = np.asarray(velocities, dtype=np.float64).copy()
    step_indices: list[int] = [0]
    p_hist: list[np.ndarray] = [p.copy()]
    v_hist: list[np.ndarray] = [v.copy()]
    for step in range(1, int(n_steps) + 1):
        p, v = _flock_step(p, v, params)
        if step % capture_interval == 0 or step == n_steps:
            step_indices.append(step)
            p_hist.append(p.copy())
            v_hist.append(v.copy())
    positions_history = np.stack(p_hist, axis=0)
    velocities_history = np.stack(v_hist, axis=0)
    return positions_history, velocities_history, step_indices


__all__ = [
    "canonical_params",
    "evolve",
    "step_one",
]
