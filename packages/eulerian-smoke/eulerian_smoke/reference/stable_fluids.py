"""Stam-Fedkiw stable-fluids NumPy reference (2D + 3D).

Algorithm reference: Stam, J. (1999), "Stable Fluids", SIGGRAPH '99,
121–128. DOI 10.1145/311535.311548. Vorticity confinement per
Fedkiw, R., Stam, J., Jensen, H. W. (2001), "Visual Simulation of
Smoke", SIGGRAPH '01, 15–22. DOI 10.1145/383259.383260.

Pipeline per step (``algebraic.md`` § 2):

  1. Semi-Lagrangian advect velocity (bilinear / trilinear backtrace,
     periodic BCs).
  2. Optional source-term forcing (manufactured-source for MMS gate 5,
     vorticity-confinement for the canonical 3D capture).
  3. Diffuse velocity (explicit Laplacian; single step suffices for
     high-Re smoke).
  4. Jacobi pressure-projection (fixed iteration count;
     ``_DEFAULT_N_JACOBI`` = 20 per Stage 0 Task 0.4 scope-analysis).
  5. Advect scalar smoke density φ with the projected divergence-free
     velocity.

**Axis convention.** All arrays use ``indexing="ij"`` throughout:

- 2D fields have shape ``(Nx, Ny)``: axis 0 = x, axis 1 = y.
- 3D fields have shape ``(Nx, Ny, Nz)``: axis 0 = x, axis 1 = y, axis 2 = z.
- ``u`` is the velocity component along axis 0; ``v`` along axis 1;
  ``w`` along axis 2. Differential operators (divergence, gradient,
  curl, Laplacian) shift along the corresponding axis to compute the
  associated component.

This matches the RD-3D reference convention (``reaction_diffusion_3d.
reference._laplacian_7point``) and the ``np.meshgrid(..., indexing='ij')``
default used by the canonical-capture ICs.

Periodic boundary conditions are implemented via ``np.roll`` and
``np.mod`` (the P23 cause-#1 mitigation pattern documented in
``docs/conventions/sub-phase-conventions.md`` § M.4 S1 / § F): every
operation reads neighbors from rolled / wrapped indices, never from
ghost cells, so stencil-order bugs and off-by-one BC errors are
structurally impossible. The determinism-strategy declaration on
``sim.py`` cites this pattern as the load-bearing clause for the
``bit-exact-same-stack-same-hw`` claim at the Python NumPy reference
scope (the spec declares ``epsilon-same-stack-same-hw`` for the
Phase-2+ Stack-C target; over-achievement is informational per
conventions doc § F.4).
"""

from __future__ import annotations

from typing import Any, Final

import numpy as np
from numpy.typing import NDArray

Array2D = NDArray[np.float64]
Array3D = NDArray[np.float64]

# Canonical capture identifiers per Appendix D § D.2.3 (re-anchor at
# Stage 1 against the probe-vs-Appendix-D drift documented in the
# Stage 0 checkpoint § 3 — Appendix D wins; the probe's
# ``stam-puff-128cube-seed42-step500`` is the Phase 1 Stage 2 shift
# #17 fall-back, NOT the load-bearing descriptor).
CANONICAL_DESCRIPTOR_3D: Final[str] = "taylor-green-128cube-seed42-step500"
CANONICAL_DESCRIPTOR_2D: Final[str] = "lid-driven-cavity-128sq-re100-seed42-step1000"
CANONICAL_SEED: Final[int] = 42
CANONICAL_STEP_COUNT_3D: Final[int] = 500
CANONICAL_STEP_COUNT_2D: Final[int] = 1000

# Stage 0 Task 0.4 finding: Jacobi-20 produces ~0.93s/step at N=128 3D
# (well under the 1-hour operator threshold). Higher iteration counts
# remain available if Stage 2 GCI surfaces convergence-stall (deferred
# per spec-ref § 6.2). Fixed iteration count + deterministic update
# order makes the projection bit-exact across runs (conventions doc
# § F clause "fixed iter-cap + ≤ tolerance" inherited from P24).
_DEFAULT_N_JACOBI: Final[int] = 20


