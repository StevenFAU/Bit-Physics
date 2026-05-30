"""Phase-4 WU-E property-based tests (spec §2.14; plan §7.6 v9 addendum).

- ``dataset_split_no_overlap`` — train/val/test partitions of a CaptureDataset
  have empty pairwise intersection (and cover the full sample set) under random
  seeds and ratios.
- ``seed_determinism_within_lightning`` — ``seed_everything(s)`` then a forward
  pass on a fixed input is bit-exact across two runs in the same process.
"""

from __future__ import annotations

import numpy as np
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

_SETTINGS = settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])


def _write_capture(out_dir, n_steps: int) -> str:
    from common_warp.capture import write_frames_capture

    frames = [(k, {"u": np.full((3,), float(k))}, {}) for k in range(n_steps)]
    manifest = {
        "schema_version": "1.1.0",
        "sim": {"name": "split-pbt", "category": "test", "variant": "ref"},
        "stack": {"name": "numpy-reference", "version": "0.0.0", "build_id": "wu-e-pbt"},
        "config": {"tier": "test", "dims": [3], "dtype": "f64", "seed": 0, "params": {}},
        "run": {
            "step_count": n_steps,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-30T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": "s.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }
    return str(write_frames_capture(frames, manifest, out_dir))


@_SETTINGS
@given(
    seed=st.integers(0, 2**31 - 1),
    n_steps=st.integers(6, 40),
    r_train=st.integers(40, 70),
    r_val=st.integers(10, 30),
)
def test_dataset_split_no_overlap(seed, n_steps, r_train, r_val, tmp_path_factory) -> None:
    from common_py.learned import CaptureDataset

    train_f = r_train / 100.0
    val_f = r_val / 100.0
    ratios = (train_f, val_f, 1.0 - train_f - val_f)
    path = _write_capture(tmp_path_factory.mktemp("split"), n_steps)
    sels = {
        s: set(
            CaptureDataset(
                capture_paths=[path], split=s, split_seed=seed, split_ratios=ratios
            )._selection.tolist()
        )
        for s in ("train", "val", "test")
    }
    assert sels["train"].isdisjoint(sels["val"])
    assert sels["train"].isdisjoint(sels["test"])
    assert sels["val"].isdisjoint(sels["test"])
    assert sels["train"] | sels["val"] | sels["test"] == set(range(n_steps))


@_SETTINGS
@given(seed=st.integers(0, 2**31 - 1))
def test_seed_determinism_within_lightning(seed: int) -> None:
    import lightning.pytorch as pl
    import torch

    x = torch.ones(1, 4)

    def _forward() -> torch.Tensor:
        pl.seed_everything(seed, workers=True)
        model = torch.nn.Linear(4, 2)
        with torch.no_grad():
            return model(x)

    torch.testing.assert_close(_forward(), _forward(), rtol=0.0, atol=0.0)
