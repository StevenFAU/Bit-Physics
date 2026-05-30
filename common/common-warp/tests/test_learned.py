"""``common_warp.learned`` tests — Warp<->Torch bridges + PhysicsNeMoAdapter (§4.2.E)."""

from __future__ import annotations

import numpy as np
import pytest
import warp as wp

from common_warp.learned import PhysicsNeMoAdapter, torch_to_warp, warp_to_torch

torch = pytest.importorskip("torch")


def test_warp_to_torch_to_warp_round_trip() -> None:
    wp.init()
    arr = wp.array(np.arange(12, dtype=np.float32).reshape(3, 4), dtype=wp.float32, device="cpu")
    t = warp_to_torch(arr)
    assert t.shape == (3, 4)
    np.testing.assert_array_equal(t.cpu().numpy(), arr.numpy())
    back = torch_to_warp(t)
    np.testing.assert_array_equal(back.numpy(), arr.numpy())


def test_physicsnemo_adapter_construction() -> None:
    model = torch.nn.Linear(4, 2)
    adapter = PhysicsNeMoAdapter(lightning_module=model, capture_dataset=["fake-ds"])
    assert adapter.lightning_module is model
    assert adapter.capture_dataset == ["fake-ds"]


def test_physicsnemo_adapter_to_model_and_datapipe() -> None:
    pytest.importorskip("physicsnemo")
    import physicsnemo

    torch.manual_seed(0)
    model = torch.nn.Linear(4, 2)
    ds = ["dataset-sentinel"]
    adapter = PhysicsNeMoAdapter(lightning_module=model, capture_dataset=ds)

    pn_model = adapter.to_physicsnemo_model()
    assert isinstance(pn_model, physicsnemo.Module)
    x = torch.ones(1, 4)
    np.testing.assert_allclose(pn_model(x).detach().numpy(), model(x).detach().numpy(), atol=1e-6)
    assert adapter.to_physicsnemo_datapipe() is ds