def canonical_params_2d() -> dict[str, Any]:
    """Lid-driven-cavity-128sq-re100 canonical parameters.

    Re-anchored at Stage 1: the 2D canonical descriptor per Appendix D
    § D.2.3 line 2481 is ``lid-driven-cavity-128sq-re100-seed42-step1000``.
    The Reynolds number Re=100 fixes ν via Re = U_lid·L/ν with U_lid=1
    and L=1, giving ν = 0.01.
    """
    return {
        "n": 128,
        "nu": 0.01,
        "rho": 1.0,
        "dx": 1.0 / 128.0,
        "dt": 0.001,  # CFL: U_lid·dt/dx ≈ 0.128 — well under SL stability;
        # the explicit-diffusion CFL ν·dt/dx² ≈ 0.16 is also safe. dt=0.005
        # is unstable because it violates the EXPLICIT-DIFFUSION bound:
        # ν·dt/dx² ≈ 0.82 > 0.25 (measured post-P6-FPEDGE-fix: blow-up at
        # step ~9 with the advection edge guarded, so the instability is the
        # diffusion stencil's, not advection's — the earlier "lid-shear-layer
        # vortex CFL exceedance" attribution predated the FP-edge discovery
        # and conflated the two; see the P6-FPEDGE discovery audit). The 5×
        # drop preserves the canonical ``step1000`` cadence (1000 steps ×
        # dt = 1.0s of simulated time).
        "n_jacobi": _DEFAULT_N_JACOBI,
    }


def canonical_params_3d() -> dict[str, Any]:
    """Taylor-green-128cube canonical parameters.

    Re-anchored at Stage 1: the 3D canonical descriptor per Appendix D
    § D.2.3 line 2481 is ``taylor-green-128cube-seed42-step500``. The
    Taylor-Green vortex (Taylor & Green 1937, DOI 10.1098/rspa.1937.0036)
    is a 3D incompressible-NS IC with analytic decay rate ∝ exp(-2ν k²t);
    ν = 0.01 keeps the canonical trajectory in a non-trivial vortical
    regime over the 500-step window.
    """
    return {
        "n": 128,
        "nu": 0.01,
        "rho": 1.0,
        "dx": 1.0 / 128.0,
        "dt": 0.005,
        "n_jacobi": _DEFAULT_N_JACOBI,
        "vorticity_eps": 0.0,  # vorticity confinement off for canonical
        # MMS-anchored capture.
    }


# -- 2D primitives -----------------------------------------------------


def semi_lagrangian_advect_2d(
    field: Array2D, u: Array2D, v: Array2D, dt: float, dx: float
) -> Array2D:
    """Bilinear semi-Lagrangian backtrace on a periodic 2D grid.

    Axis convention: ``field, u, v`` all have shape ``(Nx, Ny)`` with
    axis 0 = x and axis 1 = y; ``u`` is the velocity component along
    axis 0 and ``v`` along axis 1.

    Reads-only from ``field`` at fractional grid positions obtained by
    backtracking each cell-centre by ``(u, v) · dt``. Periodic wrap
    via ``np.mod`` (NOT ``np.clip``) — clip would break periodicity
    and contaminate the MMS error at the boundary.

    Vertex-ordering is explicit lex (i, j) — the deterministic
    convention cited in ``sim.py`` § F.1 clause 2.
    """
    Nx, Ny = field.shape
    # Use indexing="ij" with arange(Nx) FIRST so axis 0 = x.
    is_, js = np.meshgrid(np.arange(Nx), np.arange(Ny), indexing="ij")
    is_ = is_.astype(np.float64)
    js = js.astype(np.float64)
    # Backtrace in grid units. dy = dx (isotropic).
    x_back = is_ - u * dt / dx
    y_back = js - v * dt / dx
    # Periodic wrap to [0, N). np.mod is positive-modulus per numpy.
    x_back = np.mod(x_back, float(Nx))
    y_back = np.mod(y_back, float(Ny))
    # Float-precision guard, FRACTION-COMPLETE (P6-FPEDGE fix): np.mod can
    # return exactly N for tiny negative inputs (e.g., np.mod(-1e-17, 128.0)
    # == 128.0 because -1e-17 + 128.0 rounds to 128.0 in float64). The
    # original guard re-applied an integer modulus to i0 alone, which left
    # the interpolation fraction fx = x_back - i0 equal to N — a ×N bilinear
    # EXTRAPOLATION (measured firing on the lid-shear canonical IC: 10 cells
    # at the first advection, max|u| ≈ 12270 by step 3; see the P6-FPEDGE
    # discovery audit). Wrapping the COORDINATE itself to 0.0 — the limit the
    # intended semantics compute — fixes index and fraction together.
    # (Pure-NumPy elementwise; no branching.)
    x_back = np.where(x_back >= float(Nx), 0.0, x_back)
    y_back = np.where(y_back >= float(Ny), 0.0, y_back)
    i0 = x_back.astype(np.int64) % Nx
    j0 = y_back.astype(np.int64) % Ny
    i1 = (i0 + 1) % Nx
    j1 = (j0 + 1) % Ny
    fx = x_back - i0
    fy = y_back - j0
    # Lex (i, j) bilinear interpolation — load-bearing per conventions
    # doc § F.1 bilinear-vertex-ordering clause.
    f00 = field[i0, j0]
    f01 = field[i0, j1]
    f10 = field[i1, j0]
    f11 = field[i1, j1]
    return (
        (1.0 - fx) * (1.0 - fy) * f00
        + (1.0 - fx) * fy * f01
        + fx * (1.0 - fy) * f10
        + fx * fy * f11
    )


