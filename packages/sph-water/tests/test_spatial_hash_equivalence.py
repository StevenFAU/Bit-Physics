"""Spatial-hash / cell-list equivalence — determinism bridge between
the diagnostic-tier and canonical-tier neighbor-query implementations.

Added at sub-phase-particle-fluids-sph-water Stage 1 R16 routing:
the canonical-tier :func:`sph_water.reference.dfsph.cell_list_neighbor_query`
must produce byte-identical output to the diagnostic-tier
:func:`sph_water.reference.dfsph.neighbor_lists` at any input where
both representations fit in memory. This locks in the determinism
invariant — at small N (where the O(N²) builder works) the two
algorithms agree exactly; at large N (where only the cell-list
builder works) we extrapolate that agreement based on the algorithm
correctness verified at small N.

Also exercises :func:`density_evolution_vectorized` against the
loop variant :func:`density_evolution` at small N, locking in the
bit-equivalence of vectorized segment-sum vs sequential left-to-right
sum at scales where both fit.
"""

from __future__ import annotations

import numpy as np

from sph_water.reference.dfsph import (
    canonical_params,
    cell_list_neighbor_query,
    density,
    density_evolution,
    density_evolution_jit,
    density_evolution_vectorized,
    density_jit,
    neighbor_lists,
    pair_lists_from_positions,
)


def _make_random_particles(seed: int, n: int, box: float = 1.0):
    rng = np.random.default_rng(int(seed))
    positions = rng.uniform(0.0, box, size=(int(n), 3))
    velocities = rng.uniform(-1.0, 1.0, size=(int(n), 3))
    masses = rng.uniform(0.1, 2.0, size=(int(n),))
    return positions, velocities, masses


def test_cell_list_matches_neighbor_lists_at_n2() -> None:
    """Two-particle gate-5 fixture: both algorithms agree."""
    positions = np.asarray([[0.0, 0.0, 0.0], [0.5, 0.0, 0.0]], dtype=np.float64)
    h = 1.0
    a = neighbor_lists(positions, h)
    b = cell_list_neighbor_query(positions, h)
    assert a == b, f"diagnostic={a}, cell-list={b}"


def test_cell_list_matches_neighbor_lists_at_n64() -> None:
    """64-particle random IC: cell-list output byte-equal to diagnostic-tier."""
    positions, _, _ = _make_random_particles(seed=42, n=64, box=1.0)
    h = float(canonical_params()["h"])
    a = neighbor_lists(positions, h)
    b = cell_list_neighbor_query(positions, h)
    assert a == b, (
        f"first divergence at i={next(i for i, (x, y) in enumerate(zip(a, b)) if x != y)}"
    )


def test_cell_list_matches_neighbor_lists_at_n256() -> None:
    """256-particle random IC: cell-list output byte-equal to diagnostic-tier."""
    positions, _, _ = _make_random_particles(seed=42, n=256, box=1.0)
    h = float(canonical_params()["h"])
    a = neighbor_lists(positions, h)
    b = cell_list_neighbor_query(positions, h)
    # Spot-check identical lengths
    assert len(a) == len(b) == 256
    # Full element equality
    for i, (la, lb) in enumerate(zip(a, b)):
        assert la == lb, f"particle {i}: diagnostic={la} cell-list={lb}"


def test_density_evolution_vectorized_matches_loop_at_n2() -> None:
    """Two-particle fixture: vectorized + loop variants agree (gate-5 anchor)."""
    particles = [
        {"p": [0.0, 0.0, 0.0], "v": [0.0, 0.0, 0.0], "m": 1.0},
        {"p": [0.5, 0.0, 0.0], "v": [1.0, 0.0, 0.0], "m": 1.0},
    ]
    h = 1.0
    loop_result = density_evolution(particles=particles, h=h)
    positions = np.asarray([p["p"] for p in particles], dtype=np.float64)
    velocities = np.asarray([p["v"] for p in particles], dtype=np.float64)
    masses = np.asarray([p["m"] for p in particles], dtype=np.float64)
    nbrs = cell_list_neighbor_query(positions, h)
    vec_result = density_evolution_vectorized(
        positions=positions,
        velocities=velocities,
        masses=masses,
        h=h,
        nbr_lists=nbrs,
    )
    assert loop_result[0] == vec_result[0], f"loop={loop_result[0]} vec={vec_result[0]}"
    assert abs(vec_result[0] - (-0.2984155182973038)) < 1e-15, (
        f"vec={vec_result[0]} expected drho_dt_0 = -0.2984155182973038"
    )


