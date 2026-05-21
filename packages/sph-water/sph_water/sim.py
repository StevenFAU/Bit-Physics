"""SimRunner adapter — sph-water canonical capture.

================================================================================
DETERMINISM STRATEGY DECLARATION (sub-phase plan § 1.5 — LOAD-BEARING)
================================================================================

Cited in the sub-phase-particle-fluids-sph-water Stage 1 commit footer
per inherited agent-based § 1.4 / continuous-CA-rd3d § 1.5 discipline.
Seven clauses, mapped to the P24 SPH-determinism-debugging playbook
priority order (sub-phase plan § 9.1):

1. **Stable particle iteration order** (P24 cause #4 mitigation).
   :func:`sph_water.reference.dfsph._particles_to_arrays` preserves
   submission order; the Stage-1 ``sim_runner_seeded`` synthesises ICs
   from a seeded ``numpy.random.default_rng(seed)``.

   **Diagnostic-tier path** (N ≤ ~1024; gate-5 + gate-7 + gate-11 +
   gate-12 small-N fixtures): no spatial-hash bucketing, no Morton-key
   sort. Particles are iterated in submission order; :func:`neighbor_lists`
   produces sorted-by-id neighbor lists from the full O(N²) pairwise
   tensor.

   **Canonical-tier path** (N ≥ ~10⁴; the 1M-particle canonical
   capture per sub-phase plan § 2 gate 10 + § 9 R12 + § 9 R16 + § 9
   R17 routing arc): ``scipy.spatial.cKDTree`` is used via
   :func:`cell_list_neighbor_query` (function name retained from the
   R16 cell-list intermediate hop; R17 routing replaced the body with
   cKDTree to defeat the Python-interpreter-overhead bottleneck of the
   pure-Python cell-list at 1M-particle scale). Determinism preserved
   through two disciplines:
   (i) cKDTree construction is a deterministic function of the input
       positions array (fixed splitting strategy at the configured
       leafsize; no randomization);
   (ii) per-particle ``query_ball_point`` output is wrapped in a
       sort-by-id (the cKDTree query order is not intrinsically
       stable; the sort wrap locks in byte-equivalence with
       :func:`neighbor_lists` regardless of internal tree-construction
       or query order).
   Bit-equivalent to the O(N²) diagnostic-tier builder at any input
   where both fit; verified by
   ``tests/test_spatial_hash_equivalence.py`` (6 tests at N ∈ {2, 64,
   256}; same tests that verified the cell-list intermediate hop, now
   verifying the KDTree replacement — the function-name-stable
   equivalence contract).

   Note: the R16 routing landed an intermediate pure-Python cell-list
   implementation (commit ``2a48a32``); that implementation was correct
   algorithmically and bit-equivalent at the equivalence-test scales,
   but its Python outer loop over N=1M particles hit a Python-interpreter-
   overhead bottleneck (~14 hours estimated wall-clock — sub-phase plan
   § 9 R17 surface). R17 routing replaced the body with cKDTree; the
   cell-list implementation no longer exists in the source tree
   (intermediate hop superseded).

   Phase-2+ Stack-C extends this with native cell-list / Morton-key
   bucket sort + stable secondary id-sort per ``determinism.md``.

2. **Sorted neighbor-iteration order** (P24 cause #1 mitigation).
   :func:`sph_water.reference.dfsph.neighbor_lists` returns each
   particle's neighbor list sorted ascending by id (via ``np.where``,
   which is deterministic over a 1-D boolean mask). No hashmap
   iteration; no spatial-hash bucket-order leakage.

3. **Sorted per-pair force-accumulation order** (P24 cause #2
   mitigation). :func:`density` and :func:`density_evolution` iterate
   each particle's neighbor list in sorted order with a single
   per-particle accumulator (Python ``float`` ``+=``); NO
   ``numpy.add.at`` over unsorted pair indices and NO parallel
   reductions. FP non-associativity is fully sequenced.

4. **DFSPH inner-iteration determinism** (P24 cause #3 mitigation).
   :func:`divergence_free_solve` uses a fixed ``max_iter`` cap +
   ``<=`` tolerance check semantics; iteration count cannot vary
   across runs at the same input + the same parameters. The canonical
   ``max_iter`` / ``tolerance`` values are pinned at
   :func:`canonical_params`.

5. **No stochastic operations inside the step.** RNG is consumed only
   at IC synthesis via ``numpy.random.default_rng(seed)``; bare
   ``numpy.random.*`` global state is banned in ``reference`` /
   ``sim``. No Hypothesis leakage outside the PBT module.

6. **No BLAS / FMA path inside the kernel.** Elementwise NumPy +
   ``np.einsum("ijk,ijk->ij", ...)`` for the pairwise squared
   distance only (NumPy's einsum reductions are deterministic in C
   traversal order); no ``numpy.dot`` over multi-dimensional inner
   axes that could route through BLAS GEMM with thread-count drift.

7. **Phase-2+ deferred** (sub-phase plan § 1.4 + § 1.5):
   - Stack-C atomic scatter-add in the DFSPH neighbor accumulator —
     n/a for the Python NumPy reference;
   - Driver / vendor FMA fusion (WGSL/Vulkan intrinsic) — n/a;
   - Vulkan subgroup-collective ops — n/a;
   All declared in
   ``docs/sim-specs/particle-fluids/sph-water/determinism.md`` as the
   ``epsilon-same-stack-same-hw`` sources of nondeterminism that the
   Python NumPy reference does NOT exercise.

Resulting claim: the Python NumPy reference at this sub-phase target
``bit-exact-same-stack-same-hw`` (stronger than the spec's
``epsilon`` Stack-C declaration); gate-11
``test_run_twice_epsilon_diff`` witnesses the resulting claim as
epsilon-bounded by 0 (i.e., bit-exact in practice). Over-achievement
is informational only and does NOT promote the spec declaration per
sub-phase plan § 1.5.

================================================================================
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Final

import numpy as np
from capture import CaptureManifest, StepState, write_capture

from .reference.dfsph import (
    canonical_params,
    density,
    density_evolution,
    density_evolution_vectorized,
    density_vectorized,
    pair_lists_from_positions,
)

CANONICAL_DESCRIPTOR: Final[str] = "dam-break-1M-particles-seed42-step1000"
CANONICAL_N_PARTICLES: Final[int] = 1_000_000
CANONICAL_STEP_COUNT: Final[int] = 1000
# Operator-routed at Stage 1 R12 boundary (sub-phase plan § 11.5 Item 5):
# 11 frames at every-100-steps cadence (steps 0 / 100 / ... / 1000) at
# the documented 56 B per-particle per-frame payload (~587 MB H5).
CANONICAL_CAPTURE_INTERVAL: Final[int] = 100
# Operator-routed at Stage 1 R16 boundary (canonical-tier runtime
# memory cost — sub-phase plan § 9 R16 surface). Smoothing length
# tuned for ~30–60 SPH neighbors per particle at the canonical
# 1M-particle uniform-cube IC: particle spacing ≈ N^(-1/3) = 0.01;
# h = 1.2 × spacing ≈ 0.012 yields ⟨neighbors⟩ ≈ 50 per the
# (4/3)π(2h)³ × density estimate. The diagnostic-tier path keeps
# h = canonical_params()["h"] = 0.05 (the small-N default unchanged
# at 85f178f).
CANONICAL_H: Final[float] = 0.012

# Diagnostic-tier defaults — used by gate-11 determinism +
# gate-7 diagnostics + gate-6 NaN/Inf scan to avoid re-running the
# 1M-particle canonical descriptor on every pytest invocation.
# Parallels the agent-based Stage-1 ``_DIAGNOSTIC_N_STEPS = 50``
# pattern (see ``packages/boids-3d/tests/test_diagnostics.py``).
_DIAGNOSTIC_N_PARTICLES: Final[int] = 64
_DIAGNOSTIC_N_STEPS: Final[int] = 8
_DIAGNOSTIC_DESCRIPTOR: Final[str] = "dam-break-diagnostic-64particles-step8"


def _seeded_initial_state(
    seed: int, n_particles: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Seeded uniform-random dam-break IC over a $[0, 1]^3$ box.

    Returns:
        (positions, velocities, masses); shapes (N, 3), (N, 3), (N,).
    """
    rng = np.random.default_rng(int(seed))
    positions = rng.uniform(0.0, 1.0, size=(int(n_particles), 3))
    # Small initial downward drift (consistent with a dam-break IC
    # where gravity dominates; canonical_params declares g_z = -9.81).
    velocities = np.zeros((int(n_particles), 3), dtype=np.float64)
    masses = np.ones((int(n_particles),), dtype=np.float64) * 1.0e-3
    return positions, velocities, masses


