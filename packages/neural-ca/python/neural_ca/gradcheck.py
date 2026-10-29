"""Float64 reference for the Grow v2 Teach gradient check (rebuild-v2 M2).

The v2 page trains the NCA in the browser with hand-written WGSL forward and
backward passes (``packages/neural-ca/web/src/v2/teach/``). Its Prove drawer
checks those gradients on the visitor's GPU against the float64 autograd
gradients this module writes, on a few small fixed cases. The cases need no
state from a training run: each starts from the canonical seed cell, uses
committed weights (or weights stored in the fixture) and the package's own
target, and draws the trainer's counter-hash fire masks, so autograd sees
exactly the masks the GPU draws.

The model is the one the gated kernel runs (16 channels; identity + Sobel
perception; 48 -> 128 ReLU -> 16; alive = 3x3 max-pool of alpha > 0.1 before
and after the update). Two things differ from ``model.py`` and are the
trainer's, not the gate's: the fire mask is ``bp_hash3(seed, t, n) >> 8 <
2**23`` (``web/gpu/src/wgsl/hash.wgsl``) for cell ``n = (b*G + y)*G + x``, and
the loss is ``mean((x_T[:, :4] - target)**2)`` over the batch.

Parameter vector (8320 f32, the trainer's packing):

    [0, 6144)     W1 [128][48], columns PLANAR: filter * 16 + channel
    [6144, 6272)  b1 [128]
    [6272, 8320)  W2 transposed, [128][16]

Weights files use the committed layout (``nca-layout.json``: ``w1.bias`` @0,
``w1.weight`` [128][48] interleaved channel * 3 + filter @128, ``w2.weight``
[16][128] @6272); ``to_trainer`` / ``from_trainer`` convert.

    uv run --no-sync python -m neural_ca.gradcheck --out packages/neural-ca/web/public/teach

writes ``gradcheck.bin`` (the arrays) and ``gradcheck.json`` (cases, offsets,
the reference losses, float32 autograd's own error on each case, sha256).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from numpy.typing import NDArray
from torch.nn import functional as F

from neural_ca.target import make_emoji_target

CN = 16
HID = 128
NPARAM = 6144 + 128 + 2048
ALIVE = 0.1
FIRE_THRESH = 1 << 23  # bp_unit(h) < 0.5  <=>  (h >> 8) < 2**23
GRID = 64

REPO = Path(__file__).resolve().parents[4]
PUBLIC = REPO / "packages/neural-ca/web/public"
WEIGHTS = {
    # name: (path from the repo root, sha256)
    "disk": (
        "packages/neural-ca/web/public/nca-weights.bin",
        "c98a467879559bf215dd44713778868eeccdfc14599a873de05ebc9df59e4039",
    ),
    "gecko": ("packages/neural-ca/web/public/menagerie/gecko.bin", None),
}

F32 = NDArray[np.float32]
F64 = NDArray[np.float64]

# --------------------------------------------------------------------- hash


def _mix32(x: NDArray[np.uint32]) -> NDArray[np.uint32]:
    with np.errstate(over="ignore"):
        x = x ^ (x >> np.uint32(16))
        x = x * np.uint32(0x7FEB352D)
        x = x ^ (x >> np.uint32(15))
        x = x * np.uint32(0x846CA68B)
        x = x ^ (x >> np.uint32(16))
    return x


def hash3(a: int, b: int, c: NDArray[np.uint32]) -> NDArray[np.uint32]:
    """``bp_hash3(a, b, c) = mix32(a ^ mix32(b ^ mix32(c)))`` with u32 wrap."""
    inner = _mix32(c.astype(np.uint32))
    mid = _mix32(np.uint32(b) ^ inner)
    return _mix32(np.uint32(a) ^ mid)


def fire_masks(seed: int, steps: int, batch: int, grid: int) -> NDArray[np.bool_]:
    """``(steps, B, G, G)``: cell n fires at step t iff ``bp_hash3(seed, t, n) >> 8 < 2**23``."""
    n = np.arange(batch * grid * grid, dtype=np.uint32)
    out = np.empty((steps, batch, grid, grid), dtype=bool)
    for t in range(steps):
        h = hash3(seed, t, n)
        out[t] = ((h >> np.uint32(8)) < np.uint32(FIRE_THRESH)).reshape(batch, grid, grid)
    return out


# ------------------------------------------------------------------ params


def to_trainer(raw: bytes) -> F32:
    """Committed layout bytes -> the trainer's 8320-float vector."""
    v = np.frombuffer(raw, dtype="<f4")
    if v.size != NPARAM:
        raise ValueError(f"expected {NPARAM} floats, got {v.size}")
    b1 = v[0:128]
    w1 = v[128:6272].reshape(HID, CN, 3)  # [j][channel][filter]
    w2 = v[6272:8320].reshape(CN, HID)
    w1p = w1.transpose(0, 2, 1).reshape(-1)  # [j][filter][channel]
    return np.concatenate([w1p, b1, w2.T.reshape(-1)]).astype(np.float32)


