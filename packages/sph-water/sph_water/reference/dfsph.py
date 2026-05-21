"""DFSPH primitives — 3D Monaghan cubic-spline kernel + density / continuity.

The discrete formulas implemented below are derived independently from
their canonical literature anchors (cited by NAME — no imports from the
vendored SPlisHSPlasH tree at ``references/SPlisHSPlasH/``, per spec
§ 9.2 + sub-phase plan § 1.6):

- 3D cubic-spline kernel: **Monaghan (1992)**, *Annu. Rev. Astron.
  Astrophys.* 30, 543–574 (DOI 10.1146/annurev.aa.30.090192.002551);
  **Monaghan (2005)**, *Rep. Prog. Phys.* 68 (8), 1703–1759
  (DOI 10.1088/0034-4885/68/8/R01), eq. (2.7); piecewise form +
  3D normalization $\\sigma_3 = 1/\\pi$.
- SPH continuity / DFSPH density evolution: **Bender & Koschier
  (2015)**, *SCA '15*, 147–155, eq. (5) (DOI 10.1145/2786784.2786796);
  Monaghan (2005), § 2.2.

The kernel piecewise form, the gradient piecewise form, and the
two-particle two-field fixture values used by gate-5 are all
re-derivable from these papers; the Phase-0 cubic-spline-kernel golden
(``tools/testkit/golden/tables/cubic-spline-kernel.json``) and the
Phase-1 DFSPH density-evolution golden
(``tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json``)
both pin the same values. The Phase-0 reference implementation at
``tools/testkit/golden/reference_implementations/cubic_spline.py`` is
the canonical Python kernel for the workspace; this module
re-implements the same piecewise formula for the sim-side surface
(per Convention A — additive new files; no edits to Phase-0).
"""

from __future__ import annotations

from typing import Any, Sequence

import numpy as np

__all__ = [
    "SIGMA_3D",
    "W",
    "grad_W",
    "grad_W_magnitude",
    "kernel_q",
    "neighbor_lists",
    "cell_list_neighbor_query",
    "pair_lists_from_positions",
    "density",
    "density_vectorized",
    "density_evolution",
    "density_evolution_vectorized",
    "divergence_free_solve",
    "canonical_params",
]

# 3D normalization (Monaghan 1992/2005 § 2.7).
SIGMA_3D: float = 1.0 / np.pi


def _f(q: float) -> float:
    """Cubic-spline piecewise factor f(q) (3D Monaghan 1992 / 2005).

    Compact support: f(q) = 0 for q >= 2.
    """
    if q < 0.0:
        raise ValueError(f"q must be non-negative; got {q!r}")
    if q < 1.0:
        return 1.0 - 1.5 * q * q + 0.75 * q * q * q
    if q < 2.0:
        diff = 2.0 - q
        return 0.25 * diff * diff * diff
    return 0.0


def _fprime(q: float) -> float:
    """First derivative f'(q) of the piecewise cubic-spline factor."""
    if q < 0.0:
        raise ValueError(f"q must be non-negative; got {q!r}")
    if q < 1.0:
        return -3.0 * q + 2.25 * q * q
    if q < 2.0:
        diff = 2.0 - q
        return -0.75 * diff * diff
    return 0.0


def kernel_q(r_vec: np.ndarray, h: float) -> float:
    """Compute $q = \\|r\\|/h$ for a single displacement vector."""
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    return float(np.linalg.norm(r_vec) / h)


def W(q: float, h: float) -> float:
    """3D Monaghan cubic-spline kernel value $W(q, h)$.

    Args:
        q: non-negative dimensionless radius $\\|r\\|/h$.
        h: strictly positive smoothing length.

    Returns:
        $W(q, h) = \\sigma_3 / h^3 \\cdot f(q)$.
    """
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    return float(SIGMA_3D / (h * h * h) * _f(float(q)))


def grad_W_magnitude(q: float, h: float) -> float:
    """Magnitude $|\\nabla W|(q, h)$ of the cubic-spline kernel gradient."""
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    return float(SIGMA_3D / (h * h * h * h) * abs(_fprime(float(q))))


