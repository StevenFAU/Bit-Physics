"""NumPy f64 reference — the extra reaction-diffusion models of Turing Patterns v2.

docs/planning/rebuild-v2/01-reaction-diffusion.md § The model ("Other models"):
FitzHugh-Nagumo, Brusselator and Gierer-Meinhardt run behind the same live
kernel interface as Gray-Scott, and each gets a CPU mirror and a committed
golden before it ships. This module is the reference those goldens come
from. Every model is two fields on a periodic grid, the 5-point Laplacian
and forward Euler:

    u <- u + dt * (Du * lap(u) + f(u, v))
    v <- v + dt * (Dv * lap(v) + g(u, v))

The operations and their order match the WGSL live kernel
(packages/reaction-diffusion-2d/web/src/v2/model/live.wgsl) and the TypeScript
CPU mirror (packages/reaction-diffusion-2d/web/src/v2/model/models.ts):
the Laplacian sums left + right + up + down - 4 * centre and divides by dx**2.
The gated Gray-Scott kernel and its reference (gray_scott_numpy.py) are not
touched.

The second half is linear stability analysis: the dispersion relation of a
uniform steady state, in the continuum and for the discrete scheme itself
(5-point stencil eigenvalues, explicit Euler amplification), which predicts
the fastest-growing wavenumber the live FFT instrument must measure
(the Prove drawer's analytic Turing check).
"""

from __future__ import annotations

import hashlib
import math
from collections.abc import Callable
from dataclasses import dataclass
from typing import Final, Literal

import numpy as np

ModelId = Literal["gray-scott", "brusselator", "gierer-meinhardt", "fitzhugh-nagumo"]


@dataclass(frozen=True)
class ModelSetup:
    """One model run: the headline parameters (F and k slots), the constant c, the grid."""

    model: ModelId
    w: int
    h: int
    F: float
    k: float
    c: float
    Du: float
    Dv: float
    dx: float
    dt: float


# The model constants (mirrors MODELS in models.ts; the goldens' sidecars pin them).
DEFAULTS: Final[dict[str, dict[str, float]]] = {
    "brusselator": {
        "F": 4.5,
        "k": 6.75,
        "c": 0.0,
        "Du": 1.0,
        "Dv": 10.0,
        "dx": 0.5,
        "dt": 1.0 / 256.0,
    },
    "gierer-meinhardt": {
        "F": 1.0,
        "k": 2.0,
        "c": 0.0,
        "Du": 1.0,
        "Dv": 30.0,
        "dx": 1.0,
        "dt": 1.0 / 128.0,
    },
    "fitzhugh-nagumo": {
        "F": 0.05,
        "k": 0.5,
        "c": -0.45,
        "Du": 1.0,
        "Dv": 0.0,
        "dx": 1.0,
        "dt": 1.0 / 16.0,
    },
}
REST: Final[dict[str, tuple[float, float]]] = {
    "brusselator": (4.5, 1.5),
    "gierer-meinhardt": (2.0, 2.0),
    "fitzhugh-nagumo": (-0.625, -0.375),
}
SEED: Final[dict[str, tuple[float, float]]] = {
    "brusselator": (6.5, 1.5),
    "gierer-meinhardt": (8.0, 2.0),
    "fitzhugh-nagumo": (1.0, -0.375),
}


def setup(model: ModelId, w: int, h: int) -> ModelSetup:
    d = DEFAULTS[model]
    return ModelSetup(model, w, h, d["F"], d["k"], d["c"], d["Du"], d["Dv"], d["dx"], d["dt"])


# ------------------------------------------------------------------ hash --

_M32: Final[int] = 0xFFFFFFFF


def mix32(x: int) -> int:
    """The @bp/runtime / WGSL bp/hash finaliser, on Python ints masked to uint32."""
    x &= _M32
    x ^= x >> 16
    x = (x * 0x7FEB352D) & _M32
    x ^= x >> 15
    x = (x * 0x846CA68B) & _M32
    x ^= x >> 16
    return x


def hash3(a: int, b: int, c: int) -> int:
    return mix32((a ^ mix32((b ^ mix32(c & _M32)) & _M32)) & _M32)


def dyadic_noise(seed: int, cell: int, lane: int, amp: float, bits: int = 12) -> float:
    """``bits`` bits of the hash scaled to [-amp/2, amp/2).

    Exact in f32 and f64 for a power-of-two amp.
    """
    q = hash3(seed, cell, lane) >> (32 - bits)
    return (q / float(1 << bits) - 0.5) * amp


