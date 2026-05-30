"""Constraining tests for the MMS analyzer / derivation / solver internals.

These tests pin the *exact numerical contract* of:

* ``analyze._l2_norm_periodic`` -- the discrete L2 norm formula
  (``sqrt(sum(err^2) * dx)``), including the multiply-by-dx weight and the
  squaring exponent.
* ``analyze._fit_observed_order`` -- the log-log least-squares slope, fed
  analytically-constructed error sequences whose order is known in closed
  form (halving / quartering / eighths), plus the positive-error mask and
  the "need >= 2 points" guard.
* ``analyze.analyze_convergence`` -- the formal-order default fallback and
  the synthetic RunnerResult plumbing.
* ``ConvergenceResult.passes`` -- the ``abs(observed - formal) <= tol``
  decision exactly at the band edges (just-inside / just-outside).
* ``derive.derive_heat_1d`` -- the manufactured source equals the
  independently-recomputed PDE residual ``u_t - D u_xx`` at sampled
  numeric points (not just a symbolic restatement).
* ``solvers.heat_1d_ftcs`` -- the centered-Laplacian step reproduces a
  known analytic increment; the cell-centered grid offset; the CFL guard.
* ``solvers.heat_1d_broken`` -- the broken solver is genuinely first-order
  and is rejected by the analyzer (the falsifiable meta-test).

Each assertion is written so that mutating a constant, comparison, sign,
exponent, or formula in the source flips it to a failure.
"""

from __future__ import annotations

import numpy as np
import pytest
import sympy as sp

from code_verification.mms.analyze import (
    DEFAULT_ORDER_TOLERANCE,
    ConvergenceResult,
    PerResolutionError,
    _fit_observed_order,
    _l2_norm_periodic,
    analyze_convergence,
)
from code_verification.mms.derive import derive_heat_1d
from code_verification.mms.runner import (
    PerResolutionResult,
    RunnerResult,
    run_convergence_study,
)
from code_verification.mms.solutions.heat_1d.solution import HeatEq1DSolution
from code_verification.mms.solvers.heat_1d_broken import (
    broken_first_order_step,
    run_heat_1d_broken,
)
from code_verification.mms.solvers.heat_1d_ftcs import ftcs_step, run_heat_1d_ftcs


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _synthetic_result(
    l2_errors: dict[int, float],
    *,
    L: float = 1.0,
    linf_errors: dict[int, float] | None = None,
) -> RunnerResult:
    """Build a RunnerResult whose per-resolution L2 errors are *exactly* given.

    The discrete L2 norm is ``sqrt(sum(diff^2) * dx)``.  Choosing a constant
    per-cell diff ``v`` over ``N`` cells gives ``l2 = v * sqrt(N * dx) =
    v * sqrt(L)``, so ``v = l2 / sqrt(L)`` reproduces the target L2 error
    *exactly* through the real analyzer code path.  The L-inf error then
    equals ``|v|``; pass ``linf_errors`` only when a separate L-inf target
    is needed.
    """
    rows: list[PerResolutionResult] = []
    for N in sorted(l2_errors):
        dx = L / N
        v = l2_errors[N] / np.sqrt(L)
        diff = np.full(N, v, dtype=np.float64)
        if linf_errors is not None:
            # place the L-inf target in a single cell, keep L2 dominated by it
            diff = np.zeros(N, dtype=np.float64)
            diff[0] = linf_errors[N]
        rows.append(
            PerResolutionResult(
                N=N,
                x=np.zeros(N, dtype=np.float64),
                u_numerical=diff,
                u_exact=np.zeros(N, dtype=np.float64),
                dx=dx,
                t_final=0.0,
            )
        )
    return RunnerResult(
        solution=HeatEq1DSolution(L=L),
        cfl=0.25,
        t_final=0.0,
        solver_name="synthetic",
        per_resolution=tuple(rows),
    )


# --------------------------------------------------------------------------- #
# _l2_norm_periodic -- the discrete L2 formula
# --------------------------------------------------------------------------- #
def test_l2_norm_formula_exact_value() -> None:
    """sqrt(sum(err^2) * dx); pins the *dx weight and the square exponent."""
    err = np.array([3.0, 4.0], dtype=np.float64)
    dx = 2.0
    # sqrt((9 + 16) * 2) = sqrt(50)
    assert _l2_norm_periodic(err, dx) == pytest.approx(np.sqrt(50.0), rel=0, abs=1e-15)


