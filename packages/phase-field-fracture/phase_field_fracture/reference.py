"""f64 NumPy reference — phase-field brittle fracture on a regular grid.

Variational (Ambrosio-Tortorelli AT2) brittle fracture per spec-ref.md § 1:
a damage field d in [0,1] on cell centers, displacement (ux, uy) on nodes,
plane-strain Q1 elasticity with full 2x2 Gauss quadrature (no hourglass
modes), explicit velocity-Verlet dynamics with lumped mass, and the hybrid
formulation (Ambati 2015): the momentum stress is isotropic degraded
``g(d) * sigma_0`` while the tension/compression split (Miehe strain-
spectral) enters ONLY the crack driving force psi_plus (spec-ref.md § 3.2).

Non-dimensionalization (spec-ref.md § 9): length unit ell, energy-density
unit Gc/ell, density rho = 1. In these units Gc = 1, ell = 1, and the single
large group is E_tilde = E*ell/Gc (~1.17e3 for the Miehe SENT steel). All
steppers are dtype-preserving so the same code runs the f64 gates AND the
f32 WGSL-proxy tolerance measurement (the heat-equation/schrodinger proxy
pattern).

Damage updates (spec-ref.md § 3.5):

- ``gradient_flow_damage`` — the v1 browser baseline: ONE fused local
  semi-implicit step of the AT2 energy gradient flow with mobility knob
  m = chi*dt (local terms implicit, Laplacian neighbours explicit),

      d_new = (d + m*(2H + S/h^2)) / (1 + m*(1 + 2H + 4/h^2))
      d     <- max(d, d_new)                       (irreversibility, § 3.3)

  whose m -> inf limit is exactly one damped-Jacobi sweep of the elliptic
  optimality system — the finite-mobility Gamma(v) cost is disclosed and
  gated (honesty boundary #3).
- ``elliptic_damage_solve`` — the converged optimality form
  (1 + 2H) d - lap(d) = 2H via warm-started matrix-free CG: the f64
  reference and the G-Gammav gate anchor.

Analytic fixtures (spec-ref.md § 7.G): AT1/AT2 closed-form constants
(sigma_c, H_crit), the 1D optimal damage profiles, and the AT2 homogeneous
stress-strain response used by the golden tests.
"""

from __future__ import annotations

import numpy as np

# ---------------------------------------------------------------------------
# Material / non-dimensional groups (spec-ref.md § 4 reference params)
# ---------------------------------------------------------------------------

# Miehe SENT steel: E = 210e3 MPa, nu = 0.3, Gc = 2.7 N/mm, ell = 0.015 mm.
E_PHYS_MPA = 210_000.0
NU_MIEHE = 0.3
GC_PHYS_N_PER_MM = 2.7
ELL_PHYS_MM = 0.015
SPECIMEN_MM = 1.0
E_TILDE_MIEHE = E_PHYS_MPA * ELL_PHYS_MM / GC_PHYS_N_PER_MM  # ~1166.67
L_TILDE_MIEHE = SPECIMEN_MM / ELL_PHYS_MM  # ~66.67
# Force per unit thickness in non-dim units is Gc; the Miehe specimen is
# 1 mm thick, so F_phys[N] = F_tilde * GC_PHYS_N_PER_MM * 1 mm.
FORCE_UNIT_N = GC_PHYS_N_PER_MM * 1.0
# PhaseFieldX example-1711 reproduction of the Miehe SENT peak (spec-ref.md
# § 4 A provenance: a reproduction value, not a Miehe-2010 digit).
SENT_PEAK_REPRODUCTION_KN = 0.7012


def plane_strain_lame(e: float, nu: float) -> tuple[float, float]:
    """(lambda, mu) from (E, nu) — plane strain uses the 3D Lame lambda."""
    lam = e * nu / ((1.0 + nu) * (1.0 - 2.0 * nu))
    mu = e / (2.0 * (1.0 + nu))
    return lam, mu


def dilatational_speed(lam: float, mu: float, rho: float = 1.0) -> float:
    """c_d = sqrt((lambda + 2 mu)/rho) — the explicit CFL speed."""
    return float(np.sqrt((lam + 2.0 * mu) / rho))