def _diagnostic_step(
    positions: np.ndarray,
    velocities: np.ndarray,
    masses: np.ndarray,
    *,
    h: float,
    dt: float,
    g_z: float,
) -> tuple[np.ndarray, np.ndarray]:
    """One diagnostic-tier explicit Euler step (NOT the full DFSPH solver).

    For the Phase-1 Python reference at diagnostic scale, the
    canonical step is:

    1. Compute SPH continuity dρ/dt at the current state (uses
       :func:`density_evolution` for the deterministic neighbor sum;
       discarded as side-effect — the time-integration here is on
       (positions, velocities) only).
    2. Apply gravity to velocities along z.
    3. Integrate positions via explicit Euler.

    This is a deliberately-simple integrator — it exercises the
    deterministic kernel + neighbor-list + density-evolution surface
    end-to-end without committing to a full DFSPH solver at this
    sub-phase scope. Phase-2+ Stack-C replaces this with the canonical
    DFSPH constant-density + divergence-free corrector.
    """
    n = positions.shape[0]
    particles_dict = [
        {"p": positions[i].tolist(), "v": velocities[i].tolist(), "m": float(masses[i])}
        for i in range(n)
    ]
    # Exercise the deterministic-summed continuity (side-effect:
    # any non-finite would be caught by the gate-6 tier-1 NaN/Inf
    # scan downstream).
    _ = density_evolution(particles=particles_dict, h=h)
    # Explicit Euler with gravity along z.
    velocities_next = velocities.copy()
    velocities_next[:, 2] += g_z * dt
    positions_next = positions + dt * velocities_next
    return positions_next, velocities_next


