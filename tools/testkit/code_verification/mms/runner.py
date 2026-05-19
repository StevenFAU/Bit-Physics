"""MMS runner: sweep spatial resolution, persist results to a fixture HDF5.

This module is intentionally NOT consuming the Block-1 capture format; MMS
output is analysis state (final-time field + grid), not simulation state.
Output is plain HDF5 via `h5py`, layout documented at module scope below.

Fixture layout (`tests/fixtures/heat-1d-results.h5`):
    /resolutions/N=<n>/x        (N,)  float64  -- cell centers
    /resolutions/N=<n>/u_num    (N,)  float64  -- numerical state at t_final
    /resolutions/N=<n>/u_exact  (N,)  float64  -- manufactured u(x, t_final)
    /resolutions/N=<n>          attrs: dx, t_final, dt_used (max), steps
    /                           attrs: L, D, cfl, t_final, solver, schema_version="1"
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Final

import h5py
import numpy as np
from numpy.typing import NDArray

from .solutions.heat_1d.solution import HeatEq1DSolution
from .solvers.heat_1d_ftcs import run_heat_1d_ftcs

SchemeRunner = Callable[
    [
        int,
        float,
        float,
        float,
        float,
        Callable[[NDArray[np.float64]], NDArray[np.float64]],
        Callable[[NDArray[np.float64], float], NDArray[np.float64]],
    ],
    tuple[NDArray[np.float64], NDArray[np.float64], float],
]


DEFAULT_RESOLUTIONS: Final[tuple[int, ...]] = (16, 32, 64, 128)
DEFAULT_CFL: Final[float] = 0.25
DEFAULT_T_FINAL: Final[float] = 0.05


@dataclass(frozen=True)
class PerResolutionResult:
    """Solver output at a single spatial resolution."""

    N: int
    x: NDArray[np.float64]
    u_numerical: NDArray[np.float64]
    u_exact: NDArray[np.float64]
    dx: float
    t_final: float


@dataclass(frozen=True)
class RunnerResult:
    """Aggregate output across a refinement sweep."""

    solution: HeatEq1DSolution
    cfl: float
    t_final: float
    solver_name: str
    per_resolution: tuple[PerResolutionResult, ...]


def run_convergence_study(
    solution: HeatEq1DSolution | None = None,
    resolutions: tuple[int, ...] = DEFAULT_RESOLUTIONS,
    cfl: float = DEFAULT_CFL,
    t_final: float = DEFAULT_T_FINAL,
    scheme: SchemeRunner = run_heat_1d_ftcs,
    scheme_name: str = "heat_1d_ftcs",
) -> RunnerResult:
    """Run the chosen scheme at each resolution; collect numerical + exact fields."""
    soln = solution if solution is not None else HeatEq1DSolution()
    rows: list[PerResolutionResult] = []
    for N in resolutions:
        x, u_num, t_actual = scheme(
            N,
            soln.L,
            soln.D,
            t_final,
            cfl,
            lambda xi: soln.evaluate(xi, 0.0),
            soln.source_term,
        )
        u_exact = soln.evaluate(x, t_actual)
        rows.append(
            PerResolutionResult(
                N=N,
                x=x,
                u_numerical=u_num,
                u_exact=u_exact,
                dx=soln.L / N,
                t_final=t_actual,
            )
        )
    return RunnerResult(
        solution=soln,
        cfl=cfl,
        t_final=t_final,
        solver_name=scheme_name,
        per_resolution=tuple(rows),
    )


def persist_runner_result(result: RunnerResult, out_path: Path) -> Path:
    """Write the runner output to a plain HDF5 fixture (NOT the capture format).

    Layout per module docstring. Existing files are overwritten; the runner is
    idempotent by construction (deterministic NumPy / no RNG).
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with h5py.File(out_path, "w") as f:
        f.attrs["schema_version"] = "1"
        f.attrs["L"] = result.solution.L
        f.attrs["D"] = result.solution.D
        f.attrs["cfl"] = result.cfl
        f.attrs["t_final"] = result.t_final
        f.attrs["solver"] = result.solver_name
        grp_root = f.create_group("resolutions")
        for row in result.per_resolution:
            grp = grp_root.create_group(f"N={row.N}")
            grp.attrs["dx"] = row.dx
            grp.attrs["t_final"] = row.t_final
            grp.create_dataset("x", data=row.x)
            grp.create_dataset("u_num", data=row.u_numerical)
            grp.create_dataset("u_exact", data=row.u_exact)
    return out_path


def main() -> int:
    """CLI: run the default sweep and persist to the canonical fixture path."""
    result = run_convergence_study()
    target = Path(__file__).resolve().parent / "tests" / "fixtures" / "heat-1d-results.h5"
    persist_runner_result(result, target)
    print(f"wrote {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