def test_density_evolution_vectorized_matches_loop_at_n64() -> None:
    """64-particle random IC: vectorized + loop FP-equivalent.

    Per the docstring at :func:`density_evolution_vectorized`: the
    two variants are FP-equivalent, NOT bit-equivalent — the loop
    computes per-pair work via scalar-on-3-vec operations; the
    vectorized variant broadcasts over (M, 3). Algebraically
    equivalent; FP-wise diverge by ≲ ε × ⟨neighbors⟩ per particle.
    At canonical h with 64 random particles in [0, 1]^3 the
    expected drift is in the ~1e-12 range; the test tolerance
    locks in FP-equivalence at 1e-10 absolute (well below the
    sph cross-stack tolerance row at `tolerance.toml` of 1e-4
    relative, and consistent with bit-deterministic-with-itself
    for the canonical-tier capture).
    """
    positions, velocities, masses = _make_random_particles(seed=42, n=64, box=1.0)
    h = float(canonical_params()["h"])
    particles = [
        {"p": positions[i].tolist(), "v": velocities[i].tolist(), "m": float(masses[i])}
        for i in range(64)
    ]
    loop_result = np.asarray(density_evolution(particles=particles, h=h))
    nbrs = cell_list_neighbor_query(positions, h)
    vec_result = density_evolution_vectorized(
        positions=positions,
        velocities=velocities,
        masses=masses,
        h=h,
        nbr_lists=nbrs,
    )
    max_abs_diff = float(np.max(np.abs(loop_result - vec_result)))
    # FP-equivalence at 1e-10 absolute (NOT bit-equivalence; see docstring).
    assert max_abs_diff < 1e-10, (
        f"max_abs_diff={max_abs_diff:g} between loop and vectorized variants"
    )


def test_pair_lists_from_positions_matches_cell_list_at_n64() -> None:
    """pair_lists_from_positions returns the same (i, j) set as cell_list.

    The two representations differ in shape (list-of-lists vs flat
    (pair_i, pair_j) ndarrays) but represent the same underlying
    neighbor relation. Verify by reconstructing nbr_lists from
    pair_i + pair_j and comparing list-equality to cell_list output.
    """
    positions, _, _ = _make_random_particles(seed=42, n=64, box=1.0)
    h = float(canonical_params()["h"])
    nbr_lists = cell_list_neighbor_query(positions, h)
    pair_i, pair_j = pair_lists_from_positions(positions, h)
    # Reconstruct nbr_lists from (pair_i, pair_j)
    reconstructed = [[] for _ in range(64)]
    for i, j in zip(pair_i.tolist(), pair_j.tolist()):
        reconstructed[i].append(int(j))
    # Each particle's reconstructed list should already be sorted
    # (pair_lists_from_positions emits lexsort-sorted output).
    assert nbr_lists == reconstructed, (
        f"first divergence at i={next(i for i, (a, b) in enumerate(zip(nbr_lists, reconstructed)) if a != b)}"
    )


def test_density_evolution_vectorized_bit_deterministic_with_itself() -> None:
    """The vectorized variant is bit-deterministic when run twice on same input.

    This is the load-bearing determinism property for the canonical-
    tier capture: the spec demands bit-exact-same-stack-same-hw for
    the Python NumPy reference, and the gate-11 epsilon-diff test
    witnesses bit-exact at the diagnostic-tier; this test extends
    that witness to the canonical-tier algorithm. The vectorized
    variant is allowed to differ from the loop variant by FP-non-
    associativity, but it MUST be bit-identical with itself.
    """
    positions, velocities, masses = _make_random_particles(seed=42, n=64, box=1.0)
    h = float(canonical_params()["h"])
    nbrs = cell_list_neighbor_query(positions, h)
    a = density_evolution_vectorized(
        positions=positions,
        velocities=velocities,
        masses=masses,
        h=h,
        nbr_lists=nbrs,
    )
    b = density_evolution_vectorized(
        positions=positions,
        velocities=velocities,
        masses=masses,
        h=h,
        nbr_lists=nbrs,
    )
    assert np.array_equal(a, b), (
        "vectorized variant must be bit-deterministic with itself"
    )


# ---------------------------------------------------------------------------
# Numba JIT equivalence — R18 routing landings.
#
# The JIT inner (density_evolution_jit / density_jit) is consumed by
# the canonical-tier sim path (sim._canonical_step + canonical-tier
# _trajectory_to_step_states). Verify the JIT variants are
# FP-equivalent (within 1e-9 per the project convention at
# docs/common/numba.md) with the pure-NumPy loop variants at small N
# where both are tractable, AND bit-deterministic with themselves.
# Same framing as the existing density_evolution_vectorized tests.
# ---------------------------------------------------------------------------


