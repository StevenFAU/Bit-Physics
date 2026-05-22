"""D3Q19 BGK collision + streaming (gate-5 MMS arm + canonical capture).

The complete per-step LBM update is a composition of:

  1. **Collision** (BGK relaxation; Qian 1992 eq. (1)):
        f_i^post = f_i − (f_i − f_i^eq(ρ, u)) / τ
     where (ρ, u) are recovered from the pre-collision moments. With
     a body force F (used by the MMS gate-5 arm via Guo et al. 2002
     forcing), the collision becomes:
        f_i^post = f_i − (f_i − f_i^eq(ρ, u_eq)) / τ + Δt · F_i^guo
     with shifted equilibrium velocity u_eq = u + Δt · F / (2 ρ).
  2. **Streaming** (propagation):
        f_i(x + c_i Δt, t + Δt) = f_i^post(x, t)
     implemented as ``np.roll(f[i], shift=tuple(C[i]))`` per
     direction. The 19-direction loop iterates in lex order over
     :data:`C` for determinism (P22 + P23 inheritance).

Boundary conditions are applied AFTER streaming via direction-specific
half-way bounce-back (for no-slip walls) or via periodic wraparound
(implicit in ``np.roll``). The current implementation supports
periodic-in-all-directions (used by the MMS test) plus
``apply_bounce_back_y_walls`` (used by Poiseuille / Couette captures
to enforce no-slip / moving-wall conditions at y=0 and y=Ny−1).

Unit conventions (lattice ⇄ physical):

  - All in-kernel quantities (f, u, ρ, F) are in lattice units;
    Δx_lattice = Δt_lattice = 1.
  - Kinematic viscosity in lattice units: ν_lat = c_s² (τ − 1/2).
  - Conversion to/from physical units happens at sim-init and
    capture-write boundaries; the kernel itself is unit-agnostic.

See ``sim.py`` module docstring for the full determinism strategy.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from .constants import C, CS2, W
from .equilibrium import density_field, feq_field, momentum_field


def bgk_step(
    f: NDArray[np.float64],
    tau: float,
    force_lattice: NDArray[np.float64] | None = None,
) -> NDArray[np.float64]:
    """One BGK collision + streaming step.

    Inputs:
        f:   pre-step distribution, shape ``(19, Nx, Ny, Nz)``.
        tau: BGK relaxation time (lattice units; > 0.5 for stability).
        force_lattice: optional body force ``(3, Nx, Ny, Nz)`` per cell
            (lattice-unit force density). Default None for force-free.

    Returns:
        Post-step distribution, same shape. Streaming applied last;
        next step's pre-collision moments are recovered from the
        returned array.

    Determinism:
        - The 19-direction loop iterates in lex order over :data:`C`.
        - Macroscopic moments recovered via :func:`density_field` +
          :func:`momentum_field` (lex over directions; numpy einsum
          uses a fixed contraction).
        - The Guo half-step correction is applied with a fixed-order
          arithmetic (force_term first, then BGK collision, then
          streaming).
    """
    rho = density_field(f)
    rho_safe = np.maximum(rho, 1e-30)
    mom = momentum_field(f)
    # Macroscopic velocity (pre-correction): u_pre = ρu / ρ.
    u_pre = mom / rho_safe
    if force_lattice is None:
        u_eq = u_pre
        force_term = None
    else:
        # Guo et al. 2002 half-step velocity shift: u_eq = u_pre + F/(2ρ).
        u_eq = u_pre + 0.5 * force_lattice / rho_safe
    f_eq = feq_field(rho, u_eq)
    # BGK relaxation.
    f_post = f - (f - f_eq) / tau
    if force_lattice is not None:
        # Guo body-force contribution per direction:
        # F_i = (1 - 1/(2τ)) w_i [(c_i - u_eq)/c_s² + (c_i·u_eq) c_i / c_s⁴] · F.
        # Lex-ordered loop; no scatter.
        prefactor = 1.0 - 0.5 / tau
        force_term = np.empty_like(f)
        inv_cs2 = 1.0 / CS2
        inv_cs4 = 1.0 / (CS2 * CS2)
        for i in range(19):
            ci = C[i].astype(np.float64)
            ci_dot_u = ci[0] * u_eq[0] + ci[1] * u_eq[1] + ci[2] * u_eq[2]
            # (c_i - u) / c_s² + (c_i · u) c_i / c_s⁴ — direction-wise.
            term_x = (ci[0] - u_eq[0]) * inv_cs2 + ci_dot_u * ci[0] * inv_cs4
            term_y = (ci[1] - u_eq[1]) * inv_cs2 + ci_dot_u * ci[1] * inv_cs4
            term_z = (ci[2] - u_eq[2]) * inv_cs2 + ci_dot_u * ci[2] * inv_cs4
            force_term[i] = (
                prefactor
                * W[i]
                * (
                    term_x * force_lattice[0]
                    + term_y * force_lattice[1]
                    + term_z * force_lattice[2]
                )
            )
        f_post = f_post + force_term
    # Streaming: lex over 19 directions, np.roll per direction.
    return stream(f_post)


def stream(f_post: NDArray[np.float64]) -> NDArray[np.float64]:
    """Streaming step: propagate each direction by its c_i vector.

    Implemented as ``np.roll(f[i], shift=tuple(c_i), axis=(0,1,2))``
    per direction. Periodic BCs implicit. Iteration is lex over the
    19-direction set for determinism.
    """
    f_streamed = np.empty_like(f_post)
    for i in range(19):
        shift = (int(C[i, 0]), int(C[i, 1]), int(C[i, 2]))
        f_streamed[i] = np.roll(f_post[i], shift=shift, axis=(0, 1, 2))
    return f_streamed


def macroscopic_velocity(
    f: NDArray[np.float64], force_lattice: NDArray[np.float64] | None = None
) -> NDArray[np.float64]:
    """Recover the macroscopic velocity field from a distribution.

    With Guo forcing active, the physical velocity is
    ``u = (ρu + Δt F/2) / ρ`` (Guo 2002 eq. (16)).
    """
    rho = density_field(f)
    rho_safe = np.maximum(rho, 1e-30)
    mom = momentum_field(f)
    if force_lattice is not None:
        mom = mom + 0.5 * force_lattice
    return mom / rho_safe


def apply_bounce_back_y_walls(
    f: NDArray[np.float64],
    wall_velocity_top: tuple[float, float, float] = (0.0, 0.0, 0.0),
    wall_velocity_bottom: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> NDArray[np.float64]:
    """Half-way bounce-back at y=0 (bottom) and y=Ny-1 (top) walls.

    For solid walls (zero wall velocity), distributions pointing INTO
    the wall (post-streaming) are reflected to their opposite-direction
    indices. For moving walls (e.g., Couette top plate at u_wall), an
    additional momentum injection -2 w_i ρ (c_i · u_wall) / c_s²
    accounts for the wall motion (Krüger 2017 Ch. 5 § 5.3.4).

    No-slip is implemented by SWAPPING f_i ↔ f_{opp(i)} at the wall
    cells. The opposite-direction map is encoded once and applied in
    lex order for determinism.
    """
    # Opposite-direction map per the canonical D3Q19 ordering.
    # Each pair (i, opp[i]) has c_i = -c_{opp[i]}.
    OPP = np.array(
        [
            0,
            2,
            1,  # ±x
            4,
            3,  # ±y
            6,
            5,  # ±z
            8,
            7,  # (1,1,0) ↔ (-1,-1,0)
            10,
            9,  # (1,-1,0) ↔ (-1,1,0)
            12,
            11,  # (1,0,1) ↔ (-1,0,-1)
            14,
            13,  # (1,0,-1) ↔ (-1,0,1)
            16,
            15,  # (0,1,1) ↔ (0,-1,-1)
            18,
            17,  # (0,1,-1) ↔ (0,-1,1)
        ],
        dtype=np.int64,
    )
    # Sanity: c[i] + c[OPP[i]] == 0 for all i.
    # (Asserted at module-init-test time, not at every call.)
    out = f.copy()
    # Bottom wall at y=0: directions with c_iy > 0 are inflow (came
    # from below the wall, which doesn't exist). Replace with the
    # opposite direction's pre-bounce-back value plus moving-wall
    # momentum injection.
    for i in range(19):
        if C[i, 1] > 0:  # direction has positive y component
            # Bottom wall y=0
            f_opp_at_wall = f[OPP[i], :, 0, :]
            uw = wall_velocity_bottom
            ci_dot_uw = (
                float(C[i, 0]) * uw[0] + float(C[i, 1]) * uw[1] + float(C[i, 2]) * uw[2]
            )
            rho_wall = f[:, :, 0, :].sum(axis=0)
            momentum_inj = -2.0 * W[i] * rho_wall * ci_dot_uw / CS2
            out[i, :, 0, :] = f_opp_at_wall + momentum_inj
        if C[i, 1] < 0:  # direction has negative y component
            # Top wall y=Ny-1
            f_opp_at_wall = f[OPP[i], :, -1, :]
            uw = wall_velocity_top
            ci_dot_uw = (
                float(C[i, 0]) * uw[0] + float(C[i, 1]) * uw[1] + float(C[i, 2]) * uw[2]
            )
            rho_wall = f[:, :, -1, :].sum(axis=0)
            momentum_inj = -2.0 * W[i] * rho_wall * ci_dot_uw / CS2
            out[i, :, -1, :] = f_opp_at_wall + momentum_inj
    return out


__all__ = [
    "apply_bounce_back_y_walls",
    "bgk_step",
    "macroscopic_velocity",
    "stream",
]
