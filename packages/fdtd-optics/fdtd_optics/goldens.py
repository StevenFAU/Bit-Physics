"""Analytic golden generators — Mie, Fresnel, slab n_eff, grating, dispersion.

Every generator recomputes a closed-form / special-function reference value
for the committed golden tables in
``tools/testkit/golden/tables/electromagnetics/`` (spec
`docs/sim-specs/electromagnetics/fdtd-optics/spec-ref.md` § 4, § 7). VALIDATED
math — anchored by the Wiscombe MIEV0 sphere values (x=5.21282, m=1.55 ->
Q_ext=Q_sca=3.10543) and the lossless ext≡sca self-check; keep the algebra
exactly (tidy/refactor style only).

Sign-convention trap (spec § 4 E'): everything here is Bohren & Huffman
e^{-iwt} — absorbing media have Im(m) > 0 (Wiscombe's m=1.5-1i becomes
m=1.5+1j here, or the "absorber" turns into gain).
"""

from __future__ import annotations

import numpy as np
from scipy import special
from scipy.optimize import brentq

# ---------------------------------------------------------------------------
# Mie series (Bohren & Huffman)
# ---------------------------------------------------------------------------


def _nmax(x: float) -> int:
    """Wiscombe series-truncation heuristic + safety margin."""
    return int(x + 4.05 * x ** (1 / 3) + 2) + 15


def mie_sphere(x: float, m: complex, nmax: int | None = None) -> tuple[float, float]:
    """3D-sphere Mie efficiencies (Q_ext, Q_sca) — B&H Ch. 4, e^{-iwt}.

    Riccati-Bessel psi/chi/xi via half-integer scipy Bessel functions; the
    trust-anchor for the self-authored cylinder code (spec § 4 E').
    """
    if nmax is None:
        nmax = _nmax(x)
    n = np.arange(1, nmax + 1)
    z = m * x
    sx = np.sqrt(np.pi * x / 2)
    psi = sx * special.jv(n + 0.5, x)
    psi0 = sx * special.jv(0.5, x)
    psi_all = np.concatenate(([psi0], psi))
    dpsi = psi_all[:-1] - n / x * psi
    chi = -sx * special.yv(n + 0.5, x)
    chi0 = -sx * special.yv(0.5, x)
    chi_all = np.concatenate(([chi0], chi))
    dchi = chi_all[:-1] - n / x * chi
    xi = psi - 1j * chi
    dxi = dpsi - 1j * dchi
    sz = np.sqrt(np.pi * z / 2)
    psim = sz * special.jv(n + 0.5, z)
    psim0 = sz * special.jv(0.5, z)
    psim_all = np.concatenate(([psim0], psim))
    dpsim = psim_all[:-1] - n / z * psim
    a = (m * psim * dpsi - psi * dpsim) / (m * psim * dxi - xi * dpsim)
    b = (psim * dpsi - m * psi * dpsim) / (psim * dxi - m * xi * dpsim)
    qext = 2 / x**2 * np.sum((2 * n + 1) * (a + b).real)
    qsca = 2 / x**2 * np.sum((2 * n + 1) * (np.abs(a) ** 2 + np.abs(b) ** 2))
    return float(qext), float(qsca)


def mie_cylinder(
    x: float, m: complex, nmax: int | None = None
) -> tuple[float, float, float, float]:
    """Normal-incidence infinite-cylinder Mie — B&H Ch. 8, e^{-iwt}.

    TM = E parallel to the cylinder axis (our TMz polarization). Returns
    ``(q_ext_tm, q_sca_tm, q_ext_te, q_sca_te)``. Self-authored; anchored by
    the Wiscombe sphere values and the lossless ext≡sca identity.
    """
    if nmax is None:
        nmax = _nmax(x)
    n = np.arange(0, nmax + 1)
    z = m * x
    jx = special.jv(n, x)
    jz = special.jv(n, z)
    hx = special.hankel1(n, x)
    # J_{n-1} with the n=0 row from J_{-1} = -J_1 (same for H^(1)).
    jxm1 = np.concatenate(([-jx[1]], jx[:-1]))
    jzm1 = np.concatenate(([-jz[1]], jz[:-1]))
    hxm1 = np.concatenate(([-hx[1]], hx[:-1]))
    djx = jxm1 - n / x * jx
    djz = jzm1 - n / z * jz
    dhx = hxm1 - n / x * hx
    b_tm = (m * djz * jx - jz * djx) / (m * djz * hx - jz * dhx)
    a_te = (djz * jx - m * jz * djx) / (djz * hx - m * jz * dhx)

    def q(coef: np.ndarray) -> tuple[float, float]:
        qs = 2 / x * (np.abs(coef[0]) ** 2 + 2 * np.sum(np.abs(coef[1:]) ** 2))
        qe = 2 / x * (coef[0] + 2 * np.sum(coef[1:])).real
        return float(qe), float(qs)

    qe_tm, qs_tm = q(b_tm)
    qe_te, qs_te = q(a_te)
    return qe_tm, qs_tm, qe_te, qs_te


