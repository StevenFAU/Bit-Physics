"""Generate localized-inheritance and mutation fixtures from the f64 ecosystem oracle."""

from __future__ import annotations

import base64
import json
import math
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from flow_lenia.ecosystem_config import MODEL_VARIANT, default_ecosystem_config
from flow_lenia.ecosystem_reference import (
    EcosystemState,
    GenomeFields,
    MixingRule,
    build_kernels,
    clamp_displacement,
    compute_flow,
    mutate_patch,
    perceive,
    reintegrate_with_genomes,
)

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "packages/flow-lenia/web/src/prove/ecosystem-fixture.json"
RULES: tuple[MixingRule, ...] = ("average", "whole", "gene-wise", "best", "negotiation")


def encoded(array: NDArray[np.generic], dtype: str) -> dict[str, object]:
    values = np.ascontiguousarray(array, dtype=dtype)
    return {
        "shape": list(values.shape),
        "dtype": f"{np.dtype(dtype).name}-le-base64",
        "data": base64.b64encode(values.tobytes()).decode("ascii"),
    }


def initial_state(grid: int) -> EcosystemState:
    config = default_ecosystem_config(grid=grid, seed=91)
    mass = np.empty((3, grid, grid), dtype=np.float32)
    h = np.empty((9, grid, grid), dtype=np.float32)
    q = np.empty((9, grid, grid), dtype=np.float32)
    fingerprint = np.empty((grid, grid), dtype=np.uint64)
    lineage = np.empty((grid, grid), dtype=np.uint32)
    flags = np.zeros((grid, grid), dtype=np.uint32)
    base = np.asarray([kernel.weight for kernel in config.kernels], dtype=np.float32)
    for i in range(grid):
        for j in range(grid):
            for channel in range(3):
                p = 2.0 * math.pi * ((channel + 1) * i + (channel + 2) * j) / grid
                q_wave = 2.0 * math.pi * ((channel + 3) * i - (channel + 1) * j) / grid
                mass[channel, i, j] = (
                    0.17 + channel * 0.03 + 0.05 * math.sin(p) + 0.02 * math.cos(q_wave)
                )
            founder = 1 + (3 * j // grid)
            for gene in range(9):
                phase = founder * 1.31 + gene * 0.77
                h[gene, i, j] = base[gene] + 0.11 * math.sin(phase)
                q[gene, i, j] = 0.75 + 0.22 * math.cos(phase * 0.81)
            fingerprint[i, j] = np.uint64(0x1020304050607000 + founder)
            lineage[i, j] = np.uint32(founder)
    return EcosystemState(
        mass=mass.astype(np.float64),
        genomes=GenomeFields(
            h=h.astype(np.float64),
            q=q.astype(np.float64),
            fingerprint=fingerprint,
            lineage=lineage,
            flags=flags,
        ),
    )


def main() -> None:
    config = default_ecosystem_config(grid=16, seed=91)
    state = initial_state(config.grid)
    kernels = build_kernels(config)
    _, growth, affinity = perceive(state.mass, config, kernels=kernels, local_h=state.genomes.h)
    flow, _ = compute_flow(state.mass, affinity, config)
    displacement, _ = clamp_displacement(flow, config)
    cases: list[dict[str, object]] = []
    for rule in RULES:
        result = reintegrate_with_genomes(
            state,
            displacement,
            config,
            rule=rule,
            step=0,
            contextual_growth=growth,
            negotiation_beta=1.0,
        )
        cases.append(
            {
                "rule": rule,
                "mass_step_1": encoded(result.mass, "<f4"),
                "h_step_1": encoded(result.genomes.h, "<f4"),
                "q_step_1": encoded(result.genomes.q, "<f4"),
                "lineage_step_1": encoded(result.genomes.lineage, "<u4"),
                "flags_step_1": encoded(result.genomes.flags, "<u4"),
            }
        )
    mutated_state, mutation = mutate_patch(
        state,
        config,
        center=(8, 2),
        radius=3.0,
        event_index=1,
        scale=0.05,
    )
    document = {
        "schema_version": "flow-lenia-m4-conformance-v1",
        "model_variant": MODEL_VARIANT,
        "oracle": "flow_lenia.ecosystem_reference f64; expected floating fields quantized to f32",
        "config": {"grid": 16, "seed": 91, "step": 0, "negotiation_beta": 1.0},
        "tolerances": {
            "mass_abs": 1.2e-5,
            "gene_abs": 1.2e-5,
            "mass_relative_ledger": 6.0e-5,
        },
        "initial": {
            "mass": encoded(state.mass, "<f4"),
            "h": encoded(state.genomes.h, "<f4"),
            "q": encoded(state.genomes.q, "<f4"),
            "fingerprint": encoded(state.genomes.fingerprint, "<u8"),
            "lineage": encoded(state.genomes.lineage, "<u4"),
            "flags": encoded(state.genomes.flags, "<u4"),
        },
        "cases": cases,
        "mutation": {
            "event_index": mutation.event_index,
            "parent_lineage": mutation.parent_lineage,
            "child_lineage": mutation.child_lineage,
            "child_fingerprint": [
                mutation.child_fingerprint & 0xFFFFFFFF,
                mutation.child_fingerprint >> 32,
            ],
            "center": list(mutation.center),
            "radius": mutation.radius,
            "delta_h": list(mutation.delta_h),
            "delta_q": list(mutation.delta_q),
            "child_flags": int(
                mutated_state.genomes.flags[
                    mutated_state.genomes.lineage == np.uint32(mutation.child_lineage)
                ][0]
            ),
        },
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
