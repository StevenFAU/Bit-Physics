"""Property checks for square transport, pressure, and localized inheritance."""

from __future__ import annotations

import numpy as np
from hypothesis import Phase, given, settings
from hypothesis import strategies as st

from flow_lenia.ecosystem_config import FlowLeniaEcosystemConfig, KernelSpec
from flow_lenia.ecosystem_reference import (
    EcosystemState,
    GenomeFields,
    clamp_displacement,
    make_uniform_genomes,
    reintegrate_square,
    reintegrate_with_genomes,
    square_overlap_weight,
)

_SETTINGS = settings(
    max_examples=12,
    deadline=None,
    derandomize=True,
    phases=(Phase.explicit, Phase.reuse, Phase.generate, Phase.target),
)


def _config(
    *, channels: int = 1, half_width: float = 0.65, seed: int = 123
) -> FlowLeniaEcosystemConfig:
    kernels = tuple(
        KernelSpec(
            source=channel,
            target=channel,
            relative_radius=0.5,
            growth_mean=0.25,
            growth_width=0.08,
            weight=0.6,
            ring_centers=(0.2, 0.5, 0.8),
            ring_amplitudes=(0.5, 1.0, 0.4),
            ring_widths=(0.02, 0.04, 0.03),
        )
        for channel in range(channels)
    )
    return FlowLeniaEcosystemConfig(
        grid=8,
        channels=channels,
        kernels=kernels,
        gather_radius=1,
        square_half_width=half_width,
        seed=seed,
    )


@given(
    seed=st.integers(min_value=0, max_value=10_000),
    half_width=st.floats(min_value=0.15, max_value=0.85, allow_nan=False),
)
@_SETTINGS
def test_transport_mass_ledger_closes_for_bounded_random_fields(
    seed: int, half_width: float
) -> None:
    config = _config(channels=2, half_width=half_width, seed=seed)
    rng = np.random.default_rng(seed)
    mass = rng.uniform(0.0, 2.0, size=(2, 8, 8))
    displacement = rng.uniform(
        -config.max_displacement,
        config.max_displacement,
        size=(2, 2, 8, 8),
    )

    result = reintegrate_square(mass, displacement, config)

    np.testing.assert_allclose(
        result.sum(axis=(1, 2)), mass.sum(axis=(1, 2)), atol=3e-13, rtol=4e-15
    )
    assert float(result.min()) >= 0.0
    assert np.all(np.isfinite(result))


@given(
    displacement_i=st.floats(min_value=-0.8, max_value=0.8, allow_nan=False),
    displacement_j=st.floats(min_value=-0.8, max_value=0.8, allow_nan=False),
    half_width=st.floats(min_value=0.15, max_value=0.85, allow_nan=False),
)
@_SETTINGS
def test_overlap_weights_are_nonnegative_and_source_normalized(
    displacement_i: float, displacement_j: float, half_width: float
) -> None:
    weights = np.asarray(
        [
            square_overlap_weight(
                (i, j),
                (3, 3),
                (displacement_i, displacement_j),
                grid=8,
                half_width=half_width,
            )
            for i in range(8)
            for j in range(8)
        ]
    )

    assert float(weights.min()) >= 0.0
    np.testing.assert_allclose(weights.sum(), 1.0, atol=2e-15, rtol=0.0)


@given(
    seed=st.integers(min_value=0, max_value=10_000),
    shift_i=st.integers(-3, 3),
    shift_j=st.integers(-3, 3),
)
@_SETTINGS
def test_transport_is_torus_translation_equivariant(seed: int, shift_i: int, shift_j: int) -> None:
    config = _config(seed=seed)
    rng = np.random.default_rng(seed)
    mass = rng.uniform(0.0, 1.0, size=(1, 8, 8))
    displacement = rng.uniform(-0.25, 0.25, size=(1, 2, 8, 8))
    translated_mass = np.roll(mass, (shift_i, shift_j), axis=(1, 2))
    translated_displacement = np.roll(displacement, (shift_i, shift_j), axis=(2, 3))

    baseline = reintegrate_square(mass, displacement, config)
    translated = reintegrate_square(translated_mass, translated_displacement, config)

    np.testing.assert_allclose(
        translated,
        np.roll(baseline, (shift_i, shift_j), axis=(1, 2)),
        atol=3e-15,
        rtol=3e-15,
    )