def _canonical_step(
    positions: np.ndarray,
    velocities: np.ndarray,
    masses: np.ndarray,
    *,
    h: float,
    dt: float,
    g_z: float,
) -> tuple[np.ndarray, np.ndarray]:
    """One canonical-tier explicit Euler step (KDTree-backed neighbor query).

    Parallel to :func:`_diagnostic_step` but uses
    :func:`pair_lists_from_positions` (scipy cKDTree.query_pairs +
    symmetrize + lexsort) + :func:`density_evolution_vectorized` (in
    its pair-array fast-path mode) for O(N log N) + O(N·⟨neighbors⟩)
    runtime instead of the diagnostic tier's O(N²) pairwise tensor
    materialization. Sized for the canonical 1M-particle capture
    (sub-phase plan § 9 R16 + R17 routing arc).

    Same integrator semantics as the diagnostic step (explicit Euler +
    gravity along z); same deterministic-summed continuity exercise
    (side-effect via vectorized density_evolution); cross-tier
    FP-equivalence within machine-epsilon × ⟨neighbors⟩ per particle
    (the vectorized density-evolution is FP-equivalent, not
    bit-equivalent, with the loop variant — see
    :func:`density_evolution_vectorized` docstring).
    """
    pair_i, pair_j = pair_lists_from_positions(positions, h)
    # Exercise the deterministic-summed continuity (side-effect).
    _ = density_evolution_vectorized(
        positions=positions,
        velocities=velocities,
        masses=masses,
        h=h,
        pair_i=pair_i,
        pair_j=pair_j,
    )
    # Explicit Euler with gravity along z (matches _diagnostic_step).
    velocities_next = velocities.copy()
    velocities_next[:, 2] += g_z * dt
    positions_next = positions + dt * velocities_next
    return positions_next, velocities_next


