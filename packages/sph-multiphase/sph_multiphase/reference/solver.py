"""Small deterministic INDSPH integrator used for executable research gates."""

from __future__ import annotations

from dataclasses import dataclass
import numpy as np
import numpy.typing as npt

from .kernels import (
    brute_neighbors,
    ind_sph_denominator,
    number_density,
    predict_number_density,
    pressure_velocity_delta,
    surface_forces,
    timestep_limits,
    viscosity_forces,
)


@dataclass(frozen=True)
class Material:
    density: float
    viscosity: float


@dataclass(frozen=True)
class Params:
    h: float
    spacing: float
    rest_number_density: float
    phase_a: Material = Material(1000.0, 0.01)
    phase_b: Material = Material(800.0, 0.04)
    sigma: float = 0.04
    gravity: tuple[float, ...] = (0.0, -9.81)
    dt_max: float = 1e-3
    pressure_iterations: int = 8
    pressure_tolerance: float = 1e-3


@dataclass
class State:
    position: np.ndarray
    velocity: np.ndarray
    phase: np.ndarray
    persistent_id: np.ndarray | None = None
    pressure: np.ndarray | None = None
    number_density: np.ndarray | None = None

    def copy(self) -> "State":
        return State(
            self.position.copy(),
            self.velocity.copy(),
            self.phase.copy(),
            None if self.persistent_id is None else self.persistent_id.copy(),
            None if self.pressure is None else self.pressure.copy(),
            None if self.number_density is None else self.number_density.copy(),
        )


def particle_masses(state: State, params: Params) -> npt.NDArray[np.float64]:
    volume = params.spacing ** state.position.shape[1]
    rho = np.where(state.phase == 0, params.phase_a.density, params.phase_b.density)
    return np.asarray(rho * volume, dtype=np.float64)


def step(state: State, params: Params) -> tuple[State, dict[str, float | str]]:
    """One density-projection step; coefficients are never frame-rate adapted."""
    s = state.copy()
    x, v, ph = s.position, s.velocity, s.phase
    masses = particle_masses(s, params)
    nbr = brute_neighbors(x, params.h)
    gravity = np.asarray(params.gravity, dtype=np.float64)
    f_visc = viscosity_forces(
        x,
        v,
        ph,
        masses,
        (params.phase_a.viscosity, params.phase_b.viscosity),
        params.h,
        nbr,
    )
    f_surface = surface_forces(x, ph, masses, params.h, params.sigma, nbr)
    accel = gravity[None, :] + (f_visc + f_surface) / masses[:, None]
    limits = timestep_limits(
        h=params.h,
        spacing=params.spacing,
        max_speed=float(np.linalg.norm(v, axis=1).max(initial=0.0)),
        max_accel=float(np.linalg.norm(accel, axis=1).max(initial=0.0)),
        rho_a=params.phase_a.density,
        rho_b=params.phase_b.density,
        nu_max=max(
            params.phase_a.viscosity / params.phase_a.density,
            params.phase_b.viscosity / params.phase_b.density,
        ),
        sigma=params.sigma,
        dt_max=params.dt_max,
    )
    limiter = min(limits, key=lambda name: limits[name])
    dt = limits[limiter]
    v += dt * accel
    denom = ind_sph_denominator(x, masses, params.h, nbr)
    kappa = np.zeros(len(x), dtype=np.float64)
    iterations = 0
    error = 0.0
    for iterations in range(1, params.pressure_iterations + 1):
        predicted = predict_number_density(x, v, params.h, dt, neighbors=nbr)
        compression = np.maximum(predicted / params.rest_number_density - 1.0, 0.0)
        error = float(compression.max(initial=0.0))
        if error <= params.pressure_tolerance:
            break
        kappa = (
            compression
            * params.rest_number_density
            / np.maximum(denom * dt * dt, 1e-30)
        )
        v += pressure_velocity_delta(x, masses, kappa, params.h, dt, nbr)
    x += dt * v
    s.position, s.velocity = x, v
    s.number_density = number_density(x, params.h)
    s.pressure = kappa
    return s, {
        "dt": float(dt),
        "limiter": limiter,
        "pressure_iterations": float(iterations),
        "max_compression": error,
        "phase_a_mass": float(masses[ph == 0].sum()),
        "phase_b_mass": float(masses[ph == 1].sum()),
        "internal_surface_force": float(np.linalg.norm(f_surface.sum(axis=0))),
        "internal_viscous_force": float(np.linalg.norm(f_visc.sum(axis=0))),
    }


def lattice_droplet(side: int = 18, radius: float = 0.18) -> tuple[State, Params]:
    spacing = 1.0 / side
    axes = np.arange(spacing * 0.5, 1.0, spacing)
    mesh = np.meshgrid(axes, axes, indexing="ij")
    pos = np.stack([m.ravel() for m in mesh], axis=1)
    phase = (np.linalg.norm(pos - 0.5, axis=1) < radius).astype(np.uint32)
    vel = np.zeros_like(pos)
    h = 1.25 * spacing
    rest = float(np.median(number_density(pos, h)))
    return State(pos, vel, phase, np.arange(len(pos), dtype=np.uint32)), Params(
        h=h, spacing=spacing, rest_number_density=rest, gravity=(0.0, 0.0)
    )
