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
    "density",
    "density_evolution",
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
