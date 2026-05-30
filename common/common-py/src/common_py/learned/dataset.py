"""``CaptureDataset`` — a ``torch.utils.data.Dataset`` over portfolio captures (§4.2.E).

Reads capture files via the testkit ``capture.load_capture`` (the canonical
reader both common-* surfaces delegate to) and yields per-step state samples
keyed by the §4.2.P canonical field names. Consumable directly by
``torch.utils.data.DataLoader`` or via :class:`CaptureLightningDataModule`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import torch
from capture import load_capture

_SPLITS = ("train", "val", "test")


class CaptureDataset(torch.utils.data.Dataset[dict[str, Any]]):
    """A PyTorch ``Dataset`` over capture files; one sample per captured step."""

    def __init__(
        self,
        *,
        capture_paths: list[str],
        split: str = "train",
        split_seed: int = 42,
        split_ratios: tuple[float, float, float] = (0.7, 0.15, 0.15),
        frame_stride: int = 1,
        fields: list[str] | None = None,
    ) -> None:
        if split not in _SPLITS:
            raise ValueError(f"split must be one of {_SPLITS}; got {split!r}")
        if abs(sum(split_ratios) - 1.0) > 1e-9:
            raise ValueError(f"split_ratios must sum to 1.0; got {split_ratios}")
        if frame_stride < 1:
            raise ValueError(f"frame_stride must be >= 1; got {frame_stride}")

        samples: list[dict[str, np.ndarray]] = []
        for path in capture_paths:
            capture = load_capture(Path(path))
            for step_state in capture.steps():
                if step_state.step % frame_stride != 0:
                    continue
                samples.append({k: np.asarray(v) for k, v in step_state.state.items()})
        self._samples = samples
        self._fields = fields

        # Deterministic split over the global sample index (seed-pinned per §4.2.P).
        idx = np.arange(len(samples))
        np.random.default_rng(split_seed).shuffle(idx)
        n = len(idx)
        n_train = int(n * split_ratios[0])
        n_val = int(n * split_ratios[1])
        partition = {
            "train": idx[:n_train],
            "val": idx[n_train : n_train + n_val],
            "test": idx[n_train + n_val :],
        }
        self._selection = partition[split]

    def __len__(self) -> int:
        return len(self._selection)

    def __getitem__(self, idx: int) -> dict[str, Any]:
        sample = self._samples[int(self._selection[idx])]
        keys = self._fields if self._fields is not None else sorted(sample)
        return {k: torch.from_numpy(np.ascontiguousarray(sample[k])) for k in keys}
