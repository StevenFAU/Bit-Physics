"""Jones 2010 *Physarum*-transport — NumPy reference.

Per ``docs/sim-specs/agent-based/physarum/algebraic.md`` §§ 2–3, each
step is five components in order:

  1. **Sense** — sample the trail at three offsets ahead of the
     agent's heading (±Δφ, 0) by sense distance ``L_sense``.
  2. **Rotate** — pick the heading that yielded the highest reading;
     the canonical tie-break is "keep current heading" (matches the
     deterministic-limit golden derivation in
     ``tools/testkit/golden/derivations/physarum-deposit-step1.md``).
  3. **Move** — advance by ``L_move`` along the new heading.
  4. **Deposit** — add ``deposit`` to the trail cell at the new
     position.
  5. **Diffuse + decay** — periodic 3×3 box-blur, then
     ``T *= (1 - decay_alpha)``.

Citation: Jones, J. (2010). "Characteristics of pattern formation and
evolution in approximations of *Physarum* transport networks."
*Artificial Life* 16 (2), 127–153.
DOI 10.1162/artl.2010.16.2.16202. Canonical parameters from § 3,
Table 1.

Public surface (probe report § 5):

- :func:`canonical_params` — Jones-2010 canonical parameter set.
- :func:`step_to_deposit` — single-step sense+rotate+move+deposit on
  the named-agent fixture used by the gate-4 golden test.
- :func:`evolve` — array-shape sim evolution used by ``sim.py``.
"""

from __future__ import annotations

from typing import Any, Final

import numpy as np

_CANONICAL_PARAMS: Final[dict[str, float]] = {
    "delta_phi_deg": 45.0,
    "L_sense": 9.0,
    "L_move": 1.0,
    "deposit": 5.0,
    "decay_alpha": 0.1,
}


def canonical_params() -> dict[str, float]:
    """Return a fresh copy of the Jones-2010 canonical parameter set."""
    return dict(_CANONICAL_PARAMS)


def _periodic_box_blur(T: np.ndarray) -> np.ndarray:
    """Mass-preserving periodic 3×3 box blur."""
    Tp = np.pad(T, 1, mode="wrap")
    out = np.zeros_like(T)
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            i0 = 1 + di
            j0 = 1 + dj
            out += Tp[i0 : i0 + T.shape[0], j0 : j0 + T.shape[1]]
    return out / 9.0


def _rotate_heading(h: np.ndarray, delta_phi: float) -> np.ndarray:
    """Rotate 2D heading by ``+delta_phi`` (radians)."""
    c, s = np.cos(delta_phi), np.sin(delta_phi)
    return np.stack(
        [h[..., 0] * c - h[..., 1] * s, h[..., 0] * s + h[..., 1] * c], axis=-1
    )


