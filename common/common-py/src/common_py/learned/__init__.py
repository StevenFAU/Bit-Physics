"""``common_py.learned`` — PyTorch/Lightning learning harness (§4.2.E).

Dataset + Lightning data-module + a portfolio-default Trainer factory. Models are
user-supplied ``lightning.pytorch.LightningModule`` subclasses (the portfolio
ships NO ``TrainingLoop`` class — v6 adopted Lightning directly). Consumed by the
Phase-4.6 learned-dynamics sims (4.26-4.27).
"""

from __future__ import annotations

from .datamodule import CaptureLightningDataModule
from .dataset import CaptureDataset
from .trainer_defaults import default_trainer

__all__ = ["CaptureDataset", "CaptureLightningDataModule", "default_trainer"]
