"""Versioned configuration for the full Flow Lenia ecosystem reference model.

This module is deliberately separate from :mod:`flow_lenia.forward`.  The older module is the
small point-splat transport primitive used by the Taichi acceptance suite; the dataclasses below
freeze the multi-channel affinity/pressure/uniform-square model that the browser implementation
will target.

The radial kernel follows the primary JAX implementation by Plantec et al.:

``sigmoid(-10 * (d - 1)) * sum(b_j * exp(-(d-a_j)^2 / w_j))``

where ``d`` is distance divided by ``(R + 15) * r_k``.  The seemingly unusual ``+15`` is retained
as an explicit, versioned parameter so imported reference rules can be represented without a
silent transform.
"""

from __future__ import annotations

from dataclasses import dataclass

MODEL_VARIANT = "flow-lenia-ecosystem-v1"

__all__ = [
    "MODEL_VARIANT",
    "FlowLeniaEcosystemConfig",
    "KernelSpec",
    "default_ecosystem_config",
    "organism_reference_config",
]


@dataclass(frozen=True)
class KernelSpec:
    """One normalized perception kernel and its source/target connection."""

    source: int
    target: int
    relative_radius: float
    growth_mean: float
    growth_width: float
    weight: float
    ring_centers: tuple[float, float, float]
    ring_amplitudes: tuple[float, float, float]
    ring_widths: tuple[float, float, float]

    def validate(self, channels: int) -> None:
        """Raise :class:`ValueError` when the kernel cannot define a finite rule."""
        if not 0 <= self.source < channels:
            raise ValueError(f"kernel source {self.source} outside [0, {channels})")
        if not 0 <= self.target < channels:
            raise ValueError(f"kernel target {self.target} outside [0, {channels})")
        if self.relative_radius <= 0.0:
            raise ValueError("relative_radius must be positive")
        if self.growth_width <= 0.0:
            raise ValueError("growth_width must be positive")
        if any(width <= 0.0 for width in self.ring_widths):
            raise ValueError("ring widths must be positive")
        if all(amplitude == 0.0 for amplitude in self.ring_amplitudes):
            raise ValueError("a kernel needs at least one non-zero ring amplitude")


@dataclass(frozen=True)
class FlowLeniaEcosystemConfig:
    """Frozen equations and safe bounds for ``flow-lenia-ecosystem-v1``.

    Arrays use plane-major layout ``(channels, grid, grid)`` in the NumPy oracle.  The reference
    topology is an even square torus, matching the power-of-two browser tiers.
    """

    grid: int
    channels: int
    kernels: tuple[KernelSpec, ...]
    base_radius: float = 10.0
    radius_offset: float = 15.0
    cutoff_sharpness: float = 10.0
    dt: float = 0.2
    gather_radius: int = 5
    square_half_width: float = 0.65
    density_threshold: float = 2.0
    density_exponent: float = 2.0
    seed: int = 42

    def __post_init__(self) -> None:
        if self.grid < 4 or self.grid % 2 != 0:
            raise ValueError("grid must be even and at least 4")
        if self.channels < 1:
            raise ValueError("channels must be positive")
        if not self.kernels:
            raise ValueError("at least one kernel is required")
        if self.base_radius + self.radius_offset <= 0.0:
            raise ValueError("base_radius + radius_offset must be positive")
        if self.cutoff_sharpness <= 0.0:
            raise ValueError("cutoff_sharpness must be positive")
        if self.dt <= 0.0:
            raise ValueError("dt must be positive")
        if self.gather_radius < 1:
            raise ValueError("gather_radius must be positive")
        if self.square_half_width <= 0.0:
            raise ValueError("square_half_width must be positive")
        if self.square_half_width >= self.gather_radius:
            raise ValueError("square_half_width must be smaller than gather_radius")
        if self.grid <= 2 * self.gather_radius:
            raise ValueError("grid must exceed the gather neighborhood diameter")
        if self.density_threshold <= 0.0:
            raise ValueError("density_threshold must be positive")
        if self.density_exponent <= 0.0:
            raise ValueError("density_exponent must be positive")
        for kernel in self.kernels:
            kernel.validate(self.channels)

    @property
    def max_displacement(self) -> float:
        """Largest allowed displacement component for the fixed gather neighborhood."""
        return float(self.gather_radius - self.square_half_width)