def grad_W(r_vec: np.ndarray, h: float) -> np.ndarray:
    """Vector gradient $\\nabla_i W(r_i - r_j, h)$ for displacement $r$.

    Args:
        r_vec: 3-vector $r = r_i - r_j$.
        h: strictly positive smoothing length.

    Returns:
        $\\nabla_i W = (\\sigma_3 / h^4) \\cdot f'(q) \\cdot \\hat r$.
        Returns the zero vector for $\\|r\\| = 0$ (no preferred direction
        + the kernel gradient vanishes at the origin for the cubic-spline
        kernel; verifiable from $f'(0) = 0$).
    """
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    r = np.asarray(r_vec, dtype=np.float64)
    mag = float(np.linalg.norm(r))
    if mag == 0.0:
        return np.zeros_like(r)
    q = mag / h
    return (SIGMA_3D / (h**4)) * _fprime(q) * (r / mag)


def _particles_to_arrays(
    particles: Sequence[dict[str, Any]],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Lift a list[dict] particle fixture into (positions, velocities, masses).

    Particles are kept in **submission order** (the test fixture's
    natural order). Sub-phase plan § 1.5 + P24 cause #4: a stable
    iteration order is the prerequisite for any other determinism
    discipline; this helper does NOT reorder.
    """
    if not particles:
        return (
            np.zeros((0, 3), dtype=np.float64),
            np.zeros((0, 3), dtype=np.float64),
            np.zeros((0,), dtype=np.float64),
        )
    positions = np.asarray([p["p"] for p in particles], dtype=np.float64)
    velocities = np.asarray([p["v"] for p in particles], dtype=np.float64)
    masses = np.asarray([p["m"] for p in particles], dtype=np.float64)
    if positions.shape[1] != 3:
        raise ValueError(f"positions must be 3D; got shape {positions.shape}")
    return positions, velocities, masses


def neighbor_lists(
    positions: np.ndarray, h: float, *, support_factor: float = 2.0
) -> list[list[int]]:
    """O(N^2) neighbor-list builder with deterministic sorted output.

    Builds the per-particle neighbor list for the cubic-spline kernel's
    compact support (default ``q < 2`` ⇒ ``r < 2h``). Each particle's
    neighbor list:

    1. **Excludes self** (consistent with the IC-5
       ``check_neighbor_list_integrity`` contract).
    2. **Is sorted ascending by neighbor id** (P24 cause #1 / cause #2
       mitigation — deterministic per-pair iteration order is the
       prerequisite for FP-deterministic summation under
       non-associative addition).

    For Phase 1's small-N fixtures (two-particle gate-5; ~16-particle
    PBT; ~64-particle diagnostics) the O(N^2) cost is bounded; Phase-2+
    Stack-C work introduces spatial-hash bucket ordering with stable
    secondary id-sort per ``determinism.md``.
    """
    p = np.asarray(positions, dtype=np.float64)
    if p.ndim != 2 or p.shape[1] != 3:
        raise ValueError(f"positions must have shape (N, 3); got {p.shape}")
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    if support_factor <= 0.0:
        raise ValueError(
            f"support_factor must be strictly positive; got {support_factor!r}"
        )
    n = p.shape[0]
    cutoff = support_factor * h
    cutoff_sq = cutoff * cutoff
    # Pairwise squared distances; symmetric; diagonal masked.
    diff = p[:, None, :] - p[None, :, :]
    d2 = np.einsum("ijk,ijk->ij", diff, diff)
    np.fill_diagonal(d2, np.inf)
    mask = d2 < cutoff_sq
    lists: list[list[int]] = []
    for i in range(n):
        # ``np.where`` returns sorted-ascending indices for a 1-D array
        # (deterministic + insertion-order-free by construction).
        nbrs = np.where(mask[i])[0]
        lists.append([int(j) for j in nbrs])
    return lists


def cell_list_neighbor_query(
    positions: np.ndarray, h: float, *, support_factor: float = 2.0
) -> list[list[int]]:
    """KDTree-based neighbor query for canonical-tier scales.

    Equivalent in output to :func:`neighbor_lists` (byte-identical
    ``list[list[int]]`` output at any input where both fit in memory),
    with C-implemented O(N log N) construction + O(N log N) query
    instead of the O(N²) pairwise tensor materialization of the
    diagnostic-tier builder OR the pure-Python cell-list outer loop
    (the prior implementation, which was correct algorithmically but
    bottlenecked by Python-interpreter overhead at 1M-particle scale —
    see sub-phase plan § 9 R17 surface).

    Function name retained from the cell-list intermediate hop
    (sub-phase plan § 9 R16 → R17 routing arc) so the public-API
    surface (:func:`sph_water.sim.sim_runner_seeded`) is unchanged.

    Algorithm — :class:`scipy.spatial.cKDTree`:

    - Build a k-d tree of particle positions (O(N log N), C-impl.);
    - For each particle, call ``query_ball_point`` with the cubic-
      spline kernel cutoff radius ``support_factor·h``;
    - Wrap each per-particle neighbor list in a final sort-by-id
      to lock in determinism (cKDTree's query traversal order is
      not intrinsically stable; the sort wrap produces byte-equivalent
      output regardless of internal tree-construction or query order).

    Determinism discipline (sub-phase plan § 1.5 R17 amendment;
    P24 causes #1, #2, #4 mitigation):

    1. **Tree construction** is a deterministic function of the input
       positions array (scipy's cKDTree uses a fixed splitting strategy
       at the configured `leafsize`; no randomization).
    2. **query_ball_point** output may not be sorted; we sort by id
       on each per-particle list — this is the load-bearing
       determinism wrap.
    3. **Self-exclusion** — particle ``i`` excluded from its own
       neighbor list (consistent with :func:`neighbor_lists` and the
       IC-5 ``check_neighbor_list_integrity`` contract).

    Equivalence to :func:`neighbor_lists` is verified by
    ``packages/sph-water/tests/test_spatial_hash_equivalence.py`` at
    N ∈ {2, 64, 256} — both functions produce byte-identical
    ``list[list[int]]`` output (the test was originally written
    against the cell-list intermediate hop at 2a48a32; the KDTree
    replacement at R17 routing preserves the byte-equivalence
    invariant verbatim).

    Cutoff semantics: ``query_ball_point(r=R)`` returns points within
    Euclidean distance **<= R**; the diagnostic-tier
    :func:`neighbor_lists` uses ``d2 < cutoff_sq`` (strict less-than).
    For ``r == cutoff`` exactly, the two contracts differ; the cubic-
    spline kernel has ``f(q) = 0`` exactly at ``q == support_factor``
    (compact support), so points at ``r == cutoff`` contribute zero to
    density / density_evolution either way. The sort-and-deduplicate
    wrap below uses ``r2 < cutoff_sq`` to match the diagnostic-tier
    contract bit-for-bit at the boundary.
    """
    p = np.asarray(positions, dtype=np.float64)
    if p.ndim != 2 or p.shape[1] != 3:
        raise ValueError(f"positions must have shape (N, 3); got {p.shape}")
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    if support_factor <= 0.0:
        raise ValueError(
            f"support_factor must be strictly positive; got {support_factor!r}"
        )
    n = p.shape[0]
    if n == 0:
        return []
    # Local import: keep scipy out of the import-time path for
    # consumers that never call canonical-tier (diagnostic-tier
    # gates 5/6/7/8/9/11/12 + 13-anchor do not exercise this function).
    from scipy.spatial import cKDTree

    cutoff = support_factor * h
    cutoff_sq = cutoff * cutoff
    tree = cKDTree(p)
    # query_ball_point with the same r used for both tree-construction
    # query AND the d2<cutoff_sq strict-less-than filter below. scipy's
    # default is r2<=cutoff_sq (inclusive); we re-filter to <cutoff_sq
    # to match neighbor_lists's strict-less-than semantics exactly.
    raw_lists = tree.query_ball_point(p, r=cutoff, workers=1)
    lists: list[list[int]] = []
    for i in range(n):
        candidates = raw_lists[i]
        # Filter to strict-less-than + exclude self; numpy-vectorized.
        if not candidates:
            lists.append([])
            continue
        cand_arr = np.asarray(candidates, dtype=np.int64)
        # Exclude self.
        cand_arr = cand_arr[cand_arr != i]
        if cand_arr.size == 0:
            lists.append([])
            continue
        # Strict-less-than re-filter at the boundary.
        diffs = p[i] - p[cand_arr]
        d2 = np.einsum("ij,ij->i", diffs, diffs)
        kept = cand_arr[d2 < cutoff_sq]
        kept.sort()  # deterministic sort-by-id wrap.
        lists.append([int(j) for j in kept])
    return lists


def pair_lists_from_positions(
    positions: np.ndarray, h: float, *, support_factor: float = 2.0
) -> tuple[np.ndarray, np.ndarray]:
    """Fully-vectorized canonical-tier pair-array builder for canonical scales.

    Returns ``(pair_i, pair_j)`` as int64 ndarrays of shape ``(M,)``, where
    ``M = sum(len(nbr) for nbr in cell_list_neighbor_query(positions, h))``:
    one entry per directed pair (i, j) with ``j ≠ i`` and ``|r_i - r_j| <
    support_factor·h``. Output is sorted by ``pair_i`` ascending; within each
    ``i``-segment, ``pair_j`` is sorted ascending — matching the
    iteration order :func:`density_evolution_vectorized` /
    :func:`density_vectorized` consume directly via the optional
    ``pair_i`` / ``pair_j`` keyword arguments (bypassing the slow
    list-of-lists Python conversion at N=1M scale).

    Algorithm — :meth:`scipy.spatial.cKDTree.query_pairs` (vectorized
    C output of all ``(i, j)`` with ``i < j`` and distance ≤ radius;
    inclusive-radius), then symmetrize + lexsort. No Python loops over
    N; the entire build is C-vectorized end-to-end.

    Boundary semantics: ``query_pairs(r=cutoff)`` is inclusive
    (``d ≤ cutoff``); the diagnostic-tier :func:`neighbor_lists` uses
    ``d² < cutoff²`` (strict less-than). Apply a strict-less-than
    re-filter via vectorized distance recomputation so boundary points
    match the diagnostic-tier contract bit-for-bit (zero-measure for
    random FP positions; the filter is cheap insurance).

    Equivalence with :func:`cell_list_neighbor_query` (and hence with
    :func:`neighbor_lists` at any N where both fit) is verified by the
    spatial-hash-equivalence test suite — the same 6 tests gate both
    representations via the list-of-lists contract; this function
    builds the equivalent (pair_i, pair_j) flat shape that the
    vectorized density / density_evolution paths consume directly.
    """
    p = np.asarray(positions, dtype=np.float64)
    if p.ndim != 2 or p.shape[1] != 3:
        raise ValueError(f"positions must have shape (N, 3); got {p.shape}")
    if h <= 0.0:
        raise ValueError(f"h must be strictly positive; got {h!r}")
    if support_factor <= 0.0:
        raise ValueError(
            f"support_factor must be strictly positive; got {support_factor!r}"
        )
    n = p.shape[0]
    if n == 0:
        return (
            np.zeros(0, dtype=np.int64),
            np.zeros(0, dtype=np.int64),
        )
    from scipy.spatial import cKDTree

    cutoff = support_factor * h
    cutoff_sq = cutoff * cutoff
    tree = cKDTree(p)
    pairs = tree.query_pairs(r=cutoff, output_type="ndarray")  # (M, 2), i<j
    if pairs.size == 0:
        return (
            np.zeros(0, dtype=np.int64),
            np.zeros(0, dtype=np.int64),
        )
    # Strict-less-than re-filter (vectorized): drop pairs exactly at cutoff.
    diffs = p[pairs[:, 0]] - p[pairs[:, 1]]
    d2 = np.einsum("ij,ij->i", diffs, diffs)
    keep = d2 < cutoff_sq
    pairs = pairs[keep]
    if pairs.size == 0:
        return (
            np.zeros(0, dtype=np.int64),
            np.zeros(0, dtype=np.int64),
        )
    # Symmetrize: (i, j) and (j, i) directed pairs.
    pair_i = np.concatenate([pairs[:, 0], pairs[:, 1]]).astype(np.int64, copy=False)
    pair_j = np.concatenate([pairs[:, 1], pairs[:, 0]]).astype(np.int64, copy=False)
    # Sort by (pair_i, pair_j) lexicographically. lexsort sorts by the
    # LAST key first, so primary key = pair_i, secondary = pair_j.
    sort_idx = np.lexsort((pair_j, pair_i))
    return pair_i[sort_idx], pair_j[sort_idx]


def density_evolution_vectorized(
    *,
    positions: np.ndarray,
    velocities: np.ndarray,
    masses: np.ndarray,
    h: float,
    nbr_lists: list[list[int]] | None = None,
    pair_i: np.ndarray | None = None,
    pair_j: np.ndarray | None = None,
) -> np.ndarray:
    """Vectorized SPH continuity using pre-built neighbor lists.

    Pair-iteration order mirrors :func:`density_evolution`: pairs are
    flattened in (i, j) sorted order (i ascending; j ascending within
    each i's neighbor list); per-pair contributions computed
    vectorized; segment-sum via ``np.add.reduceat`` preserves
    sequential left-to-right summation within each particle's
    neighbor list (matches the Python-loop ``+=`` accumulator).

    **FP-equivalence, NOT bit-equivalence** with :func:`density_evolution`:
    the loop variant computes per-pair contributions through a sequence
    of scalar-on-3-vec operations (``np.linalg.norm(r)`` on 1-D,
    ``np.dot(v_rel, grad)`` on 3-elem); the vectorized variant
    broadcasts the same algebra over (M, 3) arrays. Algebraically
    equivalent; FP-wise the two diverge by ≲ ε × ⟨neighbors⟩ per
    particle (typically ≲ 1e-12 at the canonical h × ⟨neighbors⟩ ≈ 50
    regime; bit-equivalence at the per-pair scalar level is sacrificed
    for vectorization efficiency). The two-particle fixture
    (single-pair) IS bit-equivalent (verified by the equivalence test
    ``test_density_evolution_vectorized_matches_loop_at_n2`` — gate-5
    anchor preserved).

    The vectorized variant IS bit-deterministic with ITSELF (run twice
    on the same input = bit-identical output), which is what the
    sub-phase determinism declaration requires for the canonical-tier
    capture's gate-11 ``test_run_twice_epsilon_diff`` (and indeed
    over-achieves epsilon at bit-exact for the canonical-tier path,
    same as the diagnostic-tier path — sub-phase plan § 1.5
    over-achievement note).

    Sized for canonical-tier captures (e.g., 1M particles × 1000 steps)
    where the per-pair work exceeds the inner-loop budget of pure-
    Python iteration; the diagnostic-tier :func:`density_evolution`
    remains the bit-pinning reference for gate-5 + PBT-invariants
    tests at small N.
    """
    n = positions.shape[0]
    if n == 0:
        return np.zeros(0, dtype=np.float64)
    # Two input forms: pre-built (pair_i, pair_j) ndarrays (canonical-tier
    # fast path; bypasses the Python list-of-lists conversion) OR
    # nbr_lists list-of-lists (diagnostic-tier compatibility path).
    if pair_i is None or pair_j is None:
        if nbr_lists is None:
            raise ValueError("must provide either nbr_lists OR both pair_i and pair_j")
        # Flatten (i, j) pairs from sorted nbr_lists (slow Python path).
        pair_i_list: list[int] = []
        pair_j_list: list[int] = []
        for i, nl in enumerate(nbr_lists):
            if not nl:
                continue
            pair_i_list.extend([i] * len(nl))
            pair_j_list.extend(nl)
        if not pair_i_list:
            return np.zeros(n, dtype=np.float64)
        pair_i = np.asarray(pair_i_list, dtype=np.int64)
        pair_j = np.asarray(pair_j_list, dtype=np.int64)
    else:
        pair_i = np.asarray(pair_i, dtype=np.int64)
        pair_j = np.asarray(pair_j, dtype=np.int64)
        if pair_i.size == 0:
            return np.zeros(n, dtype=np.float64)

    # Vectorized per-pair work. Operation ordering MUST mirror the loop
    # :func:`density_evolution` per-pair sequence for bit-equivalence:
    #     r_hat = r / mag           # 3 element-wise divisions
    #     grad  = coeff * r_hat     # 3 element-wise multiplications
    #     dot   = v_rel · grad      # 3 mults + 2 adds, left-to-right
    #     contrib = m_j * dot
    # The natural "scalar (1/mag) precomputed then multiplied through"
    # vectorization is algebraically equivalent but FP-non-equivalent
    # (different rounding pattern per division-then-sum order); we use
    # the loop-matching division pattern instead so cross-tier
    # determinism holds at FP-bit precision.
    r_ij = positions[pair_i] - positions[pair_j]  # (M, 3)
    v_rel = velocities[pair_i] - velocities[pair_j]  # (M, 3)
    mag = np.linalg.norm(r_ij, axis=1)  # (M,)
    q = mag / h
    # Piecewise gradient factor f'(q) (matches :func:`_fprime`).
    fp = np.where(
        q < 1.0,
        -3.0 * q + 2.25 * q * q,
        np.where(q < 2.0, -0.75 * (2.0 - q) ** 2, 0.0),
    )
    # Element-wise division r / |r| (matches grad_W's r/mag).
    # Guard mag = 0 via safe_mag; self-pairs are excluded by neighbor lists,
    # so this branch is only exercised on FP-coincident-position edge cases.
    safe_mag = np.where(mag > 0.0, mag, 1.0)
    r_hat = r_ij / safe_mag[:, None]  # (M, 3) — 3 divisions per pair, broadcasted
    # grad_W = (SIGMA_3D / h^4) * f'(q) * r_hat  (matches grad_W function).
    coeff = (SIGMA_3D / (h**4)) * fp  # (M,)
    grad = coeff[:, None] * r_hat  # (M, 3)
    # contribution = m_j * (v_rel · grad). Sum on axis=1 is sequential
    # left-to-right (matches np.dot's 3-element behavior in the loop).
    v_dot_grad = np.sum(v_rel * grad, axis=1)  # (M,)
    contrib = masses[pair_j] * v_dot_grad  # (M,)

    # Segment-sum per i. pair_i is sorted-non-decreasing by construction.
    unique_i, start_idx = np.unique(pair_i, return_index=True)
    drho_dt = np.zeros(n, dtype=np.float64)
    sums = np.add.reduceat(contrib, start_idx)
    drho_dt[unique_i] = sums
    return drho_dt


def density_vectorized(
    *,
    positions: np.ndarray,
    masses: np.ndarray,
    h: float,
    nbr_lists: list[list[int]] | None = None,
    pair_i: np.ndarray | None = None,
    pair_j: np.ndarray | None = None,
) -> np.ndarray:
    """Vectorized SPH density using pre-built neighbor lists or pair arrays.

    $\\rho_i = \\sum_j m_j W(r_i - r_j, h)$ — same continuum formula as
    :func:`density`, vectorized over neighbor pairs. Includes the
    self-contribution $m_i W(0, h) = m_i \\sigma_3 / h^3$ explicitly
    (consistent with the two-particle golden derivation).

    FP-equivalence with :func:`density` analogous to
    :func:`density_evolution_vectorized` vs :func:`density_evolution`
    (see that docstring). Bit-deterministic with itself.

    Two input forms: pre-built ``(pair_i, pair_j)`` ndarrays
    (canonical-tier fast path; bypasses the Python list-of-lists
    conversion) OR ``nbr_lists`` list-of-lists (diagnostic-tier
    compatibility path). The two are mutually exclusive; the fast
    path is the load-bearing one at canonical scale.

    Used by the canonical-tier capture path
    (:func:`sph_water.sim.sim_runner_seeded`) to compute per-frame
    SPH density at 1M-particle scale without materializing the
    O(N²) pairwise tensor.
    """
    n = positions.shape[0]
    if n == 0:
        return np.zeros(0, dtype=np.float64)
    # Self-contribution per particle.
    W0 = SIGMA_3D / (h * h * h)  # W(q=0, h) = sigma_3 / h^3
    rho = masses * W0

    # Two input forms: (pair_i, pair_j) ndarrays OR nbr_lists list-of-lists.
    if pair_i is None or pair_j is None:
        if nbr_lists is None:
            raise ValueError("must provide either nbr_lists OR both pair_i and pair_j")
        pair_i_list: list[int] = []
        pair_j_list: list[int] = []
        for i, nl in enumerate(nbr_lists):
            if not nl:
                continue
            pair_i_list.extend([i] * len(nl))
            pair_j_list.extend(nl)
        if not pair_i_list:
            return rho
        pair_i = np.asarray(pair_i_list, dtype=np.int64)
        pair_j = np.asarray(pair_j_list, dtype=np.int64)
    else:
        pair_i = np.asarray(pair_i, dtype=np.int64)
        pair_j = np.asarray(pair_j, dtype=np.int64)
        if pair_i.size == 0:
            return rho

    r_ij = positions[pair_i] - positions[pair_j]
    mag = np.linalg.norm(r_ij, axis=1)
    q = mag / h
    # Piecewise f(q) (matches :func:`_f`).
    fq = np.where(
        q < 1.0,
        1.0 - 1.5 * q * q + 0.75 * q * q * q,
        np.where(q < 2.0, 0.25 * (2.0 - q) ** 3, 0.0),
    )
    contrib = masses[pair_j] * (SIGMA_3D / (h * h * h)) * fq

    unique_i, start_idx = np.unique(pair_i, return_index=True)
    sums = np.add.reduceat(contrib, start_idx)
    rho[unique_i] = rho[unique_i] + sums
    return rho


def density(
    *,
    particles: Sequence[dict[str, Any]],
    h: float,
) -> list[float]:
    """SPH density at each particle, $\\rho_i = \\sum_j m_j W(r_i - r_j, h)$.

    Includes the self-contribution at q = 0 (the cubic-spline kernel
    peak value $\\sigma_3 / h^3$); the j == i term is the natural sum
    semantic and is the form pinned in the two-particle golden
    derivation at ``tools/testkit/golden/derivations/dfsph-density-evolution.md``.
    Neighbor iteration order is sorted-ascending-by-id per
    :func:`neighbor_lists` (P24 cause #1 / #2 mitigation).
    """
    positions, _velocities, masses = _particles_to_arrays(particles)
    nbr_lists = neighbor_lists(positions, h)
    rho: list[float] = []
    for i, nl in enumerate(nbr_lists):
        # Self-contribution (q == 0).
        accum = float(masses[i] * W(0.0, h))
        # Neighbors in sorted-id order.
        for j in nl:
            r = positions[i] - positions[j]
            q = float(np.linalg.norm(r) / h)
            accum += float(masses[j] * W(q, h))
        rho.append(accum)
    return rho


def density_evolution(
    *,
    particles: Sequence[dict[str, Any]],
    h: float,
) -> list[float]:
    """SPH continuity equation — $d\\rho_i / dt$ at each particle.

    $d\\rho_i / dt = \\sum_j m_j (v_i - v_j) \\cdot \\nabla_i W(r_i - r_j, h)$
    (Bender & Koschier 2015, eq. (5); Monaghan 2005, § 2.2).

    The self term (j == i) contributes zero gradient at $r = 0$ and is
    skipped implicitly via :func:`neighbor_lists` (which excludes
    self). Neighbor iteration order is sorted-ascending-by-id per
    :func:`neighbor_lists`.
    """
    positions, velocities, masses = _particles_to_arrays(particles)
    nbr_lists = neighbor_lists(positions, h)
    drho_dt: list[float] = []
    for i, nl in enumerate(nbr_lists):
        accum = 0.0
        for j in nl:
            r = positions[i] - positions[j]
            v_rel = velocities[i] - velocities[j]
            grad = grad_W(r, h)
            accum += float(masses[j] * float(np.dot(v_rel, grad)))
        drho_dt.append(accum)
    return drho_dt


def canonical_params() -> dict[str, float]:
    """Canonical DFSPH parameters for the Phase-1-scope dam-break capture.

    Conservative defaults; tunable via Phase-2+ when the Stack-C
    target driver lands. The DFSPH inner-iteration caps (``max_iter``
    + ``tolerance``) are pinned by P24 cause #3 — fixed cap + ``<=``
    tolerance check semantics are the determinism prerequisites for
    the two coupled iterative solvers.
    """
    return {
        "h": 0.05,
        "rho_0": 1000.0,
        "dt": 1e-3,
        "max_iter_density": 50,
        "max_iter_divergence": 50,
        "density_tolerance": 1e-4,
        "divergence_tolerance": 1e-4,
        "g_z": -9.81,
        "viscosity": 0.01,
    }


def divergence_free_solve(
    *,
    particles: Sequence[dict[str, Any]],
    h: float,
    max_iter: int | None = None,
    tolerance: float | None = None,
) -> list[dict[str, Any]]:
    """DFSPH divergence-free velocity correction (Bender & Koschier 2015).

    **Phase-1-scope reference**: implements one inner-iteration cap of
    the divergence-free corrector — iterates until $|d\\rho/dt|_\\max
    \\le$ ``tolerance`` OR ``max_iter`` is exhausted. At each iteration
    the SPH continuity is recomputed and a per-particle pressure-like
    correction is applied to the velocity along the kernel gradient
    direction; convergence is bounded by the cap per P24 cause #3.

    For a divergence-free input (every neighbor pair already satisfies
    $(v_i - v_j) \\cdot \\nabla W = 0$ within tolerance), the function
    returns the input particles unchanged after a single iteration; the
    two-particle gate-5 golden is NOT divergence-free, so this routine
    is exercised at the PBT / diagnostic test scope rather than at
    gate-5.

    Returns the corrected particle list (new list, same per-particle
    dict shape).
    """
    params = canonical_params()
    if max_iter is None:
        max_iter = int(params["max_iter_divergence"])
    if tolerance is None:
        tolerance = float(params["divergence_tolerance"])
    if max_iter < 0:
        raise ValueError(f"max_iter must be non-negative; got {max_iter!r}")
    if tolerance < 0.0:
        raise ValueError(f"tolerance must be non-negative; got {tolerance!r}")

    positions, velocities, masses = _particles_to_arrays(particles)
    n = positions.shape[0]
    if n == 0:
        return []

    # Deterministic iteration: fixed cap + <= tolerance check semantics.
    for _ in range(max_iter):
        # Recompute continuity dρ/dt using current velocities.
        current = [
            {
                "p": positions[i].tolist(),
                "v": velocities[i].tolist(),
                "m": float(masses[i]),
            }
            for i in range(n)
        ]
        drho_dt = density_evolution(particles=current, h=h)
        max_abs = max((abs(x) for x in drho_dt), default=0.0)
        if max_abs <= tolerance:
            break
        # Apply a small symmetric pressure-like correction along the kernel
        # gradient direction (deterministic neighbor-iteration order from
        # :func:`neighbor_lists`).
        nbr_lists = neighbor_lists(positions, h)
        delta_v = np.zeros_like(velocities)
        for i, nl in enumerate(nbr_lists):
            for j in nl:
                if j <= i:
                    continue  # symmetric pair; do not double-count
                r = positions[i] - positions[j]
                grad = grad_W(r, h)
                # Symmetric per-pair correction scaled by current dρ/dt.
                correction = 0.5 * (drho_dt[i] - drho_dt[j])
                delta_v[i] -= correction * grad * (masses[j] / params["rho_0"])
                delta_v[j] += correction * grad * (masses[i] / params["rho_0"])
        velocities = velocities + delta_v

    return [
        {"p": positions[i].tolist(), "v": velocities[i].tolist(), "m": float(masses[i])}
        for i in range(n)
    ]