def maccormack_advect_2d(
    field: Array2D, u: Array2D, v: Array2D, dt: float, dx: float
) -> Array2D:
    """MacCormack-corrected semi-Lagrangian advection (2D periodic).

    Predictor-corrector pattern per Stam-Fedkiw / spec-ref § 6.1
    ("semi-Lagrangian MacCormack — formal order p = 2"):

    1. **Predictor:** ``φ̂ = SL_backtrace(φⁿ, u, v, +dt)`` — one
       semi-Lagrangian step. First-order in time + second-order in space.
    2. **Corrector:** ``φ̌ = SL_backtrace(φ̂, u, v, -dt)`` — advect the
       predictor backward by the same velocity field with reversed
       sign (mathematically equivalent to a forward-trace of ``φ̂``).
       Without discretization error this would recover ``φⁿ`` exactly;
       the deviation ``e = (φⁿ - φ̌) / 2`` is the per-step truncation.
    3. **Corrected update:** ``φ^{n+1} = φ̂ + e``.

    The result is 2nd-order accurate in both ``dt`` and ``dx`` for
    smooth fields (matches the spec's ``formal_spatial_order = 2``).
    Monotonicity-limiter clamping is intentionally OMITTED — the MMS
    fields and the canonical Taylor-Green vortex are smooth + sub-Nyquist;
    clamping would mute the 2nd-order convergence visible in the
    spec's gate-5 OOA test. The clamp can be added later for
    sharp-front variants without changing the MMS contract.
    """
    f_pred = semi_lagrangian_advect_2d(field, u, v, dt, dx)
    f_corr_back = semi_lagrangian_advect_2d(f_pred, u, v, -dt, dx)
    error = 0.5 * (field - f_corr_back)
    return f_pred + error


def _laplacian_5point_periodic(field: Array2D, inv_dx2: float) -> Array2D:
    """5-point centered Laplacian on a 2D periodic grid (rotation-symmetric)."""
    return (
        np.roll(field, +1, axis=0)
        + np.roll(field, -1, axis=0)
        + np.roll(field, +1, axis=1)
        + np.roll(field, -1, axis=1)
        - 4.0 * field
    ) * inv_dx2


