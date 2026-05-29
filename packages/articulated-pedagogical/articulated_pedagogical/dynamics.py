"""Conserved-quantity + kinematic helpers (energy, momentum, link positions).

Used by the ``energy_drift_bounded`` / ``angular_momentum_about_pivot_conserved``
PBT invariants and by the convention-free Cartesian trajectory comparison in the
double-pendulum / 6-DOF goldens. ``link_positions`` maps joint-space ``q`` to
world Cartesian COM positions, so trajectory comparisons are independent of the
joint-angle sign/zero convention.

Convention (matching ``_warp_kernels`` / ``algebraic.md``): ``q[i]`` is the joint
angle of link ``i`` relative to its parent; absolute angle ``phi_i = sum_{j<=i}
q[j]``; ``q = 0`` points a link straight down (``-y``), CCW positive. These are
host-side NumPy kinematics (diagnostics, not the Warp hot loop).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from .model import ArticulatedChain


def _kinematics(
    chain: ArticulatedChain, q: NDArray[np.floating], qd: NDArray[np.floating]
) -> tuple[NDArray[np.floating], NDArray[np.floating], NDArray[np.floating]]:
    """Return ``(cpos, vcom, omega)`` — world COM positions ``(n,2)``, COM
    velocities ``(n,2)``, absolute angular rates ``(n,)``."""
    n = chain.n_links
    q = np.asarray(q, dtype=np.float64)
    qd = np.asarray(qd, dtype=np.float64)
    lengths = np.asarray(chain.lengths, dtype=np.float64)
    cdist = np.asarray(chain.com_distances, dtype=np.float64)

    phi = np.cumsum(q)
    omega = np.cumsum(qd)
    d = np.stack([np.sin(phi), -np.cos(phi)], axis=1)  # link axis unit vectors
    e = np.stack([np.cos(phi), np.sin(phi)], axis=1)  # d/dphi of d

    cpos = np.empty((n, 2), dtype=np.float64)
    vcom = np.empty((n, 2), dtype=np.float64)
    jpos = np.zeros(2, dtype=np.float64)
    vjoint = np.zeros(2, dtype=np.float64)
    for i in range(n):
        cpos[i] = jpos + cdist[i] * d[i]
        vcom[i] = vjoint + cdist[i] * e[i] * omega[i]
        jpos = jpos + lengths[i] * d[i]
        vjoint = vjoint + lengths[i] * e[i] * omega[i]
    return cpos, vcom, omega


def link_positions(chain: ArticulatedChain, q: NDArray[np.floating]) -> NDArray[np.floating]:
    """World Cartesian COM positions of each link, shape ``(n_links, 2)``."""
    cpos, _vcom, _omega = _kinematics(chain, q, np.zeros(chain.n_links))
    return cpos


def total_energy(
    chain: ArticulatedChain, q: NDArray[np.floating], qd: NDArray[np.floating]
) -> float:
    """Total mechanical energy ``T + V`` (frictionless conserved quantity)."""
    cpos, vcom, omega = _kinematics(chain, q, qd)
    mass = np.asarray(chain.masses, dtype=np.float64)
    inertia = np.asarray(chain.inertias, dtype=np.float64)
    kinetic = 0.5 * float(
        np.sum(mass * np.sum(vcom * vcom, axis=1)) + np.sum(inertia * omega * omega)
    )
    potential = float(chain.gravity * np.sum(mass * cpos[:, 1]))
    return kinetic + potential


def linear_momentum(
    chain: ArticulatedChain, q: NDArray[np.floating], qd: NDArray[np.floating]
) -> NDArray[np.floating]:
    """World linear momentum ``(p_x, p_y)`` of the whole chain."""
    _cpos, vcom, _omega = _kinematics(chain, q, qd)
    mass = np.asarray(chain.masses, dtype=np.float64)
    return np.asarray(np.sum(mass[:, None] * vcom, axis=0), dtype=np.float64)


def angular_momentum(
    chain: ArticulatedChain, q: NDArray[np.floating], qd: NDArray[np.floating]
) -> float:
    """World angular momentum about the origin (scalar, planar ``z``)."""
    cpos, vcom, omega = _kinematics(chain, q, qd)
    mass = np.asarray(chain.masses, dtype=np.float64)
    inertia = np.asarray(chain.inertias, dtype=np.float64)
    orbital = float(np.sum(mass * (cpos[:, 0] * vcom[:, 1] - cpos[:, 1] * vcom[:, 0])))
    spin = float(np.sum(inertia * omega))
    return orbital + spin


__all__ = [
    "angular_momentum",
    "linear_momentum",
    "link_positions",
    "total_energy",
]