def rayleigh_speed(lam: float, mu: float, rho: float = 1.0) -> float:
    """Rayleigh speed via the Rahman-Michelitsch approximation
    c_R ~= c_s * (0.874 + 1.196 nu)/(1 + nu) for the G-branch band."""
    cs = float(np.sqrt(mu / rho))
    nu = lam / (2.0 * (lam + mu))
    return cs * (0.874 + 1.196 * nu) / (1.0 + nu)


# ---------------------------------------------------------------------------
# AT1/AT2 closed-form constants (spec-ref.md § 7.G goldens)
# ---------------------------------------------------------------------------


def sigma_c_at1(e: float, gc: float, ell: float) -> float:
    """AT1 uniaxial strength sigma_c = sqrt(3 Gc E / (8 ell))."""
    return float(np.sqrt(3.0 * gc * e / (8.0 * ell)))


def h_crit_at1(gc: float, ell: float) -> float:
    """AT1 elastic threshold H_crit = 3 Gc / (16 ell)."""
    return 3.0 * gc / (16.0 * ell)


def sigma_c_at2(e: float, gc: float, ell: float) -> float:
    """AT2 homogeneous peak sigma_c = sqrt(27 E Gc / (256 ell))."""
    return float(np.sqrt(27.0 * e * gc / (256.0 * ell)))


def at2_profile_1d(x: np.ndarray, ell: float) -> np.ndarray:
    """AT2 optimal 1D crack profile d(x) = exp(-|x|/ell)."""
    return np.exp(-np.abs(x) / ell)


def at1_profile_1d(x: np.ndarray, ell: float) -> np.ndarray:
    """AT1 optimal 1D crack profile d(x) = (1 - |x|/(2 ell))^2 on |x| < 2 ell."""
    return np.square(np.maximum(1.0 - np.abs(x) / (2.0 * ell), 0.0))


def surface_energy_1d(d: np.ndarray, h: float, ell: float, model: str) -> float:
    """Discrete regularized crack-surface energy of a 1D profile
    (Gc/c_w) * int (w(d)/ell + ell |d'|^2) dx with Gc = 1 — Gamma-converges
    to 1 (one crack) as ell/h -> inf, h -> 0 (spec-ref.md § 4 G)."""
    dd = np.diff(d) / h
    grad2 = float(np.sum(dd * dd) * h)
    if model == "at2":
        w_int = float(np.sum(d * d) * h)
        c_w = 2.0
    else:
        w_int = float(np.sum(d) * h)
        c_w = 8.0 / 3.0
    return (w_int / ell + ell * grad2) / c_w


def at2_homogeneous_damage(h_field: np.ndarray) -> np.ndarray:
    """Homogeneous (no-gradient) AT2 equilibrium d = 2H/(1 + 2H) in
    non-dim units (Gc = ell = 1) — the fixed point of both damage updates."""
    return 2.0 * h_field / (1.0 + 2.0 * h_field)


def at2_homogeneous_stress(eps: np.ndarray, e: float) -> np.ndarray:
    """Uniaxial homogeneous AT2 response sigma(eps) = (1-d)^2 E eps with
    H = E eps^2 / 2, in non-dim units (Gc = ell = 1). Peak is sigma_c_at2."""
    h_field = 0.5 * e * eps * eps
    d = at2_homogeneous_damage(h_field)
    return np.square(1.0 - d) * e * eps


# ---------------------------------------------------------------------------
# Q1 elasticity — 2x2 Gauss, matrix-free, dtype-preserving
# ---------------------------------------------------------------------------

_CORNER_SLICES = (
    (slice(0, -1), slice(0, -1)),  # SW
    (slice(1, None), slice(0, -1)),  # SE
    (slice(1, None), slice(1, None)),  # NE
    (slice(0, -1), slice(1, None)),  # NW
)


def q1_gradient_tables(h: float, dtype: np.dtype) -> tuple[np.ndarray, np.ndarray]:
    """Shape-function gradients dN[a, gp] at the 2x2 Gauss points of a
    uniform square Q1 element of side h (corner order SW, SE, NE, NW)."""
    g1 = 1.0 / np.sqrt(3.0)
    gps = ((-g1, -g1), (g1, -g1), (g1, g1), (-g1, g1))
    corners = ((-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0))
    dndx = np.zeros((4, 4))
    dndy = np.zeros((4, 4))
    for a, (xa, ea) in enumerate(corners):
        for g, (xg, eg) in enumerate(gps):
            dndx[a, g] = 0.25 * xa * (1.0 + eg * ea) * (2.0 / h)
            dndy[a, g] = 0.25 * ea * (1.0 + xg * xa) * (2.0 / h)
    return dndx.astype(dtype), dndy.astype(dtype)