def _divergence_2d_periodic(u: Array2D, v: Array2D, dx: float) -> Array2D:
    """Periodic 2D divergence — 2nd-order centered differences (spec-ref § 6.1).

    ``∂u/∂x ≈ (u[i+1,j] - u[i-1,j]) / (2 dx)``, similarly for ``∂v/∂y``.
    Paired with centered-difference gradient in :func:`project_pressure`
    for spec-ref § 6.1 "pressure-projection gradient — formal order p = 2"
    discretization consistency. The composed operator ``∇·∇p`` is the
    "wide" Laplacian ``(p[i+2] - 2p[i] + p[i-2])/(4dx²)`` rather than the
    5-point Laplacian used in the Jacobi sweep — this is the classical
    Stam-on-collocated inconsistency that leaves an O(dx²) residual
    divergence even after a converged Jacobi solve. The residual is
    bounded by ``~0.05`` at N=32 for smooth ICs and decays as O(dx²)
    under grid refinement; the PBT invariant
    :func:`eulerian_smoke.invariants.divergence_free_post_projection`
    uses a sub-phase-empirical threshold reflecting this floor. The
    MAC-staggered fix (face-centered velocities) is deferred to the
    Phase-2+ Stack-C C++/Vulkan port per sim spec-ref § 5.
    """
    inv_2dx = 0.5 / dx
    return (np.roll(u, -1, axis=0) - np.roll(u, +1, axis=0)) * inv_2dx + (
        np.roll(v, -1, axis=1) - np.roll(v, +1, axis=1)
    ) * inv_2dx


def project_pressure(
    u: Array2D,
    v: Array2D,
    params: dict[str, Any],
    n_iter: int | None = None,
) -> tuple[Array2D, Array2D, Array2D]:
    """Jacobi pressure-projection on a 2D periodic grid.

    Solves ``∇²p = (ρ/Δt) · ∇·u*`` with ``n_iter`` Jacobi sweeps (no
    early-stop), then subtracts ``(Δt/ρ) · ∇p`` from ``u, v`` to make
    them discretely divergence-free.

    Discretization: 2nd-order centered differences for both divergence
    and gradient (spec-ref § 6.1 "pressure-projection gradient —
    formal order p = 2"). The combined operator ``∇·∇p`` (composed
    centered-centered) is "wide" rather than the 5-point Laplacian
    iterated in the Jacobi sweep — this leaves an O(dx²) residual
    divergence that drives to zero with grid refinement (the projection
    OOA test witnesses this 2nd-order convergence at gate 5) but
    saturates at a non-zero floor for fixed ``dx``. The classical
    Stam-on-collocated tradeoff. The PBT divergence-free invariant
    uses a sub-phase-empirical threshold capturing this floor at
    the PBT grid resolution; the Phase-2+ Stack-C MAC-staggered port
    will eliminate the inconsistency per sim spec-ref § 5.

    The fixed iteration count is the P24-pattern (conventions doc § M.5)
    — no tolerance-comparison branch that would non-determinize the
    iteration count across runs.

    Returns ``(u_div_free, v_div_free, p)``.
    """
    if n_iter is None:
        n_iter = int(params.get("n_jacobi", _DEFAULT_N_JACOBI))
    dx = float(params["dx"])
    dt = float(params["dt"])
    rho = float(params.get("rho", 1.0))
    dx2 = dx * dx
    div = _divergence_2d_periodic(u, v, dx)
    rhs = (rho / dt) * div
    p = np.zeros_like(u)
    for _ in range(n_iter):
        p = 0.25 * (
            np.roll(p, +1, axis=0)
            + np.roll(p, -1, axis=0)
            + np.roll(p, +1, axis=1)
            + np.roll(p, -1, axis=1)
            - dx2 * rhs
        )
    inv_2dx = 0.5 / dx
    dpdx = (np.roll(p, -1, axis=0) - np.roll(p, +1, axis=0)) * inv_2dx
    dpdy = (np.roll(p, -1, axis=1) - np.roll(p, +1, axis=1)) * inv_2dx
    return u - (dt / rho) * dpdx, v - (dt / rho) * dpdy, p


