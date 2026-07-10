"""First-principles multiphase SPH primitives.

The cubic spline follows Monaghan (1992/2005). Number density and volume follow
Solenthaler--Pajarola (2008); the pressure constraint follows Wang et al.
(2023). Cohesion/adhesion use the compact kernels published by Akinci et al.
(2013). All gathers use ascending particle id and f64 arithmetic.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence
import math

import numpy as np

PI = math.pi


def _sigma(dim: int) -> float:
    if dim == 2:
        return 10.0 / (7.0 * PI)
    if dim == 3:
        return 1.0 / PI
    raise ValueError("only 2-D and 3-D kernels are supported")


def cubic_w(r: float, h: float, dim: int = 3) -> float:
    """Monaghan support-2h cubic-spline value."""
    if h <= 0 or r < 0:
        raise ValueError("h must be positive and r non-negative")
    q = r / h
    if q < 1.0:
        f = 1.0 - 1.5 * q * q + 0.75 * q**3
    elif q < 2.0:
        f = 0.25 * (2.0 - q) ** 3
    else:
        f = 0.0
    return _sigma(dim) * f / h**dim


def cubic_grad(rij: np.ndarray, h: float) -> np.ndarray:
    """Gradient with respect to particle i for ``rij = x_i - x_j``."""
    r = np.asarray(rij, dtype=np.float64)
    mag = float(np.linalg.norm(r))
    if mag == 0.0:
        return np.zeros_like(r)
    q = mag / h
    if q < 1.0:
        fp = -3.0 * q + 2.25 * q * q
    elif q < 2.0:
        fp = -0.75 * (2.0 - q) ** 2
    else:
        fp = 0.0
    return (_sigma(r.size) * fp / h ** (r.size + 1)) * r / mag


def cohesion_kernel(r: float, support: float) -> float:
    """Akinci 2013 cohesion kernel C(r), including its inner branch."""
    if support <= 0 or r <= 0 or r > support:
        return 0.0
    base = (support - r) ** 3 * r**3
    scale = 32.0 / (PI * support**9)
    if r <= support * 0.5:
        return scale * (2.0 * base - support**6 / 64.0)
    return scale * base


def adhesion_kernel(r: float, support: float) -> float:
    """Akinci 2013 adhesion kernel, real-valued only on [h/2, h]."""
    if support <= 0 or r <= support * 0.5 or r > support:
        return 0.0
    radicand = max(-4.0 * r * r / support + 6.0 * r - 2.0 * support, 0.0)
    return float(0.007 / support**3.25 * radicand**0.25)


def brute_neighbors(positions: np.ndarray, h: float) -> list[list[int]]:
    """Sorted strict-support neighbour oracle."""
    x = np.asarray(positions, dtype=np.float64)
    cutoff2 = (2.0 * h) ** 2
    return [
        [
            j
            for j in range(len(x))
            if j != i and float(np.dot(x[i] - x[j], x[i] - x[j])) < cutoff2
        ]
        for i in range(len(x))
    ]


def grid_neighbors(positions: np.ndarray, h: float) -> list[list[int]]:
    """Deterministic cell-list equivalent of :func:`brute_neighbors`."""
    x = np.asarray(positions, dtype=np.float64)
    cell = 2.0 * h
    buckets: dict[tuple[int, ...], list[int]] = defaultdict(list)
    keys = [tuple(np.floor(p / cell).astype(np.int64)) for p in x]
    for i, key in enumerate(keys):
        buckets[key].append(i)
    offsets = (
        np.asarray(np.meshgrid(*([[-1, 0, 1]] * x.shape[1]), indexing="ij"))
        .reshape(x.shape[1], -1)
        .T
    )
    cutoff2 = cell * cell
    out: list[list[int]] = []
    for i, key in enumerate(keys):
        found: list[int] = []
        k = np.asarray(key)
        for off in offsets:
            for j in buckets.get(tuple(k + off), []):
                if j != i and float(np.dot(x[i] - x[j], x[i] - x[j])) < cutoff2:
                    found.append(j)
        out.append(sorted(found))
    return out


def number_density(
    positions: np.ndarray, h: float, neighbors: Sequence[Sequence[int]] | None = None
) -> np.ndarray:
    """Particle number density delta_i = sum_j W_ij including self."""
    x = np.asarray(positions, dtype=np.float64)
    nbr = brute_neighbors(x, h) if neighbors is None else neighbors
    out = np.full(len(x), cubic_w(0.0, h, x.shape[1]), dtype=np.float64)
    for i, js in enumerate(nbr):
        for j in js:
            out[i] += cubic_w(float(np.linalg.norm(x[i] - x[j])), h, x.shape[1])
    return out


def mass_density_from_number(delta: np.ndarray, masses: np.ndarray) -> np.ndarray:
    """Sharp phase mass density m_i delta_i; compression remains delta/delta0."""
    return np.asarray(delta, dtype=np.float64) * np.asarray(masses, dtype=np.float64)


def interface_normals(
    positions: np.ndarray,
    phase: np.ndarray,
    h: float,
    delta: np.ndarray | None = None,
    neighbors: Sequence[Sequence[int]] | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Normalized color gradient and its magnitude at the A/B interface."""
    x = np.asarray(positions, dtype=np.float64)
    ph = np.asarray(phase, dtype=np.uint32)
    nbr = brute_neighbors(x, h) if neighbors is None else neighbors
    d = number_density(x, h, nbr) if delta is None else np.asarray(delta)
    raw = np.zeros_like(x)
    for i, js in enumerate(nbr):
        ci = float(ph[i])
        for j in js:
            raw[i] += (
                (float(ph[j]) - ci) * cubic_grad(x[i] - x[j], h) / max(d[j], 1e-30)
            )
    mag = np.linalg.norm(raw, axis=1)
    normal = np.divide(
        raw, mag[:, None], out=np.zeros_like(raw), where=mag[:, None] > 1e-14
    )
    return normal, mag