def _kernel(
    source: int,
    target: int,
    relative_radius: float,
    mean: float,
    width: float,
    weight: float,
    centers: tuple[float, float, float],
    amplitudes: tuple[float, float, float],
    ring_widths: tuple[float, float, float],
) -> KernelSpec:
    return KernelSpec(
        source=source,
        target=target,
        relative_radius=relative_radius,
        growth_mean=mean,
        growth_width=width,
        weight=weight,
        ring_centers=centers,
        ring_amplitudes=amplitudes,
        ring_widths=ring_widths,
    )


def organism_reference_config(*, grid: int = 32, seed: int = 42) -> FlowLeniaEcosystemConfig:
    """Small one-channel, three-kernel rule used by the oracle and future GPU gates.

    This is a Bit-Physics authored numerical fixture, not a claim that the parameters reproduce a
    named organism from an external catalogue.
    """
    kernels = (
        _kernel(
            0,
            0,
            0.62,
            0.24,
            0.070,
            0.70,
            (0.20, 0.52, 0.82),
            (0.8, 1.0, 0.45),
            (0.020, 0.035, 0.025),
        ),
        _kernel(
            0,
            0,
            0.43,
            0.18,
            0.055,
            0.35,
            (0.28, 0.66, 0.90),
            (1.0, 0.5, 0.2),
            (0.025, 0.040, 0.020),
        ),
        _kernel(
            0,
            0,
            0.28,
            0.31,
            0.090,
            -0.18,
            (0.15, 0.48, 0.76),
            (0.3, 1.0, 0.7),
            (0.018, 0.030, 0.030),
        ),
    )
    return FlowLeniaEcosystemConfig(grid=grid, channels=1, kernels=kernels, seed=seed)


def default_ecosystem_config(*, grid: int = 32, seed: int = 42) -> FlowLeniaEcosystemConfig:
    """Three-channel/nine-kernel reference topology for ecosystem implementation work.

    The connection counts match the official example matrix ``[[2,1,0],[0,2,1],[1,0,2]]``.
    Numerical ring parameters are deterministic Bit-Physics fixtures and carry no biological
    interpretation.
    """
    connections = (
        (0, 0),
        (0, 0),
        (0, 1),
        (1, 1),
        (1, 1),
        (1, 2),
        (2, 0),
        (2, 2),
        (2, 2),
    )
    radii = (0.72, 0.48, 0.63, 0.70, 0.44, 0.61, 0.59, 0.68, 0.42)
    means = (0.22, 0.31, 0.19, 0.24, 0.34, 0.17, 0.21, 0.26, 0.32)
    widths = (0.070, 0.085, 0.060, 0.075, 0.090, 0.052, 0.065, 0.080, 0.088)
    weights = (0.65, -0.18, 0.42, 0.61, -0.16, 0.38, 0.40, 0.58, -0.14)
    center_sets = (
        (0.18, 0.50, 0.82),
        (0.27, 0.61, 0.89),
        (0.15, 0.46, 0.76),
    )
    amplitude_sets = ((0.7, 1.0, 0.5), (1.0, 0.55, 0.25), (0.35, 1.0, 0.72))
    ring_width_sets = ((0.020, 0.035, 0.025), (0.025, 0.040, 0.020), (0.018, 0.030, 0.030))
    kernels = tuple(
        _kernel(
            source,
            target,
            radii[index],
            means[index],
            widths[index],
            weights[index],
            center_sets[index % 3],
            amplitude_sets[index % 3],
            ring_width_sets[index % 3],
        )
        for index, (source, target) in enumerate(connections)
    )
    return FlowLeniaEcosystemConfig(grid=grid, channels=3, kernels=kernels, seed=seed)
