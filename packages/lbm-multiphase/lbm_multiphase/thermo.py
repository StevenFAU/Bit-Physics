"""Pseudopotential thermodynamics — EOS, coexistence solvers, negative controls.

Convention (NORMATIVE for this package, spec
`docs/sim-specs/lattice/lbm-multiphase/spec-ref.md` § 3.3 — the Krüger et al.
2017 ch. 9 lattice-weight form): the interaction force is

    F(x) = -G psi(x) * sum_i w_i psi(x + c_i) c_i

with the D2Q9 LATTICE weights w_i (sum_i w_i c_i c_i = cs^2 I), giving the
bulk equation of state

    p(rho) = rho cs^2 + (G cs^2 / 2) psi(rho)^2 .

Mapping to the common "w(|c|^2)" multiphase-literature convention (w(1)=1/3,
w(2)=1/12; e.g. Li-Luo-Li PRE 86, 016709): w(|c_i|^2) = 3 w_i exactly, so
G_here = 3 G_there. Li's C-S setup "G = -1" is G = -3 here. Any G value
without its convention is meaningless (spec § 3.3, refuted-claims R1/R2).

Every solver here is f64 SciPy/NumPy — the *targets* side of the gates. The
lattice side lives in `reference.py`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Final

import numpy as np
from scipy.integrate import quad
from scipy.optimize import brentq

CS2: Final[float] = 1.0 / 3.0  # D2Q9 lattice sound speed squared

# ---------------------------------------------------------------------------
# Pseudopotentials
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Psi:
    """A pseudopotential: value and analytic derivative."""

    name: str
    f: Callable[[np.ndarray | float], np.ndarray | float]
    df: Callable[[np.ndarray | float], np.ndarray | float]


def psi_sc94(rho0: float = 1.0) -> Psi:
    """Original Shan-Chen 1993/94 form psi = rho0 (1 - exp(-rho/rho0)).

    Thermodynamically INCONSISTENT (coexistence deviates from Maxwell);
    kept as the G_c negative-control potential: critical point at
    rho_c = rho0 ln 2, G_c = -4/rho0 in this package's convention
    (spec § 3.3 derivation).
    """
    return Psi(
        name=f"sc94(rho0={rho0})",
        f=lambda rho: rho0 * (1.0 - np.exp(-np.asarray(rho, dtype=np.float64) / rho0)),
        df=lambda rho: np.exp(-np.asarray(rho, dtype=np.float64) / rho0),
    )


def psi_exp(psi0: float = 1.0, rho0: float = 1.0) -> Psi:
    """Tier-A potential psi = psi0 exp(-rho0/rho) (Shan-Chen 1994 § 3).

    The unique shape family with psi'/psi = rho0/rho^2 — proportional to the
    Maxwell 1/rho^2 weight, so the mechanical-stability condition with
    epsilon = 0 (Guo forcing) reduces EXACTLY to the Maxwell equal-area rule
    (spec § 3.2; Chen 2014 consistency <=> exp(-1/rho), verifier re-derived).
    """
    return Psi(
        name=f"exp(psi0={psi0},rho0={rho0})",
        f=lambda rho: psi0 * np.exp(-rho0 / np.asarray(rho, dtype=np.float64)),
        df=lambda rho: (
            psi0
            * (rho0 / np.asarray(rho, dtype=np.float64) ** 2)
            * np.exp(-rho0 / np.asarray(rho, dtype=np.float64))
        ),
    )


# Carnahan-Starling EOS (Tier B), Li-Luo-Li 2012 constants: a=1, b=4, R=1,
# T_c = 0.0943..., rho_c ~ 0.13044 (anchor values, spec § 3.2).
CS_A: Final[float] = 1.0
CS_B: Final[float] = 4.0
CS_R: Final[float] = 1.0
# G is a sign carrier for the Yuan-Schaefer psi; Li's G=-1 in the w(|c|^2)
# convention == -3 in this package's lattice-weight convention (module doc).
CS_G: Final[float] = -3.0


def p_carnahan_starling(rho: np.ndarray | float, temp: float) -> np.ndarray | float:
    """C-S pressure p = rho R T (1+phi+phi^2-phi^3)/(1-phi)^3 - a rho^2."""
    r = np.asarray(rho, dtype=np.float64)
    phi = CS_B * r / 4.0
    return (
        r * CS_R * temp * (1.0 + phi + phi * phi - phi**3) / (1.0 - phi) ** 3
        - CS_A * r * r
    )


def cs_critical_point() -> tuple[float, float]:
    """(T_c, rho_c) of the C-S EOS by solving dp/drho = d2p/drho2 = 0 (f64).

    Anchors: T_c = 0.0943, rho_c ~ 0.13044 (Li-Luo-Li [3-0], spec § 3.2).
    """

    def dp(rho: float, temp: float) -> float:
        h = 1e-7
        return float(
            p_carnahan_starling(rho + h, temp) - p_carnahan_starling(rho - h, temp)
        ) / (2 * h)

    def d2p(rho: float, temp: float) -> float:
        h = 1e-5
        return float(
            p_carnahan_starling(rho + h, temp)
            - 2.0 * p_carnahan_starling(rho, temp)
            + p_carnahan_starling(rho - h, temp)
        ) / (h * h)

    # For T slightly below T_c, dp has two roots (spinodals) that merge at T_c.
    def spinodal_gap(temp: float) -> float:
        lo, hi = 0.02, 0.4
        xs = np.linspace(lo, hi, 2000)
        d = np.array([dp(float(x), temp) for x in xs])
        return float(d.min())

    t_c = brentq(spinodal_gap, 0.05, 0.2, xtol=1e-12)
    xs = np.linspace(0.02, 0.4, 4000)
    d2 = np.array([abs(d2p(float(x), t_c)) for x in xs])
    rho_c = float(xs[d2.argmin()])
    # polish rho_c on d2p = 0
    rho_c = brentq(lambda r: d2p(r, t_c), rho_c - 0.02, rho_c + 0.02, xtol=1e-12)
    return float(t_c), float(rho_c)


def psi_cs(temp: float) -> Psi:
    """Yuan-Schaefer potential for the C-S EOS at temperature `temp`:

        psi = sqrt( 2 (p_EOS - rho cs^2) / (G cs^2) ),   G = CS_G < 0.

    In this package's convention the bulk EOS then reproduces p_EOS exactly.
    The argument 2(p-rho cs^2)/(G cs^2) must be positive over the operating
    range — asserted by the gate scenes (no silent max(0,.) clamp; the
    rafaelanderka positivity-clamp trap, spec § 2.3.1).
    """

    def val(rho: np.ndarray | float) -> np.ndarray | float:
        r = np.asarray(rho, dtype=np.float64)
        arg = 2.0 * (p_carnahan_starling(r, temp) - r * CS2) / (CS_G * CS2)
        if np.any(np.asarray(arg) <= 0):
            raise ValueError("psi_cs argument non-positive — outside envelope")
        return np.sqrt(arg)

    def dval(rho: np.ndarray | float) -> np.ndarray | float:
        r = np.asarray(rho, dtype=np.float64)
        h = 1e-7
        return (np.asarray(val(r + h)) - np.asarray(val(r - h))) / (2 * h)

    return Psi(name=f"cs(T={temp})", f=val, df=dval)


# ---------------------------------------------------------------------------
# Bulk EOS and critical-coupling negative control
# ---------------------------------------------------------------------------


def bulk_pressure(rho: np.ndarray | float, g: float, psi: Psi) -> np.ndarray | float:
    """p = rho cs^2 + (G cs^2/2) psi^2 (this package's convention, § 3.3)."""
    r = np.asarray(rho, dtype=np.float64)
    ps = np.asarray(psi.f(r))
    return r * CS2 + 0.5 * g * CS2 * ps * ps


def gc_bisection(psi: Psi, rho_lo: float = 0.01, rho_hi: float = 6.0) -> float:
    """Numerically find G_c: the G at which dp/drho develops a double root.

    dp/drho = cs^2 (1 + G psi psi'); its minimum over rho crosses zero at
    G = G_c. Permanent negative control for spec § 3.3 (asserted vs the
    analytic -4/rho0 for `psi_sc94` at import of the gate module).
    """
    xs = np.linspace(rho_lo, rho_hi, 20001)
    pp = np.asarray(psi.f(xs)) * np.asarray(psi.df(xs))
    m = float(pp.max())  # G_c = -1/max(psi psi') (most negative constraint)
    return -1.0 / m


def gc_analytic_sc94(rho0: float = 1.0) -> tuple[float, float]:
    """(rho_c, G_c) = (rho0 ln 2, -4/rho0) for psi_sc94 — spec § 3.3."""
    return rho0 * float(np.log(2.0)), -4.0 / rho0


# ---------------------------------------------------------------------------
# Coexistence solvers
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Coexistence:
    rho_v: float
    rho_l: float
    p0: float
    ratio: float


def _pressure_roots(
    p: Callable[[float], float], p0: float, xs: np.ndarray, pv: np.ndarray
) -> tuple[float, float]:
    """Outermost roots of p(rho) = p0 (vapor & liquid branches), detected on
    the SAME sampled grid used to bracket p0 (so a p0 inside the sampled
    [min, max] range always finds its crossings) and polished by brentq."""
    sign = np.sign(pv - p0)
    crossings = np.nonzero(np.diff(sign) != 0)[0]
    if len(crossings) < 2:
        raise ValueError("p(rho)=p0 has <2 roots — p0 outside binodal window")
    a0, a1 = crossings[0], crossings[-1]
    rv = brentq(lambda r: p(r) - p0, xs[a0], xs[a0 + 1], xtol=1e-14)
    rl = brentq(lambda r: p(r) - p0, xs[a1], xs[a1 + 1], xtol=1e-14)
    return float(rv), float(rl)


def _binodal_solve(
    p: Callable[[float], float],
    weight: Callable[[float], float],
    rho_lo: float,
    rho_hi: float,
) -> Coexistence:
    """Shared binodal machinery: find p0 with p(rho_v)=p(rho_l)=p0 and
    integral_{rho_v}^{rho_l} (p0 - p(rho)) * weight(rho) drho = 0.

    The p0 bracket is [max(local-min, p(rho_lo)), local-max]: below
    p(rho_lo) the vapor branch has no root inside the search window.
    """
    xs = np.linspace(rho_lo, rho_hi, 20001)
    pv = np.array([p(float(x)) for x in xs])
    dp = np.diff(pv)
    turn = np.nonzero(np.diff(np.sign(dp)) != 0)[0]
    if len(turn) < 2:
        raise ValueError("no van-der-Waals loop (G above critical?)")
    p_hi = float(pv[turn[0]])  # local maximum (liquid-side ceiling)
    p_lo = max(float(pv[turn[-1]]), float(pv[0]))  # local min vs rho_lo floor

    def integral(p0: float) -> float:
        rv, rl = _pressure_roots(p, p0, xs, pv)
        val, _ = quad(lambda r: (p0 - p(r)) * weight(r), rv, rl, limit=400)
        return float(val)

    span = p_hi - p_lo
    p0 = brentq(integral, p_lo + 1e-7 * span, p_hi - 1e-7 * span, xtol=1e-15)
    rv, rl = _pressure_roots(p, p0, xs, pv)
    return Coexistence(rho_v=rv, rho_l=rl, p0=float(p0), ratio=rl / rv)


def coexistence_mechanical(
    g: float,
    psi: Psi,
    epsilon: float,
    rho_lo: float = 0.01,
    rho_hi: float = 6.0,
) -> Coexistence:
    """Pseudopotential mechanical-stability coexistence
    (Li-Luo-Li 2012 eq. 26; Shan PRE 77, 066702 lineage):

        integral_{rho_v}^{rho_l} (p0 - p(rho)) psi'/psi^{1+eps} drho = 0
        with p(rho_v) = p(rho_l) = p0.

    epsilon encodes the forcing scheme: Guo eps=0 (for psi_exp this is
    EXACTLY the Maxwell equal-area rule — psi'/psi = rho0/rho^2); the
    sigma-scheme has eps = -2(alpha + 24 G_li sigma)/beta = 16 sigma for
    C-S/G_li=-1/nearest-neighbor (alpha=0, beta=3) — sigma=0.105 -> 1.68.
    """

    def p(rho: float) -> float:
        return float(bulk_pressure(rho, g, psi))

    def w(rho: float) -> float:
        ps = float(np.asarray(psi.f(rho)))
        dps = float(np.asarray(psi.df(rho)))
        return dps / ps ** (1.0 + epsilon)

    return _binodal_solve(p, w, rho_lo, rho_hi)


def coexistence_maxwell(
    g: float, psi: Psi, rho_lo: float = 0.01, rho_hi: float = 6.0
) -> Coexistence:
    """Maxwell equal-area construction on the bulk EOS: the eps-integral
    with the exact 1/rho^2 volume weight (integral (p0-p)/rho^2 drho = 0)."""

    def p(rho: float) -> float:
        return float(bulk_pressure(rho, g, psi))

    return _binodal_solve(p, lambda r: 1.0 / (r * r), rho_lo, rho_hi)


__all__ = [
    "CS2",
    "CS_A",
    "CS_B",
    "CS_G",
    "CS_R",
    "Coexistence",
    "Psi",
    "bulk_pressure",
    "coexistence_maxwell",
    "coexistence_mechanical",
    "cs_critical_point",
    "gc_analytic_sc94",
    "gc_bisection",
    "p_carnahan_starling",
    "psi_cs",
    "psi_exp",
    "psi_sc94",
]
