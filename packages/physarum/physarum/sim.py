"""SimRunner adapter — physarum canonical capture.

Determinism strategy (charter § 1.4 — load-bearing; cited in the
agent-based-stage-1 commit message footer):

1. **Agent update order is sorted-by-integer-input-index.** The
   ``positions`` / ``headings`` arrays at
   :func:`physarum.reference._sense_rotate_move_deposit` are indexed
   by ``arange(N)``; NumPy broadcasting and the subsequent deposit
   ``numpy.add.at`` traverse those indices in natural sorted order, so
   per-cell accumulation runs in the same order on every invocation
   of the same Python process and across distinct processes on the
   same hardware.

2. **Sense reads are deterministic.** Each agent samples the trail at
   three integer cells determined by ``np.rint`` + periodic ``np.mod``
   — no floating-point boundary ambiguity, no nearest-neighbor library
   call, no iteration-order leakage.

3. **Stochastic tie-break is replaced by a canonical deterministic
   tie-break.** The rotate step picks the center heading whenever it
   ties the max (covering the all-equal zero-trail case in the gate-4
   golden); left/right ties resolve to left. No RNG is consulted
   inside the per-step rotate. P22 clause 4 (Hypothesis-leakage and
   ``common_py.determinism.Config`` seed plumbing) is satisfied
   trivially: there is no PRNG draw inside the step.

4. **Deposit scatter is an ordered ``numpy.add.at`` over
   sorted-by-agent-id index arrays.** This is the canonical mitigation
   for P22 clause 2 (``numpy.add.at`` over an unsorted index): the
   per-cell accumulation order is fixed by the construction of the
   ``(dx, dy)`` arrays, which are themselves derived from the
   sorted-by-input-index ``positions`` array. The Stack-B port at
   Phase 2+ pins WGSL atomic-add ordering separately (deposit
   atomics are listed in
   ``docs/sim-specs/agent-based/physarum/determinism.md`` as the
   declared chaotic-regime ``epsilon`` source).

5. **Diffuse and decay are vectorized elementwise NumPy ops** —
   periodic 3×3 box-blur as a sum of nine pre-shifted padded slices
   divided by 9.0; multiplicative decay as ``T *= (1 - alpha)``. Both
   are mass-preserving / linear and deterministic; no parallel
   reductions, no reduction-tree drift.

6. **FMA fusion** is left at NumPy's default (typically unfused under
   the default BLAS / LAPACK configuration). Same-stack same-hw stays
   bit-exact across runs.

7. **Initial-condition synthesis is the ONLY RNG-touching site.**
   ``_seeded_initial_state`` threads ``numpy.random.default_rng(seed)``
   (no bare ``numpy.random.*`` global state) to draw agent positions
   and heading angles. The Phase-1 NumPy reference does not consume
   ``common_py.determinism.Config`` because there is no per-step
   PRNG draw to plumb (clause 3 above); should the Stack-B port
   introduce one (e.g., a stochastic tie-break that more closely
   matches Jones 2010 § 3 wording), it must thread ``Config`` per
   IC-4.

8. **Deferred to Phase 2+:** the chaotic-regime distributional
   posture (atomic deposits to shared cells under non-zero trail
   evolution; cross-stack ``epsilon`` declaration per
   ``docs/sim-specs/agent-based/physarum/determinism.md``). The
   Phase-1 NumPy path keeps the deposit ordered and runs the
   ``test_run_twice_bit_exact_zero_trail_limit`` test on the
   chaotic-regime canonical capture as well (advisory only — see
   charter § 1.4); the second test
   ``test_run_twice_epsilon_chaotic_regime`` records the observed
   epsilon distance and is non-blocking at this sub-phase.

Per spec § 2.5 the resulting claim is ``bit-exact-same-hw`` in the
deterministic limit (zero-trail IC) and ``bit-exact-same-hw`` in the
chaotic regime as long as the deposit scatter remains
ordered-by-agent-id (NumPy reference path); the Stack-B Phase-2+ port
re-anchors via spec § 2.6's same-stack-different-hw ``epsilon``
tolerance row, where deposit atomics break bit-equality.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference import _step_full, canonical_params

CANONICAL_DESCRIPTOR: Final[str] = "network-canonical-seed42-step5000"
CANONICAL_GRID_SIZE: Final[int] = 256
CANONICAL_N_AGENTS: Final[int] = 500
CANONICAL_STEP_COUNT: Final[int] = 5000
CANONICAL_CAPTURE_INTERVAL: Final[int] = 500


def _seeded_initial_state(
    seed: int, n_agents: int, grid_shape: tuple[int, int]
) -> tuple[np.ndarray, np.ndarray]:
    """Seeded random agent positions + uniform-random unit headings."""
    rng = np.random.default_rng(int(seed))
    W, H = grid_shape
    positions = np.column_stack(
        [
            rng.uniform(0.0, float(W), size=int(n_agents)),
            rng.uniform(0.0, float(H), size=int(n_agents)),
        ]
    )
    angles = rng.uniform(0.0, 2.0 * np.pi, size=int(n_agents))
    headings = np.column_stack([np.cos(angles), np.sin(angles)])
    return positions, headings


def _build_manifest(
    *,
    descriptor: str,
    grid_shape: tuple[int, int],
    n_agents: int,
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
) -> CaptureManifest:
    params = canonical_params()
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "physarum",
            "category": "agent-based",
            "variant": "jones-2010-canonical",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-agent-based",
        },
        config={
            "tier": "test",
            "dims": list(grid_shape),
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "delta_phi_deg": params["delta_phi_deg"],
                "L_sense": params["L_sense"],
                "L_move": params["L_move"],
                "deposit": params["deposit"],
                "decay_alpha": params["decay_alpha"],
                "n_agents": int(n_agents),
            },
        },
        run={
            "step_count": int(step_count),
            "capture_interval": int(capture_interval),
            "wall_clock_seconds": float(wall_clock_seconds),
            "start_utc": "2026-05-20T00:00:00Z",
        },
        payload={
            "format": "hdf5",
            "path": f"{descriptor}.h5",
            "checksum": "sha256:" + "0" * 64,
        },
        determinism={
            "claimed": "bit-exact-same-hw",
            "atomic_ops": True,
            "subgroup_ops": False,
        },
    )


def _evolve_to_step_states(
    positions: np.ndarray,
    headings: np.ndarray,
    *,
    grid_shape: tuple[int, int],
    step_count: int,
    capture_interval: int,
    params: dict[str, float],
) -> list[StepState]:
    T = np.zeros(grid_shape, dtype=np.float64)
    rows: list[StepState] = [
        StepState(
            step=0,
            state={
                "trail_map": T.copy(),
                "positions": positions.copy(),
                "headings": headings.copy(),
            },
            diagnostics={"total_mass": float(T.sum())},
        )
    ]
    p, h = positions.copy(), headings.copy()
    for step in range(1, int(step_count) + 1):
        T, p, h = _step_full(T=T, positions=p, headings=h, params=params)
        if step % capture_interval == 0 or step == step_count:
            rows.append(
                StepState(
                    step=int(step),
                    state={
                        "trail_map": T.copy(),
                        "positions": p.copy(),
                        "headings": h.copy(),
                    },
                    diagnostics={"total_mass": float(T.sum())},
                )
            )
    return rows


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produces the canonical Jones-2010 capture.

    Spec descriptor (Appendix D § D.2.3):
    ``network-canonical-seed42-step5000``.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    grid_shape = (CANONICAL_GRID_SIZE, CANONICAL_GRID_SIZE)
    positions, headings = _seeded_initial_state(seed, CANONICAL_N_AGENTS, grid_shape)
    params = canonical_params()
    t0 = time.perf_counter()
    rows = _evolve_to_step_states(
        positions,
        headings,
        grid_shape=grid_shape,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        params=params,
    )
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=CANONICAL_DESCRIPTOR,
        grid_shape=grid_shape,
        n_agents=CANONICAL_N_AGENTS,
        seed=seed,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        wall_clock_seconds=wall,
    )
    return write_capture(rows, manifest, out_dir)


def compute_short_trajectory(
    *,
    seed: int = 42,
    n_agents: int = CANONICAL_N_AGENTS,
    grid_size: int = CANONICAL_GRID_SIZE,
    n_steps: int = 100,
    capture_interval: int | None = None,
) -> dict[str, np.ndarray]:
    """Run a short canonical-parameter Jones-2010 trajectory in-memory.

    Used by ``test_diagnostics``; defaults are tuned to exercise the
    Tier 1 + IC-5 + scalar_field checks without re-running the full
    5000-step canonical capture per pytest invocation.
    """
    if capture_interval is None or capture_interval <= 0:
        capture_interval = max(1, int(n_steps) // 5 or 1)
    grid_shape = (int(grid_size), int(grid_size))
    positions, headings = _seeded_initial_state(seed, int(n_agents), grid_shape)
    params = canonical_params()
    T = np.zeros(grid_shape, dtype=np.float64)
    T_hist: list[np.ndarray] = [T.copy()]
    p_hist: list[np.ndarray] = [positions.copy()]
    step_indices: list[int] = [0]
    p, h = positions.copy(), headings.copy()
    for step in range(1, int(n_steps) + 1):
        T, p, h = _step_full(T=T, positions=p, headings=h, params=params)
        if step % capture_interval == 0 or step == n_steps:
            T_hist.append(T.copy())
            p_hist.append(p.copy())
            step_indices.append(step)
    return {
        "T_history": np.stack(T_hist, axis=0),
        "positions_history": np.stack(p_hist, axis=0),
        "step_indices": np.asarray(step_indices, dtype=np.int64),
        "final_T": T,
    }


__all__ = [
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_DESCRIPTOR",
    "CANONICAL_GRID_SIZE",
    "CANONICAL_N_AGENTS",
    "CANONICAL_STEP_COUNT",
    "compute_short_trajectory",
    "sim_runner_seeded",
]
