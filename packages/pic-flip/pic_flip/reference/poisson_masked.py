"""Masked free-surface pressure Poisson solver (NEW verified code, 2D + 3D).

The eulerian-smoke projection
(``packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py``)
is **periodic-only** — no fluid mask, no free-surface Dirichlet BC, no
solid walls (sim spec v0.2 § 1 projection-reuse correction). This
module is the free-surface solver a dam break actually needs: per-step
cell labels {solid, fluid, air} from marker occupancy, Dirichlet
``p = 0`` (or caller-supplied MMS data) in air cells, zero-weight solid
faces (the Zhu/Bridson/Muller pattern — also what lets *moving*
obstacles exert velocity BCs), Jacobi sweeps restricted to fluid cells
with a **fixed iteration cap** (the P24 no-early-stop determinism
pattern; the cap is per-canonical, chosen by measured hydrostatic
convergence — spec-ref § 6.3, the GPU Gems 3 ch. 30 solver-depth
failure).

**Operator pair (load-bearing deviation from the smoke reference,
measured-and-documented):** divergence is the *backward* difference
``div_i = (u_i - u_{i-1})/dx`` and the pressure gradient the *forward*
difference ``g_i = (p_{i+1} - p_i)/dx`` — the adjoint pair, which
composes to the compact 5-point (2D) / 7-point (3D) Laplacian actually
iterated by the Jacobi sweep. The smoke reference's central/central
pair composes to the *wide* Laplacian instead; on a **periodic**
domain that costs only the documented O(dx^2) interior floor, but at a
free-surface/solid boundary it fails the hydrostatic anchor at O(1)
(a settled column retains ~half of gravity per step and sinks — the
derivation is shown in
``docs/sim-specs/particle-fluids/pic-flip/algebraic.md`` § 4). With
the adjoint compact pair, the discrete hydrostatic column is
reproduced **exactly** (up to solver residual): ``p = rho g depth``
per node and post-projection fluid velocities identically zero — the
spec's § 6.3 anchor test witnesses this. Equivalent to interpreting
the collocated component ``u[i]`` as the MAC face ``(i, i+1)``; no
checkerboard null mode for this pair.

Boundary contract: domain-edge nodes must never be FLUID (callers keep
``n_wall >= 1`` solid layers or an air ring — asserted here). All
array sweeps are vectorized NumPy on f64 (deterministic; no atomics,
no BLAS reductions).
"""

from __future__ import annotations

import numpy as np

__all__ = [
    "AIR",
    "FLUID",
    "SOLID",
    "classify_cells_2d",
    "classify_cells_3d",
    "default_solid_mask_2d",
    "default_solid_mask_3d",
    "divergence_masked_2d",
    "divergence_masked_3d",
    "jacobi_masked_2d",
    "jacobi_masked_3d",
    "project_masked_2d",
    "project_masked_3d",
    "extrapolate_into_air_2d",
    "extrapolate_into_air_3d",
]

AIR: int = 0
FLUID: int = 1
SOLID: int = 2


def default_solid_mask_2d(nx: int, ny: int, n_wall: int) -> np.ndarray:
    """Container walls: ``n_wall`` solid node layers on every side."""
    mask = np.zeros((nx, ny), dtype=bool)
    mask[:n_wall, :] = True
    mask[-n_wall:, :] = True
    mask[:, :n_wall] = True
    mask[:, -n_wall:] = True
    return mask


def default_solid_mask_3d(nx: int, ny: int, nz: int, n_wall: int) -> np.ndarray:
    mask = np.zeros((nx, ny, nz), dtype=bool)
    mask[:n_wall, :, :] = True
    mask[-n_wall:, :, :] = True
    mask[:, :n_wall, :] = True
    mask[:, -n_wall:, :] = True
    mask[:, :, :n_wall] = True
    mask[:, :, -n_wall:] = True
    return mask


def classify_cells_2d(count: np.ndarray, solid_mask: np.ndarray) -> np.ndarray:
    """Labels from marker occupancy: solid mask wins; fluid iff >= 1 marker."""
    labels = np.full(count.shape, AIR, dtype=np.uint8)
    labels[count > 0] = FLUID
    labels[solid_mask] = SOLID
    return labels


def classify_cells_3d(count: np.ndarray, solid_mask: np.ndarray) -> np.ndarray:
    return classify_cells_2d(count, solid_mask)


def _assert_no_edge_fluid(labels: np.ndarray) -> None:
    for axis in range(labels.ndim):
        first = np.take(labels, 0, axis=axis)
        last = np.take(labels, -1, axis=axis)
        if np.any(first == FLUID) or np.any(last == FLUID):
            raise ValueError(
                "domain-edge node labeled FLUID — callers must keep solid "
                "walls or an air ring at the boundary (poisson_masked contract)"
            )