def test_l2_norm_scales_with_sqrt_dx() -> None:
    """Doubling dx multiplies the norm by sqrt(2) -- kills dropping/altering *dx."""
    err = np.array([1.0, 1.0, 1.0, 1.0], dtype=np.float64)
    base = _l2_norm_periodic(err, 1.0)
    doubled = _l2_norm_periodic(err, 2.0)
    assert doubled == pytest.approx(base * np.sqrt(2.0), rel=1e-12)
    # sum(1)=4, dx=1 -> sqrt(4)=2 ; kills replacing err*err with err+err etc.
    assert base == pytest.approx(2.0, rel=1e-12)


def test_l2_norm_uses_square_not_abs() -> None:
    """A single large entry dominates quadratically, not linearly."""
    err = np.array([0.0, 10.0, 0.0], dtype=np.float64)
    # sqrt(100 * dx) with dx=1 -> 10 (square then sqrt of 100), not |10|*something odd
    assert _l2_norm_periodic(err, 1.0) == pytest.approx(10.0, rel=1e-12)


# --------------------------------------------------------------------------- #
# _fit_observed_order -- log-log slope, mask, and guard
# --------------------------------------------------------------------------- #
def test_fit_order_two_when_error_quarters() -> None:
    """err = C dx^2 -> slope 2 to machine precision (pins polyfit degree/sign)."""
    dxs = np.array([1 / 16, 1 / 32, 1 / 64, 1 / 128], dtype=np.float64)
    errs = 0.7 * dxs**2
    assert _fit_observed_order(dxs, errs) == pytest.approx(2.0, abs=1e-9)


def test_fit_order_one_when_error_halves() -> None:
    """err = C dx^1 -> slope 1 (a degree change or sign flip breaks this)."""
    dxs = np.array([1 / 16, 1 / 32, 1 / 64, 1 / 128], dtype=np.float64)
    errs = 0.3 * dxs**1
    assert _fit_observed_order(dxs, errs) == pytest.approx(1.0, abs=1e-9)


def test_fit_order_three_when_error_eighths() -> None:
    """err = C dx^3 -> slope 3 (distinguishes the slope from a hardcoded const)."""
    dxs = np.array([1 / 16, 1 / 32, 1 / 64, 1 / 128], dtype=np.float64)
    errs = 1.3 * dxs**3
    assert _fit_observed_order(dxs, errs) == pytest.approx(3.0, abs=1e-9)


def test_fit_order_is_positive_for_converging_sequence() -> None:
    """Slope sign: dx<1 shrinking with err -> positive order (kills sign flip)."""
    dxs = np.array([0.5, 0.25, 0.125], dtype=np.float64)
    errs = np.array([0.25, 0.0625, 0.015625], dtype=np.float64)  # dx^2
    assert _fit_observed_order(dxs, errs) > 0.0


def test_fit_order_filters_nonpositive_errors() -> None:
    """A zero error is dropped by the `errs > 0` mask; the rest still fit dx^2."""
    dxs = np.array([1 / 16, 1 / 32, 1 / 64, 1 / 128], dtype=np.float64)
    errs = np.array([0.0, 0.7 * (1 / 32) ** 2, 0.7 * (1 / 64) ** 2, 0.7 * (1 / 128) ** 2])
    assert _fit_observed_order(dxs, errs) == pytest.approx(2.0, abs=1e-9)


def test_fit_order_two_positive_points_is_enough() -> None:
    """Boundary of the `< 2` guard: exactly two positive points must fit, not raise."""
    dxs = np.array([0.5, 0.25, 0.125], dtype=np.float64)
    errs = np.array([0.25, 0.0, 0.015625], dtype=np.float64)  # only two positive
    # remaining points (dx 0.5 err 0.25) and (dx 0.125 err 0.015625): slope log..
    slope = _fit_observed_order(dxs, errs)
    expected = (np.log(0.015625) - np.log(0.25)) / (np.log(0.125) - np.log(0.5))
    assert slope == pytest.approx(float(expected), rel=1e-12)


