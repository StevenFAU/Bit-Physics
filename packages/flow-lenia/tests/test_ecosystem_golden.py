"""Frozen cross-language anchors for ``flow-lenia-ecosystem-v1``."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from flow_lenia.ecosystem_config import MODEL_VARIANT, organism_reference_config
from flow_lenia.ecosystem_reference import (
    EcosystemState,
    build_kernels,
    growth_response,
    make_uniform_genomes,
    mutate_patch,
    square_overlap_weight,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "flow-lenia-ecosystem-v1.json"


def _fixture() -> dict[str, Any]:
    with FIXTURE_PATH.open(encoding="utf-8") as stream:
        return json.load(stream)


def test_model_variant_and_kernel_samples_match_frozen_fixture() -> None:
    fixture = _fixture()
    kernel_fixture = fixture["kernel"]
    config = organism_reference_config(
        grid=int(kernel_fixture["grid"]), seed=int(kernel_fixture["seed"])
    )
    kernels = build_kernels(config)
    center = config.grid // 2
    samples = np.asarray(
        [
            [
                kernels[index, center + di, center + dj]
                for di, dj in kernel_fixture["sample_offsets"]
            ]
            for index in range(len(config.kernels))
        ]
    )

    assert fixture["model_variant"] == MODEL_VARIANT
    np.testing.assert_allclose(
        kernels.sum(axis=(1, 2)), kernel_fixture["sums"], atol=2e-16, rtol=0.0
    )
    np.testing.assert_allclose(samples, kernel_fixture["samples"], atol=2e-16, rtol=1e-14)


def test_growth_and_square_overlap_match_frozen_fixture() -> None:
    fixture = _fixture()
    growth = fixture["growth"]
    response = growth_response(
        np.asarray(growth["inputs"], dtype=np.float64),
        float(growth["mean"]),
        float(growth["width"]),
    )
    np.testing.assert_allclose(response, growth["outputs"], atol=2e-16, rtol=1e-15)

    transport = fixture["transport"]
    weights = [
        square_overlap_weight(
            tuple(destination),
            tuple(transport["source"]),
            tuple(transport["displacement"]),
            grid=int(transport["grid"]),
            half_width=float(transport["half_width"]),
        )
        for destination in transport["destinations"]
    ]
    np.testing.assert_allclose(weights, transport["weights"], atol=2e-15, rtol=0.0)


def test_seeded_mutation_event_matches_frozen_fixture() -> None:
    mutation = _fixture()["mutation"]
    config = organism_reference_config(grid=16, seed=int(mutation["seed"]))
    mass = np.ones((1, 16, 16), dtype=np.float64)
    state = EcosystemState(
        mass,
        make_uniform_genomes(mass, config, lineage=int(mutation["parent_lineage"])),
    )

    _, event = mutate_patch(
        state,
        config,
        center=tuple(mutation["center"]),
        radius=float(mutation["radius"]),
        event_index=int(mutation["event_index"]),
        scale=float(mutation["scale"]),
    )

    assert event.parent_lineage == mutation["parent_lineage"]
    assert event.child_lineage == mutation["child_lineage"]
    assert event.child_fingerprint == mutation["child_fingerprint"]
    assert event.affected_mass == mutation["affected_mass"]
    np.testing.assert_allclose(event.delta_h, mutation["delta_h"], atol=2e-16, rtol=0.0)
    np.testing.assert_allclose(event.delta_q, mutation["delta_q"], atol=2e-16, rtol=0.0)