def _neighbor(arr: np.ndarray, axis: int, direction: int) -> np.ndarray:
    """Value of the neighbor at ``index + direction`` along ``axis``.

    Implemented with ``np.roll`` (wrapped values only surface at
    domain-edge nodes, which the label contract keeps non-fluid).
    """
    return np.roll(arr, -direction, axis=axis)


def divergence_masked_2d(
    grid_vel: np.ndarray, labels: np.ndarray, dx: float
) -> np.ndarray:
    """Backward-difference divergence at fluid nodes; zero elsewhere.

    Callers must have set solid-node velocities to the obstacle
    velocity beforehand (project_masked does).
    """
    u = grid_vel[..., 0]
    v = grid_vel[..., 1]
    div = (u - _neighbor(u, 0, -1) + v - _neighbor(v, 1, -1)) / dx
    out = np.zeros_like(div)
    fluid = labels == FLUID
    out[fluid] = div[fluid]
    return out


def divergence_masked_3d(
    grid_vel: np.ndarray, labels: np.ndarray, dx: float
) -> np.ndarray:
    u = grid_vel[..., 0]
    v = grid_vel[..., 1]
    w = grid_vel[..., 2]
    div = (
        u - _neighbor(u, 0, -1) + v - _neighbor(v, 1, -1) + w - _neighbor(w, 2, -1)
    ) / dx
    out = np.zeros_like(div)
    fluid = labels == FLUID
    out[fluid] = div[fluid]
    return out


def _jacobi_masked(
    rhs: np.ndarray,
    labels: np.ndarray,
    dx: float,
    n_iter: int,
    air_values: np.ndarray | None,
) -> np.ndarray:
    """Fixed-iteration Jacobi on fluid nodes (compact Laplacian).

    Per fluid node: ``p = (sum_nonsolid_nb value - dx^2 rhs) / diag``
    with fluid neighbor -> current ``p``; air neighbor -> Dirichlet
    value (``air_values``, default 0); solid neighbor -> face dropped
    (``diag`` reduced). No early-stop branch (P24 determinism pattern).
    """
    _assert_no_edge_fluid(labels)
    ndim = labels.ndim
    fluid = labels == FLUID
    dx2 = dx * dx
    if air_values is None:
        air_values = np.zeros_like(rhs)
    # Precompute per-direction neighbor label masks + Dirichlet fields.
    directions = [(axis, d) for axis in range(ndim) for d in (-1, +1)]
    nb_fluid = []
    nb_air_val = []
    diag = np.zeros(labels.shape, dtype=np.float64)
    for axis, d in directions:
        lab_nb = _neighbor(labels, axis, d)
        nb_fluid.append(lab_nb == FLUID)
        air_nb = np.where(lab_nb == AIR, _neighbor(air_values, axis, d), 0.0)
        nb_air_val.append(air_nb)
        diag += (lab_nb != SOLID).astype(np.float64)
    dirichlet_sum = np.zeros_like(rhs)
    for air_nb in nb_air_val:
        dirichlet_sum += air_nb
    safe_diag = np.where(diag > 0.0, diag, 1.0)
    p = np.zeros_like(rhs)
    for _ in range(int(n_iter)):
        acc = dirichlet_sum - dx2 * rhs
        for (axis, d), fl_mask in zip(directions, nb_fluid):
            acc = acc + np.where(fl_mask, _neighbor(p, axis, d), 0.0)
        p_new = np.where(fluid & (diag > 0.0), acc / safe_diag, 0.0)
        p = p_new
    return p


def jacobi_masked_2d(
    rhs: np.ndarray,
    labels: np.ndarray,
    dx: float,
    n_iter: int,
    air_values: np.ndarray | None = None,
) -> np.ndarray:
    return _jacobi_masked(rhs, labels, dx, n_iter, air_values)


def jacobi_masked_3d(
    rhs: np.ndarray,
    labels: np.ndarray,
    dx: float,
    n_iter: int,
    air_values: np.ndarray | None = None,
) -> np.ndarray:
    return _jacobi_masked(rhs, labels, dx, n_iter, air_values)


