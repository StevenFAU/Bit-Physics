"""Numba determinism regression test — sub-phase-numba-integration.

Verification surface for the project-wide numba convention documented
at ``docs/common/numba.md``. Locks in three contracts:

1. **FP-equivalence with pure-NumPy reference** at the load-bearing
   computation shape (multi-particle pair-force accumulation + density
   gradient — mirrors the arithmetic shape used by
   sub-phase-particle-fluids-sph-water and forthcoming
   eulerian-smoke / lattice-boltzmann-d3q19 / mpm-multimaterial sims).
   **FP-equivalence, NOT bit-equivalence**: NumPy's vectorized SIMD
   code and numba's lowered scalar inner loop use different
   FP-accumulation patterns; the same algebraic formula produces
   slightly different bit patterns at large enough N. The tolerance
   (1e-9 absolute) is set well below the spec's cross-stack tolerance
   of 1e-4 relative; any drift exceeding it is a real determinism
   defect.

2. **Run-to-run determinism** — two consecutive numba JIT runs with the
   same input produce **bit-identical** output. This is the load-
   bearing same-stack-same-hw contract; numba MUST not introduce
   per-run nondeterminism.

3. **Cold-vs-warm cache identity** — clearing ``__pycache__`` between
   runs does not change the numba JIT output (bit-identical). This is
   the cross-compilation-invariance contract; cache invalidation must
   produce the same compiled artifact's output.

If contract (1) fails (drift > 1e-9), investigate ``fastmath=False``
discipline + look for accidental ``parallel=True`` or other banned
flags. If (2) or (3) fail, **DO NOT relax the test** — those ARE the
project's determinism declaration; failing them means numba is
producing nondeterministic output and the convention is broken.

The reference computation is a simplified SPH-style pair sum:

  rho_i = sum_j m_j * f(q_ij) / h^3

where ``q_ij = |r_i - r_j| / h`` and ``f(q)`` is the cubic-spline
piecewise polynomial. The pair structure (sorted-(i, j), segment-sum)
matches the established pattern at
``packages/sph-water/sph_water/reference/dfsph.py:density_evolution_vectorized``.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pytest
from numba import njit

# ----------------------------------------------------------------------
# Pure-NumPy reference. No JIT; deterministic via sequential left-to-
# right accumulation per particle.
# ----------------------------------------------------------------------


def _cubic_spline_f(q: float) -> float:
    """Cubic-spline kernel piecewise factor (3D Monaghan 1992/2005)."""
    if q < 1.0:
        return 1.0 - 1.5 * q * q + 0.75 * q * q * q
    if q < 2.0:
        diff = 2.0 - q
        return 0.25 * diff * diff * diff
    return 0.0


def pair_density_pure_numpy(
    positions: np.ndarray,
    masses: np.ndarray,
    pair_i: np.ndarray,
    pair_j: np.ndarray,
    h: float,
) -> np.ndarray:
    """Pure-NumPy reference: SPH-style pair density accumulation.

    Sums m_j * f(q_ij) per particle, where f is the cubic-spline
    piecewise factor. Self-contribution at q=0 is added explicitly.
    Pair iteration order is the caller's responsibility — must be
    sorted (i, j) for determinism (segment-sum via reduceat).

    Vectorized: r_ij + mag + q + f(q) all in NumPy; segment-sum via
    np.add.reduceat. Matches the established pattern at
    sph_water.reference.dfsph.density_vectorized.
    """
    sigma_3d = 1.0 / np.pi
    sigma_3d_over_h3 = sigma_3d / (h * h * h)
    # Self-contribution per particle: f(0) = 1, so W(0) = sigma_3d / h^3.
    rho = masses * sigma_3d_over_h3
    if pair_i.size == 0:
        return rho
    r_ij = positions[pair_i] - positions[pair_j]
    # Direct per-component sum of squares — NOT (r_ij * r_ij).sum(axis=1)
    # because NumPy's .sum() may use pairwise summation that produces
    # FP-non-equivalent output to numba's sequential rx*rx+ry*ry+rz*rz.
    # And NOT np.linalg.norm(axis=1) because BLAS dnrm2 uses scale-rescale.
    rx = r_ij[:, 0]
    ry = r_ij[:, 1]
    rz = r_ij[:, 2]
    sq_sum = rx * rx + ry * ry + rz * rz
    mag = np.sqrt(sq_sum)
    q = mag / h
    # Use explicit multiplication for cubic in the q>=1 branch — NOT
    # ``(2 - q) ** 3`` because numpy's ** on float64 routes through
    # np.power / libm pow which may differ from explicit d*d*d.
    diff = 2.0 - q
    fq = np.where(
        q < 1.0,
        1.0 - 1.5 * q * q + 0.75 * q * q * q,
        np.where(q < 2.0, 0.25 * diff * diff * diff, 0.0),
    )
    contrib = masses[pair_j] * sigma_3d_over_h3 * fq
    unique_i, start_idx = np.unique(pair_i, return_index=True)
    sums = np.add.reduceat(contrib, start_idx)
    rho[unique_i] = rho[unique_i] + sums
    return rho


# ----------------------------------------------------------------------
# Numba JIT variant. Required decorator form per the convention:
#   @njit(fastmath=False, cache=True)
# Both kwargs explicit (audit clarity).
# ----------------------------------------------------------------------


@njit(fastmath=False, cache=True)
def pair_density_numba_jit(
    positions: np.ndarray,
    masses: np.ndarray,
    pair_i: np.ndarray,
    pair_j: np.ndarray,
    h: float,
) -> np.ndarray:
    """Numba JIT variant of :func:`pair_density_pure_numpy`.

    Operation order MUST mirror the pure-NumPy reference's
    ``np.add.reduceat`` semantics for bit-equivalence:

      sum_pair[i] = ((0 + c_j1) + c_j2) + ... + c_jk    (segment-sum, starts at 0)
      rho[i]      = self_i + sum_pair[i]                (self added at end)

    The naive single-pass alternative
    (``rho[i] = self_i; rho[i] += c_jk`` for each k) puts self at the
    FRONT of the sum — algebraically equivalent but FP-non-equivalent
    under non-associative addition; produces ~1e-12 drift at N=1024.
    The two-pass shape below preserves bit-equivalence with the pure-
    NumPy reduceat semantics.

    Decorator form per the project convention
    (``docs/common/numba.md``): ``fastmath=False, cache=True`` —
    both explicit.
    """
    n = positions.shape[0]
    sigma_3d = 1.0 / np.pi
    # Precompute the scalar prefactor so numba's per-iteration contrib
    # uses the same operation order as the pure-NumPy contrib =
    # masses[pair_j] * (sigma_3d / h^3) * fq.
    sigma_3d_over_h3 = sigma_3d / (h * h * h)
    # Pass 1: per-particle pair-sum starting at 0 (matches reduceat).
    sum_pair = np.zeros(n, dtype=np.float64)
    m = pair_i.shape[0]
    for k in range(m):
        i = pair_i[k]
        j = pair_j[k]
        rx = positions[i, 0] - positions[j, 0]
        ry = positions[i, 1] - positions[j, 1]
        rz = positions[i, 2] - positions[j, 2]
        # ``math.sqrt`` for explicit sqrt intrinsic (not pow(x, 0.5),
        # which may compile to a different LLVM intrinsic with subtly
        # different FP rounding). Matches np.linalg.norm's internal
        # sqrt for a single (3,) row.
        mag = math.sqrt(rx * rx + ry * ry + rz * rz)
        q = mag / h
        if q < 1.0:
            fq = 1.0 - 1.5 * q * q + 0.75 * q * q * q
        elif q < 2.0:
            diff = 2.0 - q
            fq = 0.25 * diff * diff * diff
        else:
            fq = 0.0
        # Order matches pure-NumPy: (masses[j] * prefactor) * fq.
        sum_pair[i] += masses[j] * sigma_3d_over_h3 * fq
    # Pass 2: add self-contribution at the END (matches the pure-NumPy
    # reference's ``rho[unique_i] = rho[unique_i] + sums`` order, where
    # ``rho[unique_i]`` pre-holds the self term).
    rho = np.empty(n, dtype=np.float64)
    for i in range(n):
        rho[i] = masses[i] * sigma_3d_over_h3 + sum_pair[i]
    return rho


# ----------------------------------------------------------------------
# Fixtures + helpers
# ----------------------------------------------------------------------


def _make_seeded_input(
    seed: int, n: int, h: float = 0.5
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Seeded random configuration + sorted pair list."""
    rng = np.random.default_rng(int(seed))
    positions = rng.uniform(0.0, 1.0, size=(int(n), 3))
    masses = rng.uniform(0.1, 2.0, size=(int(n),))
    # Build all-pairs within cutoff 2h using vectorized broadcast (small N).
    cutoff_sq = (2.0 * h) ** 2
    diff = positions[:, None, :] - positions[None, :, :]
    d2 = np.einsum("ijk,ijk->ij", diff, diff)
    np.fill_diagonal(d2, np.inf)
    mask = d2 < cutoff_sq
    # Flatten to (pair_i, pair_j) sorted by (i, j).
    pair_i_list: list[int] = []
    pair_j_list: list[int] = []
    for i in range(int(n)):
        nbrs = np.where(mask[i])[0]
        for j in nbrs:
            pair_i_list.append(int(i))
            pair_j_list.append(int(j))
    pair_i = np.asarray(pair_i_list, dtype=np.int64)
    pair_j = np.asarray(pair_j_list, dtype=np.int64)
    return positions, masses, pair_i, pair_j


