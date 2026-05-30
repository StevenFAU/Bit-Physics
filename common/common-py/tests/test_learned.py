"""``common_py.learned`` tests — CaptureDataset, DataModule, default_trainer (§4.2.E)."""

from __future__ import annotations

import lightning.pytorch as pl
import numpy as np
import pytest
import torch
from common_warp.capture import write_frames_capture  # test-only: build a real capture

from common_py.learned import CaptureDataset, CaptureLightningDataModule, default_trainer


def _capture(tmp_path, n_steps: int = 20):
    frames = [
        (k, {"density": np.full((4,), float(k)), "velocity": np.full((4, 2), float(k))}, {})
        for k in range(n_steps)
    ]
    manifest = {
        "schema_version": "1.1.0",
        "sim": {"name": "learned-smoke", "category": "test", "variant": "ref"},
        "stack": {"name": "numpy-reference", "version": "0.0.0", "build_id": "wu-e"},
        "config": {"tier": "test", "dims": [4], "dtype": "f64", "seed": 0, "params": {}},
        "run": {
            "step_count": n_steps,
            "capture_interval": 1,
            "wall_clock_seconds": 0.0,
            "start_utc": "2026-05-30T00:00:00Z",
        },
        "payload": {"format": "hdf5", "path": "cap.h5", "checksum": "sha256:" + "0" * 64},
        "determinism": {"claimed": "bit-exact-same-hw", "atomic_ops": False, "subgroup_ops": False},
    }
    return str(write_frames_capture(frames, manifest, tmp_path))


def test_dataset_len_and_sample_shape(tmp_path) -> None:
    path = _capture(tmp_path, 20)
    ds = CaptureDataset(capture_paths=[path], split="train", split_ratios=(0.7, 0.15, 0.15))
    assert len(ds) == 14  # 70% of 20
    sample = ds[0]
    assert set(sample) == {"density", "velocity"}
    assert isinstance(sample["density"], torch.Tensor)
    assert sample["velocity"].shape == (4, 2)


def test_dataset_split_partitions_are_disjoint_and_cover(tmp_path) -> None:
    path = _capture(tmp_path, 20)
    kw = dict(capture_paths=[path], split_seed=7, split_ratios=(0.6, 0.2, 0.2))
    sizes = {s: len(CaptureDataset(split=s, **kw)) for s in ("train", "val", "test")}
    assert sum(sizes.values()) == 20


def test_dataset_fields_filter(tmp_path) -> None:
    path = _capture(tmp_path, 10)
    ds = CaptureDataset(capture_paths=[path], split="train", fields=["density"])
    assert set(ds[0]) == {"density"}


def test_dataset_validates_args(tmp_path) -> None:
    path = _capture(tmp_path, 4)
    with pytest.raises(ValueError, match="split"):
        CaptureDataset(capture_paths=[path], split="holdout")
    with pytest.raises(ValueError, match="sum to 1"):
        CaptureDataset(capture_paths=[path], split_ratios=(0.5, 0.5, 0.5))
    with pytest.raises(ValueError, match="frame_stride"):
        CaptureDataset(capture_paths=[path], frame_stride=0)


def test_datamodule_dataloaders(tmp_path) -> None:
    path = _capture(tmp_path, 20)
    dm = CaptureLightningDataModule(capture_paths=[path], batch_size=2, num_workers=0)
    dm.setup()
    batch = next(iter(dm.train_dataloader()))
    assert batch["density"].shape[0] == 2  # batch dim
    assert dm.val_dataloader() is not None and dm.test_dataloader() is not None


def test_default_trainer_config(tmp_path) -> None:
    trainer = default_trainer(max_epochs=5, checkpoint_dir=str(tmp_path / "ckpt"))
    assert isinstance(trainer, pl.Trainer)
    assert trainer.max_epochs == 5
    names = {type(cb).__name__ for cb in trainer.callbacks}
    assert "ModelCheckpoint" in names and "EarlyStopping" in names