def _project_masked(
    grid_vel: np.ndarray,
    labels: np.ndarray,
    dx: float,
    dt: float,
    rho: float,
    n_iter: int,
    rhs_extra: np.ndarray | None,
    solid_vel: tuple[float, ...],
    air_values: np.ndarray | None,
) -> tuple[np.ndarray, np.ndarray, float]:
    ndim = labels.ndim
    fluid = labels == FLUID
    solid = labels == SOLID
    out = grid_vel.copy()
    # Solid-face velocity restore BEFORE the divergence (moving-obstacle BC).
    for a in range(ndim):
        comp = out[..., a]
        comp[solid] = solid_vel[a]
    if ndim == 2:
        div = divergence_masked_2d(out, labels, dx)
    else:
        div = divergence_masked_3d(out, labels, dx)
    rhs = (rho / dt) * div
    if rhs_extra is not None:
        rhs = rhs + np.where(fluid, rhs_extra, 0.0)
    p = _jacobi_masked(rhs, labels, dx, n_iter, air_values)
    # Dirichlet-extended pressure field for the forward gradient.
    p_ext = p.copy()
    if air_values is not None:
        air = labels == AIR
        p_ext[air] = air_values[air]
    # Face updates: component a at node i is the face (i, i+e_a); update
    # iff the face borders a fluid node and neither side is solid.
    for a in range(ndim):
        lab_up = _neighbor(labels, a, +1)
        p_up = _neighbor(p_ext, a, +1)
        face = (fluid | (lab_up == FLUID)) & (~solid) & (lab_up != SOLID)
        grad = (p_up - p_ext) / dx
        comp = out[..., a]
        comp[face] -= (dt / rho) * grad[face]
    # Re-assert the solid BC after the update.
    for a in range(ndim):
        comp = out[..., a]
        comp[solid] = solid_vel[a]
    if ndim == 2:
        div_after = divergence_masked_2d(out, labels, dx)
    else:
        div_after = divergence_masked_3d(out, labels, dx)
    max_div = float(np.max(np.abs(div_after))) if div_after.size else 0.0
    return out, p, max_div


def project_masked_2d(
    grid_vel: np.ndarray,
    labels: np.ndarray,
    dx: float,
    dt: float,
    rho: float,
    n_iter: int,
    rhs_extra: np.ndarray | None = None,
    solid_vel: tuple[float, float] = (0.0, 0.0),
    air_values: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray, float]:
    """Masked projection, 2D. Returns ``(grid_vel', p, max_fluid_div_after)``."""
    return _project_masked(
        grid_vel, labels, dx, dt, rho, n_iter, rhs_extra, solid_vel, air_values
    )


def project_masked_3d(
    grid_vel: np.ndarray,
    labels: np.ndarray,
    dx: float,
    dt: float,
    rho: float,
    n_iter: int,
    rhs_extra: np.ndarray | None = None,
    solid_vel: tuple[float, float, float] = (0.0, 0.0, 0.0),
    air_values: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray, float]:
    """Masked projection, 3D. Returns ``(grid_vel', p, max_fluid_div_after)``."""
    return _project_masked(
        grid_vel, labels, dx, dt, rho, n_iter, rhs_extra, solid_vel, air_values
    )


def _extrapolate(grid_vel: np.ndarray, labels: np.ndarray, n_layers: int) -> None:
    """Breadth-first velocity extension from fluid into air (in place).

    Air-node velocities are zeroed, then filled layer by layer with the
    mean of already-known 2*ndim-neighborhood values (fluid nodes seed
    the front; solid nodes are never sources nor overwritten). Layered
    Jacobi-style passes — deterministic, order-free.
    """
    ndim = labels.ndim
    air = labels == AIR
    known = labels == FLUID
    for a in range(grid_vel.shape[-1]):
        comp = grid_vel[..., a]
        comp[air] = 0.0
    for _ in range(int(n_layers)):
        known_f = known.astype(np.float64)
        nb_count = np.zeros(labels.shape, dtype=np.float64)
        nb_sums = [
            np.zeros(labels.shape, dtype=np.float64) for _ in range(grid_vel.shape[-1])
        ]
        for axis in range(ndim):
            for d in (-1, +1):
                nb_known = _neighbor(known_f, axis, d)
                nb_count += nb_known
                for a in range(grid_vel.shape[-1]):
                    comp = grid_vel[..., a]
                    nb_sums[a] += _neighbor(comp * known_f, axis, d)
        frontier = air & (~known) & (nb_count > 0.0)
        if not np.any(frontier):
            break
        for a in range(grid_vel.shape[-1]):
            comp = grid_vel[..., a]
            comp[frontier] = nb_sums[a][frontier] / nb_count[frontier]
        known = known | frontier


def extrapolate_into_air_2d(
    grid_vel: np.ndarray, labels: np.ndarray, n_layers: int
) -> None:
    _extrapolate(grid_vel, labels, n_layers)


def extrapolate_into_air_3d(
    grid_vel: np.ndarray, labels: np.ndarray, n_layers: int
) -> None:
    _extrapolate(grid_vel, labels, n_layers)