def q1_internal_forces(
    ux: np.ndarray,
    uy: np.ndarray,
    g_stiff: np.ndarray,
    dndx: np.ndarray,
    dndy: np.ndarray,
    lam: float,
    mu: float,
    h: float,
) -> tuple[np.ndarray, np.ndarray, float]:
    """Internal nodal forces of the hybrid momentum pass + stored elastic
    energy: per-cell isotropic stress degraded by ``g_stiff`` (the product
    of g(d) = (1-d)^2 + k_res and the material field), integrated with full
    2x2 Gauss quadrature. Returns (fx, fy, ie)."""
    dtype = ux.dtype
    lam_c = np.asarray(lam, dtype=dtype)
    mu_c = np.asarray(mu, dtype=dtype)
    wdet = np.asarray((h / 2.0) ** 2, dtype=dtype)
    half = np.asarray(0.5, dtype=dtype)
    two = np.asarray(2.0, dtype=dtype)
    fx = np.zeros_like(ux)
    fy = np.zeros_like(uy)
    uxa = [ux[s] for s in _CORNER_SLICES]
    uya = [uy[s] for s in _CORNER_SLICES]
    ie = 0.0
    for g in range(4):
        exx = sum(dndx[a, g] * uxa[a] for a in range(4))
        eyy = sum(dndy[a, g] * uya[a] for a in range(4))
        exy = half * (
            sum(dndy[a, g] * uxa[a] for a in range(4))
            + sum(dndx[a, g] * uya[a] for a in range(4))
        )
        tr = exx + eyy
        sxx = g_stiff * (lam_c * tr + two * mu_c * exx)
        syy = g_stiff * (lam_c * tr + two * mu_c * eyy)
        sxy = g_stiff * (two * mu_c * exy)
        ie += float(
            wdet * half * np.sum(sxx * exx + syy * eyy + two * sxy * exy, dtype=dtype)
        )
        for a in range(4):
            fx[_CORNER_SLICES[a]] -= wdet * (dndx[a, g] * sxx + dndy[a, g] * sxy)
            fy[_CORNER_SLICES[a]] -= wdet * (dndy[a, g] * syy + dndx[a, g] * sxy)
    return fx, fy, ie


