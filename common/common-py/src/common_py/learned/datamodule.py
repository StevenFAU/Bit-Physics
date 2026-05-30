"""``CaptureLightningDataModule`` — a Lightning DataModule over captures (§4.2.E)."""

from __future__ import annotations

from typing import Any

import lightning.pytorch as pl
from torch.utils.data import DataLoader

from .dataset import CaptureDataset


class CaptureLightningDataModule(pl.LightningDataModule):
    """``lightning.pytorch.LightningDataModule`` wrapping :class:`CaptureDataset`.

    Use in LightningModule-based training, or use ``CaptureDataset`` directly with
    a ``torch.utils.data.DataLoader`` for non-Lightning training.
    """

    def __init__(
        self,
        *,
        capture_paths: list[str],
        batch_size: int = 32,
        num_workers: int = 4,
        split_seed: int = 42,
        split_ratios: tuple[float, float, float] = (0.7, 0.15, 0.15),
    ) -> None:
        super().__init__()
        self.capture_paths = capture_paths
        self.batch_size = batch_size
        self.num_workers = num_workers
        self.split_seed = split_seed
        self.split_ratios = split_ratios
        self._datasets: dict[str, CaptureDataset] = {}

    def setup(self, stage: str | None = None) -> None:
        for split in ("train", "val", "test"):
            self._datasets[split] = CaptureDataset(
                capture_paths=self.capture_paths,
                split=split,
                split_seed=self.split_seed,
                split_ratios=self.split_ratios,
            )

    def _loader(self, split: str, *, shuffle: bool) -> DataLoader[dict[str, Any]]:
        if split not in self._datasets:
            self.setup()
        return DataLoader(
            self._datasets[split],
            batch_size=self.batch_size,
            num_workers=self.num_workers,
            shuffle=shuffle,
        )

    def train_dataloader(self) -> DataLoader[dict[str, Any]]:
        return self._loader("train", shuffle=True)

    def val_dataloader(self) -> DataLoader[dict[str, Any]]:
        return self._loader("val", shuffle=False)

    def test_dataloader(self) -> DataLoader[dict[str, Any]]:
        return self._loader("test", shuffle=False)
