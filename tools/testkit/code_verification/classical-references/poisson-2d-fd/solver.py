"""Classical finite-difference reference for the 2D Poisson equation.

A pure-NumPy/SciPy 5-point-Laplacian solver for ``Δu = f`` on the unit square
``[0,1]²`` with Dirichlet boundary data ``u = g`` on ``∂Ω``. This is a **reusable
code-verification surface** (Phase-3 task-7 ships it; future learned-dynamics sims
consume it) — see ``../README.md`` for the classical-reference pattern.

It is **stack-agnostic** (no Warp / PyTorch / project package imports) and takes
plain callables ``source(x, y)`` and ``boundary(x, y)`` so any caller can supply
its own problem. It is a **high-precision NUMERICAL baseline anchored to the
analytic solution — NOT an independent reference**: it carries its own ``O(h²)``
discretization error (5-point Laplacian truncation), which is exactly what the
``observed_convergence_orders`` check measures.

Discretization (nodes ``0..n-1`` per axis, spacing ``h = 1/(n-1)``): the interior
unknowns ``u[i,j]`` (``1 ≤ i,j ≤ n-2``) satisfy

    (u[i-1,j] + u[i+1,j] + u[i,j-1] + u[i,j+1] - 4 u[i,j]) / h² = f[i,j],

assembled as the sparse 2D Laplacian ``L = kron(I, T) + kron(T, I)`` (``T`` the
tridiagonal ``[1, -2, 1]``), with known boundary values moved to the RHS, and
solved by ``scipy.sparse.linalg.spsolve``.
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np
import scipy.sparse as sp
from scipy.sparse.linalg import spsolve

ScalarField = Callable[[np.ndarray, np.ndarray], np.ndarray]


def solve_poisson_2d(source: ScalarField, boundary: ScalarField, n: int) -> np.ndarray:
    """Solve ``Δu = f`` on an ``nxn`` grid over ``[0,1]²`` with Dirichlet BC.

    Args:
        source:   ``f(x, y)`` evaluated on a meshgrid (numpy-vectorized).
        boundary: ``g(x, y)`` — the Dirichlet datum; only its values on ``∂Ω`` are
                  used (boundary nodes are pinned to ``g``).
        n:        grid side length (``n ≥ 3``); spacing ``h = 1/(n-1)``.

    Returns:
        The ``(n, n)`` solution array (boundary nodes hold ``g``; interior nodes
        the FD solution), indexed ``[i, j]`` with ``i`` the x-axis.
    """
    if n < 3:
        raise ValueError(f"n must be >= 3 (need at least one interior node); got {n}")
    axis = np.linspace(0.0, 1.0, n)
    h = 1.0 / (n - 1)
    gx, gy = np.meshgrid(axis, axis, indexing="ij")

    grid = boundary(gx, gy).astype(np.float64, copy=True)  # boundary pinned; interior overwritten
    f_interior = source(gx, gy)[1:-1, 1:-1].astype(np.float64, copy=True)

    m = n - 2
    tri = sp.diags([1.0, -2.0, 1.0], [-1, 0, 1], shape=(m, m))
    ident = sp.identity(m)
    laplacian = (sp.kron(ident, tri) + sp.kron(tri, ident)).tocsr()

    rhs = h * h * f_interior
    rhs[0, :] -= grid[0, 1:-1]  # x=0 boundary neighbours
    rhs[-1, :] -= grid[-1, 1:-1]  # x=1
    rhs[:, 0] -= grid[1:-1, 0]  # y=0
    rhs[:, -1] -= grid[1:-1, -1]  # y=1

    interior = spsolve(laplacian, rhs.reshape(-1)).reshape(m, m)
    grid[1:-1, 1:-1] = interior
    return grid


def discrete_relative_l2(approx: np.ndarray, exact: np.ndarray) -> float:
    """Relative discrete-L2 error ``||approx - exact|| / ||exact||``."""
    return float(np.linalg.norm(approx - exact) / np.linalg.norm(exact))


def observed_convergence_orders(
    u_exact: ScalarField, source: ScalarField, boundary: ScalarField, ns: list[int]
) -> list[float]:
    """Observed FD convergence orders across the grid sequence ``ns``.

    For each ``n`` the solver's discrete-L2 error against ``u_exact`` is measured;
    the order between successive grids is ``log(e_coarse / e_fine) / log(h_coarse /
    h_fine)``. For the 5-point Laplacian this tends to **2** (``O(h²)``) as
    ``h -> 0``. A genuine solver bug breaks the *order*, not just a tolerance — so
    this is the rigor substitute for the (deferred) FD-reference mutation target.
    """
    errors: list[float] = []
    spacings: list[float] = []
    for n in ns:
        axis = np.linspace(0.0, 1.0, n)
        gx, gy = np.meshgrid(axis, axis, indexing="ij")
        approx = solve_poisson_2d(source, boundary, n)
        errors.append(discrete_relative_l2(approx, u_exact(gx, gy)))
        spacings.append(1.0 / (n - 1))
    return [
        float(np.log(errors[i] / errors[i + 1]) / np.log(spacings[i] / spacings[i + 1]))
        for i in range(len(errors) - 1)
    ]