def from_trainer(vec: F32) -> bytes:
    """The trainer's vector -> committed layout bytes (inverse of ``to_trainer``)."""
    w1 = vec[0:6144].reshape(HID, 3, CN).transpose(0, 2, 1).reshape(-1)
    b1 = vec[6144:6272]
    w2 = vec[6272:8320].reshape(HID, CN).T.reshape(-1)
    return np.concatenate([b1, w1, w2]).astype("<f4").tobytes()


def load_weights(name: str) -> F32:
    path, sha = WEIGHTS[name]
    raw = (REPO / path).read_bytes()
    if sha is not None and hashlib.sha256(raw).hexdigest() != sha:
        raise SystemExit(f"{path}: sha256 does not match the committed checkpoint")
    return to_trainer(raw)


def random_params(seed: int) -> F32:
    """PyTorch Conv2d's default init for W1 and b1 (U(+-1/sqrt(48))) and, unlike
    training's zero-init, a small random W2 so that every gradient is non-zero."""
    rng = np.random.default_rng(seed)
    bound = 1.0 / math.sqrt(48.0)
    w1 = rng.uniform(-bound, bound, 6144)
    b1 = rng.uniform(-bound, bound, 128)
    w2 = rng.standard_normal(2048) * 0.02
    return np.concatenate([w1, b1, w2]).astype(np.float32)