def rayleigh_qsca_sphere(x: float, m: complex) -> float:
    """Rayleigh small-particle limit Q_sca = (8/3) x^4 |(m^2-1)/(m^2+2)|^2
    (van de Hulst § 6.4 / B&H § 5.1) — the independent small-x closed-form
    anchor for the full Mie series."""
    lp = (m * m - 1.0) / (m * m + 2.0)
    return float(8.0 / 3.0 * x**4 * abs(lp) ** 2)


# ---------------------------------------------------------------------------
# Fresnel closed forms (spec § 4 goldens A-C)
# ---------------------------------------------------------------------------


def fresnel_rs_rp(theta_deg: float, n1: float, n2: float) -> tuple[float, float]:
    """Fresnel power reflectances (R_s, R_p) at incidence ``theta_deg`` from
    medium n1 into n2 (Hecht / B&H closed forms). Beyond the critical angle
    (n1 > n2) both are exactly 1 (TIR)."""
    th = np.deg2rad(theta_deg)
    sin_t = n1 / n2 * np.sin(th)
    if abs(sin_t) > 1.0:
        return 1.0, 1.0
    cos_i = np.cos(th)
    cos_t = np.sqrt(1.0 - sin_t * sin_t)
    rs = (n1 * cos_i - n2 * cos_t) / (n1 * cos_i + n2 * cos_t)
    rp = (n2 * cos_i - n1 * cos_t) / (n2 * cos_i + n1 * cos_t)
    return float(rs * rs), float(rp * rp)


def fresnel_ts_tp(theta_deg: float, n1: float, n2: float) -> tuple[float, float]:
    """Fresnel power transmittances (T_s, T_p): T = (n2 cos_t)/(n1 cos_i) t^2
    with the amplitude coefficients of Hecht § 4.6. Beyond the critical angle
    both are exactly 0 — the R + T = 1 energy identity partners of
    ``fresnel_rs_rp`` (lossless interface)."""
    th = np.deg2rad(theta_deg)
    sin_t = n1 / n2 * np.sin(th)
    if abs(sin_t) > 1.0:
        return 0.0, 0.0
    cos_i = np.cos(th)
    cos_t = np.sqrt(1.0 - sin_t * sin_t)
    ts = 2.0 * n1 * cos_i / (n1 * cos_i + n2 * cos_t)
    tp = 2.0 * n1 * cos_i / (n2 * cos_i + n1 * cos_t)
    ratio = (n2 * cos_t) / (n1 * cos_i)
    return float(ratio * ts * ts), float(ratio * tp * tp)


def brewster_angle_deg(n1: float, n2: float) -> float:
    """theta_B = arctan(n2/n1) — R_p -> 0 (spec § 4 golden B)."""
    return float(np.rad2deg(np.arctan2(n2, n1)))


def critical_angle_deg(n1: float, n2: float) -> float:
    """theta_c = arcsin(n2/n1) for n1 > n2 — TIR onset (spec § 4 golden C)."""
    return float(np.rad2deg(np.arcsin(n2 / n1)))


# ---------------------------------------------------------------------------
# Symmetric slab waveguide n_eff (spec § 4 golden F)
# ---------------------------------------------------------------------------


def slab_v_number(
    wavelength: float, thickness: float, n_core: float, n_clad: float
) -> float:
    """Normalized frequency V = k0 * a * sqrt(n_core^2 - n_clad^2) with the
    half-thickness convention a = thickness/2 (Saleh & Teich, Fundamentals of
    Photonics, Ch. 8). V < pi/2 means the symmetric slab is single-moded
    per polarization."""
    a = thickness / 2.0
    return float(2.0 * np.pi / wavelength * a * np.sqrt(n_core**2 - n_clad**2))


