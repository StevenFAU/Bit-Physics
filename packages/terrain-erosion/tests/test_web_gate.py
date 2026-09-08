"""Adversarial tests of the deployment verifier, independently of its diagnostics."""

from __future__ import annotations
import copy
import importlib
import sys
from pathlib import Path
import numpy as np
import pytest
from terrain_erosion.reference import initial, step

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools/productization/web-deploy"))
verify = importlib.import_module("verify")


@pytest.fixture(scope="module")
def reference_bundle():
    frames = [{"step": i, "state": {}, "diagnostics": {}} for i in [0, 20, 100]]
    for name in ["lake", "dam", "settling", "channel"]:
        s = initial(32, name)
        if name == "channel":
            s[..., 2] = s[..., 0] * 2
        s = s.astype(np.float32).astype(float)
        for i in range(101):
            if i in [0, 20, 100]:
                frames[[0, 20, 100].index(i)]["state"][name] = {
                    "shape": [32, 32, 16],
                    "dtype": "f32",
                    "data": s.astype(np.float32).ravel().tolist(),
                }
            if i < 100:
                s = step(
                    s,
                    0.01,
                    erosion=int(name == "channel"),
                    settling=0.1 if name == "settling" else 0,
                )
    return {"steps": frames}


def test_reference_gate_accepts_and_requires_second_run(reference_bundle):
    assert verify._gate_terrain_erosion([reference_bundle, reference_bundle]).passed
    assert not verify._gate_terrain_erosion([reference_bundle]).passed


def test_forged_diagnostics_do_not_hide_corrupt_fields(reference_bundle):
    corrupt = copy.deepcopy(reference_bundle)
    corrupt["steps"][-1]["state"]["dam"]["data"][0] += 0.01
    corrupt["steps"][-1]["diagnostics"] = {"budget_error": 0, "finite": 1}
    assert not verify._gate_terrain_erosion([corrupt, corrupt]).passed


def test_gate_rejects_missing_checkpoint(reference_bundle):
    bad = copy.deepcopy(reference_bundle)
    bad["steps"].pop(1)
    assert not verify._gate_terrain_erosion([bad, bad]).passed
