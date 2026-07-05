"""Curl-noise velocity-field constructions (f64 reference).

Three constructions (spec-ref § 3):

- ``curl2d``    — scalar stream function psi(x, y): v = (d psi/dy, -d psi/dx)
                  (evaluated on a fixed z-slice of the 3D noise basis).
- ``curl3d``    — classic vector potential psi = (n1, n2, n3) of decorrelated
                  FBM channels: v = curl psi (Bridson 2007, analytic-derivative
                  variant — no finite differences).
- ``crossprod`` — the flagship v = grad f1 x grad f2 (DeWolf 2005 / Wu 2021 /
                  Baerentzen et al. 2025): exactly divergence-free by Schwarz;
                  streamlines = iso-contour intersections
                  {f1 = f1(x0)} n {f2 = f2(x0)}.

Everything is analytic: FBM potentials thread the exact noise gradient and
Hessian through the chain rule, so the velocity Jacobian (and hence
div = trace(J), curl v, and the helicity density v . curl v) are closed
form — no FD stencil anywhere on this path.

Time evolution (executed decision, deviating-with-cause from the spec's 4D
noise coordinate): per-octave domain translation ``x -> x + t * drift_o``
(a Galilean pan, decorrelated across octaves). At every instant the field
is a rigid translate of a static field, so spatial incompressibility is
untouched; a true 4D simplex basis is deferred-with-cause (the analytic
4D gradient+Hessian port roughly doubles the basis surface for an
ungated display feature). Recorded in spec-ref § 3 at execution.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np

from .noise import snoise_grad_hess

# Committed per-channel domain offsets (decorrelation of FBM channels;
# arbitrary non-lattice constants, fixed forever — part of the canonical
# field definition, mirrored in the WGSL port).
CHANNEL_OFFSETS: tuple[tuple[float, float, float], ...] = (
    (0.0, 0.0, 0.0),
    (31.416, -47.853, 12.793),
    (-233.19, 108.44, 71.98),
)
# Committed per-octave time-drift directions (unit-ish, decorrelated).
OCTAVE_DRIFTS: tuple[tuple[float, float, float], ...] = (
    (0.31, 0.17, -0.23),
    (-0.19, 0.29, 0.11),
    (0.13, -0.27, 0.31),
    (-0.29, -0.13, 0.19),
    (0.23, 0.31, -0.17),
    (0.11, -0.19, -0.29),
)
_SEED_STRIDE = (127.1, 311.7, 74.7)

_EPS_LC = np.zeros((3, 3, 3))
_EPS_LC[0, 1, 2] = _EPS_LC[1, 2, 0] = _EPS_LC[2, 0, 1] = 1.0
_EPS_LC[0, 2, 1] = _EPS_LC[2, 1, 0] = _EPS_LC[1, 0, 2] = -1.0


@dataclass(frozen=True)
class CurlNoiseConfig:
    """Canonical field parameters (spec-ref § 5)."""

    construction: str = "crossprod"  # curl2d | curl3d | crossprod
    octaves: int = 4
    lacunarity: float = 2.0
    gain: float = 0.5
    ell0: float = 1.0  # base length scale
    amplitude: float = 1.0
    seed: int = 0
    time: float = 0.0  # per-octave domain pan (see module docstring)
    z_slice: float = 0.37  # curl2d: fixed z of the noise slab
    # Optional spherical obstacle (canonical scene): SDF-substitution
    # boundary for crossprod (boundary.py); None = open field.
    obstacle_center: tuple[float, float, float] | None = None
    obstacle_radius: float = 0.0
    obstacle_ramp_width: float = 0.25
    obstacle_noise_amp: float = 1.0


# Canonical params tuned at execution so RK4 + 1-iteration Newton
# reprojection is well-resolved: max |v| dt ~ 0.012 vs finest octave
# wavelength 0.125 -> measured f64 residual max ~1.2e-9 across checkpoints
# (dt = 2e-4, curlnoise.py). Hotter fields (octaves 4, ell0 0.4) push
# the 1-iter Newton out of its basin — display templates may run hot,
# the GATE scene must not.
CANONICAL_CONFIG = CurlNoiseConfig(
    construction="crossprod",
    octaves=3,
    lacunarity=2.0,
    gain=0.5,
    ell0=0.5,
    amplitude=1.0,
    seed=0,
    obstacle_center=(0.5, 0.5, 0.5),
    obstacle_radius=0.18,
    obstacle_ramp_width=0.15,
    obstacle_noise_amp=1.0,
)


def _seed_offset(seed: int) -> np.ndarray:
    return np.asarray(_SEED_STRIDE, dtype=np.float64) * float(seed)


def fbm_grad_hess(
    x: np.ndarray, cfg: CurlNoiseConfig, channel: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """FBM octave sum of one noise channel: (value, grad, hess), exact.

    f(x) = sum_o gain^o * n((x + off_ch + t*drift_o + seed_off) / ell_o),
    ell_o = ell0 * lacunarity^-o. Chain rule: grad scales 1/ell_o, hess
    1/ell_o^2. Divergence-freeness of any curl built on top is preserved
    per octave by linearity of the curl operator (golden E).
    """
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    off = np.asarray(CHANNEL_OFFSETS[channel]) + _seed_offset(cfg.seed)
    val = np.zeros(x.shape[0])
    grad = np.zeros((x.shape[0], 3))
    hess = np.zeros((x.shape[0], 3, 3))
    amp = 1.0
    ell = cfg.ell0
    for o in range(cfg.octaves):
        drift = np.asarray(OCTAVE_DRIFTS[o % len(OCTAVE_DRIFTS)])
        p = (x + off + cfg.time * drift) / ell
        v_o, g_o, h_o = snoise_grad_hess(p)
        val += amp * v_o
        grad += (amp / ell) * g_o
        hess += (amp / (ell * ell)) * h_o
        amp *= cfg.gain
        ell /= cfg.lacunarity
    return val, grad, hess


def _potential_channels(
    x: np.ndarray, cfg: CurlNoiseConfig, channels: tuple[int, ...]
) -> list[tuple[np.ndarray, np.ndarray, np.ndarray]]:
    return [fbm_grad_hess(x, cfg, ch) for ch in channels]


def velocity_jacobian(
    x: np.ndarray, cfg: CurlNoiseConfig
) -> tuple[np.ndarray, np.ndarray]:
    """Velocity v(x) and its exact Jacobian J[i, l] = d v_i / d x_l.

    div v = trace(J) is the free in-shader divergence audit (the identity
    Niagara's ``JacobianSimplex_ALU`` exposes); machine-zero here up to
    f64 rounding of the surviving terms for all three constructions.
    """
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    a = cfg.amplitude

    if cfg.construction == "crossprod":
        if cfg.obstacle_center is not None:
            from .boundary import crossprod_obstacle_potentials

            (g1, h1), (g2, h2) = crossprod_obstacle_potentials(x, cfg)
        else:
            (_, g1, h1), (_, g2, h2) = _potential_channels(x, cfg, (0, 1))
        v = a * np.cross(g1, g2)
        # J[i,l] = eps_ijk (H1[j,l] g2[k] + g1[j] H2[k,l])
        jac = a * (
            np.einsum("ijk,njl,nk->nil", _EPS_LC, h1, g2)
            + np.einsum("ijk,nj,nkl->nil", _EPS_LC, g1, h2)
        )
        return v, jac

    if cfg.construction == "curl3d":
        pots = _potential_channels(x, cfg, (0, 1, 2))
        g = np.stack([p[1] for p in pots], axis=1)  # (N, comp, 3)
        h = np.stack([p[2] for p in pots], axis=1)  # (N, comp, 3, 3)
        # v_i = eps_ijk d_j psi_k -> from gradients of the components
        v = a * np.einsum("ijk,nkj->ni", _EPS_LC, g)
        jac = a * np.einsum("ijk,nkjl->nil", _EPS_LC, h)
        return v, jac

    if cfg.construction == "curl2d":
        x3 = x.copy()
        x3[:, 2] = cfg.z_slice
        _, g1, h1 = fbm_grad_hess(x3, cfg, 0)
        n_pts = x.shape[0]
        v = np.zeros((n_pts, 3))
        v[:, 0] = a * g1[:, 1]
        v[:, 1] = -a * g1[:, 0]
        jac = np.zeros((n_pts, 3, 3))
        jac[:, 0, 0] = a * h1[:, 1, 0]
        jac[:, 0, 1] = a * h1[:, 1, 1]
        jac[:, 1, 0] = -a * h1[:, 0, 0]
        jac[:, 1, 1] = -a * h1[:, 0, 1]
        return v, jac

    raise ValueError(f"unknown construction {cfg.construction!r}")


def velocity(x: np.ndarray, cfg: CurlNoiseConfig) -> np.ndarray:
    """Velocity only (cheaper path used by advection)."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    a = cfg.amplitude
    if cfg.construction == "crossprod":
        if cfg.obstacle_center is not None:
            from .boundary import crossprod_obstacle_potentials

            (g1, _), (g2, _) = crossprod_obstacle_potentials(x, cfg)
        else:
            (_, g1, _), (_, g2, _) = _potential_channels(x, cfg, (0, 1))
        return a * np.cross(g1, g2)
    return velocity_jacobian(x, cfg)[0]


def divergence_trace(x: np.ndarray, cfg: CurlNoiseConfig) -> np.ndarray:
    """Closed-form div v = trace(J_v) — the Jacobian-trace audit."""
    _, jac = velocity_jacobian(x, cfg)
    return np.einsum("nii->n", jac)


def curl_of_velocity(x: np.ndarray, cfg: CurlNoiseConfig) -> np.ndarray:
    """Vorticity omega = curl v from the exact Jacobian."""
    _, jac = velocity_jacobian(x, cfg)
    return np.einsum("ijk,nkj->ni", _EPS_LC, jac)


def helicity_density(x: np.ndarray, cfg: CurlNoiseConfig) -> np.ndarray:
    """h(x) = v . (curl v) — the kinetic helicity density, DISPLAYED
    honestly and generically NONZERO for every construction here.

    EXECUTION CORRECTION (2026-07-05, refutes the spec v0.2 claim): the
    cross-product field does NOT have pointwise-zero kinetic helicity —
    counterexample f1 = x*y, f2 = z + x^2 gives v = (x, -y, -2x^2),
    curl v = (0, 4x, 0), v . curl v = -4xy != 0 (and this field measures
    |h| up to ~1e4). The machine-exact identities the flagship DOES have
    are ``gradient_orthogonality`` (v . grad f_i = 0 — the actual
    streamline-confinement / chaos-immunity mechanism) and
    ``clebsch_helicity_integrand`` (psi . v = 0 for the Clebsch/Euler
    potential psi = f1 grad f2) — golden F as corrected at execution.
    """
    v, jac = velocity_jacobian(x, cfg)
    omega = np.einsum("ijk,nkj->ni", _EPS_LC, jac)
    return np.sum(v * omega, axis=1)


def gradient_orthogonality(
    x: np.ndarray, cfg: CurlNoiseConfig
) -> tuple[np.ndarray, np.ndarray]:
    """(v . grad f1, v . grad f2) for crossprod — machine-exact zeros.

    v = grad f1 x grad f2 is orthogonal to both factor gradients (triple
    product with a repeated vector), so a tracer's velocity never carries
    it off either level set: streamlines are exactly confined to the
    codim-2 intersection {f1 = c1} n {f2 = c2}. This is the corrected
    chaos-immunity identity (golden F part 1)."""
    if cfg.construction != "crossprod":
        raise ValueError("gradient orthogonality is a crossprod identity")
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    if cfg.obstacle_center is not None:
        from .boundary import crossprod_obstacle_potentials

        (g1, _), (g2, _) = crossprod_obstacle_potentials(x, cfg)
    else:
        (_, g1, _), (_, g2, _) = _potential_channels(x, cfg, (0, 1))
    v = cfg.amplitude * np.cross(g1, g2)
    return np.sum(v * g1, axis=1), np.sum(v * g2, axis=1)


def clebsch_helicity_integrand(x: np.ndarray, cfg: CurlNoiseConfig) -> np.ndarray:
    """psi . v for the Clebsch/Euler potential psi = f1 grad f2 of the
    cross-product field (v = curl psi) — machine-exact zero.

    Hand proof: psi . v = f1 grad f2 . (grad f1 x grad f2) = 0 (repeated
    vector in the triple product). The classical Euler-potentials fact
    that the helicity INTEGRAND vanishes in this gauge; golden F part 2.
    NOTE: open-field construction only (the obstacle scene's f1 includes
    the SDF, which changes nothing — the identity is algebraic in
    (f1, grad f1, grad f2) — but keep the channels explicit)."""
    if cfg.construction != "crossprod":
        raise ValueError("the Clebsch identity is a crossprod identity")
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    if cfg.obstacle_center is not None:
        from .boundary import crossprod_obstacle_potentials
        from .manifold import _obstacle_f1_value

        (g1, _), (g2, _) = crossprod_obstacle_potentials(x, cfg)
        f1 = _obstacle_f1_value(x, cfg)
    else:
        f1, g1, _ = fbm_grad_hess(x, cfg, 0)
        _, g2, _ = fbm_grad_hess(x, cfg, 1)
    v = cfg.amplitude * np.cross(g1, g2)
    psi = f1[:, None] * g2
    return np.sum(psi * v, axis=1)


# --------------------------------------------------------------------------- #
# ABC flow — closed-form Beltrami reference field (spec-ref § 4, golden E/F)
# --------------------------------------------------------------------------- #
def abc_flow(
    x: np.ndarray, a: float = 1.0, b: float = 1.0, c: float = 1.0
) -> np.ndarray:
    """Arnold–Beltrami–Childress flow (Dombre et al. 1986):

    v = (A sin z + C cos y, B sin x + A cos z, C sin y + B cos x).
    div v = 0 identically; Beltrami: curl v = v (helicity density |v|^2).
    """
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    out = np.empty_like(x)
    out[:, 0] = a * np.sin(x[:, 2]) + c * np.cos(x[:, 1])
    out[:, 1] = b * np.sin(x[:, 0]) + a * np.cos(x[:, 2])
    out[:, 2] = c * np.sin(x[:, 1]) + b * np.cos(x[:, 0])
    return out


def abc_curl(
    x: np.ndarray, a: float = 1.0, b: float = 1.0, c: float = 1.0
) -> np.ndarray:
    """curl of the ABC field, computed term-by-term (equals abc_flow —
    the Beltrami residual ||curl v - v|| is the golden-F control)."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[None, :]
    out = np.empty_like(x)
    # curl_x = d_y v_z - d_z v_y = C cos y - (-A sin z) = A sin z + C cos y
    out[:, 0] = c * np.cos(x[:, 1]) + a * np.sin(x[:, 2])
    # curl_y = d_z v_x - d_x v_z = A cos z - (-B sin x) = B sin x + A cos z
    out[:, 1] = a * np.cos(x[:, 2]) + b * np.sin(x[:, 0])
    # curl_z = d_x v_y - d_y v_x = B cos x - (-C sin y) = C sin y + B cos x
    out[:, 2] = b * np.cos(x[:, 0]) + c * np.sin(x[:, 1])
    return out


def with_params(cfg: CurlNoiseConfig, **kwargs) -> CurlNoiseConfig:
    """Convenience immutable update."""
    return replace(cfg, **kwargs)