def seed_states(batch: int, grid: int = GRID) -> F32:
    x = np.zeros((batch, CN, grid, grid), dtype=np.float32)
    x[:, 3:, grid // 2, grid // 2] = 1.0
    return x


BLOB_SEED = 7
BLOB_R2 = 81


def blob_states(batch: int, grid: int = GRID) -> F32:
    """A hashed disc of live cells (radius 9 about the centre), exactly reproducible
    in the browser: channel c of cell n in sample b is
    ``u = bp_unit(bp_hash3(7, b*16 + c, n))`` (``n = y*G + x``), alpha is
    ``0.15 + 0.85 u``; float64 arithmetic rounded once to float32."""
    yy, xx = np.mgrid[0:grid, 0:grid]
    inside = (xx - grid // 2) ** 2 + (yy - grid // 2) ** 2 <= BLOB_R2
    n = (yy * grid + xx).astype(np.uint32).reshape(-1)
    x = np.zeros((batch, CN, grid, grid), dtype=np.float64)
    for b in range(batch):
        for c in range(CN):
            u = (hash3(BLOB_SEED, b * CN + c, n) >> np.uint32(8)).astype(np.float64) / 16777216.0
            v = u.reshape(grid, grid)
            if c == 3:
                v = 0.15 + 0.85 * v
            x[b, c] = np.where(inside, v, 0.0)
    return x.astype(np.float32)


# --------------------------------------------------------------- reference


def _kernel(dtype: torch.dtype) -> torch.Tensor:
    ident = torch.tensor([[0.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 0.0]], dtype=dtype)
    sx = (
        torch.outer(
            torch.tensor([1.0, 2.0, 1.0], dtype=dtype), torch.tensor([-1.0, 0.0, 1.0], dtype=dtype)
        )
        / 8.0
    )
    # planar filters (identity, sobel-x, sobel-y) per channel, as groups=CN wants:
    # output channel 3c + f
    return torch.stack([ident, sx, sx.t()], 0).repeat(CN, 1, 1).unsqueeze(1)


@dataclass
class Rollout:
    loss: float
    grad: F64
    alive_cells: int
    living_at_end: int


def rollout_grad(
    params: F32, x0: F32, target: F32, steps: int, seed: int, dtype: torch.dtype
) -> Rollout:
    """Loss after ``steps`` updates from ``x0`` and its gradient with respect to the
    packed parameters, by autograd, in ``dtype`` (the inputs are float32 values)."""
    p = torch.tensor(params.astype(np.float64), dtype=dtype)
    w1p = p[0:6144].reshape(HID, 3, CN).detach().clone().requires_grad_(True)
    b1 = p[6144:6272].detach().clone().requires_grad_(True)
    w2t = p[6272:8320].reshape(HID, CN).detach().clone().requires_grad_(True)
    # interleave W1 for the grouped conv's output order (3c + f)
    w1 = w1p.permute(0, 2, 1).reshape(HID, 48)
    batch, _, grid, _ = x0.shape
    fire = torch.tensor(fire_masks(seed, steps, batch, grid), dtype=dtype)
    kern = _kernel(dtype)
    tgt = torch.tensor(target, dtype=dtype).permute(2, 0, 1).unsqueeze(0)
    x = torch.tensor(x0, dtype=dtype)
    alive_cells = 0
    for t in range(steps):
        perc = F.conv2d(x, kern, padding=1, groups=CN)
        hid = torch.relu(torch.einsum("oi,bihw->bohw", w1, perc) + b1[None, :, None, None])
        dx = torch.einsum("io,bihw->bohw", w2t, hid)
        x1 = x + dx * fire[t][:, None]
        pre = F.max_pool2d(x[:, 3:4], 3, 1, 1) > ALIVE
        post = F.max_pool2d(x1[:, 3:4], 3, 1, 1) > ALIVE
        alive = pre & post
        alive_cells += int(alive.sum().item())
        x = x1 * alive.to(dtype)
    loss = ((x[:, :4] - tgt) ** 2).mean()
    loss.backward()  # type: ignore[no-untyped-call]
    assert w1p.grad is not None and b1.grad is not None and w2t.grad is not None
    grad = np.concatenate(
        [
            w1p.grad.detach().numpy().astype(np.float64).reshape(-1),
            b1.grad.detach().numpy().astype(np.float64).reshape(-1),
            w2t.grad.detach().numpy().astype(np.float64).reshape(-1),
        ]
    )
    living = int((x[:, 3] > ALIVE).sum().item())
    return Rollout(float(loss.item()), grad, alive_cells, living)


def rel_l2(a: F64, b: F64) -> float:
    return float(np.linalg.norm(a - b) / max(float(np.linalg.norm(b)), 1e-300))


# ------------------------------------------------------------------- cases


@dataclass(frozen=True)
class Case:
    name: str
    weights: str  # "disk" | "gecko" | "random"
    start: str  # "seed" | "blob"
    steps: int
    batch: int
    seed: int


# Small, fixed, and reproducible from committed bytes alone (the starts, the
# package's target, the trainer's fire masks). Chosen where float32 autograd
# itself stays within ~2e-7 of float64, so the check measures the backprop
# arithmetic: long rollouts can be chaotic in float32 (measured: the disk at
# 96 steps from the seed, float32 autograd 1.9e-5 from float64), which would
# test float32 itself rather than the trainer.
CASES: tuple[Case, ...] = (
    Case("disk-T24", "disk", "seed", 24, 2, 9001),
    Case("gecko-T64", "gecko", "seed", 64, 4, 9007),
    Case("random-T16", "random", "blob", 16, 2, 9003),
)
RANDOM_SEED = 4242


def case_params(c: Case) -> F32:
    return random_params(RANDOM_SEED) if c.weights == "random" else load_weights(c.weights)


def case_start(c: Case) -> F32:
    return blob_states(c.batch) if c.start == "blob" else seed_states(c.batch)


def target_rgba() -> F32:
    return make_emoji_target(GRID).astype(np.float32)


def build(out: Path) -> dict[str, object]:
    """Write gradcheck.bin + gradcheck.json under ``out``; return the manifest."""
    out.mkdir(parents=True, exist_ok=True)
    target = target_rgba()
    blob = bytearray()

    def put(a: NDArray[np.generic]) -> dict[str, object]:
        b = np.ascontiguousarray(a).tobytes()
        while len(blob) % 16:
            blob.append(0)
        off = len(blob)
        blob.extend(b)
        return {"offset": off, "bytes": len(b), "dtype": str(a.dtype), "count": int(a.size)}

    arrays: dict[str, object] = {"target": put(target.astype("<f4"))}
    rand = random_params(RANDOM_SEED)
    arrays["random_params"] = put(rand.astype("<f4"))
    cases = []
    for c in CASES:
        params = case_params(c)
        x0 = case_start(c)
        r64 = rollout_grad(params, x0, target, c.steps, c.seed, torch.float64)
        r32 = rollout_grad(params, x0, target, c.steps, c.seed, torch.float32)
        cases.append(
            {
                "name": c.name,
                "weights": c.weights,
                "weights_file": None if c.weights == "random" else WEIGHTS[c.weights][0],
                "start": c.start,
                "steps": c.steps,
                "batch": c.batch,
                "seed": c.seed,
                "grad64": put(r64.grad.astype("<f8")),
                "loss64": r64.loss,
                "alive_cells64": r64.alive_cells,
                "living_at_end64": r64.living_at_end,
                "f32_autograd_rel_l2": rel_l2(r32.grad, r64.grad),
                "f32_autograd_loss_rel": abs(r32.loss - r64.loss) / r64.loss,
            }
        )
        print(
            f"{c.name:>11}: loss {r64.loss:.6e}  alive cell-steps {r64.alive_cells}  "
            f"living {r64.living_at_end}  "
            f"f32 autograd rel L2 {cases[-1]['f32_autograd_rel_l2']:.3e}",
            flush=True,
        )
    (out / "gradcheck.bin").write_bytes(bytes(blob))
    manifest: dict[str, object] = {
        "what": "Grow v2 Teach gradient check: float64 autograd gradients of one NCA rollout "
        "per case, with the trainer's counter-hash fire masks (neural_ca/gradcheck.py)",
        "generator": "packages/neural-ca/python/neural_ca/gradcheck.py",
        "grid": GRID,
        "channels": CN,
        "nparam": NPARAM,
        "param_layout": "trainer: W1 [128][3][16] planar, b1 [128], W2^T [128][16]",
        "starts": {
            "seed": "the canonical seed cell (channels 3..15 = 1 at (32, 32)) in every sample",
            "blob": "cells with (x-32)^2 + (y-32)^2 <= 81: channel c of sample b = "
            "u = bp_unit(bp_hash3(7, b*16 + c, y*64 + x)), "
            "alpha 0.15 + 0.85u (f64, rounded to f32)",
        },
        "target": "neural_ca.target.make_emoji_target(64), premultiplied RGBA",
        "loss": "mean((x_T[:, :4] - target)^2) over batch, 4 channels and the grid",
        "fire_mask": "bp_hash3(seed, t, (b*G + y)*G + x) >> 8 < 2^23",
        "random_params_seed": RANDOM_SEED,
        "torch": torch.__version__,
        "sha256": hashlib.sha256(bytes(blob)).hexdigest(),
        "arrays": arrays,
        "cases": cases,
    }
    (out / "gradcheck.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", type=Path, default=PUBLIC / "teach")
    args = ap.parse_args()
    build(args.out)


if __name__ == "__main__":
    main()