@given(seed=st.integers(min_value=0, max_value=10_000))
@_SETTINGS
def test_weighted_average_genes_stay_in_incoming_convex_hull(seed: int) -> None:
    config = _config(seed=seed)
    mass = np.zeros((1, 8, 8), dtype=np.float64)
    mass[0, 3, 3] = 0.7
    mass[0, 3, 4] = 1.3
    genomes = make_uniform_genomes(mass, config)
    h = genomes.h.copy()
    q = genomes.q.copy()
    h[:, 3, 3], q[:, 3, 3] = -0.4, 0.2
    h[:, 3, 4], q[:, 3, 4] = 1.2, 0.9
    fingerprints = genomes.fingerprint.copy()
    lineages = genomes.lineage.copy()
    fingerprints[3, 3], fingerprints[3, 4] = 101, 202
    lineages[3, 3], lineages[3, 4] = 11, 22
    state = EcosystemState(
        mass,
        GenomeFields(h, q, fingerprints, lineages, genomes.flags),
    )
    displacement = np.zeros((1, 2, 8, 8), dtype=np.float64)

    result = reintegrate_with_genomes(state, displacement, config, rule="average", step=4)

    occupied = result.mass.sum(axis=0) > 0.0
    assert np.all(result.genomes.h[:, occupied] >= -0.4)
    assert np.all(result.genomes.h[:, occupied] <= 1.2)
    assert np.all(result.genomes.q[:, occupied] >= 0.2)
    assert np.all(result.genomes.q[:, occupied] <= 0.9)


@given(seed=st.integers(min_value=0, max_value=10_000))
@_SETTINGS
def test_stateless_mixers_repeat_for_same_seed_and_step(seed: int) -> None:
    config = _config(seed=seed)
    rng = np.random.default_rng(seed)
    mass = rng.uniform(0.0, 1.0, size=(1, 8, 8))
    genomes = make_uniform_genomes(mass, config)
    h = rng.uniform(-1.0, 1.0, size=genomes.h.shape)
    q = rng.uniform(-1.0, 1.0, size=genomes.q.shape)
    fingerprints = np.arange(1, 65, dtype=np.uint64).reshape(8, 8)
    lineages = np.arange(1, 65, dtype=np.uint32).reshape(8, 8)
    state = EcosystemState(mass, GenomeFields(h, q, fingerprints, lineages, genomes.flags))
    displacement = rng.uniform(-0.2, 0.2, size=(1, 2, 8, 8))

    for rule in ("whole", "gene-wise", "negotiation"):
        first = reintegrate_with_genomes(state, displacement, config, rule=rule, step=29)
        second = reintegrate_with_genomes(state, displacement, config, rule=rule, step=29)
        np.testing.assert_array_equal(first.mass, second.mass)
        np.testing.assert_array_equal(first.genomes.h, second.genomes.h)
        np.testing.assert_array_equal(first.genomes.q, second.genomes.q)
        np.testing.assert_array_equal(first.genomes.fingerprint, second.genomes.fingerprint)


@given(seed=st.integers(min_value=0, max_value=10_000))
@_SETTINGS
def test_displacement_clamp_never_exceeds_proof_bound(seed: int) -> None:
    config = _config(seed=seed)
    flow = np.random.default_rng(seed).normal(0.0, 100.0, size=(1, 2, 8, 8))

    displacement, clamp_mask = clamp_displacement(flow, config)

    assert float(np.max(np.abs(displacement))) <= config.max_displacement
    assert np.any(clamp_mask)
