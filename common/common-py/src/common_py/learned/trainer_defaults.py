"""``default_trainer`` — a Lightning Trainer with portfolio-standard defaults (§4.2.E)."""

from __future__ import annotations

import lightning.pytorch as pl
from lightning.pytorch.callbacks import EarlyStopping, ModelCheckpoint

#: Portfolio-standard training seed (§4.2.P deterministic-seed convention).
PORTFOLIO_SEED = 42


def default_trainer(
    *,
    max_epochs: int = 100,
    checkpoint_dir: str,
    early_stopping_patience: int = 10,
    accelerator: str = "auto",
    precision: str = "32",
) -> pl.Trainer:
    """Construct a Lightning ``Trainer`` with portfolio-standard defaults (§4.2.E).

    Seeds globally (``seed_everything`` + deterministic algorithms per §4.2.P),
    keeps the top-3 checkpoints by ``val_loss``, and early-stops on ``val_loss``.
    This is preset config, NOT a wrapper around Lightning's ``Trainer`` — sim
    implementers supply their own ``LightningModule``.
    """
    pl.seed_everything(PORTFOLIO_SEED, workers=True)
    callbacks = [
        ModelCheckpoint(dirpath=checkpoint_dir, monitor="val_loss", save_top_k=3, mode="min"),
        EarlyStopping(monitor="val_loss", patience=early_stopping_patience, mode="min"),
    ]
    return pl.Trainer(
        max_epochs=max_epochs,
        accelerator=accelerator,
        precision=precision,  # type: ignore[arg-type]
        callbacks=callbacks,
        deterministic=True,
        logger=False,
        enable_progress_bar=False,
    )
