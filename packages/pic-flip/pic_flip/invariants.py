"""Property-based invariants for the pic-flip sim (gate 12, spec-ref § 6.6).

Six declared invariants (>= 2 per R9):

1. partition of unity              (transfer weights)
2. mass + momentum conservation    (across P2G)
3. divergence-free post-projection (masked solve, converged cap)
4. affine round-trip preservation  (Prop 5.1) + PIC negative control
5. angular-momentum conservation   (Props 5.4/5.5) + PIC negative control
6. regularizer inertness at rest   (push-apart + drift source)

Negative controls run on a fixed embedded configuration (not
Hypothesis-drawn) so their nonzero margins are deterministic — the
random draws prove the *conservation* side, the fixed configs prove
the *discrimination* side.
"""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from .reference.apic import (
    g2p_2d,
    grid_velocity_from_momentum,
    p2g_2d,
    partition_of_unity_sum,
)
from .reference.poisson_masked import (
    classify_cells_2d,
    default_solid_mask_2d,
    divergence_masked_2d,
    project_masked_2d,
)
from .reference.regularizers import (
    drift_rhs_2d,
    measure_rest_density,
    push_apart_2d,
    scatter_unit_density_2d,
)

__all__ = [
    "partition_of_unity_quadratic_bspline",
    "mass_momentum_conservation_p2g",
    "divergence_free_post_projection_masked",
    "apic_affine_roundtrip_preserved",
    "angular_momentum_conserved_across_transfers",
    "regularizers_inert_at_rest",
]

_GRID_N = 16
_DX = 1.0 / _GRID_N


