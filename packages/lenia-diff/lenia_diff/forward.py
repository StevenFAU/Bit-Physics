"""Differentiable Lenia — config + closed-form Quad4 analytic helpers (Stack D / Taichi).

The tape-differentiable ``ti.ad.Tape`` kernels live in :mod:`._kernels` (IC-12 dedicated
kernel module). This module holds the strict-typed Python surface: the configuration
dataclass and the closed-form Quad4 growth/kernel helpers used by the A1 (growth-parameter
gradient) and A3 (convolution-Jacobian / initial-field gradient) analytic anchors.

Physics matches the landed reference (``packages/lenia``): real-space periodic Quad4
convolution + Quad4 polynomial growth ``G(u)=2·max(0,1-(u-mu)²/(9sigma²))⁴-1`` + clip-Euler.
The closed forms are grep-cited from the vendored Chakazul source at SHA
``adfc542939266de7f4bb7ebb552e8499701ee107`` (``references/Chakazul-Lenia/Python/LeniaF.py``
:500 growth / :493 kernel; Chan 2019, *Complex Systems* 28(3):251-286).
"""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from ._kernels import lenia_convolve_diff, lenia_load_initial, lenia_loss_l2, lenia_update_diff

__all__ = [
    "LeniaDiffConfig",
    "lenia_convolve_diff",
    "lenia_load_initial",
    "lenia_loss_l2",
    "lenia_update_diff",
    "periodic_conv",
    "quad4_growth",
    "quad4_growth_dmu",
    "quad4_growth_dsigma",
    "quad4_growth_du",
    "quad4_kernel_window",
]


@dataclass(frozen=True)
class LeniaDiffConfig:
    """Canonical differentiable-Lenia configuration (smooth-interior regime).

    Deliberately small (``grid=16``, ``R=3``, ``steps=4``) and **smooth-interior**
    (``sigma=0.15`` wide — NOT the orbium ``sigma=0.015`` clip-tight preset; ``mu``
    near the field mean) so the gradient is well-conditioned (Quad4 growth ``base>0``,
    clip inactive) and the golden table evaluates in well under a second. ``mu``/``sigma``
    are the recovered growth parameters.
    """

    grid: int = 16
    R: int = 3
    steps: int = 4
    dt: float = 0.1
    mu: float = 0.30
    sigma: float = 0.15


def quad4_kernel_window(R: int) -> NDArray[np.float64]:
    """Normalized real-space Quad4 kernel window ``(2R+1)²`` (sum 1).

    ``K(r) = (4 r (1-r))⁴`` on ``r = ‖offset‖/R in [0,1]`` (compact support), then
    normalized — identical to ``lenia._build_kernel_window``. Source: Chakazul
    ``references/Chakazul-Lenia/Python/LeniaF.py:493``.
    """
    size = 2 * R + 1
    coords = np.arange(size, dtype=np.float64) - float(R)
    yy, xx = np.meshgrid(coords, coords, indexing="ij")
    r = np.sqrt(xx * xx + yy * yy) / float(R)
    inside = (r >= 0.0) & (r <= 1.0)
    base = 4.0 * r * (1.0 - r)
    K = np.where(inside, base**4, 0.0)
    total = float(K.sum())
    if total <= 0.0:
        raise ValueError(f"Quad4 kernel window sum is non-positive ({total})")
    return (K / total).astype(np.float64, copy=False)


def periodic_conv(
    field: NDArray[np.float64], K: NDArray[np.float64], R: int
) -> NDArray[np.float64]:
    """Real-space periodic-BC convolution ``(K*field)`` (oracle for A3).

    Sums ``field[(i+di)%n,(j+dj)%n]·K[di+R,dj+R]`` over the ``(2R+1)²`` taps in the SAME
    (di outer, dj inner) order as the Taichi kernel, so the analytic A3 adjoint matches
    the autodiff gradient to machine precision.
    """
    out = np.zeros_like(field)
    for di in range(-R, R + 1):
        for dj in range(-R, R + 1):
            out += np.roll(np.roll(field, di, 0), dj, 1) * K[di + R, dj + R]
    return out


def quad4_growth(u: NDArray[np.float64], mu: float, sigma: float) -> NDArray[np.float64]:
    """Quad4 polynomial growth ``G(u)=2·max(0,1-(u-mu)²/(9sigma²))⁴-1`` (Chakazul gn=1)."""
    base = np.maximum(0.0, 1.0 - (u - mu) ** 2 / (9.0 * sigma * sigma))
    return (2.0 * base**4 - 1.0).astype(np.float64)


def _smooth_base(u: NDArray[np.float64], mu: float, sigma: float) -> NDArray[np.float64]:
    """``base = 1 - (u-mu)²/(9sigma²)`` WITHOUT the ``max(0,·)`` clamp (smooth-interior use)."""
    return (1.0 - (u - mu) ** 2 / (9.0 * sigma * sigma)).astype(np.float64)


def quad4_growth_dmu(u: NDArray[np.float64], mu: float, sigma: float) -> NDArray[np.float64]:
    """Closed-form ``∂G/∂mu = 16·base³·(u-mu)/(9sigma²)`` in the smooth interior (``base>0``)."""
    base = _smooth_base(u, mu, sigma)
    return (16.0 * base**3 * (u - mu) / (9.0 * sigma * sigma)).astype(np.float64)


def quad4_growth_dsigma(u: NDArray[np.float64], mu: float, sigma: float) -> NDArray[np.float64]:
    """Closed-form ``∂G/∂sigma = 16·base³·(u-mu)²/(9sigma³)`` in the smooth interior."""
    base = _smooth_base(u, mu, sigma)
    return (16.0 * base**3 * (u - mu) ** 2 / (9.0 * sigma**3)).astype(np.float64)


def quad4_growth_du(u: NDArray[np.float64], mu: float, sigma: float) -> NDArray[np.float64]:
    """Closed-form ``dG/du = -16·base³·(u-mu)/(9sigma²)`` (the A3 convolution-chain term)."""
    base = _smooth_base(u, mu, sigma)
    return (-16.0 * base**3 * (u - mu) / (9.0 * sigma * sigma)).astype(np.float64)