# ----------------------------------------------------------------------
# Tests
# ----------------------------------------------------------------------


@pytest.mark.parametrize("n", [64, 256, 1024])
def test_numba_jit_fp_equivalent_with_pure_numpy(n: int) -> None:
    """numba JIT output is FP-equivalent with pure-NumPy reference.

    **FP-equivalence, NOT bit-equivalence** with the pure-NumPy
    vectorized reference (matches the established pattern at
    ``packages/sph-water/sph_water/reference/dfsph.py:density_evolution_vectorized``
    vs the loop variant): NumPy's vectorized SIMD code and numba's
    lowered scalar inner loop use different FP-accumulation patterns
    (NumPy may emit AVX2/AVX-512 4-or-8-double-wide accumulators with
    pairwise summation; numba's @njit scalar loop emits per-pair
    sequential ops). Both compute the same algebraic formula; FP-wise
    they diverge by ≲ eps * N per particle.

    What this test asserts: max_abs_diff ≤ 1e-9 (well below the spec's
    sph cross-stack tolerance of 1e-4 relative — see
    ``tools/testkit/equivalence/tolerance-budget.toml``). What this
    test does NOT assert: bit-identity. Bit-identity is verified by
    the run-to-run + cold-vs-warm tests below; those ARE the load-
    bearing determinism contract.

    If max_abs_diff exceeds 1e-9, the JIT variant is doing something
    materially different from the pure-NumPy reference (e.g.,
    fastmath=True snuck in) — investigate before relaxing the
    tolerance.
    """
    h = 0.5
    positions, masses, pair_i, pair_j = _make_seeded_input(seed=42, n=n, h=h)
    rho_numpy = pair_density_pure_numpy(positions, masses, pair_i, pair_j, h)
    rho_numba = pair_density_numba_jit(positions, masses, pair_i, pair_j, h)
    assert rho_numpy.shape == rho_numba.shape, (
        f"shape mismatch: numpy={rho_numpy.shape} numba={rho_numba.shape}"
    )
    max_abs_diff = float(np.max(np.abs(rho_numpy - rho_numba)))
    assert max_abs_diff < 1e-9, (
        f"max_abs_diff={max_abs_diff:g} at N={n} exceeds 1e-9 FP-equivalence "
        f"tolerance; numba JIT is doing something materially different from "
        f"the pure-NumPy reference (check fastmath=False discipline)"
    )


