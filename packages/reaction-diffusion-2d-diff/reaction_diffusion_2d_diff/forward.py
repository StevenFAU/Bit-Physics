"""Differentiable Gray-Scott forward — config + analytic helpers (Stack D / Taichi).

The tape-differentiable ``ti.ad.Tape`` kernels live in :mod:`._kernels` (IC-12
dedicated kernel module). This module holds the strict-typed Python surface: the
configuration dataclass and the closed-form discrete-Fourier-eigenmode helpers used
by the A1 analytic anchor.

Physics matches the reference (Pearson, *Science* 261:189, 1993 Gray-Scott; the
landed ``packages/reaction-diffusion-2d-stack-d`` uses the identical 5-point periodic
Laplacian + forward-Euler reaction-diffusion update).
"""

from dataclasses import dataclass

import numpy as np

from ._kernels import gray_scott_step, load_initial, loss_l2_final_u, well_mixed_step

__all__ = [
    "RD2DDiffConfig",
    "discrete_laplacian_eigenvalue",
    "fourier_eigenmode",
    "gray_scott_step",
    "load_initial",
    "loss_l2_final_u",
    "well_mixed_step",
]


@dataclass(frozen=True)
class RD2DDiffConfig:
    """Canonical differentiable-RD-2D configuration.

    Deliberately small (``n=16``, ``steps=8``) so the gradient is well-conditioned
    and the golden table evaluates in well under a second. ``Du`` is the recovered
    parameter; ``Dv``/``F``/``k`` are fixed unless a regime overrides them.
    """

    n: int = 16
    steps: int = 8
    dt: float = 0.25
    dx: float = 1.0
    Du: float = 0.16
    Dv: float = 0.08
    F: float = 0.0367
    k: float = 0.0649
    reaction: bool = True  # False -> pure-diffusion regime (A1 analytic anchor)


def discrete_laplacian_eigenvalue(mx: int, my: int, n: int, dx: float) -> float:
    """Eigenvalue ``λ < 0`` of the periodic 5-point Laplacian for Fourier mode (mx,my).

    ``λ = (2/dx²)[(cos(2π·mx/n) - 1) + (cos(2π·my/n) - 1)]`` — exact for the discrete
    operator (circulant-Laplacian linear algebra; the continuum analog is the
    ``exp(-D k² t)`` mode decay, Strauss *PDE* 2e §4.1 + Ch. 5).
    """
    return (2.0 / (dx * dx)) * (
        (float(np.cos(2.0 * np.pi * mx / n)) - 1.0) + (float(np.cos(2.0 * np.pi * my / n)) - 1.0)
    )


def fourier_eigenmode(mx: int, my: int, n: int) -> np.ndarray:
    """Discrete Fourier eigenmode ``φ(i,j) = cos(2π(mx·i + my·j)/n)`` on the n x n grid."""
    ii, jj = np.meshgrid(np.arange(n), np.arange(n), indexing="ij")
    mode: np.ndarray = np.cos(2.0 * np.pi * (mx * ii + my * jj) / n).astype(np.float64)
    return mode
