"""Incompressible Schrödinger Flow (ISF) — f64 NumPy canonical reference.

Implements the split-step spinor solver of Chern, Knöppel, Pinkall, Schröder,
Weißmann, "Schrödinger's Smoke", ACM TOG 35(4) / SIGGRAPH 2016 (DOI
10.1145/2897824.2925868) and the Chern 2017 Caltech thesis (Alg. 1-4), per
`docs/sim-specs/volumetric-grid/schrodinger-smoke/spec-ref.md` (v0.2).

State: a normalized two-component complex wavefunction (spinor)
Psi = (psi1, psi2) : T^3 -> C^2 stored as a complex128 array of shape
(2, N, N, N) on a periodic unit box, dx = 1/N.

Per timestep (thesis Alg. 1, Lie split):
  1. free Schrödinger step  — exact FFT propagator, CONTINUOUS Laplacian
     eigenvalues (paper Eq. 18);
  2. pointwise normalize    — restores |Psi| = 1 (rho = 1);
  3. pressure projection    — FFT Poisson gauge shift, DISCRETE sin^2
     Laplacian eigenvalues (paper Eq. 17).

Two-spectra rule (spec-ref.md § 3, pinned by golden E): the free step and the
projection deliberately use DIFFERENT Laplacian spectra. The projection's
machine-zero divergence is a telescoping identity that holds only when the
Poisson solve inverts the same 7-point stencil the divergence was built from;
dividing by continuous -|k|^2 leaves an O(h^2) residual.

Velocity sign is pinned: u = +hbar * Im(conj(psi) * grad psi); the discrete
edge circulation is eta_e = hbar * arg<Psi_a, Psi_b>_C (thesis App. 1.C).

Determinism: the gated state is a pure grid solver (FFT + gather, no scatter,
no atomics) — f64 NumPy is run-twice bit-identical on fixed hardware; every
`run_isf` asserts a 2-run bit-identity witness (spec-ref.md § 8).
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass, field

import numpy as np

# ---------------------------------------------------------------------------
# Spectra (golden E — the two-spectra rule)
# ---------------------------------------------------------------------------


def continuous_laplacian_eigenvalues(shape: tuple[int, ...], dx: float) -> np.ndarray:
    """Continuous Laplacian eigenvalues lambda_k = -|k|^2 (paper Eq. 18).

    Used ONLY by the free Schrödinger step. k are the standard periodic
    angular wavenumbers 2*pi*fftfreq(N, d=dx).
    """
    axes = [2.0 * np.pi * np.fft.fftfreq(n, d=dx) for n in shape]
    kx, ky, kz = np.meshgrid(*axes, indexing="ij")
    return -(kx**2 + ky**2 + kz**2)


def discrete_laplacian_eigenvalues(shape: tuple[int, ...], dx: float) -> np.ndarray:
    """Discrete 7-point-stencil Laplacian eigenvalues (paper Eq. 17).

    lambda_tilde = -(4/dx^2) * sum_i sin^2(pi * k_i / N_i), k_i the integer
    FFT mode index. Used ONLY by the pressure projection: it is the exact
    Fourier symbol of the (eta_+ - eta_-)/dx^2 divergence stencil, which is
    what makes the post-projection divergence telescope to FP-zero.
    """
    # fftfreq(n) is the signed mode fraction k/N; sin^2(pi*k/N) is invariant
    # under k -> k + N so the signed convention is safe.
    axes = [np.sin(np.pi * np.fft.fftfreq(n)) ** 2 for n in shape]
    sx, sy, sz = np.meshgrid(*axes, indexing="ij")
    return -(4.0 / dx**2) * (sx + sy + sz)


# ---------------------------------------------------------------------------
# Split-step core (thesis Alg. 1-3)
# ---------------------------------------------------------------------------


def free_step(
    psi: np.ndarray, hbar: float, dt: float, lam_cont: np.ndarray
) -> np.ndarray:
    """Alg. 2 — exact free-Schrödinger propagator via FFT phase multiply.

    psi_hat <- psi_hat * exp(-i*(hbar*dt/2)*|k|^2) = exp(+i*(hbar*dt/2)*lam).
    Per-mode exact and unitary; there is NO dt error for band-limited data
    (spec-ref.md § 3, review catch #2).
    """
    psi_hat = np.fft.fftn(psi, axes=(1, 2, 3))
    psi_hat *= np.exp(1j * (hbar * dt / 2.0) * lam_cont)
    return np.fft.ifftn(psi_hat, axes=(1, 2, 3))


def normalize(psi: np.ndarray) -> np.ndarray:
    """Pointwise |Psi| = 1 restoration (rho = 1 constraint)."""
    return psi / np.sqrt(np.abs(psi[0]) ** 2 + np.abs(psi[1]) ** 2)


def edge_phases(psi: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """hbar-scaled edge phases eta_tilde = arg<Psi_v, Psi_{v+e}>_C per axis.

    <a,b>_C = conj(a1)*b1 + conj(a2)*b2. eta_tilde lives on the principal
    branch (-pi, pi] — see `edge_phase_headroom`.
    """
    out = []
    for axis in range(3):
        shifted = np.roll(psi, -1, axis=axis + 1)
        inner = np.conj(psi[0]) * shifted[0] + np.conj(psi[1]) * shifted[1]
        out.append(np.angle(inner))
    return out[0], out[1], out[2]


def divergence_from_phases(
    etas: tuple[np.ndarray, np.ndarray, np.ndarray], dx: float
) -> np.ndarray:
    """Discrete divergence div_v = sum_axis (eta_e+ - eta_e-)/dx^2 (Alg. 3).

    Runs on the hbar-scaled eta_tilde — the hbar cancels through the solve.
    """
    div = np.zeros_like(etas[0])
    for axis, eta in enumerate(etas):
        div += eta - np.roll(eta, 1, axis=axis)
    return div / dx**2


def pressure_project(psi: np.ndarray, dx: float, lam_disc: np.ndarray) -> np.ndarray:
    """Alg. 3 — FFT Poisson pressure projection by a pure phase (gauge) shift.

    Solves Delta_disc(phi) = div with the DISCRETE Eq.-17 eigenvalues, then
    Psi <- Psi * exp(-i*phi). The gauge shifts every edge phase exactly
    (eta <- eta - (phi_w - phi_v)), so the residual divergence telescopes to
    FP-zero — provided no edge re-wraps past +-pi (see edge_phase_headroom).
    """
    div = divergence_from_phases(edge_phases(psi), dx)
    div_hat = np.fft.fftn(div)
    with np.errstate(divide="ignore", invalid="ignore"):
        phi_hat = np.where(lam_disc != 0.0, div_hat / lam_disc, 0.0)
    phi = np.real(np.fft.ifftn(phi_hat))
    return psi * np.exp(-1j * phi)


def isf_step(
    psi: np.ndarray,
    hbar: float,
    dt: float,
    dx: float,
    lam_cont: np.ndarray,
    lam_disc: np.ndarray,
    scheme: str = "lie",
) -> np.ndarray:
    """One full ISF step. scheme = 'lie' (paper-verbatim) or 'strang'.

    Strang symmetrizes the free step around the normalize+project correction:
    F(dt/2) -> normalize -> project -> F(dt/2) -> normalize -> project.
    Order of accuracy is MEASURED by Richardson self-convergence, never
    asserted (projections are not flows; spec-ref.md § 6.1).
    """
    if scheme == "lie":
        psi = free_step(psi, hbar, dt, lam_cont)
        psi = normalize(psi)
        return pressure_project(psi, dx, lam_disc)
    if scheme == "strang":
        # symmetric composition F(dt/2) o (normalize+project) o F(dt/2);
        # the trailing half free step leaves the boundary state off the
        # constraint manifold — callers project before reading diagnostics.
        psi = free_step(psi, hbar, dt / 2.0, lam_cont)
        psi = normalize(psi)
        psi = pressure_project(psi, dx, lam_disc)
        return free_step(psi, hbar, dt / 2.0, lam_cont)
    raise ValueError(f"unknown scheme {scheme!r}")


# ---------------------------------------------------------------------------
# Velocity readout (Eq. 1 / Eq. 4, sign pinned)
# ---------------------------------------------------------------------------


def velocity_faces(
    psi: np.ndarray, hbar: float, dx: float
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Staggered MAC face velocities u_face = hbar * eta_tilde / dx per axis.

    Sign convention pinned: u = +hbar*Im(conj(psi)*grad psi); a plane wave
    psi1 = e^{i k.x} yields u = +hbar*k (asserted by a unit test).
    """
    ex, ey, ez = edge_phases(psi)
    return hbar * ex / dx, hbar * ey / dx, hbar * ez / dx


def velocity_cell_centered(
    faces: tuple[np.ndarray, np.ndarray, np.ndarray],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Cell-centred velocity: average of the two incident MAC faces per axis
    (parent eulerian-smoke capture-field parity)."""
    out = []
    for axis, f in enumerate(faces):
        out.append(0.5 * (f + np.roll(f, 1, axis=axis)))
    return out[0], out[1], out[2]


def edge_phase_headroom(psi: np.ndarray) -> float:
    """max|eta_tilde|/pi — the velocity-aliasing / projection-exactness guard
    (spec-ref.md § 3, paper 'Shortcomings': |u| <~ pi*hbar/dx per edge)."""
    ex, ey, ez = edge_phases(psi)
    return float(
        max(np.max(np.abs(ex)), np.max(np.abs(ey)), np.max(np.abs(ez))) / np.pi
    )


# ---------------------------------------------------------------------------
# Clebsch / Hopf diagnostics (Theorem 1)
# ---------------------------------------------------------------------------


def hopf_s2(psi: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Hopf map s = conj(Psi) i Psi : T^3 -> S^2 (unit spinor assumed).

    s = (2*Re(conj(psi1)*psi2), 2*Im(conj(psi1)*psi2), |psi1|^2 - |psi2|^2).
    """
    cross = np.conj(psi[0]) * psi[1]
    sz = np.abs(psi[0]) ** 2 - np.abs(psi[1]) ** 2
    return 2.0 * np.real(cross), 2.0 * np.imag(cross), sz


def kinetic_energy(psi: np.ndarray, hbar: float, dx: float) -> float:
    """0.5 * sum |u|^2 dx^3 on the MAC faces — an inviscid model invariant,
    tracked with a MEASURED drift ceiling (not machine-exact)."""
    ux, uy, uz = velocity_faces(psi, hbar, dx)
    return float(0.5 * np.sum(ux**2 + uy**2 + uz**2) * dx**3)


def circulation_loop(
    psi: np.ndarray, hbar: float, loop: list[tuple[int, int, int]]
) -> float:
    """Circulation ∮ u.dl = hbar * sum of edge phases along a closed lattice
    loop (list of grid vertices; consecutive entries must be grid neighbours,
    the last connecting back to the first). Continuum target 2*pi*hbar*n."""
    total = 0.0
    for a, b in zip(loop, loop[1:] + loop[:1]):
        inner = np.conj(psi[0][a]) * psi[0][b] + np.conj(psi[1][a]) * psi[1][b]
        total += float(np.angle(inner))
    return hbar * total


# ---------------------------------------------------------------------------
# Analytic host fixtures (spec-ref.md § 5, § 7)
# ---------------------------------------------------------------------------


def grid_coords(n: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Cell-centre-free vertex coordinates x_i = i*dx on the unit box."""
    ax = np.arange(n) / n
    return np.meshgrid(ax, ax, ax, indexing="ij")


def gaussian_packet(
    n: int, t: float, hbar: float, sigma0: float, center: float = 0.5
) -> np.ndarray:
    """Closed-form free-space Gaussian packet at time t, sampled on the grid.

    1D: psi(x,t) = (a/(a+i*hbar*t/2))^{1/2} exp(-(x-c)^2/(4*(a+i*hbar*t/2))),
    a = sigma0^2 (heat kernel at complex diffusivity i*hbar/2); 3D is the
    product. |psi|^2 width: sigma_t^2 = a*(1 + (hbar*t/(2a))^2). Free-space
    formula — callers pick (sigma0, t) so periodic images stay < 1e-12 at the
    box boundary (spec-ref.md § 6.1). Returned with psi2 = 0 (the fixture
    probes the linear free step only; it is not a unit spinor).
    """
    x, y, z = grid_coords(n)
    a = sigma0**2
    at = a + 0.5j * hbar * t
    pref = np.sqrt(a / at)
    psi1 = pref**3 * np.exp(
        -((x - center) ** 2 + (y - center) ** 2 + (z - center) ** 2) / (4.0 * at)
    )
    psi = np.zeros((2, n, n, n), dtype=np.complex128)
    psi[0] = psi1
    return psi


def spherical_clebsch_lift(alpha: np.ndarray, theta: np.ndarray) -> np.ndarray:
    """The landed spherical-Clebsch lift (clebsch-pfm A1 surface, reused):
    Psi = (cos(alpha/2)*e^{i*theta/2}, sin(alpha/2)*e^{-i*theta/2}).
    Unit-norm exact-to-FP by construction."""
    psi = np.empty((2, *alpha.shape), dtype=np.complex128)
    psi[0] = np.cos(alpha / 2.0) * np.exp(0.5j * theta)
    psi[1] = np.sin(alpha / 2.0) * np.exp(-0.5j * theta)
    return psi


def taylor_green_wave_2d(x: np.ndarray, y: np.ndarray, hbar: float) -> np.ndarray:
    """z-invariant 2D Taylor-Green spherical-Clebsch lift — a faithful f64
    port of the landed C++ fixture
    `packages/eulerian-smoke-frontier-clebsch-pfm/src/clebsch_pfm_math.cpp`
    `taylor_green_wave_2d`: cos(alpha) = -cos(2*pi*x),
    theta = 4*(-cos(2*pi*y)/(2*pi))/hbar."""
    k = 2.0 * np.pi
    zc = -np.cos(k * x)
    theta = 4.0 * (-np.cos(k * y) / k) / hbar
    alpha = np.arccos(np.clip(zc, -1.0, 1.0))
    return spherical_clebsch_lift(alpha, theta)


def vortex_ring_wave(
    n: int,
    center: tuple[float, float, float],
    radius: float,
    thickness: float,
    hbar: float,
    normal: tuple[float, float, float] = (1.0, 0.0, 0.0),
    eps: float = 0.01,
) -> np.ndarray:
    """Paper § 3.1 slab phase imprint for a vortex ring (pinned at review).

    phi = e^{i*theta}, theta = pi*(1 + d/r) inside the slab |d| < r over the
    disk spanning the ring (d = signed distance along the ring normal,
    rho < radius), theta = 0 outside; Psi = (phi, eps) with the paper's
    explicit eps = 0.01 zero-guard. Caller must normalize + settle
    (`settle_ic`) before stepping. Multi-ring scenes multiply single-ring
    phis componentwise on psi1.
    """
    x, y, z = grid_coords(n)
    nx, ny, nz = np.asarray(normal, dtype=np.float64) / np.linalg.norm(normal)
    rx, ry, rz = x - center[0], y - center[1], z - center[2]
    d = rx * nx + ry * ny + rz * nz
    rho2 = (rx - d * nx) ** 2 + (ry - d * ny) ** 2 + (rz - d * nz) ** 2
    inside = (np.abs(d) < thickness) & (rho2 < radius**2)
    theta = np.where(inside, np.pi * (1.0 + d / thickness), 0.0)
    psi = np.empty((2, n, n, n), dtype=np.complex128)
    psi[0] = np.exp(1j * theta)
    psi[1] = eps
    return psi


def knot_wave(
    n: int,
    polynomial: list[tuple[complex, int, int]],
    scale: float = 4.0,
    center: tuple[float, float, float] = (0.5, 0.5, 0.5),
    eps: float = 0.01,
) -> np.ndarray:
    """Knot/link IC via the Tao-Ren-Tong-Xiong polynomial construction
    (Phys. Fluids 33, 077112 (2021); spec-ref.md § 2 anchor 6).

    Inverse-stereographic map of the (scaled, centred) box to S^3 in C^2:
      z1 = 2*(X + iY)/(R^2 + 1),  z2 = (R^2 - 1 + 2iZ)/(R^2 + 1),
    then psi1 = sum coeff * z1^a * z2^b over `polynomial` (e.g. the trefoil
    Milnor pair z1^2 - z2^3; the Hopf link z1*z2), psi2 = eps zero-guard.
    Vortex cores = zeros of psi1. Caller normalizes + settles.
    """
    x, y, z = grid_coords(n)
    gx = scale * (x - center[0])
    gy = scale * (y - center[1])
    gz = scale * (z - center[2])
    r2 = gx**2 + gy**2 + gz**2
    z1 = 2.0 * (gx + 1j * gy) / (r2 + 1.0)
    z2 = (r2 - 1.0 + 2j * gz) / (r2 + 1.0)
    psi1 = np.zeros_like(z1)
    for coeff, a, b in polynomial:
        psi1 = psi1 + coeff * z1**a * z2**b
    psi = np.empty((2, n, n, n), dtype=np.complex128)
    psi[0] = psi1
    psi[1] = eps
    return psi


def constraint_project(
    psi: np.ndarray,
    region_mask: np.ndarray,
    k_vec: tuple[float, float, float],
    hbar: float,
    t: float,
    dx: float,
    lam_disc: np.ndarray,
) -> np.ndarray:
    """Paper Alg. 4 — velocity-constraint region in the PERIODIC box (no DCT).

    Inside the mask, both spinor components keep their amplitude but take the
    prescribed plane-wave phase theta = (u.x - |u|^2 t/2)/hbar with u =
    hbar*k_vec, then one pressure projection blends the constraint into the
    bulk. Serves IC settling (iterate 5-10x), the jet nozzle (fixed mask each
    step) and obstacles (k_vec = 0). BREAKS the unitary-norm gate by
    construction — beyond-canonical, ungated (spec-ref.md § 13.3).
    """
    n = psi.shape[1]
    x, y, z = grid_coords(n)
    u = hbar * np.asarray(k_vec, dtype=np.float64)
    omega = float(np.dot(u, u)) / (2.0 * hbar)
    phase = (u[0] * x + u[1] * y + u[2] * z) / hbar - omega * t
    out = psi.copy()
    for c in range(2):
        out[c] = np.where(region_mask, np.abs(psi[c]) * np.exp(1j * phase), psi[c])
    return pressure_project(out, dx, lam_disc)


def settle_ic(
    psi: np.ndarray, dx: float, lam_disc: np.ndarray, iterations: int = 8
) -> np.ndarray:
    """IC settling (paper § 3.2): normalize, then iterate the pressure
    projection 5-10x so the imprinted phase becomes divergence-consistent."""
    psi = normalize(psi)
    for _ in range(iterations):
        psi = pressure_project(psi, dx, lam_disc)
    return psi


# ---------------------------------------------------------------------------
# Runner + diagnostics (spec-ref.md § 5, § 8)
# ---------------------------------------------------------------------------


@dataclass
class IsfConfig:
    n: int = 64
    hbar: float = 0.05
    dt: float = 1.0 / 24.0
    steps: int = 24
    scheme: str = "lie"
    scene: str = "translating-ring"
    ring_radius: float = 0.22
    ring_thickness: float = 0.08
    ring_center: tuple[float, float, float] = (0.35, 0.5, 0.5)
    settle_iterations: int = 8
    capture_every: int = 0  # 0 = no field capture


@dataclass
class IsfResult:
    config: IsfConfig
    norm_l2_drift: float = 0.0
    parseval_rel_err: float = 0.0
    max_div_postproj: float = 0.0
    edge_phase_headroom: float = 0.0
    energy_initial: float = 0.0
    energy_final: float = 0.0
    circulation_measured: float = 0.0
    circulation_target: float = 0.0
    circulation_rel_err: float = 0.0
    determinism_witness_sha256: str = ""
    captures: list[np.ndarray] = field(default_factory=list)
    capture_steps: list[int] = field(default_factory=list)
    psi_final: np.ndarray | None = None


def make_scene(cfg: IsfConfig, lam_disc: np.ndarray) -> np.ndarray:
    dx = 1.0 / cfg.n
    if cfg.scene == "translating-ring":
        psi = vortex_ring_wave(
            cfg.n, cfg.ring_center, cfg.ring_radius, cfg.ring_thickness, cfg.hbar
        )
        return settle_ic(psi, dx, lam_disc, cfg.settle_iterations)
    if cfg.scene == "taylor-green":
        x, y, _ = grid_coords(cfg.n)
        psi = taylor_green_wave_2d(x, y, cfg.hbar)
        return settle_ic(psi, dx, lam_disc, cfg.settle_iterations)
    raise ValueError(f"unknown scene {cfg.scene!r}")


def ring_probe_loop(cfg: IsfConfig) -> list[tuple[int, int, int]]:
    """Axis-aligned rectangular lattice loop threading the canonical ring
    exactly once: it runs along the ring axis through the disk centre, closes
    outside the ring, and therefore links the vortex core with winding 1."""
    n = cfg.n
    cx = int(round(cfg.ring_center[0] * n)) % n
    cy = int(round(cfg.ring_center[1] * n)) % n
    cz = int(round(cfg.ring_center[2] * n)) % n
    half = int(round(1.8 * cfg.ring_radius * n))
    off = int(round(1.8 * cfg.ring_radius * n))
    loop: list[tuple[int, int, int]] = []
    for i in range(-half, half):  # up the axis through the disk centre
        loop.append(((cx + i) % n, cy % n, cz))
    for j in range(off):  # out radially
        loop.append(((cx + half) % n, (cy + j) % n, cz))
    for i in range(half, -half, -1):  # back down outside the ring
        loop.append(((cx + i) % n, (cy + off) % n, cz))
    for j in range(off, 0, -1):  # radially home
        loop.append(((cx - half) % n, (cy + j) % n, cz))
    return loop


def _trajectory_sha256(captures: list[np.ndarray]) -> str:
    h = hashlib.sha256()
    for c in captures:
        h.update(np.ascontiguousarray(c).tobytes())
    return h.hexdigest()


def _run_once(cfg: IsfConfig) -> IsfResult:
    dx = 1.0 / cfg.n
    shape = (cfg.n, cfg.n, cfg.n)
    lam_cont = continuous_laplacian_eigenvalues(shape, dx)
    lam_disc = discrete_laplacian_eigenvalues(shape, dx)
    psi = make_scene(cfg, lam_disc)

    res = IsfResult(config=cfg)
    res.energy_initial = kinetic_energy(psi, cfg.hbar, dx)

    def capture(step: int) -> None:
        ux, uy, uz = velocity_cell_centered(velocity_faces(psi, cfg.hbar, dx))
        res.captures.append(np.stack([ux, uy, uz]).astype(np.float64))
        res.capture_steps.append(step)

    if cfg.capture_every:
        capture(0)
    # The gated canonical run is the paper-verbatim Lie split, spelled out
    # here so the unitary-norm gate can measure the free step in isolation
    # (the projection is a pure phase; normalize is the deliberate rho = 1
    # correction, not a conservation law). The strang variant exists for the
    # Richardson order study, which drives `isf_step` directly.
    if cfg.scheme != "lie":
        raise ValueError("run_isf canonical runs are Lie-split only")
    max_drift = 0.0
    for step in range(1, cfg.steps + 1):
        pre = float(np.sum(np.abs(psi) ** 2))
        psi = free_step(psi, cfg.hbar, cfg.dt, lam_cont)
        post = float(np.sum(np.abs(psi) ** 2))
        max_drift = max(max_drift, abs(post - pre) / pre)
        psi = normalize(psi)
        psi = pressure_project(psi, dx, lam_disc)
        if cfg.capture_every and step % cfg.capture_every == 0:
            capture(step)

    res.norm_l2_drift = max_drift
    psi_hat = np.fft.fftn(psi, axes=(1, 2, 3))
    real_e = float(np.sum(np.abs(psi) ** 2))
    four_e = float(np.sum(np.abs(psi_hat) ** 2) / cfg.n**3)
    res.parseval_rel_err = abs(real_e - four_e) / real_e
    div = divergence_from_phases(edge_phases(psi), dx)
    res.max_div_postproj = float(np.max(np.abs(div)))
    res.edge_phase_headroom = edge_phase_headroom(psi)
    res.energy_final = kinetic_energy(psi, cfg.hbar, dx)
    if cfg.scene == "translating-ring":
        res.circulation_target = 2.0 * np.pi * cfg.hbar
        res.circulation_measured = abs(
            circulation_loop(psi, cfg.hbar, ring_probe_loop(cfg))
        )
        res.circulation_rel_err = (
            abs(res.circulation_measured - res.circulation_target)
            / res.circulation_target
        )
    res.psi_final = psi
    return res


def run_isf(cfg: IsfConfig) -> IsfResult:
    """Run the scene twice and assert bit-identity before returning (the § 8
    determinism witness; witness run #2 IS the returned run)."""
    first = _run_once(cfg)
    second = _run_once(cfg)
    assert first.psi_final is not None and second.psi_final is not None
    if first.psi_final.tobytes() != second.psi_final.tobytes():
        raise AssertionError("2-run determinism witness failed (bit-identity)")
    for a, b in zip(first.captures, second.captures):
        if a.tobytes() != b.tobytes():
            raise AssertionError("2-run determinism witness failed (captures)")
    second.determinism_witness_sha256 = _trajectory_sha256(
        second.captures if second.captures else [second.psi_final]
    )
    return second


def main() -> None:
    parser = argparse.ArgumentParser(description="ISF f64 reference runner")
    parser.add_argument("--n", type=int, default=64)
    parser.add_argument("--hbar", type=float, default=0.05)
    parser.add_argument("--dt", type=float, default=1.0 / 24.0)
    parser.add_argument("--steps", type=int, default=24)
    parser.add_argument("--scene", default="translating-ring")
    parser.add_argument("--capture-every", type=int, default=0)
    args = parser.parse_args()
    cfg = IsfConfig(
        n=args.n,
        hbar=args.hbar,
        dt=args.dt,
        steps=args.steps,
        scene=args.scene,
        capture_every=args.capture_every,
    )
    res = run_isf(cfg)
    print(
        json.dumps(
            {
                "norm_l2_drift": res.norm_l2_drift,
                "parseval_rel_err": res.parseval_rel_err,
                "max_div_postproj": res.max_div_postproj,
                "edge_phase_headroom": res.edge_phase_headroom,
                "energy_initial": res.energy_initial,
                "energy_final": res.energy_final,
                "circulation_measured": res.circulation_measured,
                "circulation_target": res.circulation_target,
                "circulation_rel_err": res.circulation_rel_err,
                "determinism_witness_sha256": res.determinism_witness_sha256,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
