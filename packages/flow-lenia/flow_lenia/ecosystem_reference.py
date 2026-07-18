"""Pure NumPy f64 oracle for the full Flow Lenia ecosystem model.

The implementation favors transparent equations and stable iteration order over speed.  It is the
scientific target for the WebGPU solver, not the browser runtime itself.  In particular, transport
is the finite uniform-square Reintegration Tracking gather rather than the older point-splat
primitive in :mod:`flow_lenia.forward`.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

from .ecosystem_config import FlowLeniaEcosystemConfig, KernelSpec

FloatArray = NDArray[np.float64]
UInt32Array = NDArray[np.uint32]
UInt64Array = NDArray[np.uint64]
MixingRule = Literal["average", "whole", "gene-wise", "best", "negotiation"]

IDENTITY_MIXED = np.uint32(1 << 0)
IDENTITY_MUTATED = np.uint32(1 << 1)
MIXED_LINEAGE = np.uint32(0xFFFFFFFF)

__all__ = [
    "IDENTITY_MIXED",
    "IDENTITY_MUTATED",
    "MIXED_LINEAGE",
    "EcosystemState",
    "GenomeFields",
    "MixingRule",
    "MutationEvent",
    "StepDiagnostics",
    "build_kernels",
    "clamp_displacement",
    "compute_flow",
    "direct_periodic_convolution",
    "growth_response",
    "make_uniform_genomes",
    "mutate_patch",
    "perceive",
    "radial_kernel",
    "reintegrate_square",
    "reintegrate_with_genomes",
    "sobel_periodic",
    "square_overlap_weight",
    "step_reference",
]


@dataclass(frozen=True)
class GenomeFields:
    """Localized rule and identity planes, all indexed as ``[..., x, y]``."""

    h: FloatArray
    q: FloatArray
    fingerprint: UInt64Array
    lineage: UInt32Array
    flags: UInt32Array


@dataclass(frozen=True)
class EcosystemState:
    """Mass plus localized rules for an ecosystem reference step."""

    mass: FloatArray
    genomes: GenomeFields


@dataclass(frozen=True)
class StepDiagnostics:
    """Intermediates used by independent anchors and CPU/GPU divergence reports."""

    perception: FloatArray
    growth: FloatArray
    affinity: FloatArray
    alpha: FloatArray
    flow: FloatArray
    displacement: FloatArray
    clamp_mask: NDArray[np.bool_]


@dataclass(frozen=True)
class MutationEvent:
    """One deterministic, contiguous mutation event for the bounded lineage log."""

    event_index: int
    parent_lineage: int
    child_lineage: int
    child_fingerprint: int
    center: tuple[int, int]
    radius: float
    affected_mass: float
    delta_h: tuple[float, ...]
    delta_q: tuple[float, ...]


def _grid_coordinates(grid: int) -> NDArray[np.int64]:
    half = grid // 2
    return np.arange(-half, half, dtype=np.int64)


def radial_kernel(config: FlowLeniaEcosystemConfig, spec: KernelSpec) -> FloatArray:
    """Return one centered, discretely normalized three-ring kernel.

    Index ``(grid//2, grid//2)`` is zero displacement.  Use :func:`numpy.fft.ifftshift` before an
    FFT; :func:`direct_periodic_convolution` consumes this centered representation directly.
    """
    axis = _grid_coordinates(config.grid).astype(np.float64)
    xx, yy = np.meshgrid(axis, axis, indexing="ij")
    radius = (config.base_radius + config.radius_offset) * spec.relative_radius
    distance = np.sqrt(xx * xx + yy * yy) / radius
    cutoff = 0.5 * (np.tanh((-config.cutoff_sharpness * (distance - 1.0)) / 2.0) + 1.0)
    rings = np.zeros_like(distance)
    for center, amplitude, width in zip(
        spec.ring_centers, spec.ring_amplitudes, spec.ring_widths, strict=True
    ):
        rings += amplitude * np.exp(-((distance - center) ** 2) / width)
    kernel = cutoff * rings
    normalization = float(kernel.sum(dtype=np.float64))
    if not math.isfinite(normalization) or normalization <= 0.0:
        raise ValueError("kernel normalization must be finite and positive")
    return np.ascontiguousarray(kernel / normalization, dtype=np.float64)


def build_kernels(config: FlowLeniaEcosystemConfig) -> FloatArray:
    """Build all centered normalized kernels as ``(kernel, x, y)``."""
    return np.ascontiguousarray(
        np.stack([radial_kernel(config, spec) for spec in config.kernels]), dtype=np.float64
    )


def direct_periodic_convolution(field: FloatArray, centered_kernel: FloatArray) -> FloatArray:
    """Direct f64 periodic convolution used as an independent small-grid FFT oracle."""
    if field.ndim != 2 or centered_kernel.shape != field.shape:
        raise ValueError("field and centered kernel must be equally sized 2-D arrays")
    grid = field.shape[0]
    if field.shape[1] != grid or grid % 2 != 0:
        raise ValueError("the reference convolution requires an even square field")
    out = np.zeros_like(field, dtype=np.float64)
    axis = _grid_coordinates(grid)
    for kernel_i, offset_i in enumerate(axis):
        for kernel_j, offset_j in enumerate(axis):
            weight = float(centered_kernel[kernel_i, kernel_j])
            if weight != 0.0:
                out += weight * np.roll(field, (int(offset_i), int(offset_j)), axis=(0, 1))
    return np.ascontiguousarray(out, dtype=np.float64)


def growth_response(
    values: FloatArray, mean: float | FloatArray, width: float | FloatArray
) -> FloatArray:
    """Lenia bell response ``2 exp(-0.5 ((U-m)/s)^2) - 1``."""
    widths = np.asarray(width, dtype=np.float64)
    if np.any(widths <= 0.0):
        raise ValueError("growth widths must be positive")
    z = (values - mean) / widths
    return np.ascontiguousarray(2.0 * np.exp(-0.5 * z * z) - 1.0, dtype=np.float64)


def _validate_mass(mass: FloatArray, config: FlowLeniaEcosystemConfig) -> FloatArray:
    array = np.ascontiguousarray(mass, dtype=np.float64)
    expected = (config.channels, config.grid, config.grid)
    if array.shape != expected:
        raise ValueError(f"mass shape {array.shape} does not match {expected}")
    if not np.all(np.isfinite(array)):
        raise ValueError("mass must be finite")
    if np.any(array < 0.0):
        raise ValueError("mass must be non-negative")
    return array


def perceive(
    mass: FloatArray,
    config: FlowLeniaEcosystemConfig,
    *,
    kernels: FloatArray | None = None,
    local_h: FloatArray | None = None,
    environment: FloatArray | None = None,
) -> tuple[FloatArray, FloatArray, FloatArray]:
    """Compute kernel perception ``U``, growth ``I``, and channel affinity ``V``."""
    mass = _validate_mass(mass, config)
    if kernels is None:
        kernels = build_kernels(config)
    expected_kernels = (len(config.kernels), config.grid, config.grid)
    if kernels.shape != expected_kernels:
        raise ValueError(f"kernel shape {kernels.shape} does not match {expected_kernels}")

    perception = np.empty(expected_kernels, dtype=np.float64)
    growth = np.empty_like(perception)
    affinity = np.zeros_like(mass)
    if local_h is not None and local_h.shape != expected_kernels:
        raise ValueError(f"local_h shape {local_h.shape} does not match {expected_kernels}")

    for index, spec in enumerate(config.kernels):
        perception[index] = direct_periodic_convolution(mass[spec.source], kernels[index])
        growth[index] = growth_response(perception[index], spec.growth_mean, spec.growth_width)
        weight: float | FloatArray = spec.weight if local_h is None else local_h[index]
        affinity[spec.target] += weight * growth[index]

    if environment is not None:
        if environment.shape != mass.shape or not np.all(np.isfinite(environment)):
            raise ValueError("environment must be a finite field matching mass")
        affinity += environment
    return (
        np.ascontiguousarray(perception),
        np.ascontiguousarray(growth),
        np.ascontiguousarray(affinity),
    )


_SOBEL_AXIS_1 = np.array(
    [[1.0, 0.0, -1.0], [2.0, 0.0, -2.0], [1.0, 0.0, -1.0]],
    dtype=np.float64,
)
_SOBEL_AXIS_0 = _SOBEL_AXIS_1.T.copy()


def _convolve_3x3_periodic(field: FloatArray, stencil: FloatArray) -> FloatArray:
    out = np.zeros_like(field, dtype=np.float64)
    for stencil_i, offset_i in enumerate((-1, 0, 1)):
        for stencil_j, offset_j in enumerate((-1, 0, 1)):
            out += stencil[stencil_i, stencil_j] * np.roll(field, (offset_i, offset_j), axis=(0, 1))
    return out


def sobel_periodic(field: FloatArray) -> FloatArray:
    """Official unnormalized Sobel convention with periodic boundaries.

    The result shape is ``(2, x, y)``.  Component 0 differentiates array axis 0 and component 1
    differentiates axis 1.  The stencil is intentionally not divided by eight because the primary
    Flow Lenia implementation is also unnormalized.
    """
    if field.ndim != 2 or field.shape[0] != field.shape[1]:
        raise ValueError("Sobel input must be a square 2-D field")
    return np.ascontiguousarray(
        np.stack(
            [
                _convolve_3x3_periodic(field, _SOBEL_AXIS_0),
                _convolve_3x3_periodic(field, _SOBEL_AXIS_1),
            ]
        ),
        dtype=np.float64,
    )


def compute_flow(
    mass: FloatArray,
    affinity: FloatArray,
    config: FlowLeniaEcosystemConfig,
) -> tuple[FloatArray, FloatArray]:
    """Compute pressure-gated channel flow and the crowding gate ``alpha``."""
    mass = _validate_mass(mass, config)
    if affinity.shape != mass.shape or not np.all(np.isfinite(affinity)):
        raise ValueError("affinity must be a finite field matching mass")
    density_gradient = sobel_periodic(mass.sum(axis=0, dtype=np.float64))
    alpha = np.clip((mass / config.density_threshold) ** config.density_exponent, 0.0, 1.0)
    flow = np.empty((config.channels, 2, config.grid, config.grid), dtype=np.float64)
    for channel in range(config.channels):
        affinity_gradient = sobel_periodic(affinity[channel])
        flow[channel] = (
            affinity_gradient * (1.0 - alpha[channel])[None, :, :]
            - density_gradient * alpha[channel][None, :, :]
        )
    return np.ascontiguousarray(flow), np.ascontiguousarray(alpha)


def clamp_displacement(
    flow: FloatArray, config: FlowLeniaEcosystemConfig
) -> tuple[FloatArray, NDArray[np.bool_]]:
    """Convert flow to displacement and component-clamp it to the gather proof domain."""
    expected = (config.channels, 2, config.grid, config.grid)
    if flow.shape != expected or not np.all(np.isfinite(flow)):
        raise ValueError(f"flow must be finite with shape {expected}")
    raw = config.dt * flow
    displacement = np.clip(raw, -config.max_displacement, config.max_displacement)
    clamped = np.any(displacement != raw, axis=1)
    return np.ascontiguousarray(displacement), np.ascontiguousarray(clamped)


def _periodic_delta(delta: float, grid: int) -> float:
    return float((delta + 0.5 * grid) % grid - 0.5 * grid)


def _overlap_length(center_delta: float, half_width: float) -> float:
    return float(
        np.clip(
            0.5 + half_width - abs(center_delta),
            0.0,
            min(1.0, 2.0 * half_width),
        )
    )


def square_overlap_weight(
    destination: tuple[int, int],
    source: tuple[int, int],
    displacement: tuple[float, float],
    *,
    grid: int,
    half_width: float,
) -> float:
    """Exact normalized overlap of one moved uniform square with one unit destination cell."""
    if half_width <= 0.0:
        raise ValueError("half_width must be positive")
    source_center_i = source[0] + 0.5 + displacement[0]
    source_center_j = source[1] + 0.5 + displacement[1]
    destination_center_i = destination[0] + 0.5
    destination_center_j = destination[1] + 0.5
    delta_i = _periodic_delta(destination_center_i - source_center_i, grid)
    delta_j = _periodic_delta(destination_center_j - source_center_j, grid)
    overlap_i = _overlap_length(delta_i, half_width)
    overlap_j = _overlap_length(delta_j, half_width)
    return overlap_i * overlap_j / (4.0 * half_width * half_width)


def _validate_displacement(
    displacement: FloatArray, config: FlowLeniaEcosystemConfig
) -> FloatArray:
    expected = (config.channels, 2, config.grid, config.grid)
    array = np.ascontiguousarray(displacement, dtype=np.float64)
    if array.shape != expected or not np.all(np.isfinite(array)):
        raise ValueError(f"displacement must be finite with shape {expected}")
    if np.any(np.abs(array) > config.max_displacement + 1e-12):
        raise ValueError("displacement exceeds the fixed gather neighborhood")
    return array


def _candidate_weights(
    destination_i: int,
    destination_j: int,
    source_i: int,
    source_j: int,
    displacement: FloatArray,
    config: FlowLeniaEcosystemConfig,
) -> FloatArray:
    weights = np.empty(config.channels, dtype=np.float64)
    for channel in range(config.channels):
        weights[channel] = square_overlap_weight(
            (destination_i, destination_j),
            (source_i, source_j),
            (
                float(displacement[channel, 0, source_i, source_j]),
                float(displacement[channel, 1, source_i, source_j]),
            ),
            grid=config.grid,
            half_width=config.square_half_width,
        )
    return weights


def reintegrate_square(
    mass: FloatArray,
    displacement: FloatArray,
    config: FlowLeniaEcosystemConfig,
) -> FloatArray:
    """Destination-gather finite-square Reintegration Tracking on a torus."""
    mass = _validate_mass(mass, config)
    displacement = _validate_displacement(displacement, config)
    out = np.zeros_like(mass, dtype=np.float64)
    dd = config.gather_radius
    for destination_i in range(config.grid):
        for destination_j in range(config.grid):
            for offset_i in range(-dd, dd + 1):
                source_i = (destination_i + offset_i) % config.grid
                for offset_j in range(-dd, dd + 1):
                    source_j = (destination_j + offset_j) % config.grid
                    weights = _candidate_weights(
                        destination_i,
                        destination_j,
                        source_i,
                        source_j,
                        displacement,
                        config,
                    )
                    out[:, destination_i, destination_j] += mass[:, source_i, source_j] * weights
    return np.ascontiguousarray(out, dtype=np.float64)


def step_reference(
    mass: FloatArray,
    config: FlowLeniaEcosystemConfig,
    *,
    kernels: FloatArray | None = None,
    local_h: FloatArray | None = None,
    environment: FloatArray | None = None,
) -> tuple[FloatArray, StepDiagnostics]:
    """Advance one full affinity/pressure/uniform-square reference step."""
    perception, growth, affinity = perceive(
        mass,
        config,
        kernels=kernels,
        local_h=local_h,
        environment=environment,
    )
    flow, alpha = compute_flow(mass, affinity, config)
    displacement, clamp_mask = clamp_displacement(flow, config)
    next_mass = reintegrate_square(mass, displacement, config)
    return next_mass, StepDiagnostics(
        perception=perception,
        growth=growth,
        affinity=affinity,
        alpha=alpha,
        flow=flow,
        displacement=displacement,
        clamp_mask=clamp_mask,
    )


def _splitmix64(value: int) -> int:
    mask = (1 << 64) - 1
    value = (value + 0x9E3779B97F4A7C15) & mask
    value = ((value ^ (value >> 30)) * 0xBF58476D1CE4E5B9) & mask
    value = ((value ^ (value >> 27)) * 0x94D049BB133111EB) & mask
    return (value ^ (value >> 31)) & mask


def _counter_hash(seed: int, step: int, destination: int, candidate: int, gene: int) -> int:
    value = seed & ((1 << 64) - 1)
    for component in (step, destination, candidate, gene):
        value = _splitmix64(value ^ (int(component) & ((1 << 64) - 1)))
    return value


def _unit_float(value: int) -> float:
    return ((value >> 11) + 0.5) * (1.0 / (1 << 53))


def _fingerprint_values(*arrays: NDArray[np.generic]) -> np.uint64:
    digest = hashlib.blake2b(digest_size=8, person=b"flow-lenia-v1")
    for array in arrays:
        canonical = np.ascontiguousarray(array)
        digest.update(str(canonical.dtype).encode("ascii"))
        digest.update(np.asarray(canonical.shape, dtype="<u8").tobytes())
        digest.update(canonical.tobytes())
    return np.uint64(int.from_bytes(digest.digest(), "little"))


def make_uniform_genomes(
    mass: FloatArray,
    config: FlowLeniaEcosystemConfig,
    *,
    q_value: float = 1.0,
    lineage: int = 1,
) -> GenomeFields:
    """Create a coherent localized rule field from the config's global weights."""
    mass = _validate_mass(mass, config)
    h_vector = np.asarray([spec.weight for spec in config.kernels], dtype=np.float64)
    q_vector = np.full(len(config.kernels), q_value, dtype=np.float64)
    h = np.broadcast_to(h_vector[:, None, None], (len(h_vector), config.grid, config.grid)).copy()
    q = np.broadcast_to(q_vector[:, None, None], (len(q_vector), config.grid, config.grid)).copy()
    occupied = mass.sum(axis=0) > 0.0
    fingerprint_value = _fingerprint_values(h_vector, q_vector)
    fingerprint = np.where(occupied, fingerprint_value, np.uint64(0)).astype(np.uint64)
    lineages = np.where(occupied, np.uint32(lineage), np.uint32(0)).astype(np.uint32)
    flags = np.zeros((config.grid, config.grid), dtype=np.uint32)
    return GenomeFields(
        h=np.ascontiguousarray(h),
        q=np.ascontiguousarray(q),
        fingerprint=np.ascontiguousarray(fingerprint),
        lineage=np.ascontiguousarray(lineages),
        flags=np.ascontiguousarray(flags),
    )


def _validate_genomes(genomes: GenomeFields, config: FlowLeniaEcosystemConfig) -> None:
    gene_shape = (len(config.kernels), config.grid, config.grid)
    identity_shape = (config.grid, config.grid)
    if genomes.h.shape != gene_shape or genomes.q.shape != gene_shape:
        raise ValueError(f"H and Q must have shape {gene_shape}")
    if not np.all(np.isfinite(genomes.h)) or not np.all(np.isfinite(genomes.q)):
        raise ValueError("H and Q must be finite")
    for field in (genomes.fingerprint, genomes.lineage, genomes.flags):
        if field.shape != identity_shape:
            raise ValueError(f"identity fields must have shape {identity_shape}")


def _same_genome(
    genomes: GenomeFields,
    first: tuple[int, int],
    candidate: tuple[int, int],
) -> bool:
    fi, fj = first
    ci, cj = candidate
    return bool(
        genomes.fingerprint[fi, fj] == genomes.fingerprint[ci, cj]
        and genomes.lineage[fi, fj] == genomes.lineage[ci, cj]
        and genomes.flags[fi, fj] == genomes.flags[ci, cj]
        and np.array_equal(genomes.h[:, fi, fj], genomes.h[:, ci, cj])
        and np.array_equal(genomes.q[:, fi, fj], genomes.q[:, ci, cj])
    )


def reintegrate_with_genomes(
    state: EcosystemState,
    displacement: FloatArray,
    config: FlowLeniaEcosystemConfig,
    *,
    rule: MixingRule,
    step: int,
    contextual_growth: FloatArray | None = None,
    negotiation_beta: float = 1.0,
) -> EcosystemState:
    """Transport mass and stream localized genome inheritance through the same gather.

    ``contextual_growth`` has shape ``(kernels, grid, grid)`` and supplies the local ``I_k`` values
    for best-affinity and negotiation scoring.  No candidate genome is considered unless positive
    mass actually arrives from its source cell.
    """
    mass = _validate_mass(state.mass, config)
    displacement = _validate_displacement(displacement, config)
    _validate_genomes(state.genomes, config)
    if rule not in ("average", "whole", "gene-wise", "best", "negotiation"):
        raise ValueError(f"unknown mixing rule: {rule}")
    kernel_count = len(config.kernels)
    if contextual_growth is None:
        contextual_growth = np.zeros((kernel_count, config.grid, config.grid), dtype=np.float64)
    if contextual_growth.shape != (kernel_count, config.grid, config.grid):
        raise ValueError("contextual_growth has the wrong shape")
    if not math.isfinite(negotiation_beta) or negotiation_beta < 0.0:
        raise ValueError("negotiation_beta must be finite and non-negative")

    next_mass = np.zeros_like(mass)
    next_h = np.zeros_like(state.genomes.h)
    next_q = np.zeros_like(state.genomes.q)
    next_fingerprint = np.zeros_like(state.genomes.fingerprint)
    next_lineage = np.zeros_like(state.genomes.lineage)
    next_flags = np.zeros_like(state.genomes.flags)
    dd = config.gather_radius
    gene_count = 2 * kernel_count

    for destination_i in range(config.grid):
        for destination_j in range(config.grid):
            destination_index = destination_i * config.grid + destination_j
            total_incoming = 0.0
            first_source: tuple[int, int] | None = None
            all_same = True
            average_h = np.zeros(kernel_count, dtype=np.float64)
            average_q = np.zeros(kernel_count, dtype=np.float64)
            selected_source: tuple[int, int] | None = None
            selected_gene_sources: list[tuple[int, int] | None] = [None] * gene_count
            best_score = -math.inf
            negotiation_score = -math.inf
            candidate_index = 0

            for offset_i in range(-dd, dd + 1):
                source_i = (destination_i + offset_i) % config.grid
                for offset_j in range(-dd, dd + 1):
                    source_j = (destination_j + offset_j) % config.grid
                    weights = _candidate_weights(
                        destination_i,
                        destination_j,
                        source_i,
                        source_j,
                        displacement,
                        config,
                    )
                    channel_arrivals = mass[:, source_i, source_j] * weights
                    next_mass[:, destination_i, destination_j] += channel_arrivals
                    incoming = float(channel_arrivals.sum(dtype=np.float64))
                    if incoming <= 0.0:
                        candidate_index += 1
                        continue

                    source = (source_i, source_j)
                    total_incoming += incoming
                    if first_source is None:
                        first_source = source
                    elif all_same and not _same_genome(state.genomes, first_source, source):
                        all_same = False

                    source_h = state.genomes.h[:, source_i, source_j]
                    source_q = state.genomes.q[:, source_i, source_j]
                    average_h += incoming * source_h
                    average_q += incoming * source_q

                    reservoir_u = _unit_float(
                        _counter_hash(
                            config.seed,
                            step,
                            destination_index,
                            candidate_index,
                            -1,
                        )
                    )
                    if selected_source is None or reservoir_u < incoming / total_incoming:
                        selected_source = source

                    for gene in range(gene_count):
                        gene_u = _unit_float(
                            _counter_hash(
                                config.seed,
                                step,
                                destination_index,
                                candidate_index,
                                gene,
                            )
                        )
                        if (
                            selected_gene_sources[gene] is None
                            or gene_u < incoming / total_incoming
                        ):
                            selected_gene_sources[gene] = source

                    context = contextual_growth[:, destination_i, destination_j]
                    affinity_score = float(np.dot(context, source_h))
                    if affinity_score > best_score:
                        best_score = affinity_score
                        if rule == "best":
                            selected_source = source

                    negotiation_logit = (
                        negotiation_beta * incoming * float(np.dot(context, source_q))
                    )
                    gumbel_u = _unit_float(
                        _counter_hash(
                            config.seed,
                            step,
                            destination_index,
                            candidate_index,
                            gene_count,
                        )
                    )
                    gumbel = -math.log(-math.log(gumbel_u))
                    if negotiation_logit + gumbel > negotiation_score:
                        negotiation_score = negotiation_logit + gumbel
                        if rule == "negotiation":
                            selected_source = source
                    candidate_index += 1

            if total_incoming <= 0.0 or first_source is None:
                continue
            if all_same:
                selected_source = first_source
                rule_for_cell: MixingRule = "whole"
            else:
                rule_for_cell = rule

            if rule_for_cell == "average":
                next_h[:, destination_i, destination_j] = average_h / total_incoming
                next_q[:, destination_i, destination_j] = average_q / total_incoming
                next_fingerprint[destination_i, destination_j] = _fingerprint_values(
                    next_h[:, destination_i, destination_j],
                    next_q[:, destination_i, destination_j],
                )
                next_lineage[destination_i, destination_j] = MIXED_LINEAGE
                next_flags[destination_i, destination_j] = IDENTITY_MIXED
            elif rule_for_cell == "gene-wise":
                parent_fingerprints = np.empty(gene_count, dtype=np.uint64)
                for gene, gene_source in enumerate(selected_gene_sources):
                    if gene_source is None:
                        raise RuntimeError("positive incoming mass left a gene reservoir empty")
                    source_i, source_j = gene_source
                    if gene < kernel_count:
                        next_h[gene, destination_i, destination_j] = state.genomes.h[
                            gene, source_i, source_j
                        ]
                    else:
                        q_gene = gene - kernel_count
                        next_q[q_gene, destination_i, destination_j] = state.genomes.q[
                            q_gene, source_i, source_j
                        ]
                    parent_fingerprints[gene] = state.genomes.fingerprint[source_i, source_j]
                next_fingerprint[destination_i, destination_j] = _fingerprint_values(
                    parent_fingerprints
                )
                next_lineage[destination_i, destination_j] = MIXED_LINEAGE
                next_flags[destination_i, destination_j] = IDENTITY_MIXED
            else:
                if selected_source is None:
                    raise RuntimeError("positive incoming mass left the selector empty")
                source_i, source_j = selected_source
                next_h[:, destination_i, destination_j] = state.genomes.h[:, source_i, source_j]
                next_q[:, destination_i, destination_j] = state.genomes.q[:, source_i, source_j]
                next_fingerprint[destination_i, destination_j] = state.genomes.fingerprint[
                    source_i, source_j
                ]
                next_lineage[destination_i, destination_j] = state.genomes.lineage[
                    source_i, source_j
                ]
                next_flags[destination_i, destination_j] = state.genomes.flags[source_i, source_j]

    return EcosystemState(
        mass=np.ascontiguousarray(next_mass),
        genomes=GenomeFields(
            h=np.ascontiguousarray(next_h),
            q=np.ascontiguousarray(next_q),
            fingerprint=np.ascontiguousarray(next_fingerprint),
            lineage=np.ascontiguousarray(next_lineage),
            flags=np.ascontiguousarray(next_flags),
        ),
    )


def _normal_from_counter(seed: int, event_index: int, gene: int, lane: int) -> float:
    u1 = _unit_float(_counter_hash(seed, event_index, gene, lane, 0))
    u2 = _unit_float(_counter_hash(seed, event_index, gene, lane, 1))
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)


