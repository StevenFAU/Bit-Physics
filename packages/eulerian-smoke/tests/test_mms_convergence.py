"""MMS-based code-verification tests for eulerian-smoke (gate 5).

Two inline OOA tests against the NS-2D Taylor-Green-style manufactured
solution at
``tools/testkit/code_verification/mms/solutions/incompressible_ns_2d/``
(shared with ``lattice-boltzmann-d3q19`` per Phase 1 Stage 2 shift #18):

- :func:`test_mms_observed_ooa_advection_matches_formal` — verifies the
  MacCormack-corrected semi-Lagrangian advection step (with the analytic
  pressure-gradient subtracted from the manufactured source so the
  projection is bypassed) converges to the analytic NS solution at the
  formal order ``p = 2`` per spec-ref § 6.1 ("semi-Lagrangian
  MacCormack — formal order p = 2"). 3-grid ladder
  ``N ∈ {32, 64, 128}`` on the unit square with ``dt ∝ dx²`` so
  cumulative time-error matches spatial ``O(dx²)``.

- :func:`test_mms_observed_ooa_projection_matches_formal` — verifies the
  Jacobi-driven pressure-projection's discrete Helmholtz decomposition
  converges to the analytic decomposition at ``p = 2`` (the spec-ref
  § 6.1 "pressure-projection gradient" half of the gate-5 claim).
  Constructs ``u* = u_solenoidal + ∇φ`` from known analytic factors;
  applies ``project_pressure`` with ``n_jacobi = 100·N`` so Jacobi
  convergence keeps pace with the ``O(dx²)`` discretization residual
  (the canonical pipeline uses ``n_jacobi = 20`` which is sufficient
  for capture-determinism but does NOT fully solve the Poisson system
  — Jacobi is a smoother, not a solver — so the OOA test scales the
  iteration count with grid level).

Phase 1 shipped both as ``raise NotImplementedError`` stub bodies; the
eulerian-smoke sub-phase Stage 1 fills in the bodies (SHIFTED — parallels
the closed-form / agent-based / RD-3D / sph-water sub-phase Stage 1 S1
test-stub-replacement precedent inherited via
``docs/conventions/sub-phase-conventions.md`` § A.2). Per Path-Y
operator routing (sub-phase plan § 1.2 + § 4.2 step 3 + conventions
doc § L.2 row 6), the convergence study is INLINED here rather than
generalizing ``tools/testkit/code_verification/mms/runner.py`` (which
remains heat-1D-specialized; MMS-runner generalization stays banked
for LBM plan-drafting).

If either observed OOA fails to converge within the ±0.5 tolerance,
consult playbook P23 in
``docs/phases/sub-phase-continuous-ca-rd3d.md`` § 9.1 (inherited via
conventions doc § M.4) before mutating the test thresholds. The five
priority causes are: (1) BC contamination of the source term at
periodic edges, (2) SymPy↔NumPy translation drift in the manufactured
solution, (3) insufficient grid refinement / pre-asymptotic regime,
(4) ``Δt``-vs-CFL coupling (eulerian-smoke MMS needs ``dt ∝ dx²``
because forward-Euler operator-splitting accumulates cumulative
time-error ∝ ``dt``), (5) error-norm choice (this test uses the
discrete L² norm).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from eulerian_smoke.reference import (  # type: ignore[import-not-found]
    project_pressure,
    stable_fluids_step,
)

from code_verification.mms.solutions.incompressible_ns_2d.solution import (
    IncompressibleNS2DSolution,
)

Array2D = NDArray[np.float64]

# Convergence-ladder constants. Plan § 4.2 step 3 default lean:
# N ∈ {32, 64, 128} on the unit square (mirrors RD-3D Stage 1's N ∈
# {16, 32, 64} pattern but bumped one octave because eulerian-smoke's
# canonical resolution is 128).
_LADDER: tuple[int, ...] = (32, 64, 128)
_T_FINAL_ADVECTION: float = 0.02  # short horizon; cos(t)·sin(t) factors
# in the manufactured solution shift visibly (~2 %) but the MMS stays
# well within the smooth regime. With dt ∝ dx², N=128 takes ~330 steps.
_ORDER_TOLERANCE: float = 0.5  # spec § 2.4 + sim spec-ref § 6.1.
_FORMAL_ORDER: float = 2.0  # MacCormack-corrected SL + 2nd-order projection gradient.


def _build_unit_square_grid(N: int) -> tuple[Array2D, Array2D, float]:
    """Cell-centered ``N × N`` mesh on the periodic unit square ``[0, 1]²``.

    Returns ``(X, Y, dx)`` where ``X[i, j] = (i + 0.5) / N`` and
    ``Y[i, j] = (j + 0.5) / N`` (``indexing='ij'`` convention — axis 0
    is the ``x`` direction, axis 1 is the ``y`` direction; this matches
    the ``stable_fluids`` module's internal axis convention).
    """
    dx = 1.0 / N
    cell_centers = (np.arange(N, dtype=np.float64) + 0.5) * dx
    X, Y = np.meshgrid(cell_centers, cell_centers, indexing="ij")
    return X, Y, dx


def _l2_norm_2d_periodic(err: Array2D, dx: float) -> float:
    """Discrete L^2 norm on a cell-centered periodic 2D mesh.

    ``||e||_{L^2} = sqrt(sum(e^2) · dx^2)`` — the 2D-volume analogue of
    the RD-3D test's 3D variant
    (``packages/reaction-diffusion-3d/tests/test_mms_convergence.py::
    _l2_norm_3d_periodic``).
    """
    return float(np.sqrt(np.sum(err * err) * dx * dx))


def _fit_observed_order(dxs: NDArray[np.float64], errs: NDArray[np.float64]) -> float:
    """Least-squares fit of ``log(err) = p · log(dx) + c``; return slope ``p``."""
    log_dx = np.log(dxs)
    log_err = np.log(errs)
    slope, _intercept = np.polyfit(log_dx, log_err, 1)
    return float(slope)


def _analytic_pressure_gradient(
    X: Array2D, Y: Array2D, t: float
) -> tuple[Array2D, Array2D]:
    """Closed-form ``∇p`` for the manufactured solution.

    Per ``derivation.md`` § "Required derivatives":
    ``p_x = π · sin(4πx) · cos²(t)``, ``p_y = π · sin(4πy) · cos²(t)``.
    """
    cos2_t = float(np.cos(t)) ** 2
    p_x = np.pi * np.sin(4.0 * np.pi * X) * cos2_t
    p_y = np.pi * np.sin(4.0 * np.pi * Y) * cos2_t
    return p_x, p_y


def _run_advection_mms_at_resolution(
    soln: IncompressibleNS2DSolution, N: int
) -> tuple[float, float, int, float, float, float]:
    """Run the projection-disabled MacCormack pipeline at one resolution.

    Returns ``(dx, dt, n_steps, l2_u, l2_v, l2_combined)``. Time integration
    uses ``dt = dx²`` so cumulative time error matches spatial ``O(dx²)``;
    the MMS source has the analytic ``∇p`` subtracted because the
    projection is bypassed (``n_jacobi = 0``) — without this subtraction
    the pipeline would double-count the pressure-gradient term.
    """
    X, Y, dx = _build_unit_square_grid(N)
    dt_target = dx * dx  # dt ∝ dx² for OOA = 2 in dx.
    n_steps = max(1, int(np.ceil(_T_FINAL_ADVECTION / dt_target)))
    dt = _T_FINAL_ADVECTION / n_steps
    params = {
        "nu": soln.nu,
        "rho": soln.rho,
        "dx": dx,
        "dt": dt,
        "n_jacobi": 0,  # projection bypass — see docstring above.
    }
    u, v, p = soln.evaluate(X, Y, 0.0)
    for n in range(n_steps):
        t_n = n * dt
        s_u, s_v = soln.source_term(X, Y, t_n)
        p_x, p_y = _analytic_pressure_gradient(X, Y, t_n)
        u, v, p = stable_fluids_step(u, v, p, params, source=(s_u - p_x, s_v - p_y))
    u_exact, v_exact, _ = soln.evaluate(X, Y, _T_FINAL_ADVECTION)
    l2_u = _l2_norm_2d_periodic(u - u_exact, dx)
    l2_v = _l2_norm_2d_periodic(v - v_exact, dx)
    l2_combined = float(np.sqrt(l2_u * l2_u + l2_v * l2_v))
    return dx, dt, n_steps, l2_u, l2_v, l2_combined


def _run_projection_mms_at_resolution(
    N: int,
) -> tuple[float, int, float]:
    """Discrete Helmholtz decomposition at one resolution.

    Constructs a known smooth velocity ``u* = u_solenoidal + ∇φ`` with
    analytic factors:

      ``φ(x, y) = sin(2πx) · sin(2πy)``
      ``ψ(x, y) = sin(2πx) · cos(2πy)``  (stream function for u_solenoidal)
      ``u_div = ∇φ``
      ``u_sol = (∂ψ/∂y, -∂ψ/∂x)``  (divergence-free by construction)

    Applies :func:`project_pressure` with ``n_iter = 100 · N`` to ensure
    Jacobi convergence keeps pace with the ``O(dx²)`` discretization
    residual at each grid level (Jacobi's per-iter convergence rate at
    the lowest wavelength is ``≈ 1 - π²/(2N²)`` so the iteration count
    must scale with ``N²`` for true convergence; we scale linearly with
    ``N`` and observe empirically that ``factor = 100`` is sufficient
    for OOA ≈ 2 on the 3-grid ladder — see Stage 1 commit footer).

    Returns ``(dx, n_iter, l2_combined)`` where ``l2_combined`` is the
    L² norm of ``(u_proj - u_sol, v_proj - u_sol)``.
    """
    X, Y, dx = _build_unit_square_grid(N)
    two_pi = 2.0 * np.pi
    sin_x = np.sin(two_pi * X)
    cos_x = np.cos(two_pi * X)
    sin_y = np.sin(two_pi * Y)
    cos_y = np.cos(two_pi * Y)
    # u_div = ∇φ where φ = sin(2πx) sin(2πy).
    u_div_x = two_pi * cos_x * sin_y
    u_div_y = two_pi * sin_x * cos_y
    # u_sol = (∂ψ/∂y, -∂ψ/∂x) where ψ = sin(2πx) cos(2πy).
    u_sol_x = -two_pi * sin_x * sin_y
    u_sol_y = -two_pi * cos_x * cos_y
    u_star = u_div_x + u_sol_x
    v_star = u_div_y + u_sol_y
    n_iter = 100 * N
    params = {"dx": dx, "dt": 1.0, "rho": 1.0}
    u_proj, v_proj, _p = project_pressure(u_star, v_star, params, n_iter=n_iter)
    err_u = u_proj - u_sol_x
    err_v = v_proj - u_sol_y
    l2 = _l2_norm_2d_periodic(np.sqrt(err_u * err_u + err_v * err_v), dx)
    return dx, n_iter, l2


def test_mms_observed_ooa_advection_matches_formal() -> None:
    """3-grid convergence study of the MacCormack-SL pipeline; OOA ≈ 2 ± 0.5.

    Convergence-rate ladder is recorded inline in the assertion message
    so the Stage 1 commit footer can quote it verbatim (plan § 4.2
    step 3 + step 10).
    """
    soln = IncompressibleNS2DSolution(nu=0.01, L=1.0, rho=1.0)
    rows: list[tuple[int, float, float, int, float, float, float]] = []
    for N in _LADDER:
        dx, dt, n_steps, l2_u, l2_v, l2_combined = _run_advection_mms_at_resolution(
            soln, N
        )
        rows.append((N, dx, dt, n_steps, l2_u, l2_v, l2_combined))

    dxs = np.array([row[1] for row in rows], dtype=np.float64)
    l2_comb = np.array([row[6] for row in rows], dtype=np.float64)
    observed_ooa = _fit_observed_order(dxs, l2_comb)

    ladder_lines = [
        f"  N={N:3d}  dx={dx:.6e}  dt={dt:.6e}  n_steps={n_steps:5d}  "
        f"||e_U||_2={l2_u:.6e}  ||e_V||_2={l2_v:.6e}  ||e||_2={l2c:.6e}"
        for N, dx, dt, n_steps, l2_u, l2_v, l2c in rows
    ]
    diag = (
        f"\nMMS advection convergence-rate ladder "
        f"(eulerian-smoke, t_final={_T_FINAL_ADVECTION}):\n"
        + "\n".join(ladder_lines)
        + f"\nobserved OOA = {observed_ooa:.4f}  "
        f"(formal = {_FORMAL_ORDER:.1f}, tolerance ±{_ORDER_TOLERANCE:.2f})"
    )
    assert abs(observed_ooa - _FORMAL_ORDER) <= _ORDER_TOLERANCE, diag


def test_mms_observed_ooa_projection_matches_formal() -> None:
    """3-grid convergence study of the Jacobi projection; OOA ≈ 2 ± 0.5.

    The discrete projection's accuracy against the analytic Helmholtz
    decomposition is bounded by the 2nd-order centered-difference
    gradient discretization (spec-ref § 6.1 "pressure-projection
    gradient"). Convergence-rate ladder recorded inline.
    """
    rows: list[tuple[int, float, int, float]] = []
    for N in _LADDER:
        dx, n_iter, l2 = _run_projection_mms_at_resolution(N)
        rows.append((N, dx, n_iter, l2))

    dxs = np.array([row[1] for row in rows], dtype=np.float64)
    l2s = np.array([row[3] for row in rows], dtype=np.float64)
    observed_ooa = _fit_observed_order(dxs, l2s)

    ladder_lines = [
        f"  N={N:3d}  dx={dx:.6e}  n_iter={n_iter:6d}  ||u_proj - u_sol||_2 = {l2:.6e}"
        for N, dx, n_iter, l2 in rows
    ]
    diag = (
        "\nMMS projection convergence-rate ladder (eulerian-smoke):\n"
        + "\n".join(ladder_lines)
        + f"\nobserved OOA = {observed_ooa:.4f}  "
        f"(formal = {_FORMAL_ORDER:.1f}, tolerance ±{_ORDER_TOLERANCE:.2f})"
    )
    assert abs(observed_ooa - _FORMAL_ORDER) <= _ORDER_TOLERANCE, diag