def _sense_rotate_move_deposit(
    *,
    T: np.ndarray,
    positions: np.ndarray,
    headings: np.ndarray,
    params: dict[str, float],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Apply steps 1–4 (sense+rotate+move+deposit) in one batch.

    Returns the new trail map, new positions, and new headings.
    Agent ordering is preserved (sorted-by-input-index); the deposit
    scatter is sequenced via ``numpy.add.at`` over those same indices.
    """
    W, H = T.shape
    delta_phi = float(np.radians(params["delta_phi_deg"]))
    L_sense = float(params["L_sense"])
    L_move = float(params["L_move"])
    deposit = float(params["deposit"])
    h_left = _rotate_heading(headings, +delta_phi)
    h_center = headings
    h_right = _rotate_heading(headings, -delta_phi)
    # Sense readings at the three offsets (periodic boundary).
    sense_pos = np.stack(
        [
            positions + L_sense * h_left,
            positions + L_sense * h_center,
            positions + L_sense * h_right,
        ],
        axis=0,
    )
    sx = np.mod(np.rint(sense_pos[..., 0]).astype(np.int64), W)
    sy = np.mod(np.rint(sense_pos[..., 1]).astype(np.int64), H)
    readings = T[sx, sy]  # (3, N)
    left_r, center_r, right_r = readings[0], readings[1], readings[2]
    # Canonical tie-break: keep current heading whenever center matches
    # the maximum (covers the all-equal case); otherwise pick the
    # winning side, with ties between left and right resolved to left
    # (deterministic, no RNG).
    max_r = np.maximum(np.maximum(left_r, center_r), right_r)
    take_center = center_r >= max_r
    take_left = (~take_center) & (left_r >= right_r)
    new_headings = np.where(
        take_center[:, None],
        h_center,
        np.where(take_left[:, None], h_left, h_right),
    )
    new_positions = positions + L_move * new_headings
    # Deposit: integer cell coords with periodic wrap; ordered scatter-add.
    dx = np.mod(np.rint(new_positions[..., 0]).astype(np.int64), W)
    dy = np.mod(np.rint(new_positions[..., 1]).astype(np.int64), H)
    new_T = T.copy()
    np.add.at(new_T, (dx, dy), deposit)
    return new_T, new_positions, new_headings


def step_to_deposit(
    *,
    grid_shape: tuple[int, int] | list[int],
    agents: list[dict[str, Any]],
    params: dict[str, float],
    initial_trail: str | np.ndarray | None = None,
) -> list[list[float]]:
    """Single sense+rotate+move+deposit step on the named-agent fixture.

    Args:
        grid_shape: ``(W, H)`` extents of the trail map.
        agents: ``[{"p": [x, y], "h": [hx, hy]}, ...]``; order preserved.
        params: ``canonical_params()``-shaped dict.
        initial_trail: ``"zero"`` (default) or a ``(W, H)`` array.

    Returns:
        ``list[list[float]]`` of shape ``(W, H)`` representing the trail
        map immediately after the deposit step (before diffuse+decay).
        Indexed ``grid[x][y]``.
    """
    W, H = int(grid_shape[0]), int(grid_shape[1])
    if initial_trail is None or (
        isinstance(initial_trail, str) and initial_trail == "zero"
    ):
        T = np.zeros((W, H), dtype=np.float64)
    else:
        T = np.asarray(initial_trail, dtype=np.float64).copy()
    positions = np.array(
        [[float(a["p"][0]), float(a["p"][1])] for a in agents], dtype=np.float64
    )
    headings = np.array(
        [[float(a["h"][0]), float(a["h"][1])] for a in agents], dtype=np.float64
    )
    new_T, _, _ = _sense_rotate_move_deposit(
        T=T, positions=positions, headings=headings, params=params
    )
    return [list(row) for row in new_T]


def _diffuse_and_decay(T: np.ndarray, decay_alpha: float) -> np.ndarray:
    """Apply step 5: periodic 3×3 box-blur then multiplicative decay."""
    diffused = _periodic_box_blur(T)
    return diffused * (1.0 - float(decay_alpha))


def _step_full(
    *,
    T: np.ndarray,
    positions: np.ndarray,
    headings: np.ndarray,
    params: dict[str, float],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """One complete five-component Jones-2010 step."""
    T_after_deposit, new_positions, new_headings = _sense_rotate_move_deposit(
        T=T, positions=positions, headings=headings, params=params
    )
    T_next = _diffuse_and_decay(T_after_deposit, float(params["decay_alpha"]))
    return T_next, new_positions, new_headings


def evolve(
    *,
    grid_shape: tuple[int, int] | list[int],
    agents: list[dict[str, Any]] | None = None,
    params: dict[str, float],
    n_steps: int,
    initial_positions: np.ndarray | None = None,
    initial_headings: np.ndarray | None = None,
    initial_trail: str | np.ndarray | None = None,
    capture_interval: int | None = None,
) -> dict[str, Any]:
    """Evolve the Jones-2010 system for ``n_steps`` full steps.

    Either ``agents`` or the ``initial_positions`` / ``initial_headings``
    pair must be supplied. Returns a dict with the captured trail-map
    history, position/heading histories, and the step indices.
    """
    W, H = int(grid_shape[0]), int(grid_shape[1])
    if agents is not None:
        positions = np.array(
            [[float(a["p"][0]), float(a["p"][1])] for a in agents], dtype=np.float64
        )
        headings = np.array(
            [[float(a["h"][0]), float(a["h"][1])] for a in agents], dtype=np.float64
        )
    else:
        if initial_positions is None or initial_headings is None:
            raise ValueError(
                "supply either `agents` or `initial_positions`+`initial_headings`"
            )
        positions = np.asarray(initial_positions, dtype=np.float64).copy()
        headings = np.asarray(initial_headings, dtype=np.float64).copy()
    if initial_trail is None or (
        isinstance(initial_trail, str) and initial_trail == "zero"
    ):
        T = np.zeros((W, H), dtype=np.float64)
    else:
        T = np.asarray(initial_trail, dtype=np.float64).copy()
    if capture_interval is None or capture_interval <= 0:
        capture_interval = max(1, int(n_steps))
    step_indices: list[int] = [0]
    T_hist: list[np.ndarray] = [T.copy()]
    p_hist: list[np.ndarray] = [positions.copy()]
    h_hist: list[np.ndarray] = [headings.copy()]
    for step in range(1, int(n_steps) + 1):
        T, positions, headings = _step_full(
            T=T, positions=positions, headings=headings, params=params
        )
        if step % capture_interval == 0 or step == n_steps:
            step_indices.append(step)
            T_hist.append(T.copy())
            p_hist.append(positions.copy())
            h_hist.append(headings.copy())
    return {
        "T_history": np.stack(T_hist, axis=0),
        "positions_history": np.stack(p_hist, axis=0),
        "headings_history": np.stack(h_hist, axis=0),
        "step_indices": step_indices,
        "final_T": T,
        "final_positions": positions,
        "final_headings": headings,
    }


__all__ = [
    "canonical_params",
    "evolve",
    "step_to_deposit",
]
