"""Adapter onto the reusable classical finite-difference Poisson reference.

The 5-point-Laplacian FD solver lives in the **testkit** at
``tools/testkit/code_verification/classical-references/poisson-2d-fd/solver.py``
(a reusable code-verification surface future learned-dynamics sims also consume).
Because that directory is hyphenated (not an importable module name), it is
**path-loaded** (the tier-3 diagnostics precedent).

This module adapts a :class:`~pinn_poisson.problems.PoissonProblem` (whose
``source``/``boundary_value`` are backend-generic) into the plain NumPy callables
the stack-agnostic solver expects.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

import numpy as np

from .problems import PoissonProblem

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SOLVER_PATH = (
    _REPO_ROOT
    / "tools"
    / "testkit"
    / "code_verification"
    / "classical-references"
    / "poisson-2d-fd"
    / "solver.py"
)


def _load_solver() -> Any:
    """Path-load the hyphenated-directory FD solver module (tier-3 precedent)."""
    spec = importlib.util.spec_from_file_location("poisson_2d_fd_solver", _SOLVER_PATH)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise ImportError(f"cannot load FD solver from {_SOLVER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fd_solve(problem: PoissonProblem, n: int) -> np.ndarray:
    """Solve ``Δu = f`` on an ``nxn`` grid (Dirichlet ``g`` from ``problem``)."""
    solver = _load_solver()

    def source(x: np.ndarray, y: np.ndarray) -> np.ndarray:
        return np.asarray(problem.source(x, y, np))

    def boundary(x: np.ndarray, y: np.ndarray) -> np.ndarray:
        return np.asarray(problem.boundary_value(x, y, np))

    return np.asarray(solver.solve_poisson_2d(source, boundary, n))


def fd_convergence_orders(problem: PoissonProblem, ns: list[int]) -> list[float]:
    """Observed FD convergence orders across grid refinements ``ns`` (expect ≈ 2)."""
    solver = _load_solver()

    def u_exact(x: np.ndarray, y: np.ndarray) -> np.ndarray:
        return np.asarray(problem.u_exact(x, y, np))

    def source(x: np.ndarray, y: np.ndarray) -> np.ndarray:
        return np.asarray(problem.source(x, y, np))

    def boundary(x: np.ndarray, y: np.ndarray) -> np.ndarray:
        return np.asarray(problem.boundary_value(x, y, np))

    return list(solver.observed_convergence_orders(u_exact, source, boundary, ns))
