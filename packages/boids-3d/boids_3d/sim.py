"""SimRunner adapter — boids-3d canonical captures.

Determinism strategy (charter § 1.4 — load-bearing; cited in the
agent-based-stage-1 commit message footer):

1. **Agent update order is sorted-by-integer-index, fixed across runs.**
   The flock arrays at :func:`boids_3d.reference._flock_step` are
   indexed by ``arange(N)``; NumPy broadcasting expands the pairwise
   ``diff`` and mask tensors in the natural sorted order, so per-agent
   reductions sum in the same order on every invocation of the same
   Python process and across distinct processes on the same hardware.

2. **Neighborhood queries are deterministic.** At Phase-1 fixture sizes
   (3-agent fixture; 1000-agent capture) the nested-loop broadphase is
   the O(N^2) NumPy form above — no spatial-hash bucket-order leakage.
   The mask ``d <= perception_radius`` is constructed from the
   deterministic distance matrix in a single numpy expression.

3. **No stochastic operations inside the step.** The Reynolds 1987
   step is fully deterministic given the IC; the only RNG draw is the
   seeded initial-condition synthesis in :func:`_seeded_initial_state`,
   which threads through ``numpy.random.default_rng(seed)`` (no bare
   ``numpy.random.*`` global state). No tie-breaks, no Hypothesis
   leakage outside the PBT module.

4. **Reductions are sequenced via NumPy broadcasting.** The three
   steering sums (separation, alignment, cohesion) reduce along the
   neighbor axis with ``sum(axis=1)``, which is a deterministic
   left-to-right traversal in NumPy's C implementation. No
   ``numpy.add.at`` over unsorted indices, no parallel reductions.

5. **Max-speed clamp is computed via a single conditional scale
   factor** (``np.where(v_mag > v_max, v_max / v_mag, 1.0)``); no
   branch that would route different agents through different code
   paths and thereby different floating-point rounding.

6. **FMA fusion** is left at NumPy's default (typically unfused under
   the default BLAS / LAPACK configuration); no explicit ``np.fma`` is
   used. If a future platform's BLAS pin alters fusion, the Phase 2+
   Stack-B port re-anchors via the spec § 2.6 same-stack-different-hw
   ``epsilon`` tolerance row; same-stack same-hw stays bit-exact.

7. **Deferred to Phase 2+:** spatial-hash broadphase ordering at
   large-N (> 1000) — declared in
   ``docs/sim-specs/agent-based/boids-3d/determinism.md`` as
   pinned-bucket-order; the Phase-1 NumPy path skips broadphase
   entirely and keeps O(N^2) at the canonical 1000-agent descriptor.

Per spec § 2.5 the resulting claim is ``bit-exact-same-hw``; gate-10
``test_run_twice_bit_exact`` witnesses it against both Appendix D
§ D.2.3 descriptors (``flock-3agents-canonical-seed42-step1000`` and
``flock-1000agents-seed42-step1000``).
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference import canonical_params, evolve

CANONICAL_3AGENT_DESCRIPTOR: Final[str] = "flock-3agents-canonical-seed42-step1000"
CANONICAL_1000AGENT_DESCRIPTOR: Final[str] = "flock-1000agents-seed42-step1000"
CANONICAL_STEP_COUNT: Final[int] = 1000
CANONICAL_CAPTURE_INTERVAL: Final[int] = 100
_IC_JITTER_SCALE: Final[float] = 1e-6
_FLOCK_HALF_EXTENT: Final[float] = 10.0
_FLOCK_VELOCITY_SCALE: Final[float] = 1.0

_CANONICAL_3AGENT_POSITIONS: Final[np.ndarray] = np.array(
    [
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
    ],
    dtype=np.float64,
)
_CANONICAL_3AGENT_VELOCITIES: Final[np.ndarray] = np.array(
    [
        [1.0, 0.0, 0.0],
        [-1.0, 0.0, 0.0],
        [0.0, 0.0, 1.0],
    ],
    dtype=np.float64,
)


def _seeded_3agent_initial_state(seed: int) -> tuple[np.ndarray, np.ndarray]:
    """Canonical 3-agent IC + per-component jitter from ``seed``."""
    rng = np.random.default_rng(int(seed))
    p_jitter = _IC_JITTER_SCALE * rng.standard_normal(_CANONICAL_3AGENT_POSITIONS.shape)
    v_jitter = _IC_JITTER_SCALE * rng.standard_normal(
        _CANONICAL_3AGENT_VELOCITIES.shape
    )
    return (
        _CANONICAL_3AGENT_POSITIONS + p_jitter,
        _CANONICAL_3AGENT_VELOCITIES + v_jitter,
    )


def _seeded_flock_initial_state(
    seed: int, n_agents: int
) -> tuple[np.ndarray, np.ndarray]:
    """Seeded uniform-random flock IC over a (-L, L)^3 box."""
    rng = np.random.default_rng(int(seed))
    positions = rng.uniform(
        -_FLOCK_HALF_EXTENT, _FLOCK_HALF_EXTENT, size=(int(n_agents), 3)
    )
    velocities = rng.uniform(
        -_FLOCK_VELOCITY_SCALE, _FLOCK_VELOCITY_SCALE, size=(int(n_agents), 3)
    )
    return positions, velocities


def _build_manifest(
    *,
    descriptor: str,
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
            "name": "boids-3d",
            "category": "agent-based",
            "variant": "reynolds-1987-canonical",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-agent-based",
        },
        config={
            "tier": "test",
            "dims": [int(n_agents), 3],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "w_sep": params["w_sep"],
                "w_align": params["w_align"],
                "w_cohere": params["w_cohere"],
                "perception_radius": params["perception_radius"],
                "v_max": params["v_max"],
                "dt": params["dt"],
                "n_agents": int(n_agents),
                "ic_jitter_scale": _IC_JITTER_SCALE,
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
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _evolve_to_step_states(
    positions: np.ndarray,
    velocities: np.ndarray,
    *,
    step_count: int,
    capture_interval: int,
) -> list[StepState]:
    p_hist, v_hist, step_indices = evolve(
        positions,
        velocities,
        canonical_params(),
        n_steps=step_count,
        capture_interval=capture_interval,
    )
    rows: list[StepState] = []
    for idx, step in enumerate(step_indices):
        p = p_hist[idx]
        v = v_hist[idx]
        speed = np.linalg.norm(v, axis=-1)
        rows.append(
            StepState(
                step=int(step),
                state={
                    "position": np.asarray(p, dtype=np.float64).copy(),
                    "velocity": np.asarray(v, dtype=np.float64).copy(),
                },
                diagnostics={
                    "max_speed": float(speed.max()) if speed.size else 0.0,
                    "mean_speed": float(speed.mean()) if speed.size else 0.0,
                },
            )
        )
    return rows


def _write_capture(
    *,
    descriptor: str,
    positions: np.ndarray,
    velocities: np.ndarray,
    seed: int,
    out_dir: Path,
    step_count: int,
    capture_interval: int,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()
    rows = _evolve_to_step_states(
        positions,
        velocities,
        step_count=step_count,
        capture_interval=capture_interval,
    )
    wall = time.perf_counter() - t0
    manifest = _build_manifest(
        descriptor=descriptor,
        n_agents=int(positions.shape[0]),
        seed=seed,
        step_count=step_count,
        capture_interval=capture_interval,
        wall_clock_seconds=wall,
    )
    return write_capture(rows, manifest, out_dir)


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produces the 1000-agent canonical capture.

    Spec descriptor (Appendix D § D.2.3):
    ``flock-1000agents-seed42-step1000``.
    """
    positions, velocities = _seeded_flock_initial_state(seed, n_agents=1000)
    return _write_capture(
        descriptor=CANONICAL_1000AGENT_DESCRIPTOR,
        positions=positions,
        velocities=velocities,
        seed=seed,
        out_dir=out_dir,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
    )


