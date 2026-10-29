"""The Grow v2 Teach gradient-check fixture (rebuild-v2 M2).

``packages/neural-ca/web/public/teach/gradcheck.{bin,json}`` holds float64
autograd gradients that the v2 page's Prove drawer compares with the WebGPU
trainer's on the visitor's GPU. These tests regenerate them from the committed
inputs and check the bytes the page reads.
"""

from __future__ import annotations

import hashlib
import json

import numpy as np
import pytest
import torch

from neural_ca import gradcheck as G

FIXTURE = G.PUBLIC / "teach"


@pytest.fixture(scope="module")
def manifest() -> dict:  # type: ignore[type-arg]
    return json.loads((FIXTURE / "gradcheck.json").read_text())


@pytest.fixture(scope="module")
def blob() -> bytes:
    return (FIXTURE / "gradcheck.bin").read_bytes()


def _array(blob: bytes, a: dict, dtype: str) -> np.ndarray:  # type: ignore[type-arg]
    return np.frombuffer(blob, dtype=dtype, count=a["count"], offset=a["offset"])


def test_fixture_sha(manifest: dict, blob: bytes) -> None:  # type: ignore[type-arg]
    assert hashlib.sha256(blob).hexdigest() == manifest["sha256"]


def test_layout_round_trip() -> None:
    raw = (G.REPO / G.WEIGHTS["disk"][0]).read_bytes()
    assert G.from_trainer(G.to_trainer(raw)) == raw


def test_committed_inputs(manifest: dict, blob: bytes) -> None:  # type: ignore[type-arg]
    assert np.array_equal(
        _array(blob, manifest["arrays"]["target"], "<f4"), G.target_rgba().reshape(-1)
    )
    rand = _array(blob, manifest["arrays"]["random_params"], "<f4")
    assert np.array_equal(rand, G.random_params(manifest["random_params_seed"]))


@pytest.mark.parametrize("case", G.CASES, ids=[c.name for c in G.CASES])
def test_reference_gradients_regenerate(case: G.Case, manifest: dict, blob: bytes) -> None:  # type: ignore[type-arg]
    row = next(r for r in manifest["cases"] if r["name"] == case.name)
    assert (row["steps"], row["batch"], row["seed"], row["start"]) == (
        case.steps,
        case.batch,
        case.seed,
        case.start,
    )
    ref = _array(blob, row["grad64"], "<f8")
    r = G.rollout_grad(
        G.case_params(case),
        G.case_start(case),
        G.target_rgba(),
        case.steps,
        case.seed,
        torch.float64,
    )
    # float64 autograd on another CPU may round differently in the last bits
    assert G.rel_l2(r.grad, ref) < 1e-12
    assert abs(r.loss - row["loss64"]) / row["loss64"] < 1e-12
    assert r.alive_cells == row["alive_cells64"]


def test_fire_mask_rate() -> None:
    m = G.fire_masks(1, 4, 2, 64)
    assert abs(float(m.mean()) - 0.5) < 0.01