def compute_diagnostic_trajectory(
    *,
    seed: int = 42,
    n_particles: int = _DIAGNOSTIC_N_PARTICLES,
    n_steps: int = _DIAGNOSTIC_N_STEPS,
    capture_interval: int = 1,
) -> tuple[np.ndarray, np.ndarray, list[int]]:
    """Diagnostic-tier in-memory trajectory (no I/O).

    Used by ``test_diagnostics`` and ``test_determinism`` to inspect
    positions/velocities/step-indices without round-tripping through
    HDF5 + without paying the 1M-particle canonical-capture cost on
    every pytest invocation.
    """
    params = canonical_params()
    h = float(params["h"])
    dt = float(params["dt"])
    g_z = float(params["g_z"])
    positions, velocities, masses = _seeded_initial_state(seed, n_particles)
    n_frames = max(1, int(n_steps) // max(1, int(capture_interval))) + 1
    p_hist = np.zeros((n_frames, int(n_particles), 3), dtype=np.float64)
    v_hist = np.zeros((n_frames, int(n_particles), 3), dtype=np.float64)
    step_indices: list[int] = []
    # Initial frame.
    p_hist[0] = positions
    v_hist[0] = velocities
    step_indices.append(0)
    frame_idx = 1
    for step in range(1, int(n_steps) + 1):
        positions, velocities = _diagnostic_step(
            positions, velocities, masses, h=h, dt=dt, g_z=g_z
        )
        if step % int(capture_interval) == 0:
            if frame_idx < n_frames:
                p_hist[frame_idx] = positions
                v_hist[frame_idx] = velocities
                step_indices.append(int(step))
                frame_idx += 1
    # Trim if fewer frames captured than allocated.
    if frame_idx < n_frames:
        p_hist = p_hist[:frame_idx]
        v_hist = v_hist[:frame_idx]
    return p_hist, v_hist, step_indices


def neighbor_lists_at(
    positions: np.ndarray, *, h: float | None = None
) -> list[list[int]]:
    """Diagnostic helper — neighbor lists at a positions snapshot.

    Used by ``test_diagnostics`` to feed IC-5
    ``check_neighbor_list_integrity``. Wraps the reference module's
    builder with the canonical smoothing length default.
    """
    from .reference.dfsph import neighbor_lists  # local import: avoid cycle

    if h is None:
        h = float(canonical_params()["h"])
    return neighbor_lists(np.asarray(positions, dtype=np.float64), float(h))


def _build_manifest(
    *,
    descriptor: str,
    n_particles: int,
    seed: int,
    step_count: int,
    capture_interval: int,
    wall_clock_seconds: float,
) -> CaptureManifest:
    params = canonical_params()
    return CaptureManifest(
        schema_version="1.0.0",
        sim={
            "name": "sph-water",
            "category": "particle-fluids",
            "variant": "dfsph-bender-koschier-2015",
        },
        stack={
            "name": "numpy-reference",
            "version": "0.0.1",
            "build_id": "sub-phase-particle-fluids-sph-water",
        },
        config={
            "tier": "test",
            "dims": [int(n_particles), 3],
            "dtype": "f64",
            "seed": int(seed),
            "params": {
                "h": params["h"],
                "rho_0": params["rho_0"],
                "dt": params["dt"],
                "g_z": params["g_z"],
                "n_particles": int(n_particles),
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
            # Python NumPy reference target: bit-exact (per § 1.5
            # over-achievement). Stack-C target remains epsilon per
            # determinism.md.
            "claimed": "bit-exact-same-hw",
            "atomic_ops": False,
            "subgroup_ops": False,
        },
    )


def _trajectory_to_step_states(
    p_hist: np.ndarray,
    v_hist: np.ndarray,
    step_indices: list[int],
    masses: np.ndarray,
    *,
    use_spatial_hash: bool = False,
    h: float | None = None,
) -> list[StepState]:
    """Lift a trajectory tuple into IC-1 ``StepState`` rows.

    Adds per-particle SPH density at each captured frame (exercising
    the deterministic-summed kernel on every snapshot — gate-7 IC-5
    diagnostics consume this).

    Diagnostic-tier (``use_spatial_hash=False``) uses :func:`density`
    via the O(N²) neighbor-list builder; canonical-tier
    (``use_spatial_hash=True``) uses :func:`density_vectorized` with
    :func:`cell_list_neighbor_query` per sub-phase plan § 9 R16
    routing.
    """
    if h is None:
        h = float(canonical_params()["h"])
    rows: list[StepState] = []
    for idx, step in enumerate(step_indices):
        positions = p_hist[idx]
        velocities = v_hist[idx]
        if use_spatial_hash:
            pair_i, pair_j = pair_lists_from_positions(positions, h)
            rho = density_vectorized(
                positions=positions,
                masses=masses,
                h=h,
                pair_i=pair_i,
                pair_j=pair_j,
            )
            mean_rho = float(np.mean(rho)) if rho.size else 0.0
        else:
            particles_dict = [
                {
                    "p": positions[i].tolist(),
                    "v": velocities[i].tolist(),
                    "m": float(masses[i]),
                }
                for i in range(positions.shape[0])
            ]
            rho_list = density(particles=particles_dict, h=h)
            rho = np.asarray(rho_list, dtype=np.float64)
            mean_rho = float(np.mean(rho)) if rho_list else 0.0
        speed = np.linalg.norm(velocities, axis=-1)
        rows.append(
            StepState(
                step=int(step),
                state={
                    "position": np.asarray(positions, dtype=np.float64).copy(),
                    "velocity": np.asarray(velocities, dtype=np.float64).copy(),
                    "density": rho.copy(),
                },
                diagnostics={
                    "max_speed": float(speed.max()) if speed.size else 0.0,
                    "mean_density": mean_rho,
                },
            )
        )
    return rows


def _write_capture(
    *,
    descriptor: str,
    n_particles: int,
    seed: int,
    n_steps: int,
    capture_interval: int,
    out_dir: Path,
    use_spatial_hash: bool = False,
    h_override: float | None = None,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    h = float(h_override) if h_override is not None else float(canonical_params()["h"])
    t0 = time.perf_counter()
    positions, velocities, masses = _seeded_initial_state(seed, n_particles)
    p_hist, v_hist, step_indices = _evolve_to_frames(
        positions,
        velocities,
        masses,
        n_steps=n_steps,
        capture_interval=capture_interval,
        use_spatial_hash=use_spatial_hash,
        h=h,
    )
    wall = time.perf_counter() - t0
    rows = _trajectory_to_step_states(
        p_hist,
        v_hist,
        step_indices,
        masses,
        use_spatial_hash=use_spatial_hash,
        h=h,
    )
    manifest = _build_manifest(
        descriptor=descriptor,
        n_particles=int(n_particles),
        seed=seed,
        step_count=n_steps,
        capture_interval=capture_interval,
        wall_clock_seconds=wall,
    )
    return write_capture(rows, manifest, out_dir)


def _evolve_to_frames(
    positions: np.ndarray,
    velocities: np.ndarray,
    masses: np.ndarray,
    *,
    n_steps: int,
    capture_interval: int,
    use_spatial_hash: bool = False,
    h: float | None = None,
) -> tuple[np.ndarray, np.ndarray, list[int]]:
    """Compute the per-frame trajectory.

    Diagnostic-tier (``use_spatial_hash=False``) uses
    :func:`_diagnostic_step` (O(N²) full pairwise neighbor lookup);
    canonical-tier (``use_spatial_hash=True``) uses
    :func:`_canonical_step` (O(N + N⟨neighbors⟩) spatial-hash neighbor
    query + vectorized continuity).
    """
    params = canonical_params()
    if h is None:
        h = float(params["h"])
    dt = float(params["dt"])
    g_z = float(params["g_z"])
    p = positions.copy()
    v = velocities.copy()
    p_frames: list[np.ndarray] = [p.copy()]
    v_frames: list[np.ndarray] = [v.copy()]
    step_indices: list[int] = [0]
    step_fn = _canonical_step if use_spatial_hash else _diagnostic_step
    for step in range(1, int(n_steps) + 1):
        p, v = step_fn(p, v, masses, h=h, dt=dt, g_z=g_z)
        if step % int(capture_interval) == 0 or step == int(n_steps):
            p_frames.append(p.copy())
            v_frames.append(v.copy())
            step_indices.append(int(step))
    p_hist = np.stack(p_frames, axis=0)
    v_hist = np.stack(v_frames, axis=0)
    return p_hist, v_hist, step_indices


def sim_runner_seeded(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — produces the canonical 1M-particle capture.

    Spec descriptor (Appendix D § D.2.3):
    ``dam-break-1M-particles-seed42-step1000``.

    **Operator-routed configuration** (sub-phase plan § 9 R12 + R16):

    - Cadence: every-100-steps ⇒ 11 frames (steps 0, 100, 200, ...,
      1000). Pre-commit ceiling raised to 1 GB at the R12 routing
      step to absorb the ~587 MB H5 payload.
    - Neighbor query: :func:`cell_list_neighbor_query` (spatial-hash
      / cell-list) at the R16 routing step. The O(N²) diagnostic-
      tier builder is infeasible at N = 1M (21.8 TiB pairwise
      tensor allocation); the spatial-hash variant produces
      bit-equivalent neighbor lists at any input where both fit.
    - Smoothing length: ``CANONICAL_H = 0.012`` — tuned for ~50 SPH
      neighbors per particle at the 1M-particle uniform-cube IC
      (vs the diagnostic-tier ``canonical_params()["h"] = 0.05``,
      which would give ~4200 neighbors at this scale).
    - Determinism: bit-deterministic with itself (see sim.py module
      docstring clause 1, R16 amendment).
    """
    return _write_capture(
        descriptor=CANONICAL_DESCRIPTOR,
        n_particles=CANONICAL_N_PARTICLES,
        seed=seed,
        n_steps=CANONICAL_STEP_COUNT,
        capture_interval=CANONICAL_CAPTURE_INTERVAL,
        out_dir=out_dir,
        use_spatial_hash=True,
        h_override=CANONICAL_H,
    )


def sim_runner_diagnostic(seed: int, out_dir: Path) -> Path:
    """SimRunner Protocol — diagnostic-tier capture for gate-11 determinism.

    Mirrors the agent-based ``sim_runner_seeded_3agent`` /
    closed-form diagnostic-runner pattern (separate from the canonical
    1M-particle ``sim_runner_seeded`` for tractability at test scope).
    """
    return _write_capture(
        descriptor=_DIAGNOSTIC_DESCRIPTOR,
        n_particles=_DIAGNOSTIC_N_PARTICLES,
        seed=seed,
        n_steps=_DIAGNOSTIC_N_STEPS,
        capture_interval=max(1, _DIAGNOSTIC_N_STEPS // 4),
        out_dir=out_dir,
    )