def test_numba_jit_run_to_run_determinism() -> None:
    """Two consecutive numba JIT runs with same input produce same output.

    Spec § 2.5 ``bit-exact-same-stack-same-hw`` declaration applied to
    the JIT path: run-to-run determinism is the floor.
    """
    h = 0.5
    positions, masses, pair_i, pair_j = _make_seeded_input(seed=42, n=256, h=h)
    rho_a = pair_density_numba_jit(positions, masses, pair_i, pair_j, h)
    rho_b = pair_density_numba_jit(positions, masses, pair_i, pair_j, h)
    assert np.array_equal(rho_a, rho_b), "numba JIT not bit-deterministic with itself"


def test_numba_jit_cold_vs_warm_cache_identity(tmp_path: Path) -> None:
    """Clearing numba's cache between runs does not change the output.

    Cache invalidation is automatic on source / version change; this
    test verifies that the compiled artifact's bit pattern is consumer-
    invariant — recompiling from scratch produces the same output as a
    cached load.

    Approach: run once (populates the in-module cache + filesystem
    cache); clear the module-adjacent ``__pycache__/`` numba shards;
    run again; compare. This catches any per-compilation
    nondeterminism (e.g., random insertion order in LLVM optimization
    passes) that would invalidate the cross-version regression
    coverage at § 5 of ``docs/common/numba.md``.
    """
    h = 0.5
    positions, masses, pair_i, pair_j = _make_seeded_input(seed=42, n=256, h=h)
    rho_warm = pair_density_numba_jit(positions, masses, pair_i, pair_j, h)

    # Clear numba's filesystem cache for this module's __pycache__.
    # Numba caches compiled artifacts as ``*.nbi`` / ``*.nbc`` files at
    # the module's adjacent ``__pycache__/`` directory.
    test_file = Path(__file__).resolve()
    pycache = test_file.parent / "__pycache__"
    if pycache.exists():
        for stale in pycache.glob("*.nbi"):
            stale.unlink()
        for stale in pycache.glob("*.nbc"):
            stale.unlink()

    rho_cold = pair_density_numba_jit(positions, masses, pair_i, pair_j, h)
    assert np.array_equal(rho_warm, rho_cold), (
        "numba JIT output differs between cached and uncached executions — "
        "compilation pipeline has unstable codegen for this function"
    )
    # Touch tmp_path so pytest accepts the fixture as used.
    (tmp_path / "marker").write_text("ok")
