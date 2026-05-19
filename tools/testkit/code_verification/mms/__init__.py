"""Method of Manufactured Solutions pipeline (spec § 2.2).

Phase 0 ships the heat-equation-1D pipeline: a smooth manufactured solution,
a symbolic source-term derivation (SymPy), a NumPy FTCS reference solver, a
runner that sweeps spatial resolution, and an analyzer that fits the observed
convergence order against the formal order. A deliberately-broken first-order
spatial solver pins the analyzer's negative case.
"""

from __future__ import annotations

from .analyze import ConvergenceResult, analyze_convergence
from .runner import RunnerResult, run_convergence_study
from .solutions.heat_1d.solution import HeatEq1DSolution

__all__ = [
    "ConvergenceResult",
    "HeatEq1DSolution",
    "RunnerResult",
    "analyze_convergence",
    "run_convergence_study",
]