def _event_identity(seed: int, parent_lineage: int, event_index: int, tag: int) -> int:
    value = _counter_hash(seed, event_index, parent_lineage, tag, 0)
    return value


def _lineage_hue_key(lineage: int) -> int:
    """Pack the renderer's stable parent-hue inputs into identity flag metadata."""
    value = lineage & 0xFFFFFFFF
    value = ((value ^ (value >> 16)) * 0x7FEB352D) & 0xFFFFFFFF
    value = ((value ^ (value >> 15)) * 0x846CA68B) & 0xFFFFFFFF
    value = (value ^ (value >> 16)) & 0xFFFFFFFF
    return (value & 0xFFFF) | ((lineage & 7) << 16)


def mutate_patch(
    state: EcosystemState,
    config: FlowLeniaEcosystemConfig,
    *,
    center: tuple[int, int],
    radius: float,
    event_index: int,
    scale: float = 0.05,
    h_bounds: tuple[float, float] = (-2.0, 2.0),
    q_bounds: tuple[float, float] = (-2.0, 2.0),
) -> tuple[EcosystemState, MutationEvent]:
    """Apply one seed-addressed Gaussian rule delta to a coherent toroidal lineage patch."""
    mass = _validate_mass(state.mass, config)
    _validate_genomes(state.genomes, config)
    if radius <= 0.0 or not math.isfinite(radius):
        raise ValueError("mutation radius must be finite and positive")
    if scale < 0.0 or not math.isfinite(scale):
        raise ValueError("mutation scale must be finite and non-negative")
    if h_bounds[0] > h_bounds[1] or q_bounds[0] > q_bounds[1]:
        raise ValueError("mutation bounds must be ordered")

    center_i = center[0] % config.grid
    center_j = center[1] % config.grid
    density = mass.sum(axis=0, dtype=np.float64)
    patch = np.zeros((config.grid, config.grid), dtype=np.bool_)
    lineage_mass: dict[int, float] = {}
    for i in range(config.grid):
        distance_i = min(abs(i - center_i), config.grid - abs(i - center_i))
        for j in range(config.grid):
            distance_j = min(abs(j - center_j), config.grid - abs(j - center_j))
            if (
                distance_i * distance_i + distance_j * distance_j <= radius * radius
                and density[i, j] > 0.0
            ):
                patch[i, j] = True
                lineage = int(state.genomes.lineage[i, j])
                lineage_mass[lineage] = lineage_mass.get(lineage, 0.0) + float(density[i, j])
    if not lineage_mass:
        raise ValueError("mutation patch contains no matter")
    parent_lineage = min(lineage_mass, key=lambda lineage: (-lineage_mass[lineage], lineage))
    patch &= state.genomes.lineage == np.uint32(parent_lineage)

    kernel_count = len(config.kernels)
    delta_h = np.asarray(
        [
            scale * _normal_from_counter(config.seed, event_index, gene, 0)
            for gene in range(kernel_count)
        ],
        dtype=np.float64,
    )
    delta_q = np.asarray(
        [
            scale * _normal_from_counter(config.seed, event_index, gene, 1)
            for gene in range(kernel_count)
        ],
        dtype=np.float64,
    )
    child_lineage = _event_identity(config.seed, parent_lineage, event_index, 0) & 0xFFFFFFFE
    if child_lineage == 0:
        child_lineage = 2
    child_fingerprint = _event_identity(config.seed, parent_lineage, event_index, 1)
    if child_fingerprint == 0:
        child_fingerprint = 1

    next_h = state.genomes.h.copy()
    next_q = state.genomes.q.copy()
    for gene in range(kernel_count):
        next_h[gene, patch] = np.clip(next_h[gene, patch] + delta_h[gene], h_bounds[0], h_bounds[1])
        next_q[gene, patch] = np.clip(next_q[gene, patch] + delta_q[gene], q_bounds[0], q_bounds[1])
    next_fingerprint = state.genomes.fingerprint.copy()
    next_lineage = state.genomes.lineage.copy()
    next_flags = state.genomes.flags.copy()
    next_fingerprint[patch] = np.uint64(child_fingerprint)
    next_lineage[patch] = np.uint32(child_lineage)
    parent_hue_metadata = np.uint32(_lineage_hue_key(parent_lineage) << 8)
    next_flags[patch] |= IDENTITY_MUTATED | parent_hue_metadata
    affected_mass = float(density[patch].sum(dtype=np.float64))

    next_state = EcosystemState(
        mass=mass.copy(),
        genomes=GenomeFields(
            h=np.ascontiguousarray(next_h),
            q=np.ascontiguousarray(next_q),
            fingerprint=np.ascontiguousarray(next_fingerprint),
            lineage=np.ascontiguousarray(next_lineage),
            flags=np.ascontiguousarray(next_flags),
        ),
    )
    event = MutationEvent(
        event_index=event_index,
        parent_lineage=parent_lineage,
        child_lineage=child_lineage,
        child_fingerprint=child_fingerprint,
        center=(center_i, center_j),
        radius=radius,
        affected_mass=affected_mass,
        delta_h=tuple(float(value) for value in delta_h),
        delta_q=tuple(float(value) for value in delta_q),
    )
    return next_state, event
