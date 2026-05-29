"""Gate-3 RED (Stage 1a): checkpoint serialization round-trip.

Trains briefly, saves the model to ``.safetensors``, reloads into a fresh
model, and asserts every weight tensor is bit-identical pre/post. RED at Stage
1a (``train_to_target`` raises ``NotImplementedError``); GREEN at Stage 1b-D.
This is the Stack-D serialization contract; the SEPARATE Stack-B conversion
round-trip (``.safetensors`` -> WGSL buffer) is tested at Stage 1b-B.
"""

from __future__ import annotations

import numpy as np
import torch
from safetensors.torch import load_file, save_file

from neural_ca import NCAConfig, NCAModel, train_to_target
from neural_ca.train import TrainConfig


def test_safetensors_round_trip_bit_identical(small_target: np.ndarray, tmp_path) -> None:
    config = NCAConfig(channel_n=16, grid_size=small_target.shape[0])
    target = torch.from_numpy(small_target)

    result = train_to_target(target, config=config, train_config=TrainConfig(steps=50, seed=42))

    ckpt = tmp_path / "neural-ca-test.safetensors"
    save_file(result.model.state_dict(), str(ckpt))

    reloaded = NCAModel(config)
    reloaded.load_state_dict(load_file(str(ckpt)))

    for name, original in result.model.state_dict().items():
        restored = reloaded.state_dict()[name]
        assert torch.equal(original, restored), f"weight {name} changed across round-trip"