def test_fit_order_raises_with_fewer_than_two_points() -> None:
    """One positive error -> ValueError (pins the `< 2` threshold, not `< 1`)."""
    dxs = np.array([0.5, 0.25, 0.125], dtype=np.float64)
    errs = np.array([0.0, 0.0, 0.015625], dtype=np.float64)
    with pytest.raises(ValueError):
        _fit_observed_order(dxs, errs)


# --------------------------------------------------------------------------- #
# analyze_convergence -- plumbing + formal-order default
# --------------------------------------------------------------------------- #
def test_analyze_convergence_recovers_known_l2_order() -> None:
    """End-to-end through the real PerResolutionError path: exact dx^2 -> order 2."""
    L = 1.0
    l2 = {N: 0.5 * (L / N) ** 2 for N in (16, 32, 64, 128)}
    result = _synthetic_result(l2, L=L)
    conv = analyze_convergence(result, formal_order=2.0)
    assert conv.observed_order_l2 == pytest.approx(2.0, abs=1e-6)
    # per-resolution L2 errors are reproduced (kills l2_error formula mutants)
    by_n = {r.N: r.l2_error for r in conv.per_resolution}
    for N, want in l2.items():
        assert by_n[N] == pytest.approx(want, rel=1e-9)


def test_analyze_convergence_defaults_formal_order_to_solution() -> None:
    """formal_order=None must fall back to solution.formal_spatial_order (==2)."""
    l2 = {N: 0.5 * (1.0 / N) ** 2 for N in (16, 32, 64, 128)}
    result = _synthetic_result(l2)
    conv = analyze_convergence(result)  # no formal_order passed
    assert conv.formal_order == 2.0


def test_analyze_convergence_default_tolerance_constant() -> None:
    """The module default tolerance is exactly 0.5 and is threaded through."""
    assert DEFAULT_ORDER_TOLERANCE == 0.5
    l2 = {N: 0.5 * (1.0 / N) ** 2 for N in (16, 32, 64, 128)}
    conv = analyze_convergence(_synthetic_result(l2))
    assert conv.order_tolerance == 0.5


# --------------------------------------------------------------------------- #
# ConvergenceResult.passes -- decision at the band edges
# --------------------------------------------------------------------------- #
def _result_with_order(observed: float, formal: float, tol: float) -> ConvergenceResult:
    return ConvergenceResult(
        per_resolution=(PerResolutionError(N=16, dx=1 / 16, l2_error=1.0, linf_error=1.0),),
        formal_order=formal,
        observed_order_l2=observed,
        observed_order_linf=observed,
        order_tolerance=tol,
    )


def test_passes_true_just_inside_lower_edge() -> None:
    """observed = formal - tol + eps -> inside band -> passes."""
    r = _result_with_order(observed=1.5 + 1e-9, formal=2.0, tol=0.5)
    assert r.passes is True


def test_passes_true_exactly_on_edge() -> None:
    """abs(diff) == tol must PASS (<= comparison, not <)."""
    r = _result_with_order(observed=1.5, formal=2.0, tol=0.5)
    assert r.passes is True
    r_hi = _result_with_order(observed=2.5, formal=2.0, tol=0.5)
    assert r_hi.passes is True


def test_passes_false_just_outside_lower_edge() -> None:
    """observed = formal - tol - eps -> outside band -> fails."""
    r = _result_with_order(observed=1.5 - 1e-9, formal=2.0, tol=0.5)
    assert r.passes is False


def test_passes_false_just_outside_upper_edge() -> None:
    """Uses abs(): too-high an order also fails (kills dropping abs())."""
    r = _result_with_order(observed=2.5 + 1e-9, formal=2.0, tol=0.5)
    assert r.passes is False


def test_passes_uses_l2_not_linf() -> None:
    """Decision keys on observed_order_l2 (linf set far off must not save it)."""
    r = ConvergenceResult(
        per_resolution=(PerResolutionError(N=16, dx=1 / 16, l2_error=1.0, linf_error=1.0),),
        formal_order=2.0,
        observed_order_l2=0.5,  # far outside band
        observed_order_linf=2.0,  # exactly on formal
        order_tolerance=0.5,
    )
    assert r.passes is False