def stable_fluids_step(
    u: Array2D,
    v: Array2D,
    p: Array2D,
    params: dict[str, Any],
    source: tuple[Array2D, Array2D] | None = None,
) -> tuple[Array2D, Array2D, Array2D]:
    """One 2D Stam stable-fluids step on a periodic grid.

    Axis convention: ``(u, v)`` shape ``(Nx, Ny)``; axis 0 = x, axis 1 = y.

    Args:
        u, v: velocity components at cell centres.
        p: previous-step pressure (unused at this step; carried in the
            signature per probe report § 5 contract).
        params: ``{"nu": ν, "rho": ρ, "dx": dx, "dt": dt, "n_jacobi": …}``.
        source: optional ``(S_u, S_v)`` manufactured-source forcing
            (units: acceleration). Used by the MMS gate 5 inline
            convergence study.

    Returns:
        ``(u_next, v_next, p_next)``.
    """
    del p  # unused — convention re-exposed pass-through.
    nu = float(params["nu"])
    dt = float(params["dt"])
    dx = float(params["dx"])
    inv_dx2 = 1.0 / (dx * dx)
    # 1. Advect velocity (MacCormack-corrected semi-Lagrangian; 2nd-order
    #    spec-ref § 6.1). Self-advection — u, v are advected by themselves.
    u_adv = maccormack_advect_2d(u, u, v, dt, dx)
    v_adv = maccormack_advect_2d(v, u, v, dt, dx)
    # 2. Source forcing (manufactured source for MMS, or zero).
    if source is not None:
        s_u, s_v = source
        u_adv = u_adv + dt * s_u
        v_adv = v_adv + dt * s_v
    # 3. Diffuse (explicit Laplacian — single step; OK for the canonical
    #    Re=100 / smoke regime, and consistent with the MMS source-term
    #    derivation which assumes explicit viscous treatment).
    if nu > 0.0:
        u_adv = u_adv + dt * nu * _laplacian_5point_periodic(u_adv, inv_dx2)
        v_adv = v_adv + dt * nu * _laplacian_5point_periodic(v_adv, inv_dx2)
    # 4. Jacobi pressure-projection.
    u_next, v_next, p_next = project_pressure(u_adv, v_adv, params)
    return u_next, v_next, p_next


# -- 3D primitives -----------------------------------------------------


def semi_lagrangian_advect_3d(
    field: Array3D,
    u: Array3D,
    v: Array3D,
    w: Array3D,
    dt: float,
    dx: float,
) -> Array3D:
    """Trilinear semi-Lagrangian backtrace on a periodic 3D grid.

    Axis convention: ``field, u, v, w`` all have shape ``(Nx, Ny, Nz)``
    with axis 0 = x, axis 1 = y, axis 2 = z; ``u`` along axis 0,
    ``v`` along axis 1, ``w`` along axis 2.

    Reads-only from ``field``; periodic wrap via ``np.mod``; lex
    (i, j, k) vertex-ordering.
    """
    Nx, Ny, Nz = field.shape
    is_, js, ks = np.meshgrid(
        np.arange(Nx), np.arange(Ny), np.arange(Nz), indexing="ij"
    )
    is_ = is_.astype(np.float64)
    js = js.astype(np.float64)
    ks = ks.astype(np.float64)
    x_back = np.mod(is_ - u * dt / dx, float(Nx))
    y_back = np.mod(js - v * dt / dx, float(Ny))
    z_back = np.mod(ks - w * dt / dx, float(Nz))
    # Fraction-complete FP-edge guard (P6-FPEDGE fix) — see
    # semi_lagrangian_advect_2d's inline note.
    x_back = np.where(x_back >= float(Nx), 0.0, x_back)
    y_back = np.where(y_back >= float(Ny), 0.0, y_back)
    z_back = np.where(z_back >= float(Nz), 0.0, z_back)
    i0 = x_back.astype(np.int64) % Nx
    j0 = y_back.astype(np.int64) % Ny
    k0 = z_back.astype(np.int64) % Nz
    i1 = (i0 + 1) % Nx
    j1 = (j0 + 1) % Ny
    k1 = (k0 + 1) % Nz
    fx = x_back - i0
    fy = y_back - j0
    fz = z_back - k0
    # Lex (i, j, k) trilinear interpolation.
    c000 = field[i0, j0, k0]
    c001 = field[i0, j0, k1]
    c010 = field[i0, j1, k0]
    c011 = field[i0, j1, k1]
    c100 = field[i1, j0, k0]
    c101 = field[i1, j0, k1]
    c110 = field[i1, j1, k0]
    c111 = field[i1, j1, k1]
    c00 = c000 * (1.0 - fz) + c001 * fz
    c01 = c010 * (1.0 - fz) + c011 * fz
    c10 = c100 * (1.0 - fz) + c101 * fz
    c11 = c110 * (1.0 - fz) + c111 * fz
    c0 = c00 * (1.0 - fy) + c01 * fy
    c1 = c10 * (1.0 - fy) + c11 * fy
    return c0 * (1.0 - fx) + c1 * fx


