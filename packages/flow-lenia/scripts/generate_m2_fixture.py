"""Generate the compact f32 browser conformance fixture from the f64 M1 oracle."""

from __future__ import annotations

import base64
import json
import math
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from flow_lenia.ecosystem_config import MODEL_VARIANT, default_ecosystem_config
from flow_lenia.ecosystem_reference import build_kernels, step_reference

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "packages/flow-lenia/web/src/prove/organism-fixture.json"


def conformance_mass(grid: int, variant: int) -> NDArray[np.float64]:
    """Match ``makeConformanceMass`` after its browser f32 upload boundary."""
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


def field(array: NDArray[np.generic]) -> dict[str, object]:
    values = np.ascontiguousarray(array, dtype="<f4")
    return {
        "shape": list(values.shape),
        "dtype": "f32-le-base64",
        "data": base64.b64encode(values.tobytes()).decode("ascii"),
    }


def generate_case(name: str, variant: int, *, complete: bool) -> dict[str, object]:
    config = default_ecosystem_config(grid=16, seed=91)
    kernels = build_kernels(config)
    initial = conformance_mass(config.grid, variant)
    one_step, diagnostics = step_reference(initial, config, kernels=kernels)
    rollout = one_step
    for _ in range(3):
        rollout, _ = step_reference(rollout, config, kernels=kernels)
    fields: dict[str, object] = {
        "initial_mass": field(initial),
        "displacement_step_1": field(diagnostics.displacement),
        "mass_step_1": field(one_step),
        "mass_step_4": field(rollout),
    }
    if complete:
        fields.update(
            perception_step_1=field(diagnostics.perception),
            growth_step_1=field(diagnostics.growth),
            affinity_step_1=field(diagnostics.affinity),
            alpha_step_1=field(diagnostics.alpha),
            flow_step_1=field(diagnostics.flow),
        )
    return {"name": name, "variant": variant, "fields": fields}


def main() -> None:
    config = default_ecosystem_config(grid=16, seed=91)
    document = {
        "schema_version": "flow-lenia-m2-conformance-v1",
        "model_variant": MODEL_VARIANT,
        "oracle": "flow_lenia.ecosystem_reference f64; expected arrays quantized to f32",
        "config": {
            "grid": config.grid,
            "channels": config.channels,
            "kernels": len(config.kernels),
            "seed": config.seed,
            "dt": config.dt,
            "dd": config.gather_radius,
            "sigma": config.square_half_width,
            "density_threshold": config.density_threshold,
            "density_exponent": config.density_exponent,
        },
        "tolerances": {
            "perception_abs": 1.0e-6,
            "growth_abs": 1.0e-5,
            "affinity_abs": 1.0e-5,
            "alpha_abs": 2.0e-7,
            "flow_abs": 2.0e-5,
            "displacement_abs": 4.0e-6,
            "mass_step_1_abs": 1.0e-5,
            "mass_step_4_abs": 2.0e-5,
            "mass_relative_ledger": 5.0e-5,
        },
        "cases": [
            generate_case("smooth-periodic", 0, complete=True),
            generate_case("seam-loaded", 1, complete=False),
            generate_case("crowded-pressure", 2, complete=False),
        ],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
