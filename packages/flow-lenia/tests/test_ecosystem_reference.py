"""Independent anchors for the full f64 Flow Lenia ecosystem oracle."""

from __future__ import annotations

from dataclasses import replace

import numpy as np
import pytest

from flow_lenia.ecosystem_config import (
    FlowLeniaEcosystemConfig,
    KernelSpec,
    default_ecosystem_config,
)
from flow_lenia.ecosystem_reference import (
    IDENTITY_MUTATED,
    EcosystemState,
    GenomeFields,
    MixingRule,
    build_kernels,
    compute_flow,
    growth_response,
    make_uniform_genomes,
    mutate_patch,
    perceive,
    reintegrate_square,
    reintegrate_with_genomes,
    sobel_periodic,
    square_overlap_weight,
    step_reference,
)


def _kernel(*, source: int = 0, target: int = 0, weight: float = 0.7) -> KernelSpec:
    return KernelSpec(
        source=source,
        target=target,
        relative_radius=0.75,
        growth_mean=0.25,
        growth_width=0.08,
        weight=weight,
        ring_centers=(0.2, 0.55, 0.82),
        ring_amplitudes=(0.7, 1.0, 0.4),
        ring_widths=(0.025, 0.04, 0.03),
    )


def _config(
    *,
    channels: int = 1,
    half_width: float = 0.25,
    threshold: float = 2.0,
    seed: int = 17,
) -> FlowLeniaEcosystemConfig:
    kernels = tuple(_kernel(source=channel, target=channel) for channel in range(channels))
    return FlowLeniaEcosystemConfig(
        grid=8,
        channels=channels,
        kernels=kernels,
        base_radius=1.0,
        radius_offset=0.0,
        gather_radius=1,
        square_half_width=half_width,
        density_threshold=threshold,
        seed=seed,
    )


def _zero_displacement(config: FlowLeniaEcosystemConfig) -> np.ndarray:
    return np.zeros((config.channels, 2, config.grid, config.grid), dtype=np.float64)


def test_kernels_are_discretely_normalized_and_radially_symmetric() -> None:
    config = _config()
    kernel = build_kernels(config)[0]
    center = config.grid // 2

    assert float(kernel.sum()) == pytest.approx(1.0, abs=2e-16)
    assert kernel[center + 1, center] == pytest.approx(kernel[center, center + 1])
    assert kernel[center - 1, center] == pytest.approx(kernel[center, center - 1])
    assert np.all(kernel >= 0.0)


def test_growth_has_exact_peak_and_hand_computed_off_center_value() -> None:
    mean = 0.3
    width = 0.1
    values = np.array([mean, mean + width, mean + 2.0 * width], dtype=np.float64)
    response = growth_response(values, mean, width)

    assert response[0] == 1.0
    assert response[1] == pytest.approx(2.0 * np.exp(-0.5) - 1.0, abs=1e-15)
    assert response[2] == pytest.approx(2.0 * np.exp(-2.0) - 1.0, abs=1e-15)


def test_uniform_affinity_and_density_produce_zero_flow() -> None:
    config = _config(channels=2)
    mass = np.full((2, 8, 8), 0.2, dtype=np.float64)
    _, _, affinity = perceive(mass, config)
    flow, _ = compute_flow(mass, affinity, config)

    np.testing.assert_allclose(flow, 0.0, atol=2e-15, rtol=0.0)


def test_pressure_gradient_direction_and_official_sobel_magnitude() -> None:
    config = replace(
        _config(threshold=1.0),
        kernels=(replace(_kernel(), weight=0.0),),
    )
    mass = np.zeros((1, 8, 8), dtype=np.float64)
    mass[0, 4, 4] = 1.0
    mass[0, 5, 4] = 2.0
    affinity = np.zeros_like(mass)

    density_gradient = sobel_periodic(mass[0])
    flow, alpha = compute_flow(mass, affinity, config)

    assert density_gradient[0, 4, 4] == 4.0
    assert density_gradient[1, 4, 4] == 0.0
    assert alpha[0, 4, 4] == 1.0
    assert flow[0, 0, 4, 4] == -4.0
    assert flow[0, 1, 4, 4] == 0.0


def test_translated_half_cell_square_has_hand_derived_four_cell_weights() -> None:
    config = _config(half_width=0.25)
    mass = np.zeros((1, 8, 8), dtype=np.float64)
    mass[0, 3, 3] = 1.0
    displacement = _zero_displacement(config)
    displacement[0, :, 3, 3] = 0.4

    result = reintegrate_square(mass, displacement, config)

    assert result[0, 3, 3] == pytest.approx(0.49, abs=2e-15)
    assert result[0, 3, 4] == pytest.approx(0.21, abs=2e-15)
    assert result[0, 4, 3] == pytest.approx(0.21, abs=2e-15)
    assert result[0, 4, 4] == pytest.approx(0.09, abs=2e-15)
    assert np.count_nonzero(result) == 4


def test_broad_stationary_square_has_hand_derived_nine_cell_weights() -> None:
    center_weight = square_overlap_weight((3, 3), (3, 3), (0.0, 0.0), grid=8, half_width=0.65)
    edge_weight = square_overlap_weight((3, 4), (3, 3), (0.0, 0.0), grid=8, half_width=0.65)
    corner_weight = square_overlap_weight((4, 4), (3, 3), (0.0, 0.0), grid=8, half_width=0.65)

    assert center_weight == pytest.approx(1.0 / 1.3**2, abs=2e-15)
    assert edge_weight == pytest.approx(0.15 / 1.3**2, abs=2e-15)
    assert corner_weight == pytest.approx(0.15**2 / 1.3**2, abs=2e-15)
    assert center_weight + 4.0 * edge_weight + 4.0 * corner_weight == pytest.approx(1.0)