def _laplacian_7point_periodic(field: Array3D, inv_dx2: float) -> Array3D:
    """7-point centered Laplacian on a 3D periodic grid (rotation-symmetric)."""
    return (
        np.roll(field, +1, axis=0)
        + np.roll(field, -1, axis=0)
        + np.roll(field, +1, axis=1)
        + np.roll(field, -1, axis=1)
        + np.roll(field, +1, axis=2)
        + np.roll(field, -1, axis=2)
        - 6.0 * field
    ) * inv_dx2


def _divergence_3d_periodic(u: Array3D, v: Array3D, w: Array3D, dx: float) -> Array3D:
    """Periodic 3D divergence — 2nd-order centered differences per axis."""
    inv_2dx = 0.5 / dx
    return (
        (np.roll(u, -1, axis=0) - np.roll(u, +1, axis=0))
        + (np.roll(v, -1, axis=1) - np.roll(v, +1, axis=1))
        + (np.roll(w, -1, axis=2) - np.roll(w, +1, axis=2))
    ) * inv_2dx


def project_pressure_3d(
    u: Array3D,
    v: Array3D,
    w: Array3D,
    params: dict[str, Any],
    n_iter: int | None = None,
) -> tuple[Array3D, Array3D, Array3D, Array3D]:
    """Jacobi pressure-projection on a 3D periodic grid.

    Returns ``(u_div_free, v_div_free, w_div_free, p)``.
    """
    if n_iter is None:
        n_iter = int(params.get("n_jacobi", _DEFAULT_N_JACOBI))
    dx = float(params["dx"])
    dt = float(params["dt"])
    rho = float(params.get("rho", 1.0))
    dx2 = dx * dx
    div = _divergence_3d_periodic(u, v, w, dx)
    rhs = (rho / dt) * div
    p = np.zeros_like(u)
    inv6 = 1.0 / 6.0
    for _ in range(n_iter):
        p = inv6 * (
            np.roll(p, +1, axis=0)
            + np.roll(p, -1, axis=0)
            + np.roll(p, +1, axis=1)
            + np.roll(p, -1, axis=1)
            + np.roll(p, +1, axis=2)
            + np.roll(p, -1, axis=2)
            - dx2 * rhs
        )
    inv_2dx = 0.5 / dx
    dpdx = (np.roll(p, -1, axis=0) - np.roll(p, +1, axis=0)) * inv_2dx
    dpdy = (np.roll(p, -1, axis=1) - np.roll(p, +1, axis=1)) * inv_2dx
    dpdz = (np.roll(p, -1, axis=2) - np.roll(p, +1, axis=2)) * inv_2dx
    return (
        u - (dt / rho) * dpdx,
        v - (dt / rho) * dpdy,
        w - (dt / rho) * dpdz,
        p,
    )


def _curl_3d_periodic(
    u: Array3D, v: Array3D, w: Array3D, dx: float
) -> tuple[Array3D, Array3D, Array3D]:
    """Periodic 3D curl via centered differences. Returns ``(ω_x, ω_y, ω_z)``.

    axis 0 = x, axis 1 = y, axis 2 = z.
    ``ω_x = ∂w/∂y - ∂v/∂z``
    ``ω_y = ∂u/∂z - ∂w/∂x``
    ``ω_z = ∂v/∂x - ∂u/∂y``
    """
    inv_2dx = 0.5 / dx
    dwdy = (np.roll(w, -1, axis=1) - np.roll(w, +1, axis=1)) * inv_2dx
    dvdz = (np.roll(v, -1, axis=2) - np.roll(v, +1, axis=2)) * inv_2dx
    dudz = (np.roll(u, -1, axis=2) - np.roll(u, +1, axis=2)) * inv_2dx
    dwdx = (np.roll(w, -1, axis=0) - np.roll(w, +1, axis=0)) * inv_2dx
    dvdx = (np.roll(v, -1, axis=0) - np.roll(v, +1, axis=0)) * inv_2dx
    dudy = (np.roll(u, -1, axis=1) - np.roll(u, +1, axis=1)) * inv_2dx
    return dwdy - dvdz, dudz - dwdx, dvdx - dudy