# --------------------------------------------------------------------------- #
# derive.py -- source == independently recomputed residual at numeric points
# --------------------------------------------------------------------------- #
def test_derived_source_equals_pde_residual_numerically() -> None:
    """S must equal u_t - D u_xx evaluated independently at sample (x,t,L,D)."""
    result = derive_heat_1d()
    x, t = result.coordinate, result.time
    L, D = result.parameters["L"], result.parameters["D"]
    u = result.u_symbolic
    # Independent residual recomputation (not reusing source_symbolic).
    residual = sp.diff(u, t) - D * sp.diff(u, x, 2)
    f_src = sp.lambdify((x, t, L, D), result.source_symbolic, "numpy")
    f_res = sp.lambdify((x, t, L, D), residual, "numpy")
    rng = np.random.default_rng(0)
    for _ in range(20):
        xv = float(rng.uniform(0.0, 3.0))
        tv = float(rng.uniform(0.0, 3.0))
        Lv = float(rng.uniform(0.5, 3.0))
        Dv = float(rng.uniform(0.1, 4.0))
        assert f_src(xv, tv, Lv, Dv) == pytest.approx(f_res(xv, tv, Lv, Dv), rel=1e-12)


def test_derived_source_matches_solution_object_source_term() -> None:
    """The symbolic source agrees with HeatEq1DSolution.source_term() numerically."""
    result = derive_heat_1d()
    x, t = result.coordinate, result.time
    L, D = result.parameters["L"], result.parameters["D"]
    f_src = sp.lambdify((x, t, L, D), result.source_symbolic, "numpy")
    soln = HeatEq1DSolution(D=1.7, L=2.3)
    xs = np.linspace(0.0, soln.L, 11)
    tv = 0.37
    sym = np.array([f_src(float(xi), tv, soln.L, soln.D) for xi in xs])
    obj = soln.source_term(xs, tv)
    assert np.allclose(sym, obj, rtol=1e-12, atol=1e-13)


def test_solution_source_term_amplitude_formula() -> None:
    """S = sin(kx)[D k^2 cos t - sin t]; pins k, the k^2, and the -sin t sign."""
    soln = HeatEq1DSolution(D=1.3, L=2.0)
    k = 2.0 * np.pi / soln.L
    x = np.array([0.1, 0.4, 0.9], dtype=np.float64)
    t = 0.6
    expected = np.sin(k * x) * (soln.D * k * k * np.cos(t) - np.sin(t))
    assert np.allclose(soln.source_term(x, t), expected, rtol=1e-13)


# --------------------------------------------------------------------------- #
# heat_1d_ftcs -- centered Laplacian step + grid + CFL guard
# --------------------------------------------------------------------------- #
def test_ftcs_step_reproduces_centered_laplacian_increment() -> None:
    """One step on a known field equals u + dt*(D*lap + S) with the centered lap."""
    u = np.array([1.0, 2.0, 4.0, 8.0], dtype=np.float64)
    dt, dx, D = 0.01, 0.5, 1.3
    source = np.array([0.0, -1.0, 2.0, 0.5], dtype=np.float64)
    lap = (np.roll(u, -1) - 2.0 * u + np.roll(u, 1)) / (dx * dx)
    expected = u + dt * (D * lap + source)
    out = ftcs_step(u, dt, dx, D, source)
    assert np.allclose(out, expected, rtol=0, atol=1e-15)
    # Spot-check one interior node by hand: node i=1 has neighbours 1 and 4.
    lap1 = (4.0 - 2.0 * 2.0 + 1.0) / (dx * dx)
    assert out[1] == pytest.approx(2.0 + dt * (D * lap1 + source[1]), abs=1e-15)


def test_ftcs_constant_field_no_source_is_invariant() -> None:
    """Centered Laplacian of a constant is exactly 0 -> step is the identity."""
    u = np.full(8, 3.5, dtype=np.float64)
    out = ftcs_step(u, dt=0.1, dx=0.25, D=2.0, source=np.zeros_like(u))
    assert np.allclose(out, u, rtol=0, atol=1e-15)


