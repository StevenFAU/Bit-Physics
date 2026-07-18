"""Keep the compact WebGPU M2 fixture pinned to the f64 M1 oracle."""

from __future__ import annotations

import base64
import json
import math
from pathlib import Path
from typing import Any

import numpy as np

from flow_lenia.ecosystem_config import MODEL_VARIANT, default_ecosystem_config
from flow_lenia.ecosystem_reference import build_kernels, step_reference

FIXTURE = Path(__file__).parents[1] / "web/src/prove/organism-fixture.json"


def _conformance_mass(grid: int, variant: int) -> np.ndarray[Any, np.dtype[np.float64]]:
    mass = np.empty((3, grid, grid), dtype=np.float32)
    for i in range(grid):
        for j in range(grid):
            for channel in range(3):
                p = 2.0 * math.pi * ((channel + 1) * i + (channel + 2) * j) / grid
                q = 2.0 * math.pi * ((channel + 3) * i - (channel + 1) * j) / grid
                value = 0.16 + channel * 0.035 + 0.055 * math.sin(p) + 0.025 * math.cos(q)
                if variant == 1 and (i < 2 or j >= grid - 2):
                    value += 0.24 / (channel + 1)
                if (
                    variant == 2
                    and grid / 2 - 2 <= i <= grid / 2 + 1
                    and grid / 2 - 2 <= j <= grid / 2 + 1
                ):
                    value += 2.4 - channel * 0.25
                mass[channel, i, j] = value
    return mass.astype(np.float64)


def _decode(record: dict[str, Any]) -> np.ndarray[Any, np.dtype[np.float32]]:
    values = np.frombuffer(base64.b64decode(record["data"]), dtype="<f4")
    return values.reshape(record["shape"])


def test_m2_fixture_is_generated_from_the_f64_oracle() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    config = default_ecosystem_config(grid=16, seed=91)
    kernels = build_kernels(config)
    assert fixture["model_variant"] == MODEL_VARIANT
    assert fixture["config"]["kernels"] == len(config.kernels)

    for case in fixture["cases"]:
        initial = _conformance_mass(config.grid, int(case["variant"]))
        expected_one, diagnostics = step_reference(initial, config, kernels=kernels)
        expected_four = expected_one
        for _ in range(3):
            expected_four, _ = step_reference(expected_four, config, kernels=kernels)
        fields = case["fields"]
        np.testing.assert_array_equal(_decode(fields["initial_mass"]), initial.astype(np.float32))
        np.testing.assert_array_equal(
            _decode(fields["displacement_step_1"]),
            diagnostics.displacement.astype(np.float32),
        )
        np.testing.assert_array_equal(
            _decode(fields["mass_step_1"]), expected_one.astype(np.float32)
        )
        np.testing.assert_array_equal(
            _decode(fields["mass_step_4"]), expected_four.astype(np.float32)
        )
        if case["name"] == "smooth-periodic":
            for field_name, expected in (
                ("perception_step_1", diagnostics.perception),
                ("growth_step_1", diagnostics.growth),
                ("affinity_step_1", diagnostics.affinity),
                ("alpha_step_1", diagnostics.alpha),
                ("flow_step_1", diagnostics.flow),
            ):
                np.testing.assert_array_equal(
                    _decode(fields[field_name]), expected.astype(np.float32)
                )