def interface_curvature(
    positions: np.ndarray,
    phase: np.ndarray,
    h: float,
    neighbors: Sequence[Sequence[int]] | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Reproducing volume-weighted divergence of the normalized color field.

    Returns signed curvature and interface weight. Its interface mean converges
    to ``1/R`` for a circle and ``2/R`` for a sphere; this is the discrete
    Young--Laplace calibration primitive used by the tests and Study view.
    """
    x = np.asarray(positions, dtype=np.float64)
    nbr = grid_neighbors(x, h) if neighbors is None else neighbors
    delta = number_density(x, h, nbr)
    normal, weight = interface_normals(x, phase, h, delta, nbr)
    volume = 1.0 / np.maximum(delta, 1e-30)
    curvature = np.zeros(len(x), dtype=np.float64)
    for i, js in enumerate(nbr):
        for j in js:
            curvature[i] += volume[j] * float(
                np.dot(normal[i] - normal[j], cubic_grad(x[i] - x[j], h))
            )
    return curvature, weight


def ind_sph_denominator(
    positions: np.ndarray,
    masses: np.ndarray,
    h: float,
    neighbors: Sequence[Sequence[int]] | None = None,
) -> np.ndarray:
    """Jacobi denominator of the equal-volume number-density constraint."""
    x = np.asarray(positions, dtype=np.float64)
    m = np.asarray(masses, dtype=np.float64)
    if len(m) != len(x):
        raise ValueError("masses and positions must have equal length")
    nbr = brute_neighbors(x, h) if neighbors is None else neighbors
    denom = np.zeros(len(x), dtype=np.float64)
    for i, js in enumerate(nbr):
        gi = np.zeros(x.shape[1], dtype=np.float64)
        for j in js:
            g = cubic_grad(x[i] - x[j], h)
            gi += g / m[i]
            denom[i] += float(np.dot(g / m[j], g / m[j]))
        denom[i] += float(np.dot(gi, gi))
    return denom


def predict_number_density(
    positions: np.ndarray,
    velocities: np.ndarray,
    h: float,
    dt: float,
    delta: np.ndarray | None = None,
    neighbors: Sequence[Sequence[int]] | None = None,
) -> np.ndarray:
    """First-order INDSPH continuity prediction."""
    x = np.asarray(positions, dtype=np.float64)
    v = np.asarray(velocities, dtype=np.float64)
    nbr = brute_neighbors(x, h) if neighbors is None else neighbors
    d0 = number_density(x, h, nbr) if delta is None else np.asarray(delta)
    rate = np.zeros(len(x), dtype=np.float64)
    for i, js in enumerate(nbr):
        for j in js:
            rate[i] += float(np.dot(v[i] - v[j], cubic_grad(x[i] - x[j], h)))
    return d0 + dt * rate


def pressure_velocity_delta(
    positions: np.ndarray,
    masses: np.ndarray,
    kappa: np.ndarray,
    h: float,
    dt: float,
    neighbors: Sequence[Sequence[int]] | None = None,
) -> np.ndarray:
    """Pairwise pressure impulse; total momentum is antisymmetric by construction."""
    x = np.asarray(positions, dtype=np.float64)
    m = np.asarray(masses, dtype=np.float64)
    if len(m) != len(x):
        raise ValueError("masses and positions must have equal length")
    k = np.asarray(kappa, dtype=np.float64)
    nbr = brute_neighbors(x, h) if neighbors is None else neighbors
    dv = np.zeros_like(x)
    seen: set[tuple[int, int]] = set()
    for i, js in enumerate(nbr):
        for j in js:
            pair = (min(i, j), max(i, j))
            if pair in seen:
                continue
            seen.add(pair)
            force = -0.5 * (k[i] + k[j]) * cubic_grad(x[i] - x[j], h)
            dv[i] += dt * force / m[i]
            dv[j] -= dt * force / m[j]
    return dv


def surface_forces(
    positions: np.ndarray,
    phase: np.ndarray,
    masses: np.ndarray,
    h: float,
    sigma: float,
    neighbors: Sequence[Sequence[int]] | None = None,
) -> np.ndarray:
    """Akinci pairwise cohesion plus normal-difference curvature force.

    The supplied ``sigma`` is the calibrated effective coefficient for this
    resolution. Forces are accumulated per unordered pair, making net internal
    force zero to roundoff even at unequal particle mass.
    """
    x = np.asarray(positions, dtype=np.float64)
    ph = np.asarray(phase, dtype=np.uint32)
    if len(masses) != len(x):
        raise ValueError("masses and positions must have equal length")
    nbr = brute_neighbors(x, h) if neighbors is None else neighbors
    d = number_density(x, h, nbr)
    nrm, weight = interface_normals(x, ph, h, d, nbr)
    volume = 1.0 / np.maximum(d, 1e-30)
    force = np.zeros_like(x)
    for i, js in enumerate(nbr):
        for j in js:
            if j <= i or ph[i] == ph[j]:
                continue
            rij = x[i] - x[j]
            r = float(np.linalg.norm(rij))
            if r == 0:
                continue
            cohesion = (
                -sigma * volume[i] * volume[j] * cohesion_kernel(r, 2.0 * h) * rij / r
            )
            curvature = (
                -sigma * volume[i] * volume[j] * (nrm[i] - nrm[j]) / max(h, 1e-30)
            )
            interface_scale = min(1.0, h * (weight[i] + weight[j]))
            fij = interface_scale * (cohesion + curvature)
            force[i] += fij
            force[j] -= fij
    return force


def harmonic_mean(a: float, b: float) -> float:
    return 0.0 if a <= 0 or b <= 0 else 2.0 * a * b / (a + b)


def viscosity_forces(
    positions: np.ndarray,
    velocities: np.ndarray,
    phase: np.ndarray,
    masses: np.ndarray,
    viscosities: tuple[float, float],
    h: float,
    neighbors: Sequence[Sequence[int]] | None = None,
) -> np.ndarray:
    """Momentum-symmetric Morris/Hu-Adams pair viscosity with harmonic mu."""
    x = np.asarray(positions, dtype=np.float64)
    v = np.asarray(velocities, dtype=np.float64)
    ph = np.asarray(phase, dtype=np.uint32)
    if len(masses) != len(x):
        raise ValueError("masses and positions must have equal length")
    nbr = brute_neighbors(x, h) if neighbors is None else neighbors
    d = number_density(x, h, nbr)
    vol = 1.0 / np.maximum(d, 1e-30)
    force = np.zeros_like(x)
    for i, js in enumerate(nbr):
        for j in js:
            if j <= i:
                continue
            rij = x[i] - x[j]
            r2 = float(np.dot(rij, rij))
            mu = harmonic_mean(viscosities[int(ph[i])], viscosities[int(ph[j])])
            scalar = (
                -2.0
                * mu
                * vol[i]
                * vol[j]
                * float(np.dot(rij, cubic_grad(rij, h)))
                / (r2 + 0.01 * h * h)
            )
            fij = scalar * (v[j] - v[i])
            force[i] += fij
            force[j] -= fij
    return force


def capillary_dt(
    rho_a: float, rho_b: float, spacing: float, sigma: float, safety: float = 0.4
) -> float:
    if sigma <= 0:
        return math.inf
    return safety * math.sqrt((rho_a + rho_b) * spacing**3 / (4.0 * PI * sigma))


def timestep_limits(
    *,
    h: float,
    spacing: float,
    max_speed: float,
    max_accel: float,
    rho_a: float,
    rho_b: float,
    nu_max: float,
    sigma: float,
    dt_max: float,
) -> dict[str, float]:
    return {
        "CFL": 0.4 * h / max(max_speed, 1e-9),
        "acceleration": 0.25 * math.sqrt(h / max(max_accel, 1e-9)),
        "viscosity": math.inf if nu_max <= 0 else 0.125 * h * h / nu_max,
        "capillary": capillary_dt(rho_a, rho_b, spacing, sigma),
        "maximum": dt_max,
    }


def laplace_pressure(sigma: float, radius: float, dim: int) -> float:
    return (dim - 1) * sigma / radius


def capillary_wave_omega(
    k: float, sigma: float, rho_a: float, rho_b: float, delta_rho_g: float = 0.0
) -> float:
    return math.sqrt((delta_rho_g * k + sigma * k**3) / (rho_a + rho_b))


def rayleigh_lamb_omega(
    mode: int, radius: float, sigma: float, rho_inside: float, rho_outside: float
) -> float:
    """Inviscid spherical-drop mode frequency for two incompressible liquids."""
    if mode < 2 or radius <= 0 or sigma < 0:
        raise ValueError("mode >= 2, radius > 0, and sigma >= 0 are required")
    numerator = mode * (mode - 1) * (mode + 1) * (mode + 2) * sigma
    denominator = radius**3 * ((mode + 1) * rho_inside + mode * rho_outside)
    return math.sqrt(numerator / denominator)


def two_layer_poiseuille(
    y: np.ndarray,
    *,
    half_a: float,
    half_b: float,
    mu_a: float,
    mu_b: float,
    pressure_gradient: float,
) -> np.ndarray:
    """Exact flat-interface two-layer channel profile.

    Fluid A occupies ``[-half_a, 0]`` and B ``[0, half_b]``. No-slip holds at
    both walls and velocity/shear stress are continuous at the interface.
    ``pressure_gradient`` is the positive streamwise driving magnitude.
    """
    if min(half_a, half_b, mu_a, mu_b) <= 0:
        raise ValueError("layer heights and viscosities must be positive")
    g = pressure_gradient
    # Unknowns [A_a, B_a, A_b, B_b] in u=-g*y^2/(2mu)+A*y+B.
    matrix = np.array(
        [
            [-half_a, 1.0, 0.0, 0.0],
            [0.0, 0.0, half_b, 1.0],
            [0.0, 1.0, 0.0, -1.0],
            [mu_a, 0.0, -mu_b, 0.0],
        ],
        dtype=np.float64,
    )
    rhs = np.array(
        [
            g * half_a**2 / (2.0 * mu_a),
            g * half_b**2 / (2.0 * mu_b),
            0.0,
            0.0,
        ]
    )
    aa, ba, ab, bb = np.linalg.solve(matrix, rhs)
    yy = np.asarray(y, dtype=np.float64)
    ua = -g * yy**2 / (2.0 * mu_a) + aa * yy + ba
    ub = -g * yy**2 / (2.0 * mu_b) + ab * yy + bb
    return np.asarray(np.where(yy <= 0.0, ua, ub), dtype=np.float64)


def sessile_cap_geometry(
    volume: float, contact_angle_degrees: float
) -> tuple[float, float, float]:
    """Sphere radius, base radius, and height of a volume-matched spherical cap."""
    if volume <= 0 or not 0 < contact_angle_degrees < 180:
        raise ValueError("positive volume and contact angle in (0, 180) required")
    theta = math.radians(contact_angle_degrees)
    c = math.cos(theta)
    radius = (3.0 * volume / (PI * (2.0 - 3.0 * c + c**3))) ** (1.0 / 3.0)
    return radius, radius * math.sin(theta), radius * (1.0 - c)


def contact_angle_from_cap(base_radius: float, height: float) -> float:
    if base_radius <= 0 or height <= 0:
        raise ValueError("base radius and height must be positive")
    return math.degrees(2.0 * math.atan2(height, base_radius))


def taylor_deformation(capillary_number: float, viscosity_ratio: float) -> float:
    return (
        capillary_number
        * (19.0 * viscosity_ratio + 16.0)
        / (16.0 * viscosity_ratio + 16.0)
    )
