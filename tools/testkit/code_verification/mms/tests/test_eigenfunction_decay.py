"""Test (b) -- zero source with eigenfunction IC decays at analytical rate.

For the heat equation with no source and IC sin(2 pi x / L), the exact
solution is sin(k x) * exp(-D k^2 t). On a centered-difference FTCS scheme,
the discrete operator's eigenvalue for the mode k is approximately
4 / dx^2 * sin^2(k dx / 2), which converges to k^2 as dx -> 0. We assert
the numerical decay matches the analytical decay to a few percent at the
highest resolution.
"""

from __future__ import annotations

import numpy as np

from code_verification.mms.solutions.heat_1d.solution import HeatEq1DSolution
from code_verification.mms.solvers.heat_1d_ftcs import run_heat_1d_ftcs


def test_eigenfunction_decays_at_analytical_rate() -> None:
    soln = HeatEq1DSolution(D=1.0, L=1.0)
    N = 256
    t_final = 0.02
    rate = soln.free_decay_rate()  # D * (2 pi / L)^2

    def ic(x: np.ndarray) -> np.ndarray:
        return np.sin(2.0 * np.pi * x / soln.L)

    def zero_source(x: np.ndarray, _t: float) -> np.ndarray:
        return np.zeros_like(x)

    x, u_final, t_actual = run_heat_1d_ftcs(
        N=N,
        L=soln.L,
        D=soln.D,
        t_final=t_final,
        cfl=0.25,
        initial_condition=ic,
        source_fn=zero_source,
    )
    analytical = np.sin(2.0 * np.pi * x / soln.L) * np.exp(-rate * t_actual)
    # FTCS damps the discrete eigenvalue slightly faster than the continuous one;
    # at N=256 with t_final=0.02 the relative L-inf error sits well under 2%.
    rel_err = float(np.max(np.abs(u_final - analytical))) / float(np.max(np.abs(analytical)))
    assert rel_err < 2e-2, f"eigenfunction decay drifted: rel_err={rel_err}"
