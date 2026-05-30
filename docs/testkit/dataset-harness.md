# Dataset + learning harness — `common_py.learned` / `common_warp.learned`

> Phase-4 WU-E (plan §4.2.E). The data-loading + Lightning-training conventions
> + Warp<->PyTorch bridges + PhysicsNeMo adapter consumed by the Phase-4.6
> learned-dynamics sims (4.26 gns-particle, 4.27 learned-closure-les).

## `common_py.learned`

```python
from common_py.learned import CaptureDataset, CaptureLightningDataModule, default_trainer
```

(On-demand import — NOT re-exported from `common_py/__init__`, which would force
`torch`+`lightning` on every common-py consumer; common-py's base stack is
Taichi. §0.3 SHIFT from the plan's "register learned submodule".)

- **`CaptureDataset(*, capture_paths, split="train"|"val"|"test", split_seed=42,
  split_ratios=(0.7,0.15,0.15), frame_stride=1, fields=None)`** — a
  `torch.utils.data.Dataset`; one sample per captured step, read via the testkit
  `capture.load_capture`. Yielded samples use the §4.2.P canonical field names
  (e.g. `"density"`, `"velocity"`). The split is a **deterministic, seed-pinned**
  partition of the global sample index — the three splits are disjoint and cover
  the full set (PBT `dataset_split_no_overlap`).
- **`CaptureLightningDataModule(*, capture_paths, batch_size=32, num_workers=4,
  split_seed=42, split_ratios=...)`** — a `lightning.pytorch.LightningDataModule`
  exposing `train/val/test_dataloader`.
- **`default_trainer(*, max_epochs=100, checkpoint_dir, early_stopping_patience=10,
  accelerator="auto", precision="32")`** — preset `lightning.pytorch.Trainer`
  config (NOT a wrapper): `seed_everything(42, workers=True)` + `deterministic=True`
  (§4.2.P seed convention), `ModelCheckpoint(save_top_k=3, monitor="val_loss")`,
  `EarlyStopping(monitor="val_loss")`. Sim implementers supply their own
  `LightningModule` and call `default_trainer(...).fit(module, datamodule)`.

## `common_warp.learned`

```python
from common_warp.learned import warp_to_torch, torch_to_warp, PhysicsNeMoAdapter
```

- **`warp_to_torch(wp_array)` / `torch_to_warp(tensor)`** — canonical-name
  wrappers over Warp's PyTorch interop (`wp.to_torch` / `wp.from_torch`),
  zero-copy where device+dtype permit.
- **`PhysicsNeMoAdapter(*, lightning_module, capture_dataset)`** —
  `to_physicsnemo_model()` wraps the LightningModule in a `physicsnemo.Module`
  (forward delegates); `to_physicsnemo_datapipe()` exposes the CaptureDataset as
  a PhysicsNeMo datapipe (a torch Dataset). Lazy-imports
  **nvidia-physicsnemo 2.1.0** (pin re-resolved live at the WU-E probe — the
  plan's "1.x" is stale per A-6); concrete semantics refined per-sim at 4.27.

## Determinism + seed management (§4.2.P)

`default_trainer` seeds globally (`seed_everything` + `deterministic=True`); the
PBT `seed_determinism_within_lightning` confirms a seeded forward pass is
bit-exact across two runs in the same process. CUDA determinism is a runtime
concern; the CPU path is bit-exact.

## Dependencies

`lightning>=2.6,<3.0` (Apache-2.0; common-py `learned` extra) and
`nvidia-physicsnemo>=2.1` (Apache-2.0; common-warp `learned` extra; base build
CPU-installable). See `docs/dependencies.md`.