@dataclass(frozen=True)
class CanonicalIC:
    seed: int
    amp: float
    bump: int
    bits: int = 12


def canonical_field(model: ModelId, w: int, h: int, ic: CanonicalIC) -> np.ndarray:
    """Rest state + dyadic noise (+ a centred square at the seed state). Shape (h, w, 2), f64."""
    out = np.empty((h, w, 2), dtype=np.float64)
    x0 = (w - ic.bump) // 2
    y0 = (h - ic.bump) // 2
    for y in range(h):
        for x in range(w):
            cell = y * w + x
            in_bump = ic.bump > 0 and x0 <= x < x0 + ic.bump and y0 <= y < y0 + ic.bump
            bu, bv = SEED[model] if in_bump else REST[model]
            out[y, x, 0] = bu + dyadic_noise(ic.seed, cell, 1, ic.amp, ic.bits)
            out[y, x, 1] = bv + dyadic_noise(ic.seed, cell, 2, ic.amp, ic.bits)
    return out


# ---------------------------------------------------------------- solver --


def rates(
    s: ModelSetup, u: np.ndarray, v: np.ndarray, lap_u: np.ndarray, lap_v: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """(du/dt, dv/dt): the same expressions in the same order as live.wgsl.

    Gray-Scott keeps the gated kernel's order; the other models add the
    bracketed reaction term to the diffusion term.
    """
    F, k, c = s.F, s.k, s.c
    if s.model == "gray-scott":
        uvv = u * v * v
        return s.Du * lap_u - uvv + F * (1.0 - u), s.Dv * lap_v + uvv - (F + k) * v
    if s.model == "brusselator":
        uuv = u * u * v
        return s.Du * lap_u + (F - (k + 1.0) * u + uuv), s.Dv * lap_v + (k * u - uuv)
    if s.model == "gierer-meinhardt":
        uu = u * u
        return s.Du * lap_u + (uu / v - F * u + c), s.Dv * lap_v + (uu - k * v)
    if s.model == "fitzhugh-nagumo":
        return s.Du * lap_u + (u - u * u * u - v), s.Dv * lap_v + F * (u - k * v - c)
    raise ValueError(s.model)


def _lap(f: np.ndarray, dx2: float) -> np.ndarray:
    """left + right + up + down - 4 * centre, periodic, over dx**2 (live.wgsl order)."""
    out: np.ndarray = (
        np.roll(f, 1, axis=1)
        + np.roll(f, -1, axis=1)
        + np.roll(f, 1, axis=0)
        + np.roll(f, -1, axis=0)
        - 4.0 * f
    ) / dx2
    return out


def step(state: np.ndarray, s: ModelSetup, steps: int) -> np.ndarray:
    """Advance an (h, w, 2) state by ``steps`` forward-Euler steps; returns a new array."""
    u = state[..., 0].copy()
    v = state[..., 1].copy()
    dx2 = s.dx * s.dx
    for _ in range(steps):
        du, dv = rates(s, u, v, _lap(u, dx2), _lap(v, dx2))
        u, v = u + s.dt * du, v + s.dt * dv
    return np.stack([u, v], axis=-1)


def sha256_f64(a: np.ndarray) -> str:
    return "sha256:" + hashlib.sha256(np.ascontiguousarray(a, dtype="<f8").tobytes()).hexdigest()


# ------------------------------------------------- linear stability ------


def brusselator_jacobian(A: float, B: float) -> tuple[float, float, float, float]:
    """Jacobian (f_u, f_v, g_u, g_v) at the uniform state (u*, v*) = (A, B/A)."""
    return (B - 1.0, A * A, -B, -A * A)


def brusselator_closed_forms(A: float, Du: float, Dv: float) -> dict[str, float]:
    """Onset B_c = (1 + A sqrt(Du/Dv))**2, q_c**2 = A / sqrt(Du Dv), Hopf B_H = 1 + A**2."""
    return {
        "B_c": (1.0 + A * math.sqrt(Du / Dv)) ** 2,
        "q_c2": A / math.sqrt(Du * Dv),
        "B_H": 1.0 + A * A,
    }


def growth_continuum(J: tuple[float, float, float, float], Du: float, Dv: float, Q: float) -> float:
    """Re of the larger eigenvalue of J - Q diag(Du, Dv) (Q = |q|**2)."""
    a, b, c, d = J
    tr = a + d - (Du + Dv) * Q
    det = (a - Du * Q) * (d - Dv * Q) - b * c
    disc = tr * tr - 4.0 * det
    return 0.5 * (tr + math.sqrt(disc)) if disc >= 0.0 else 0.5 * tr


def _golden_max(fn: Callable[[float], float], lo: float, hi: float, tol: float = 1e-12) -> float:
    """Maximise a unimodal fn on [lo, hi] by golden-section search."""
    g = (math.sqrt(5.0) - 1.0) / 2.0
    a, b = lo, hi
    x1 = b - g * (b - a)
    x2 = a + g * (b - a)
    f1, f2 = fn(x1), fn(x2)
    while b - a > tol * max(1.0, abs(a) + abs(b)):
        if f1 < f2:
            a, x1, f1 = x1, x2, f2
            x2 = a + g * (b - a)
            f2 = fn(x2)
        else:
            b, x2, f2 = x2, x1, f1
            x1 = b - g * (b - a)
            f1 = fn(x1)
    return 0.5 * (a + b)


def _bracket(
    fn: Callable[[float], float], lo: float, hi: float, n: int = 2000
) -> tuple[float, float]:
    xs = np.linspace(lo, hi, n + 1)
    ys = [fn(float(x)) for x in xs]
    i = int(np.argmax(ys))
    return float(xs[max(i - 1, 0)]), float(xs[min(i + 1, n)])


def fastest_growing_continuum(
    J: tuple[float, float, float, float], Du: float, Dv: float
) -> tuple[float, float]:
    """(Q*, sigma*) — the continuum dispersion relation's maximum over Q = |q|**2 in (0, 4 Q_hi]."""
    a, _, _, d = J
    q_hi = max(abs(a), abs(d)) / min(Du, Dv) * 4.0 + 1.0
    lo, hi = _bracket(lambda Q: growth_continuum(J, Du, Dv, Q), 0.0, q_hi)
    q = _golden_max(lambda Q: growth_continuum(J, Du, Dv, Q), lo, hi)
    return q, growth_continuum(J, Du, Dv, q)


def amplification(
    J: tuple[float, float, float, float],
    Du: float,
    Dv: float,
    dx: float,
    dt: float,
    kx: float,
    ky: float,
) -> float:
    """Spectral radius of I + dt (J - lam diag(Du, Dv)) for mode (kx, ky), rad per cell."""
    lam = (4.0 / (dx * dx)) * (math.sin(0.5 * kx) ** 2 + math.sin(0.5 * ky) ** 2)
    a = 1.0 + dt * (J[0] - Du * lam)
    b = dt * J[1]
    c = dt * J[2]
    d = 1.0 + dt * (J[3] - Dv * lam)
    tr = a + d
    det = a * d - b * c
    disc = tr * tr - 4.0 * det
    if disc >= 0.0:
        return 0.5 * (abs(tr) + math.sqrt(disc))
    return math.sqrt(max(det, 0.0))


RING_ANGLES: Final[int] = 720


def ring_growth(
    J: tuple[float, float, float, float],
    Du: float,
    Dv: float,
    dx: float,
    dt: float,
    n: int,
    r: float,
) -> float:
    """Discrete-scheme growth rate per unit time, averaged over the ring of r waves per window."""
    acc = 0.0
    for j in range(RING_ANGLES):
        th = (j + 0.5) / RING_ANGLES * (math.pi / 2.0)
        kx = 2.0 * math.pi * r * math.cos(th) / n
        ky = 2.0 * math.pi * r * math.sin(th) / n
        acc += math.log(amplification(J, Du, Dv, dx, dt, kx, ky))
    return acc / RING_ANGLES / dt


def fastest_growing_discrete(
    J: tuple[float, float, float, float], Du: float, Dv: float, dx: float, dt: float, n: int
) -> tuple[float, float]:
    """(r*, sigma*) — the discrete scheme's fastest-growing ring, r in waves per n-cell window."""

    def fn(r: float) -> float:
        return ring_growth(J, Du, Dv, dx, dt, n, r)

    lo, hi = _bracket(fn, 1.0, n / 2.0 - 1.0, 400)
    r = _golden_max(fn, lo, hi, 1e-10)
    return r, fn(r)


def wavenumber_to_ring(q: float, dx: float, n: int) -> float:
    """q [rad / length] -> waves per n-cell window of spacing dx."""
    return q * dx * n / (2.0 * math.pi)