def test_closed_transport_conserves_each_channel_and_non_negativity() -> None:
    config = _config(channels=2, half_width=0.65)
    rng = np.random.default_rng(123)
    mass = rng.uniform(0.0, 1.0, size=(2, 8, 8))
    displacement = rng.uniform(
        -config.max_displacement,
        config.max_displacement,
        size=(2, 2, 8, 8),
    )

    result = reintegrate_square(mass, displacement, config)

    np.testing.assert_allclose(
        result.sum(axis=(1, 2)), mass.sum(axis=(1, 2)), atol=2e-13, rtol=2e-15
    )
    assert float(result.min()) >= 0.0
    assert np.all(np.isfinite(result))


def test_full_three_channel_nine_kernel_step_closes_mass_ledger() -> None:
    config = default_ecosystem_config(grid=16, seed=7)
    mass = np.random.default_rng(7).uniform(0.0, 0.3, size=(3, 16, 16))

    result, diagnostics = step_reference(mass, config)

    np.testing.assert_allclose(
        result.sum(axis=(1, 2)), mass.sum(axis=(1, 2)), atol=3e-13, rtol=4e-15
    )
    assert float(result.min()) >= 0.0
    assert diagnostics.perception.shape == (9, 16, 16)
    assert diagnostics.growth.shape == (9, 16, 16)
    assert diagnostics.affinity.shape == (3, 16, 16)
    assert diagnostics.flow.shape == (3, 2, 16, 16)
    assert np.all(np.isfinite(diagnostics.flow))


@pytest.mark.parametrize("rule", ["average", "whole", "gene-wise", "best", "negotiation"])
def test_constant_incoming_genome_is_constant_for_every_mixer(rule: MixingRule) -> None:
    config = _config(half_width=0.65)
    mass = np.full((1, 8, 8), 0.5, dtype=np.float64)
    genomes = make_uniform_genomes(mass, config, q_value=0.4, lineage=27)
    state = EcosystemState(mass=mass, genomes=genomes)

    result = reintegrate_with_genomes(
        state,
        _zero_displacement(config),
        config,
        rule=rule,
        step=11,
    )

    np.testing.assert_array_equal(result.genomes.h, genomes.h)
    np.testing.assert_array_equal(result.genomes.q, genomes.q)
    np.testing.assert_array_equal(result.genomes.fingerprint, genomes.fingerprint)
    np.testing.assert_array_equal(result.genomes.lineage, genomes.lineage)


@pytest.mark.parametrize("rule", ["whole", "best", "negotiation"])
def test_whole_genome_selectors_only_return_incoming_identity(rule: MixingRule) -> None:
    config = _config(half_width=0.65)
    mass = np.zeros((1, 8, 8), dtype=np.float64)
    mass[0, 3, 3] = 1.0
    mass[0, 3, 4] = 1.0
    genomes = make_uniform_genomes(mass, config)
    h = genomes.h.copy()
    q = genomes.q.copy()
    fingerprint = genomes.fingerprint.copy()
    lineage = genomes.lineage.copy()
    h[:, 3, 3], q[:, 3, 3], fingerprint[3, 3], lineage[3, 3] = 0.2, 0.3, 111, 7
    h[:, 3, 4], q[:, 3, 4], fingerprint[3, 4], lineage[3, 4] = 0.8, -0.1, 222, 9
    state = EcosystemState(
        mass=mass,
        genomes=GenomeFields(h, q, fingerprint, lineage, genomes.flags),
    )

    result = reintegrate_with_genomes(
        state,
        _zero_displacement(config),
        config,
        rule=rule,
        step=3,
        contextual_growth=np.ones((1, 8, 8), dtype=np.float64),
    )

    occupied = result.mass.sum(axis=0) > 0.0
    assert set(np.unique(result.genomes.fingerprint[occupied])).issubset({111, 222})
    assert set(np.unique(result.genomes.lineage[occupied])).issubset({7, 9})


def test_mutation_is_repeatable_and_changes_one_coherent_lineage_patch() -> None:
    config = _config(half_width=0.65, seed=91)
    mass = np.ones((1, 8, 8), dtype=np.float64)
    state = EcosystemState(mass, make_uniform_genomes(mass, config, lineage=12))

    first, first_event = mutate_patch(
        state, config, center=(0, 0), radius=1.1, event_index=5, scale=0.08
    )
    second, second_event = mutate_patch(
        state, config, center=(0, 0), radius=1.1, event_index=5, scale=0.08
    )

    assert first_event == second_event
    np.testing.assert_array_equal(first.genomes.h, second.genomes.h)
    np.testing.assert_array_equal(first.genomes.q, second.genomes.q)
    changed = first.genomes.lineage == first_event.child_lineage
    assert np.count_nonzero(changed) == 5
    assert first_event.parent_lineage == 12
    assert first_event.affected_mass == 5.0
    assert np.all((first.genomes.flags[changed] & IDENTITY_MUTATED) != 0)
    assert np.all(first.genomes.fingerprint[changed] == first_event.child_fingerprint)
    np.testing.assert_array_equal(first.mass, mass)