def _random_particles(
    seed: int, n: int, c_scale: float = 0.0
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Seeded particles strictly interior (full stencil in-bounds)."""
    rng = np.random.default_rng(int(seed))
    pos = rng.uniform(3.0 * _DX, (_GRID_N - 4) * _DX, size=(int(n), 2))
    vel = rng.uniform(-1.0, 1.0, size=(int(n), 2))
    mass = rng.uniform(0.1, 2.0, size=(int(n),))
    affine_c = c_scale * rng.uniform(-1.0, 1.0, size=(int(n), 2, 2))
    return pos, vel, mass, affine_c


@given(p=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False))
@settings(max_examples=50, deadline=None)
def partition_of_unity_quadratic_bspline(p: float) -> None:
    """Invariant 1: the 3 stencil weights sum to 1 at any coordinate."""
    assert abs(partition_of_unity_sum(p) - 1.0) <= 1e-12


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n=st.integers(min_value=1, max_value=32),
)
@settings(
    max_examples=20,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def mass_momentum_conservation_p2g(seed: int, n: int) -> None:
    """Invariant 2: sum_p m_p == sum_i m_i and sum_p m_p v_p+affine == sum_i mom_i.

    The affine term contributes zero net momentum (first weight moment
    is zero), so grid momentum equals particle momentum even for APIC.
    """
    pos, vel, mass, affine_c = _random_particles(seed, n, c_scale=1.0)
    grid_mass = np.zeros((_GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    p2g_2d(pos, vel, mass, affine_c, grid_mass, grid_mom, _DX)
    scale = float(np.sum(mass))
    assert abs(float(np.sum(grid_mass)) - scale) <= 1e-12 * max(scale, 1.0)
    mom_p = np.sum(mass[:, None] * vel, axis=0)
    mom_g = np.sum(grid_mom, axis=(0, 1))
    assert np.all(
        np.abs(mom_g - mom_p) <= 1e-11 * max(1.0, float(np.max(np.abs(mom_p))))
    ), (
        mom_g,
        mom_p,
    )


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n=st.integers(min_value=8, max_value=64),
)
@settings(max_examples=10, deadline=None)
def divergence_free_post_projection_masked(seed: int, n: int) -> None:
    """Invariant 3: post-projection fluid divergence sits at the solver floor.

    Fixed 2000-sweep Jacobi on a <= 16^2 grid drives the iteration error
    to machine level; the compact adjoint operator pair makes the
    projected divergence consistent (no wide-operator floor) — measured
    tolerance 1e-8 (spec-ref § 6.5/§ 6.6 note).
    """
    pos, vel, mass, affine_c = _random_particles(seed, n, c_scale=0.5)
    grid_mass = np.zeros((_GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    p2g_2d(pos, vel, mass, affine_c, grid_mass, grid_mom, _DX)
    grid_vel = grid_velocity_from_momentum(grid_mass, grid_mom)
    count = np.zeros((_GRID_N, _GRID_N), dtype=np.int64)
    from .reference.apic import count_particles_2d

    count_particles_2d(pos, _GRID_N, _GRID_N, _DX, count)
    labels = classify_cells_2d(count, default_solid_mask_2d(_GRID_N, _GRID_N, 2))
    _vel2, _p, max_div = project_masked_2d(grid_vel, labels, _DX, 1.0e-3, 1.0, 2000)
    assert max_div <= 1e-8, max_div


def _affine_grid_field(v0: np.ndarray, c_mat: np.ndarray) -> np.ndarray:
    xs = np.arange(_GRID_N) * _DX
    xx, yy = np.meshgrid(xs, xs, indexing="ij")
    field = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    field[..., 0] = v0[0] + c_mat[0, 0] * xx + c_mat[0, 1] * yy
    field[..., 1] = v0[1] + c_mat[1, 0] * xx + c_mat[1, 1] * yy
    return field


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n=st.integers(min_value=1, max_value=32),
)
@settings(max_examples=20, deadline=None)
def apic_affine_roundtrip_preserved(seed: int, n: int) -> None:
    """Invariant 4 (Prop 5.1): grid -> particle -> grid reproduces an
    affine field at every massed node; PIC does not (fixed negative
    control)."""
    rng = np.random.default_rng(int(seed))
    v0 = rng.uniform(-1.0, 1.0, size=2)
    c_mat = rng.uniform(-2.0, 2.0, size=(2, 2))
    field = _affine_grid_field(v0, c_mat)
    pos, _vel, mass, _c = _random_particles(seed + 1, n)
    vel_p = np.empty_like(pos)
    c_p = np.empty((pos.shape[0], 2, 2), dtype=np.float64)
    g2p_2d(pos, field, _DX, True, vel_p, c_p)
    grid_mass = np.zeros((_GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    p2g_2d(pos, vel_p, mass, c_p, grid_mass, grid_mom, _DX)
    massed = grid_mass > 0.0
    recon = grid_velocity_from_momentum(grid_mass, grid_mom)
    err = np.abs(recon[massed] - field[massed])
    scale = max(1.0, float(np.max(np.abs(field))))
    assert float(np.max(err)) <= 1e-12 * scale, float(np.max(err))
    # C reconstruction is exact too.
    assert np.max(np.abs(c_p - c_mat)) <= 1e-11 * max(1.0, float(np.max(np.abs(c_mat))))


def _pic_roundtrip_negative_control() -> None:
    """Fixed config: PIC (B discarded) fails to reproduce the field."""
    v0 = np.array([0.5, -0.25])
    c_mat = np.array([[0.0, -0.5], [0.5, 0.0]])
    field = _affine_grid_field(v0, c_mat)
    pos = np.array([[6.0 * _DX, 6.0 * _DX], [9.25 * _DX, 7.5 * _DX]])
    mass = np.array([1.0, 2.0])
    vel_p = np.empty_like(pos)
    c_p = np.empty((2, 2, 2), dtype=np.float64)
    g2p_2d(pos, field, _DX, False, vel_p, c_p)  # PIC: no affine term.
    grid_mass = np.zeros((_GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    p2g_2d(pos, vel_p, mass, c_p, grid_mass, grid_mom, _DX)
    massed = grid_mass > 0.0
    recon = grid_velocity_from_momentum(grid_mass, grid_mom)
    dev = float(np.max(np.abs(recon[massed] - field[massed])))
    assert dev > 1e-6, f"PIC negative control vanished (dev={dev})"


def _total_l(pos, vel, c, mass, dx: float) -> float:
    orbital = np.sum(mass * (pos[:, 0] * vel[:, 1] - pos[:, 1] * vel[:, 0]))
    spin = np.sum(mass * 0.25 * dx * dx * (c[:, 1, 0] - c[:, 0, 1]))
    return float(orbital + spin)


@given(
    seed=st.integers(min_value=0, max_value=2**31 - 1),
    n=st.integers(min_value=1, max_value=32),
)
@settings(max_examples=20, deadline=None)
def angular_momentum_conserved_across_transfers(seed: int, n: int) -> None:
    """Invariant 5 (Props 5.4/5.5): L_particles == L_grid == L_particles'
    for APIC (f64 tolerance); PIC loses L (fixed negative control)."""
    pos, vel, mass, affine_c = _random_particles(seed, n, c_scale=2.0)
    l_before = _total_l(pos, vel, affine_c, mass, _DX)
    grid_mass = np.zeros((_GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    p2g_2d(pos, vel, mass, affine_c, grid_mass, grid_mom, _DX)
    xs = np.arange(_GRID_N) * _DX
    xx, yy = np.meshgrid(xs, xs, indexing="ij")
    l_grid = float(np.sum(xx * grid_mom[..., 1] - yy * grid_mom[..., 0]))
    grid_vel = grid_velocity_from_momentum(grid_mass, grid_mom)
    vel_new = np.empty_like(vel)
    c_new = np.empty_like(affine_c)
    g2p_2d(pos, grid_vel, _DX, True, vel_new, c_new)
    l_after = _total_l(pos, vel_new, c_new, mass, _DX)
    scale = max(1.0, abs(l_before))
    assert abs(l_grid - l_before) <= 1e-11 * scale, (l_before, l_grid)
    assert abs(l_after - l_before) <= 1e-11 * scale, (l_before, l_after)


def _pic_angular_momentum_negative_control() -> None:
    """Fixed spin-rich config: PIC G2P visibly changes L."""
    pos = np.array([[6.0 * _DX, 6.0 * _DX], [10.0 * _DX, 7.0 * _DX]])
    vel = np.array([[0.5, -0.25], [1.5, 0.75]])
    mass = np.array([1.0, 2.0])
    affine_c = np.zeros((2, 2, 2), dtype=np.float64)
    affine_c[:, 0, 1] = -4.0
    affine_c[:, 1, 0] = 4.0
    l_before = _total_l(pos, vel, affine_c, mass, _DX)
    grid_mass = np.zeros((_GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    p2g_2d(pos, vel, mass, affine_c, grid_mass, grid_mom, _DX)
    grid_vel = grid_velocity_from_momentum(grid_mass, grid_mom)
    vel_new = np.empty_like(vel)
    c_new = np.empty_like(affine_c)
    g2p_2d(pos, grid_vel, _DX, False, vel_new, c_new)  # PIC.
    l_after_pic = _total_l(pos, vel_new, c_new, mass, _DX)
    assert abs(l_after_pic - l_before) > 1e-6, (l_before, l_after_pic)


def apic_roundtrip_pic_negative_control() -> None:
    """Paired negative control for invariant 4 (fixed config)."""
    _pic_roundtrip_negative_control()


def angular_momentum_pic_negative_control() -> None:
    """Paired negative control for invariant 5 (fixed config)."""
    _pic_angular_momentum_negative_control()


def regularizers_inert_at_rest() -> None:
    """Invariant 6: on a settled lattice (spacing == minDist; rho <= rho_0)
    push-apart displaces nothing and the drift source is identically zero."""
    n_grid = _GRID_N
    dx = _DX
    # Unjittered 2-per-axis lattice: spacing dx/2 == minDist at factor 0.25.
    axes = np.arange(2 * dx + 0.25 * dx, (n_grid - 3) * dx, 0.5 * dx)
    xx, yy = np.meshgrid(axes, axes, indexing="ij")
    pos = np.stack([xx.ravel(), yy.ravel()], axis=-1).astype(np.float64)
    before = pos.copy()
    push_apart_2d(pos, 0.25 * dx, 2, 2 * dx, (n_grid - 3) * dx, (n_grid - 3) * dx)
    assert np.array_equal(pos, before), "push-apart moved a settled lattice"
    den = np.zeros((n_grid, n_grid), dtype=np.float64)
    scatter_unit_density_2d(pos, dx, den)
    from .reference.apic import count_particles_2d

    count = np.zeros((n_grid, n_grid), dtype=np.int64)
    count_particles_2d(pos, n_grid, n_grid, dx, count)
    labels = classify_cells_2d(count, default_solid_mask_2d(n_grid, n_grid, 2))
    rho_rest = measure_rest_density(den, labels)
    rhs = drift_rhs_2d(den, labels, rho_rest, 1.0, 1.0e-3)
    assert np.all(rhs == 0.0), "drift source fired at rest"


def divergence_matches_masked_operator() -> None:
    """Consistency helper: the projection's reported max-div equals a
    recomputation with the public masked-divergence operator."""
    pos, vel, mass, affine_c = _random_particles(7, 32, c_scale=0.5)
    grid_mass = np.zeros((_GRID_N, _GRID_N), dtype=np.float64)
    grid_mom = np.zeros((_GRID_N, _GRID_N, 2), dtype=np.float64)
    p2g_2d(pos, vel, mass, affine_c, grid_mass, grid_mom, _DX)
    grid_vel = grid_velocity_from_momentum(grid_mass, grid_mom)
    from .reference.apic import count_particles_2d

    count = np.zeros((_GRID_N, _GRID_N), dtype=np.int64)
    count_particles_2d(pos, _GRID_N, _GRID_N, _DX, count)
    labels = classify_cells_2d(count, default_solid_mask_2d(_GRID_N, _GRID_N, 2))
    vel2, _p, max_div = project_masked_2d(grid_vel, labels, _DX, 1.0e-3, 1.0, 500)
    div = divergence_masked_2d(vel2, labels, _DX)
    assert abs(float(np.max(np.abs(div))) - max_div) <= 1e-15
