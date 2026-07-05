"""Discrete divergence routes (spec-ref § 6.2 — the three honest routes).

Route A — matched staggered (MAC) curl + divergence: the compatible /
support-operator pair whose composition DIV.CURL telescopes to exact
zero (Hyman & Shashkov 1999, Eqs. 1.7-1.10; natural-with-natural
pairing — the v0.2 caveat). Machine-zero in f64 (~1e-13 declared
ceiling; each potential value enters the cell balance once with +1 and
once with -1).

Route C — same-stencil nested finite differences: FD curl of the
analytic potential followed by FD divergence with the SAME displacement;
mixed-partial stencil terms cancel to near machine zero (measured).

Independent-stencil probe — FD divergence (stencil g) of the ANALYTIC
velocity: residual is the probe's O(g^2) truncation error, MEASURED as a
convergence slope, never labeled machine-zero (golden A table 2).
"""

from __future__ import annotations

import numpy as np


# --------------------------------------------------------------------------- #
# Route A — 2D: psi at nodes, velocity at faces, div at cells
# --------------------------------------------------------------------------- #
def matched_curl_2d(psi: np.ndarray, dx: float) -> tuple[np.ndarray, np.ndarray]:
    """u on x-normal faces, w on y-normal faces from nodal psi.

    psi: (nx+1, ny+1) nodes. u[i, j] = (psi[i, j+1] - psi[i, j]) / dx on
    the (nx+1, ny) x-faces; w[i, j] = -(psi[i+1, j] - psi[i, j]) / dx on
    the (nx, ny+1) y-faces (the discrete v = rot psi)."""
    u = (psi[:, 1:] - psi[:, :-1]) / dx
    w = -(psi[1:, :] - psi[:-1, :]) / dx
    return u, w


def matched_divergence_2d(u: np.ndarray, w: np.ndarray, dx: float) -> np.ndarray:
    """Cell-centered natural divergence of face velocities."""
    return (u[1:, :] - u[:-1, :]) / dx + (w[:, 1:] - w[:, :-1]) / dx


# --------------------------------------------------------------------------- #
# Route A — 3D: vector potential on edges, velocity at faces, div at cells
# --------------------------------------------------------------------------- #
def matched_curl_3d(
    psi_x: np.ndarray, psi_y: np.ndarray, psi_z: np.ndarray, dx: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Face velocities from edge vector potential (natural CURL).

    Shapes on an (n, n, n) cell grid:
      psi_x (n, n+1, n+1)  x-edges     u (n+1, n, n)  x-faces
      psi_y (n+1, n, n+1)  y-edges     v (n, n+1, n)  y-faces
      psi_z (n+1, n+1, n)  z-edges     w (n, n, n+1)  z-faces

    u = d(psi_z)/dy - d(psi_y)/dz, etc. — each face's circulation of the
    four surrounding edges divided by dx."""
    u = (psi_z[:, 1:, :] - psi_z[:, :-1, :]) / dx - (
        psi_y[:, :, 1:] - psi_y[:, :, :-1]
    ) / dx
    v = (psi_x[:, :, 1:] - psi_x[:, :, :-1]) / dx - (
        psi_z[1:, :, :] - psi_z[:-1, :, :]
    ) / dx
    w = (psi_y[1:, :, :] - psi_y[:-1, :, :]) / dx - (
        psi_x[:, 1:, :] - psi_x[:, :-1, :]
    ) / dx
    return u, v, w


def matched_divergence_3d(
    u: np.ndarray, v: np.ndarray, w: np.ndarray, dx: float
) -> np.ndarray:
    """Cell-centered natural divergence of face velocities."""
    return (
        (u[1:, :, :] - u[:-1, :, :]) / dx
        + (v[:, 1:, :] - v[:, :-1, :]) / dx
        + (w[:, :, 1:] - w[:, :, :-1]) / dx
    )


# --------------------------------------------------------------------------- #
# Independent-stencil FD divergence probe of an analytic field (O(g^2))
# --------------------------------------------------------------------------- #
def fd_divergence_probe(velocity_fn, x: np.ndarray, g: float) -> np.ndarray:
    """Central-difference divergence of ``velocity_fn`` with stencil ``g``.

    The residual on a divergence-free analytic field is the stencil's own
    O(g^2) truncation error — the measured-convergent instrument."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    div = np.zeros(x.shape[0])
    for k in range(3):
        e = np.zeros(3)
        e[k] = g
        vp = velocity_fn(x + e)
        vm = velocity_fn(x - e)
        div += (vp[:, k] - vm[:, k]) / (2.0 * g)
    return div


# --------------------------------------------------------------------------- #
# Route C — same-stencil nested FD (Bridson's FD curl, then FD div, same h)
# --------------------------------------------------------------------------- #
def nested_fd_divergence_2d(psi_fn, x: np.ndarray, h: float) -> np.ndarray:
    """FD div (stencil h) of the FD rot (SAME stencil h) of scalar psi.

    All four corner psi evaluations are shared between the u- and w-
    stencils, so the mixed partials cancel term-by-term (Sterbenz-exact
    nearby subtractions) — measured near machine zero at h ~ 1e-4."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    ex = np.array([h, 0.0, 0.0])
    ey = np.array([0.0, h, 0.0])
    # psi at the four diagonal corners (each value used by BOTH components)
    pp = psi_fn(x + ex + ey)
    pm = psi_fn(x + ex - ey)
    mp = psi_fn(x - ex + ey)
    mm = psi_fn(x - ex - ey)
    # u = d psi/dy: u(x+ex) = (pp - pm)/2h ; u(x-ex) = (mp - mm)/2h
    # w = -d psi/dx: w(x+ey) = -(pp - mp)/2h ; w(x-ey) = -(pm - mm)/2h
    # div*2h = [u(x+ex) - u(x-ex)] + [w(x+ey) - w(x-ey)]
    du = (pp - pm) - (mp - mm)
    dw = -((pp - mp) - (pm - mm))
    return (du + dw) / (4.0 * h * h)