def sim_runner_seeded_3agent(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produces the canonical-3-agent capture.

    Spec descriptor (Appendix D § D.2.3):
    ``flock-3agents-canonical-seed42-step1000``.
    """
    positions, velocities = _seeded_3agent_initial_state(seed)
    return _write_capture(
        descriptor=CANONICAL_3AGENT_DESCRIPTOR,
        positions=positions,
        velocities=velocities,
        seed=seed,
        out_dir=out_dir,
        step_count=CANONICAL_STEP_COUNT,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
    )


def compute_canonical_trajectory(
    *,
    seed: int = 42,
    n_agents: int = 1000,
    n_steps: int = CANONICAL_STEP_COUNT,
    capture_interval: int = CANONICAL_CAPTURE_INTERVAL,
) -> tuple[np.ndarray, np.ndarray, list[int]]:
    """In-memory canonical 1000-agent trajectory (no I/O).

    Used by ``test_diagnostics`` to inspect positions/velocities/step
    indices without round-tripping through HDF5.
    """
    positions, velocities = _seeded_flock_initial_state(seed, n_agents=n_agents)
    return evolve(
        positions,
        velocities,
        canonical_params(),
        n_steps=n_steps,
        capture_interval=capture_interval,
    )


def neighbor_lists_at(
    positions: np.ndarray,
    *,
    perception_radius: float | None = None,
) -> list[list[int]]:
    """Build per-agent neighbor index lists at the given snapshot.

    Used by ``test_diagnostics``'s IC-5 neighbor-list-integrity check.
    Self is excluded; neighbors are sorted by integer index (determinism
    strategy clause 1).
    """
    p = np.asarray(positions, dtype=np.float64)
    radius = (
        float(perception_radius)
        if perception_radius is not None
        else float(canonical_params()["perception_radius"])
    )
    diff = p[None, :, :] - p[:, None, :]
    d2 = np.einsum("ijk,ijk->ij", diff, diff)
    n = p.shape[0]
    if n > 0:
        d2[np.arange(n), np.arange(n)] = np.inf
    cutoff_sq = radius * radius
    lists: list[list[int]] = []
    for i in range(n):
        idx = np.flatnonzero(d2[i] <= cutoff_sq)
        lists.append(sorted(int(j) for j in idx))
    return lists


__all__ = [
    "CANONICAL_1000AGENT_DESCRIPTOR",
    "CANONICAL_3AGENT_DESCRIPTOR",
    "CANONICAL_CAPTURE_INTERVAL",
    "CANONICAL_STEP_COUNT",
    "compute_canonical_trajectory",
    "neighbor_lists_at",
    "sim_runner_seeded",
    "sim_runner_seeded_3agent",
]