def test_ftcs_grid_is_cell_centered() -> None:
    """x_i = (i + 0.5)*dx; kills dropping the +0.5 or changing the offset."""
    x, _u, _t = run_heat_1d_ftcs(
        N=4,
        L=1.0,
        D=1.0,
        t_final=0.0,  # zero-time: no stepping, just inspect the grid
        cfl=0.25,
        initial_condition=lambda xi: np.zeros_like(xi),
        source_fn=lambda xi, _t: np.zeros_like(xi),
    )
    assert np.allclose(x, np.array([0.125, 0.375, 0.625, 0.875]), rtol=0, atol=1e-15)


def test_ftcs_rejects_unstable_cfl() -> None:
    """cfl >= 0.5 must raise; cfl just below must not (pins the 0.5 boundary)."""
    args = dict(
        N=8,
        L=1.0,
        D=1.0,
        t_final=0.0,
        initial_condition=lambda xi: np.zeros_like(xi),
        source_fn=lambda xi, _t: np.zeros_like(xi),
    )
    with pytest.raises(ValueError):
        run_heat_1d_ftcs(cfl=0.5, **args)  # type: ignore[arg-type]
    # cfl just under 0.5 is accepted
    run_heat_1d_ftcs(cfl=0.499, **args)  # type: ignore[arg-type]


def test_ftcs_recovers_eigenfunction_decay_rate() -> None:
    """Zero-source eigenfunction IC decays at ~exp(-D k^2 t) (analytic check)."""
    soln = HeatEq1DSolution(D=1.0, L=1.0)
    rate = soln.free_decay_rate()
    assert rate == pytest.approx((2.0 * np.pi) ** 2, rel=1e-12)  # D k^2, k=2pi
    N = 256
    t_final = 0.02
    x, u_final, t_actual = run_heat_1d_ftcs(
        N=N,
        L=soln.L,
        D=soln.D,
        t_final=t_final,
        cfl=0.25,
        initial_condition=lambda xi: np.sin(2.0 * np.pi * xi / soln.L),
        source_fn=lambda xi, _t: np.zeros_like(xi),
    )
    analytic = np.sin(2.0 * np.pi * x / soln.L) * np.exp(-rate * t_actual)
    rel = float(np.max(np.abs(u_final - analytic))) / float(np.max(np.abs(analytic)))
    assert rel < 2e-2


# --------------------------------------------------------------------------- #
# heat_1d_broken -- genuinely first-order; rejected by the analyzer
# --------------------------------------------------------------------------- #
def test_broken_step_uses_forward_not_centered_difference() -> None:
    """Broken pseudo-Laplacian is (u[i+1]-u[i])/dx, *not* the centered stencil."""
    u = np.array([1.0, 2.0, 4.0, 8.0], dtype=np.float64)
    dt, dx, D = 0.01, 0.5, 1.3
    source = np.zeros_like(u)
    pseudo = (np.roll(u, -1) - u) / dx
    expected = u + dt * (D * pseudo + source)
    out = broken_first_order_step(u, dt, dx, D, source)
    assert np.allclose(out, expected, rtol=0, atol=1e-15)
    # It must DIFFER from the correct centered step on this non-affine field.
    centered = (np.roll(u, -1) - 2.0 * u + np.roll(u, 1)) / (dx * dx)
    assert not np.allclose(pseudo, centered)


def test_broken_solver_is_first_order_and_rejected() -> None:
    """Observed order ~1 (well under 1.5), and analyzer.passes is False."""
    result = run_convergence_study(
        scheme=run_heat_1d_broken,
        scheme_name="heat_1d_broken",
    )
    conv = analyze_convergence(result)
    assert conv.observed_order_l2 <= 1.5
    assert conv.passes is False


def test_ftcs_solver_is_accepted_contrast() -> None:
    """The good solver passes -- guards against an over-broad reject in passes()."""
    conv = analyze_convergence(run_convergence_study())
    assert conv.observed_order_l2 == pytest.approx(2.0, abs=0.5)
    assert conv.passes is True