def _vorticity_confinement_3d(
    u: Array3D,
    v: Array3D,
    w: Array3D,
    eps: float,
    dx: float,
) -> tuple[Array3D, Array3D, Array3D]:
    """Fedkiw-2001 vorticity confinement force ``ε · (N × ω) · dx``."""
    if eps == 0.0:
        return (np.zeros_like(u), np.zeros_like(v), np.zeros_like(w))
    omega_x, omega_y, omega_z = _curl_3d_periodic(u, v, w, dx)
    omega_mag = np.sqrt(omega_x * omega_x + omega_y * omega_y + omega_z * omega_z)
    inv_2dx = 0.5 / dx
    grad_x = (np.roll(omega_mag, -1, axis=0) - np.roll(omega_mag, +1, axis=0)) * inv_2dx
    grad_y = (np.roll(omega_mag, -1, axis=1) - np.roll(omega_mag, +1, axis=1)) * inv_2dx
    grad_z = (np.roll(omega_mag, -1, axis=2) - np.roll(omega_mag, +1, axis=2)) * inv_2dx
    grad_norm = np.sqrt(grad_x * grad_x + grad_y * grad_y + grad_z * grad_z) + 1e-30
    Nx_ = grad_x / grad_norm
    Ny_ = grad_y / grad_norm
    Nz_ = grad_z / grad_norm
    fc_x = eps * dx * (Ny_ * omega_z - Nz_ * omega_y)
    fc_y = eps * dx * (Nz_ * omega_x - Nx_ * omega_z)
    fc_z = eps * dx * (Nx_ * omega_y - Ny_ * omega_x)
    return fc_x, fc_y, fc_z


def stable_fluids_step_3d(
    u: Array3D,
    v: Array3D,
    w: Array3D,
    density: Array3D,
    params: dict[str, Any],
) -> tuple[Array3D, Array3D, Array3D, Array3D, Array3D]:
    """One 3D Stam-Fedkiw stable-fluids step (velocity + scalar smoke density).

    Returns ``(u_next, v_next, w_next, density_next, p_next)``.
    Used by the canonical ``taylor-green-128cube-seed42-step500`` capture.
    """
    nu = float(params["nu"])
    dt = float(params["dt"])
    dx = float(params["dx"])
    eps_vc = float(params.get("vorticity_eps", 0.0))
    inv_dx2 = 1.0 / (dx * dx)
    u_adv = semi_lagrangian_advect_3d(u, u, v, w, dt, dx)
    v_adv = semi_lagrangian_advect_3d(v, u, v, w, dt, dx)
    w_adv = semi_lagrangian_advect_3d(w, u, v, w, dt, dx)
    fc_x, fc_y, fc_z = _vorticity_confinement_3d(u_adv, v_adv, w_adv, eps_vc, dx)
    u_adv = u_adv + dt * fc_x
    v_adv = v_adv + dt * fc_y
    w_adv = w_adv + dt * fc_z
    if nu > 0.0:
        u_adv = u_adv + dt * nu * _laplacian_7point_periodic(u_adv, inv_dx2)
        v_adv = v_adv + dt * nu * _laplacian_7point_periodic(v_adv, inv_dx2)
        w_adv = w_adv + dt * nu * _laplacian_7point_periodic(w_adv, inv_dx2)
    u_next, v_next, w_next, p_next = project_pressure_3d(u_adv, v_adv, w_adv, params)
    density_next = semi_lagrangian_advect_3d(density, u_next, v_next, w_next, dt, dx)
    return u_next, v_next, w_next, density_next, p_next


__all__ = [
    "Array2D",
    "Array3D",
    "CANONICAL_DESCRIPTOR_2D",
    "CANONICAL_DESCRIPTOR_3D",
    "CANONICAL_SEED",
    "CANONICAL_STEP_COUNT_2D",
    "CANONICAL_STEP_COUNT_3D",
    "canonical_params_2d",
    "canonical_params_3d",
    "maccormack_advect_2d",
    "project_pressure",
    "project_pressure_3d",
    "semi_lagrangian_advect_2d",
    "semi_lagrangian_advect_3d",
    "stable_fluids_step",
    "stable_fluids_step_3d",
]