def slab_neff(
    wavelength: float,
    thickness: float,
    n_core: float,
    n_clad: float,
    polarization: str = "TE",
) -> float:
    """Fundamental-mode effective index of a symmetric slab (BYU ECE360
    § 7.3 half-thickness convention, brentq on the transcendental root):

        TE0:  u tan u = sqrt(V^2 - u^2)
        TM0:  u tan u = (n_core/n_clad)^2 * sqrt(V^2 - u^2)

    with u = k0*a*sqrt(n_core^2 - n_eff^2), a = thickness/2 and
    V = k0*a*sqrt(n_core^2 - n_clad^2). Validated pair (220 nm Si n=3.48 in
    SiO2 n=1.44 at 1.525 um): TE0 = 2.8631679, TM0 = 2.0826428.
    """
    a = thickness / 2.0
    k0 = 2.0 * np.pi / wavelength
    v = k0 * a * np.sqrt(n_core**2 - n_clad**2)
    factor = 1.0 if polarization.upper() == "TE" else (n_core / n_clad) ** 2

    def f(u: float) -> float:
        return u * np.tan(u) - factor * np.sqrt(max(v * v - u * u, 0.0))

    hi = min(v, np.pi / 2.0)
    u0 = float(brentq(f, 1e-12, hi - 1e-12, xtol=1e-15, rtol=8.9e-16))
    return float(np.sqrt(n_core**2 - (u0 / (k0 * a)) ** 2))


# ---------------------------------------------------------------------------
# Grating equation (spec § 4 golden D)
# ---------------------------------------------------------------------------


def grating_orders(d: float, wavelength: float, m_range: int = 2) -> dict[int, float]:
    """Normal-incidence grating-equation angles sin(theta_m) = m*lambda/d in
    degrees for |m| <= m_range where |m*lambda/d| <= 1 (|sin| = 1 exactly is
    reported as the +-90 deg grazing cutoff)."""
    out: dict[int, float] = {}
    for m in range(-m_range, m_range + 1):
        sin_m = m * wavelength / d
        if abs(sin_m) <= 1.0:
            out[m] = float(np.rad2deg(np.arcsin(sin_m)))
    return out


def propagating_order_count(d: float, wavelength: float) -> int:
    """Number of strictly propagating orders (|m*lambda/d| < 1; the exact
    |sin| = 1 grazing cutoff is excluded)."""
    m_max = int(np.floor(d / wavelength))
    if m_max * wavelength / d == 1.0:
        m_max -= 1
    return 2 * m_max + 1


# ---------------------------------------------------------------------------
# Numerical-dispersion master relation (spec § 3.7, golden K)
# ---------------------------------------------------------------------------


def dispersion_vp_ratio(sc: float, n_lambda: float, theta_deg: float) -> float:
    """Numerical phase-velocity ratio vp/c on the 2D Yee grid.

    Solves the § 3.7 master relation for the numerical wavenumber k~ along
    propagation angle ``theta_deg`` (square cells Delta=1, c=1,
    Delta_t = S_c) at ``n_lambda`` cells per free-space wavelength:

        [sin(w*dt/2) / (c*dt)]^2 = sum_xi [sin(k~_xi * Delta/2) / Delta]^2

    and returns vp_ratio = w / (k~ c). S_c = 1 is dispersionless only in 1D;
    in 2D the error is largest on-axis, smallest on the diagonal (Schneider
    uFDTD dispersion chapter).
    """
    th = np.deg2rad(theta_deg)
    k_phys = 2.0 * np.pi / n_lambda
    omega = k_phys  # c = 1
    lhs = (np.sin(omega * sc / 2.0) / sc) ** 2
    cx, sy = np.cos(th), np.sin(th)

    def f(k: float) -> float:
        return np.sin(k * cx / 2.0) ** 2 + np.sin(k * sy / 2.0) ** 2 - lhs

    k_num = float(brentq(f, 0.25 * k_phys, 2.0 * k_phys, xtol=1e-15, rtol=8.9e-16))
    return float(omega / k_num)


__all__ = [
    "brewster_angle_deg",
    "critical_angle_deg",
    "dispersion_vp_ratio",
    "fresnel_rs_rp",
    "fresnel_ts_tp",
    "grating_orders",
    "mie_cylinder",
    "mie_sphere",
    "propagating_order_count",
    "rayleigh_qsca_sphere",
    "slab_neff",
    "slab_v_number",
]