def test_density_evolution_jit_fp_equivalent_with_loop_at_n64() -> None:
    """64-particle random IC: JIT variant FP-equivalent with loop variant.

    Per docs/common/numba.md § 6: numba's lowered scalar loop and
    pure-NumPy's SIMD-vectorized code use different FP-accumulation
    patterns; algebraic equivalence holds but bit-equality does not.
    Tolerance 1e-9 is the convention's contract; tighter would flag
    accidental fastmath drift.
    """
    positions, velocities, masses = _make_random_particles(seed=42, n=64, box=1.0)
    h = float(canonical_params()["h"])
    particles = [
        {"p": positions[i].tolist(), "v": velocities[i].tolist(), "m": float(masses[i])}
        for i in range(64)
    ]
    loop_result = np.asarray(density_evolution(particles=particles, h=h))
    pair_i, pair_j = pair_lists_from_positions(positions, h)
    jit_result = density_evolution_jit(
        positions=positions,
        velocities=velocities,
        masses=masses,
        h=h,
        pair_i=pair_i,
        pair_j=pair_j,
    )
    max_abs_diff = float(np.max(np.abs(loop_result - jit_result)))
    assert max_abs_diff < 1e-9, (
        f"max_abs_diff={max_abs_diff:g} between density_evolution loop and "
        f"density_evolution_jit at N=64 exceeds 1e-9 FP-equivalence tolerance"
    )


def test_density_evolution_jit_bit_deterministic_with_itself() -> None:
    """JIT variant produces bit-identical output across two consecutive runs.

    Load-bearing same-stack-same-hw contract per docs/common/numba.md
    § 6 contract (2): bit-identical run-to-run output. If this fails
    the numba convention has been broken.
    """
    positions, velocities, masses = _make_random_particles(seed=42, n=64, box=1.0)
    h = float(canonical_params()["h"])
    pair_i, pair_j = pair_lists_from_positions(positions, h)
    a = density_evolution_jit(
        positions=positions,
        velocities=velocities,
        masses=masses,
        h=h,
        pair_i=pair_i,
        pair_j=pair_j,
    )
    b = density_evolution_jit(
        positions=positions,
        velocities=velocities,
        masses=masses,
        h=h,
        pair_i=pair_i,
        pair_j=pair_j,
    )
    assert np.array_equal(a, b), (
        "density_evolution_jit must be bit-deterministic with itself"
    )


def test_density_jit_fp_equivalent_with_loop_at_n64() -> None:
    """64-particle random IC: density_jit FP-equivalent with density loop.

    Same FP-equivalence-within-1e-9 contract as
    test_density_evolution_jit_fp_equivalent_with_loop_at_n64.
    """
    positions, _velocities, masses = _make_random_particles(seed=42, n=64, box=1.0)
    h = float(canonical_params()["h"])
    velocities = np.zeros((64, 3), dtype=np.float64)  # density does not need v
    particles = [
        {"p": positions[i].tolist(), "v": velocities[i].tolist(), "m": float(masses[i])}
        for i in range(64)
    ]
    loop_result = np.asarray(density(particles=particles, h=h))
    pair_i, pair_j = pair_lists_from_positions(positions, h)
    jit_result = density_jit(
        positions=positions,
        masses=masses,
        h=h,
        pair_i=pair_i,
        pair_j=pair_j,
    )
    max_abs_diff = float(np.max(np.abs(loop_result - jit_result)))
    assert max_abs_diff < 1e-9, (
        f"max_abs_diff={max_abs_diff:g} between density loop and density_jit "
        f"at N=64 exceeds 1e-9 FP-equivalence tolerance"
    )


def test_density_jit_bit_deterministic_with_itself() -> None:
    """density_jit produces bit-identical output across two consecutive runs."""
    positions, _, masses = _make_random_particles(seed=42, n=64, box=1.0)
    h = float(canonical_params()["h"])
    pair_i, pair_j = pair_lists_from_positions(positions, h)
    a = density_jit(
        positions=positions,
        masses=masses,
        h=h,
        pair_i=pair_i,
        pair_j=pair_j,
    )
    b = density_jit(
        positions=positions,
        masses=masses,
        h=h,
        pair_i=pair_i,
        pair_j=pair_j,
    )
    assert np.array_equal(a, b), "density_jit must be bit-deterministic with itself"
