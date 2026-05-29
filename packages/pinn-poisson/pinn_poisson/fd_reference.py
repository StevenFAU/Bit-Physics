"""Adapter onto the reusable classical finite-difference Poisson reference.

The 5-point-Laplacian FD solver lives in the **testkit** at
``tools/testkit/code_verification/classical-references/poisson-2d-fd/solver.py``
(a reusable code-verification surface future learned-dynamics sims also consume).
Because that directory is hyphenated (not an importable module name), it is
**path-loaded** (the tier-3 diagnostics precedent).

Stage 1a: shell — the testkit solver does not exist yet (it is a Stage 1b-FD
deliverable), so these raise ``NotImplementedError``. Stage 1b-FD creates the
solver and wires the body to path-load + delegate to it.
"""

from __future__ import annotations

import numpy as np

from .problems import PoissonProblem


def fd_solve(problem: PoissonProblem, n: int) -> np.ndarray:
    """Solve ``Du = f`` on an ``nxn`` interior grid (Dirichlet ``g`` from ``problem``).

    Returns the FD solution sampled on the ``nxn`` interior nodes.
    """
    raise NotImplementedError(
        "Stage 1b-FD: path-load tools/testkit/code_verification/classical-references/"
        "poisson-2d-fd/solver.py and delegate to solve_poisson_2d(problem, n)."
    )


def fd_convergence_orders(problem: PoissonProblem, ns: list[int]) -> list[float]:
    """Observed FD convergence orders across grid refinements ``ns`` (expect ≈ 2).

    For the MMS anchor the discrete-L2 error vs the analytic solution should
    decrease as ``O(h^2)`` (standard 5-point Laplacian truncation), giving an
    observed order ``log2(e_coarse / e_fine) ≈ 2`` between successive halvings.
    """
    raise NotImplementedError(
        "Stage 1b-FD: compute discrete-L2 errors vs problem.u_exact across ns and "
        "return successive log2 error ratios."
    )