def center_strain(
    ux: np.ndarray, uy: np.ndarray, h: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Cell-center strain from the bilinear Q1 field (exx, eyy, exy)."""
    dtype = ux.dtype
    i2h = np.asarray(1.0 / (2.0 * h), dtype=dtype)
    half = np.asarray(0.5, dtype=dtype)
    uxa = [ux[s] for s in _CORNER_SLICES]
    uya = [uy[s] for s in _CORNER_SLICES]
    exx = ((uxa[1] + uxa[2]) - (uxa[0] + uxa[3])) * i2h
    eyy = ((uya[2] + uya[3]) - (uya[0] + uya[1])) * i2h
    exy = half * (
        ((uxa[2] + uxa[3]) - (uxa[0] + uxa[1])) * i2h
        + ((uya[1] + uya[2]) - (uya[0] + uya[3])) * i2h
    )
    return exx, eyy, exy


def psi_plus_miehe(
    exx: np.ndarray, eyy: np.ndarray, exy: np.ndarray, lam: float, mu: float
) -> np.ndarray:
    """Miehe strain-spectral tensile energy density psi_0^+ (2D eigen split,
    spec-ref.md § 8.2): only this drives damage — cracks do not grow in
    compression (gate G-split)."""
    dtype = exx.dtype
    lam_c = np.asarray(lam, dtype=dtype)
    mu_c = np.asarray(mu, dtype=dtype)
    half = np.asarray(0.5, dtype=dtype)
    zero = np.asarray(0.0, dtype=dtype)
    tr = exx + eyy
    disc = np.sqrt(np.square((exx - eyy) * half) + np.square(exy))
    e1 = tr * half + disc
    e2 = tr * half - disc
    trp = np.maximum(tr, zero)
    return half * lam_c * trp * trp + mu_c * (
        np.square(np.maximum(e1, zero)) + np.square(np.maximum(e2, zero))
    )


def psi_iso(
    exx: np.ndarray, eyy: np.ndarray, exy: np.ndarray, lam: float, mu: float
) -> np.ndarray:
    """Isotropic (unsplit) strain energy density — the hybrid momentum energy."""
    dtype = exx.dtype
    lam_c = np.asarray(lam, dtype=dtype)
    mu_c = np.asarray(mu, dtype=dtype)
    half = np.asarray(0.5, dtype=dtype)
    tr = exx + eyy
    return half * lam_c * tr * tr + mu_c * (
        np.square(exx) + np.square(eyy) + np.asarray(2.0, dtype=dtype) * np.square(exy)
    )


# ---------------------------------------------------------------------------
# Damage updates (spec-ref.md § 3.5)
# ---------------------------------------------------------------------------


def neighbor_sum(x: np.ndarray) -> np.ndarray:
    """4-neighbour sum with Neumann (mirror) boundaries."""
    p = np.pad(x, 1, mode="edge")
    return p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]


def laplacian(x: np.ndarray, h: float) -> np.ndarray:
    """5-point Laplacian with Neumann boundaries."""
    inv_h2 = np.asarray(1.0 / (h * h), dtype=x.dtype)
    return (neighbor_sum(x) - np.asarray(4.0, dtype=x.dtype) * x) * inv_h2


def gradient_flow_damage(
    d: np.ndarray, h_field: np.ndarray, m: float, h: float, gc: np.ndarray | None = None
) -> np.ndarray:
    """One fused semi-implicit AT2 gradient-flow step (the browser kernel;
    m = chi*dt). Local reaction terms implicit, Laplacian neighbours
    explicit; per-step max() is the projected irreversibility update
    (spec-ref.md § 3.3/§ 3.5). ``gc`` is the optional toughness field
    Gc(x)/Gc_0 (cellwise-constant smeared approximation, § 5.2)."""
    dtype = d.dtype
    m_c = np.asarray(m, dtype=dtype)
    one = np.asarray(1.0, dtype=dtype)
    two = np.asarray(2.0, dtype=dtype)
    four = np.asarray(4.0, dtype=dtype)
    inv_h2 = np.asarray(1.0 / (h * h), dtype=dtype)
    gc_c = one if gc is None else gc
    num = d + m_c * (two * h_field + gc_c * (neighbor_sum(d) * inv_h2))
    den = one + m_c * (gc_c * (one + four * inv_h2) + two * h_field)
    return np.maximum(d, num / den)


def elliptic_damage_solve(
    d: np.ndarray,
    h_field: np.ndarray,
    h: float,
    gc: np.ndarray | None = None,
    rel_tol: float = 1e-10,
    max_iter: int = 400,
) -> tuple[np.ndarray, int]:
    """Converged AT2 optimality form (the chi -> inf steady state):

        gc(x) * (d - lap d) + 2 H d = 2 H

    solved by warm-started matrix-free CG (f64 reference / G-Gammav anchor).
    Returns (max(d, solution), iterations). AT2's minimizer lies in [0,1)
    by the maximum principle, so no projection is needed inside the solve
    (AT1 would need one — spec-ref.md § 3.3)."""
    dtype = d.dtype
    one = np.asarray(1.0, dtype=dtype)
    two = np.asarray(2.0, dtype=dtype)
    gc_c = one if gc is None else gc
    b = two * h_field

    def apply_a(z: np.ndarray) -> np.ndarray:
        return gc_c * (z - laplacian(z, h)) + two * h_field * z

    x = d.copy()
    r = b - apply_a(x)
    p = r.copy()
    rs = float(np.sum(r * r, dtype=np.float64))
    b2 = float(np.sum(b * b, dtype=np.float64)) + 1e-300
    tol2 = rel_tol * rel_tol * b2
    it = 0
    while rs > tol2 and it < max_iter:
        ap = apply_a(p)
        alpha = np.asarray(
            rs / (float(np.sum(p * ap, dtype=np.float64)) + 1e-300), dtype
        )
        x = x + alpha * p
        r = r - alpha * ap
        rs_new = float(np.sum(r * r, dtype=np.float64))
        p = r + np.asarray(rs_new / (rs + 1e-300), dtype) * p
        rs = rs_new
        it += 1
    return np.maximum(d, x), it
