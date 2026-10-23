"""Reference side of the Grow in-browser training spike (rebuild-v2 M0).

Throwaway measurement code, not part of the ``neural_ca`` package or its gate.
It provides:

- the procedural targets the spike trains on (40x40 inside a 72x72 grid, the
  spec's canonical Teach size; premultiplied RGBA on a transparent field);
- a float64 (and float32) PyTorch autograd reference of one NCA rollout's loss
  and parameter gradients, with the SAME counter-based fire masks the WGSL
  trainer draws (``bp_hash3`` from ``web/gpu/src/wgsl/hash.wgsl``), so the
  WebGPU hand-written backward pass can be checked against autograd;
- the comparison of the browser's gradients with that reference.

Run with the workspace venv (``uv run --no-sync python ...``); see README.md.

Parameter vector layout (8320 f32, the GPU's packing):
    [0, 6144)     W1, row-major [128][48], columns PLANAR: filter * 16 + channel
                  (filters: identity, Sobel-x, Sobel-y)
    [6144, 6272)  b1 [128]
    [6272, 8320)  W2 transposed, row-major [128][16]
The committed checkpoint (``packages/neural-ca/web/public/nca-weights.bin``) uses
the PyTorch layout (columns INTERLEAVED: channel * 3 + filter); ``pack``/``unpack``
convert.
"""

from __future__ import annotations

import argparse
import base64
import json
import math
import sys
from pathlib import Path

import numpy as np
import torch
from torch.nn import functional as F

CN = 16
HID = 128
NPARAM = 6144 + 128 + 2048
ALIVE = 0.1
FIRE_THRESH = 1 << 23  # bp_unit(h) < 0.5  <=>  (h >> 8) < 2^23

REPO = Path(__file__).resolve().parents[3]
CHECKPOINT = REPO / "packages/neural-ca/web/public/nca-weights.bin"
CHECKPOINT_SHA = "c98a467879559bf215dd44713778868eeccdfc14599a873de05ebc9df59e4039"

# --------------------------------------------------------------------------- hash


def _mix32(x: np.ndarray) -> np.ndarray:
    x = x.astype(np.uint32)
    with np.errstate(over="ignore"):
        x = x ^ (x >> np.uint32(16))
        x = x * np.uint32(0x7FEB352D)
        x = x ^ (x >> np.uint32(15))
        x = x * np.uint32(0x846CA68B)
        x = x ^ (x >> np.uint32(16))
    return x


def hash3(a: int, b: int, c: np.ndarray) -> np.ndarray:
    """``bp_hash3(a, b, c)`` = mix32(a ^ mix32(b ^ mix32(c))), u32 wrap."""
    inner = _mix32(c)
    mid = _mix32(np.uint32(b) ^ inner)
    return _mix32(np.uint32(a) ^ mid)


def fire_masks(seed: int, steps: int, batch: int, grid: int) -> np.ndarray:
    """(steps, B, G, G) bool: cell n = (b*G + y)*G + x fires at step t iff
    (bp_hash3(seed, t, n) >> 8) < 2^23 (rate 0.5)."""
    n = np.arange(batch * grid * grid, dtype=np.uint32)
    out = np.empty((steps, batch, grid, grid), dtype=bool)
    for t in range(steps):
        h = hash3(seed, t, n)
        out[t] = ((h >> np.uint32(8)) < np.uint32(FIRE_THRESH)).reshape(
            batch, grid, grid
        )
    return out


# --------------------------------------------------------------------- params


def load_checkpoint() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    raw = CHECKPOINT.read_bytes()
    import hashlib

    sha = hashlib.sha256(raw).hexdigest()
    if sha != CHECKPOINT_SHA:
        raise SystemExit(f"checkpoint sha {sha} != committed {CHECKPOINT_SHA}")
    v = np.frombuffer(raw, dtype="<f4")
    b1 = v[0:128].copy()
    w1 = v[128:6272].reshape(128, 48).copy()  # interleaved columns
    w2 = v[6272:8320].reshape(16, 128).copy()
    return w1, b1, w2


def pack(w1: np.ndarray, b1: np.ndarray, w2: np.ndarray) -> np.ndarray:
    """PyTorch layout (W1 interleaved [128][48], b1, W2 [16][128]) -> GPU vector."""
    w1p = w1.reshape(128, CN, 3).transpose(0, 2, 1).reshape(128, 48)  # [j][filter*16+c]
    return np.concatenate([w1p.reshape(-1), b1.reshape(-1), w2.T.reshape(-1)]).astype(
        np.float32
    )


def unpack(vec: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    w1p = vec[0:6144].reshape(128, 3, CN)
    w1 = w1p.transpose(0, 2, 1).reshape(128, 48)
    b1 = vec[6144:6272]
    w2 = vec[6272:8320].reshape(128, 16).T
    return w1, b1, w2


def random_params(seed: int) -> np.ndarray:
    """PyTorch Conv2d default init for w1/b1 (U(+-1/sqrt(48))) and, unlike
    training (zero-init), a small random w2 so every gradient is non-trivial."""
    rng = np.random.default_rng(seed)
    bound = 1.0 / math.sqrt(48.0)
    w1 = rng.uniform(-bound, bound, (128, 48)).astype(np.float32)
    b1 = rng.uniform(-bound, bound, 128).astype(np.float32)
    w2 = (rng.standard_normal((16, 128)) * 0.02).astype(np.float32)
    return pack(w1, b1, w2)


# -------------------------------------------------------------------- targets


def _capsule(
    px: np.ndarray,
    py: np.ndarray,
    a: tuple[float, float],
    b: tuple[float, float],
    r: float,
) -> np.ndarray:
    ax, ay = a
    bx, by = b
    vx, vy = bx - ax, by - ay
    t = np.clip(
        ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy + 1e-12), 0.0, 1.0
    )
    dx = px - (ax + t * vx)
    dy = py - (ay + t * vy)
    return dx * dx + dy * dy <= r * r


def _ellipse(
    px: np.ndarray, py: np.ndarray, c: tuple[float, float], rx: float, ry: float
) -> np.ndarray:
    return ((px - c[0]) / rx) ** 2 + ((py - c[1]) / ry) ** 2 <= 1.0


def _shape_samples(
    name: str, px: np.ndarray, py: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Inside-mask and colour at sample points in [0, 40)^2 target coordinates."""
    col = np.zeros(px.shape + (3,), dtype=np.float32)
    if name == "disk":
        # The package's canonical two-tone glyph (neural_ca/target.py), at 40 px.
        r = np.hypot(px - 20.0, py - 20.0)
        inside = r <= 16.0  # 0.4 of the 40-px box
        col[...] = (1.0, 0.78, 0.10)
        col[r <= 0.18 * 40] = (0.95, 0.35, 0.05)
        return inside, col
    if name == "gecko":
        # A lizard-like silhouette standing in for the Distill lizard emoji
        # (thin limbs and tail are what make that target hard).
        body = _ellipse(px, py, (20.0, 20.5), 4.6, 8.5)
        head = _ellipse(px, py, (20.0, 9.0), 4.0, 4.6)
        neck = _capsule(px, py, (20.0, 10.0), (20.0, 14.0), 3.0)
        tail = (
            _capsule(px, py, (20.0, 27.0), (21.5, 32.0), 2.6)
            | _capsule(px, py, (21.5, 32.0), (25.0, 35.5), 2.0)
            | _capsule(px, py, (25.0, 35.5), (30.0, 36.5), 1.4)
            | _capsule(px, py, (30.0, 36.5), (33.5, 34.5), 1.0)
        )
        legs = np.zeros_like(body)
        for sx in (-1.0, 1.0):
            for (ax, ay), (kx, ky), (fx, fy) in (
                ((3.0, -4.5), (9.0, -6.5), (11.0, -11.0)),
                ((3.0, 5.0), (9.0, 7.5), (11.0, 12.0)),
            ):
                a = (20.0 + sx * ax, 20.5 + ay)
                k = (20.0 + sx * kx, 20.5 + ky)
                f = (20.0 + sx * fx, 20.5 + fy)
                legs |= _capsule(px, py, a, k, 1.5) | _capsule(px, py, k, f, 1.3)
                legs |= _ellipse(px, py, f, 1.9, 1.9)
        inside = body | head | neck | tail | legs
        col[...] = (0.36, 0.74, 0.24)
        belly = _ellipse(px, py, (20.0, 20.5), 2.0, 6.5)
        col[belly] = (0.62, 0.86, 0.36)
        for cx, cy in ((18.0, 16.0), (22.0, 19.0), (18.5, 23.5), (21.5, 26.5)):
            col[_ellipse(px, py, (cx, cy), 1.1, 1.1)] = (0.14, 0.40, 0.13)
        for cx in (18.0, 22.0):
            col[_ellipse(px, py, (cx, 7.8), 0.95, 0.95)] = (0.05, 0.08, 0.05)
        return inside, col
    if name == "star":
        ang = np.arctan2(py - 20.0, px - 20.0) + math.pi / 2.0
        r = np.hypot(px - 20.0, py - 20.0)
        edge = 17.0 * (0.42 + 0.58 * ((0.5 + 0.5 * np.cos(5.0 * ang)) ** 1.6))
        inside = r <= edge
        col[...] = (0.98, 0.50, 0.20)
        col[r <= 5.0] = (1.0, 0.80, 0.50)
        return inside, col
    raise SystemExit(f"unknown target {name!r}")


def make_target(name: str, size: int = 40, pad: int = 16, ss: int = 4) -> np.ndarray:
    """(G, G, 4) premultiplied RGBA, G = size + 2*pad; ss x ss supersampled edges."""
    g = size + 2 * pad
    off = (np.arange(ss, dtype=np.float32) + 0.5) / ss
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    px = (xx[..., None, None] + off[None, None, None, :]).astype(np.float64)
    py = (yy[..., None, None] + off[None, None, :, None]).astype(np.float64)
    px, py = np.broadcast_arrays(px, py)
    inside, col = _shape_samples(name, px, py)
    a = inside.mean(axis=(2, 3))
    rgb = (col * inside[..., None]).mean(axis=(2, 3))  # premultiplied by coverage
    out = np.zeros((g, g, 4), dtype=np.float32)
    out[pad : pad + size, pad : pad + size, :3] = rgb
    out[pad : pad + size, pad : pad + size, 3] = a
    return out


def seed_states(batch: int, grid: int) -> np.ndarray:
    x = np.zeros((batch, CN, grid, grid), dtype=np.float32)
    x[:, 3:, grid // 2, grid // 2] = 1.0
    return x


# ------------------------------------------------------------- reference grad


def _perception_kernel(dtype: torch.dtype) -> torch.Tensor:
    ident = torch.tensor(
        [[0.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 0.0]], dtype=dtype
    )
    sx = (
        torch.outer(
            torch.tensor([1.0, 2.0, 1.0], dtype=dtype),
            torch.tensor([-1.0, 0.0, 1.0], dtype=dtype),
        )
        / 8.0
    )
    sy = sx.t()
    return (
        torch.stack([ident, sx, sy], 0).repeat(CN, 1, 1).unsqueeze(1)
    )  # (48,1,3,3) interleaved


def rollout_grad(
    params: np.ndarray,
    x0: np.ndarray,
    target: np.ndarray,
    steps: int,
    seed: int,
    dtype: torch.dtype,
    alive_override: np.ndarray | None = None,
) -> dict[str, np.ndarray | float]:
    """Loss = mean((x_T[:, :4] - target)^2) after ``steps`` NCA updates from
    ``x0`` and its gradient w.r.t. the packed parameters, by autograd."""
    w1n, b1n, w2n = unpack(params.astype(np.float32))
    w1 = torch.tensor(w1n, dtype=dtype, requires_grad=True)
    b1 = torch.tensor(b1n, dtype=dtype, requires_grad=True)
    w2 = torch.tensor(np.ascontiguousarray(w2n), dtype=dtype, requires_grad=True)
    batch, _, grid, _ = x0.shape
    fire = torch.tensor(fire_masks(seed, steps, batch, grid), dtype=dtype)
    kern = _perception_kernel(dtype)
    tgt = torch.tensor(target, dtype=dtype).permute(2, 0, 1).unsqueeze(0)
    x = torch.tensor(x0, dtype=dtype)
    alive_log = np.zeros((steps, batch, grid, grid), dtype=bool)
    for t in range(steps):
        p = F.conv2d(x, kern, padding=1, groups=CN)
        h = torch.relu(torch.einsum("oi,bihw->bohw", w1, p) + b1[None, :, None, None])
        dx = torch.einsum("oi,bihw->bohw", w2, h)
        x1 = x + dx * fire[t][:, None]
        if alive_override is not None:
            alive = torch.tensor(alive_override[t], dtype=torch.bool)[:, None]
        else:
            pre = F.max_pool2d(x[:, 3:4], 3, 1, 1) > ALIVE
            post = F.max_pool2d(x1[:, 3:4], 3, 1, 1) > ALIVE
            alive = pre & post
        alive_log[t] = alive[:, 0].numpy()
        x = x1 * alive.to(dtype)
    loss = ((x[:, :4] - tgt) ** 2).mean()
    loss.backward()
    gw1 = w1.grad.detach().numpy().astype(np.float64)  # type: ignore[union-attr]
    gb1 = b1.grad.detach().numpy().astype(np.float64)  # type: ignore[union-attr]
    gw2 = w2.grad.detach().numpy().astype(np.float64)  # type: ignore[union-attr]
    w1p = gw1.reshape(128, CN, 3).transpose(0, 2, 1).reshape(-1)
    grad = np.concatenate([w1p, gb1, gw2.T.reshape(-1)])
    return {
        "loss": float(loss.item()),
        "grad": grad,
        "xT": x.detach().numpy().astype(np.float64),
        "alive": alive_log,
    }


# ---------------------------------------------------------------- case files


def _b64(a: np.ndarray) -> str:
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode("ascii")


def _unb64(s: str, dtype: str) -> np.ndarray:
    return np.frombuffer(base64.b64decode(s), dtype=dtype)


GRADCHECK_CASES = [
    # name, params, steps, batch, seed, init
    ("ckpt-T1", "checkpoint", 1, 4, 101, "grown"),
    ("ckpt-T16", "checkpoint", 16, 4, 102, "seed"),
    ("ckpt-T64", "checkpoint", 64, 4, 103, "seed"),
    ("ckpt-T96", "checkpoint", 96, 4, 104, "seed"),
    ("ckpt-T64-grown", "checkpoint", 64, 4, 105, "grown"),
    ("rand-T8", "random", 8, 4, 106, "grown"),
    ("rand-T32", "random", 32, 4, 107, "grown"),
]


def grown_states(
    params: np.ndarray, batch: int, grid: int, steps: int = 120, seed: int = 7
) -> np.ndarray:
    """A pool-like start: the checkpoint grown ``steps`` from the seed (f32, no grad)."""
    w1n, b1n, w2n = unpack(params)
    w1 = torch.tensor(w1n)
    b1 = torch.tensor(b1n)
    w2 = torch.tensor(np.ascontiguousarray(w2n))
    kern = _perception_kernel(torch.float32)
    fire = torch.tensor(fire_masks(seed, steps, batch, grid), dtype=torch.float32)
    x = torch.tensor(seed_states(batch, grid))
    with torch.no_grad():
        for t in range(steps):
            p = F.conv2d(x, kern, padding=1, groups=CN)
            h = torch.relu(
                torch.einsum("oi,bihw->bohw", w1, p) + b1[None, :, None, None]
            )
            x1 = x + torch.einsum("oi,bihw->bohw", w2, h) * fire[t][:, None]
            alive = (F.max_pool2d(x[:, 3:4], 3, 1, 1) > ALIVE) & (
                F.max_pool2d(x1[:, 3:4], 3, 1, 1) > ALIVE
            )
            x = x1 * alive.float()
    return x.numpy().astype(np.float32)


def cmd_cases(out: Path, grid: int, target_name: str) -> None:
    out.mkdir(parents=True, exist_ok=True)
    target = make_target(target_name)
    assert target.shape[0] == grid
    ckpt = pack(*load_checkpoint())
    cases = []
    for name, which, steps, batch, seed, init in GRADCHECK_CASES:
        params = ckpt if which == "checkpoint" else random_params(seed)
        if init == "seed":
            x0 = seed_states(batch, grid)
        else:
            x0 = grown_states(ckpt, batch, grid)
        refs = {}
        for label, dt in (("f64", torch.float64), ("f32", torch.float32)):
            r = rollout_grad(params, x0, target, steps, seed, dt)
            refs[label] = r
        np.savez_compressed(
            out / f"{name}.ref.npz",
            grad64=refs["f64"]["grad"],
            grad32=refs["f32"]["grad"],
            loss64=refs["f64"]["loss"],
            loss32=refs["f32"]["loss"],
            xT64=refs["f64"]["xT"],
            alive64=refs["f64"]["alive"],
            alive32=refs["f32"]["alive"],
            params=params,
            x0=x0,
            target=target,
        )
        cases.append(
            {
                "name": name,
                "grid": grid,
                "batch": batch,
                "steps": steps,
                "seed": seed,
                "params": _b64(params.astype("<f4")),
                "x0": _b64(
                    x0.transpose(0, 2, 3, 1).astype("<f4")
                ),  # (B, G, G, 16) cell-major
                "target": _b64(target.astype("<f4")),
            }
        )
        print(f"case {name}: loss64={refs['f64']['loss']:.6e}", flush=True)
    (out / "cases.json").write_text(json.dumps({"target": target_name, "cases": cases}))


def _rel(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b) / max(np.linalg.norm(b), 1e-300))


SEGMENTS = (("w1", 0, 6144), ("b1", 6144, 6272), ("w2", 6272, 8320))


def cmd_compare(cases_dir: Path, gpu_json: Path, out: Path) -> None:
    gpu = json.loads(gpu_json.read_text())
    report = []
    for res in gpu["results"]:
        ref = np.load(cases_dir / f"{res['name']}.ref.npz")
        g_gpu = _unb64(res["grad"], "<f4").astype(np.float64)
        g64 = ref["grad64"]
        g32 = ref["grad32"]
        b, steps = ref["alive64"].shape[1], ref["alive64"].shape[0]
        grid = ref["alive64"].shape[2]
        alive_gpu = (
            _unb64(res["alive"], "u1").reshape(steps, b, grid, grid).astype(bool)
        )
        flips_gpu = int((alive_gpu != ref["alive64"]).sum())
        flips_32 = int((ref["alive32"] != ref["alive64"]).sum())
        row: dict[str, object] = {
            "name": res["name"],
            "steps": steps,
            "loss_gpu": res["loss"],
            "loss_f64": float(ref["loss64"]),
            "loss_rel_gpu": abs(res["loss"] - float(ref["loss64"]))
            / float(ref["loss64"]),
            "loss_rel_f32cpu": abs(float(ref["loss32"]) - float(ref["loss64"]))
            / float(ref["loss64"]),
            "alive_flips_gpu_vs_f64": flips_gpu,
            "alive_flips_f32cpu_vs_f64": flips_32,
            "alive_cells_f64": int(ref["alive64"].sum()),
        }
        for seg, lo, hi in SEGMENTS:
            row[f"rel_{seg}_gpu"] = _rel(g_gpu[lo:hi], g64[lo:hi])
            row[f"rel_{seg}_f32cpu"] = _rel(g32[lo:hi], g64[lo:hi])
        row["rel_all_gpu"] = _rel(g_gpu, g64)
        row["rel_all_f32cpu"] = _rel(g32, g64)
        row["rel_all_gpu_vs_f32cpu"] = _rel(g_gpu, g32)
        row["maxabs_over_maxref_gpu"] = float(
            np.abs(g_gpu - g64).max() / np.abs(g64).max()
        )
        row["maxabs_over_maxref_f32cpu"] = float(
            np.abs(g32 - g64).max() / np.abs(g64).max()
        )
        row["cos_gpu"] = float(
            g_gpu @ g64 / (np.linalg.norm(g_gpu) * np.linalg.norm(g64))
        )
        # The update the trainer actually applies is the per-tensor normalised
        # gradient; report its error too.
        nerr = []
        for _seg, lo, hi in SEGMENTS:
            a = g_gpu[lo:hi] / (np.linalg.norm(g_gpu[lo:hi]) + 1e-8)
            c = g64[lo:hi] / (np.linalg.norm(g64[lo:hi]) + 1e-8)
            nerr.append(float(np.linalg.norm(a - c)))
        row["normalised_update_err_max"] = max(nerr)
        if flips_gpu:
            # Isolate the backprop arithmetic from alive-mask discontinuities.
            r = rollout_grad(
                ref["params"],
                ref["x0"],
                ref["target"],
                steps,
                int(res["seed"]),
                torch.float64,
                alive_gpu,
            )
            row["rel_all_gpu_vs_f64_gpu_masks"] = _rel(g_gpu, r["grad"])  # type: ignore[arg-type]
        xt_gpu = (
            _unb64(res["xT"], "<f4")
            .reshape(b, grid, grid, CN)
            .transpose(0, 3, 1, 2)
            .astype(np.float64)
        )
        row["xT_maxabs_gpu_vs_f64"] = float(np.abs(xt_gpu - ref["xT64"]).max())
        report.append(row)
    worst = {
        "rel_all_gpu": max(r["rel_all_gpu"] for r in report),  # type: ignore[type-var]
        "rel_all_f32cpu": max(r["rel_all_f32cpu"] for r in report),  # type: ignore[type-var]
        "maxabs_over_maxref_gpu": max(r["maxabs_over_maxref_gpu"] for r in report),  # type: ignore[type-var]
    }
    doc = {"adapter": gpu.get("adapter"), "cases": report, "worst": worst}
    out.write_text(json.dumps(doc, indent=2))
    for r in report:
        print(
            f"{r['name']:>16}  T={r['steps']:>3}  rel(gpu)={r['rel_all_gpu']:.3e}  "
            f"rel(f32cpu)={r['rel_all_f32cpu']:.3e}  gpu~f32cpu={r['rel_all_gpu_vs_f32cpu']:.3e}  flips gpu/f32cpu={r['alive_flips_gpu_vs_f64']}/"
            f"{r['alive_flips_f32cpu_vs_f64']}  loss rel={r['loss_rel_gpu']:.2e}"
        )
    print("worst", json.dumps(worst))


def cmd_targets(out: Path) -> None:
    from PIL import Image

    out.mkdir(parents=True, exist_ok=True)
    for name in ("disk", "gecko", "star"):
        t = make_target(name)
        (out / f"{name}.f32").write_bytes(t.astype("<f4").tobytes())
        Image.fromarray(composite(t, scale=6)).save(out / f"target-{name}.png")
        print(name, t.shape, f"coverage={float(t[..., 3].mean()):.3f}")


def composite(rgba: np.ndarray, scale: int = 6) -> np.ndarray:
    """Premultiplied RGBA over the dish colour, nearest-upscaled, uint8."""
    bg = np.array([0.04, 0.07, 0.08], dtype=np.float32)
    c = np.clip(rgba, 0.0, 1.0)
    rgb = c[..., :3] + (1.0 - c[..., 3:4]) * bg
    img = (np.clip(rgb, 0, 1) * 255.0 + 0.5).astype(np.uint8)
    return np.kron(img, np.ones((scale, scale, 1), dtype=np.uint8))


def cmd_png(src: Path, out: Path, grid: int) -> None:
    from PIL import Image

    v = np.frombuffer(src.read_bytes(), dtype="<f4").reshape(-1, grid, grid, 4)
    tiles = [composite(v[i]) for i in range(v.shape[0])]
    Image.fromarray(np.concatenate(tiles, axis=1)).save(out)


RECOGNISABLE_IOU = 0.85  # silhouette overlap, grown from a seed, at T=96 AND T=300
SHARP_RGB = 0.06  # mean RGB distance inside the target at T=96 (eyes and spots visible)


def summarize_run(d: dict) -> dict:
    cfg = d["config"]
    log = d["log"]  # [iter, T, loss, gpuTotal, fwd, bwd, opt]
    warm = [r for r in log if r[0] >= 100 and r[3] is not None]
    gpu = sorted(r[3] for r in warm)
    med = gpu[len(gpu) // 2] if gpu else None
    p90 = gpu[int(len(gpu) * 0.9)] if gpu else None
    t_mean = float(np.mean([r[1] for r in log]))

    def first(pred):  # type: ignore[no-untyped-def]
        for e in d["evals"]:
            if pred(e):
                return {"iter": e["iter"], "train_s": round(e["trainMs"] / 1000, 1)}
        return None

    timing_only = not d["evals"]
    if timing_only:  # dense (timing-only) runs have no evaluations
        rec = sharp = None
        final = None
    else:
        rec = first(
            lambda e: (
                e["T96"]["iou"] >= RECOGNISABLE_IOU
                and e["T300"]["iou"] >= RECOGNISABLE_IOU
            )
        )
        sharp = first(
            lambda e: (
                e["T96"]["rgbErr"] <= SHARP_RGB and e["T300"]["iou"] >= RECOGNISABLE_IOU
            )
        )
        last = d["evals"][-1]
        final = {
            "iter": last["iter"],
            "iou_T96": round(last["T96"]["iou"], 3),
            "iou_T300": round(last["T300"]["iou"], 3),
            "rgbErr_T96": round(last["T96"]["rgbErr"], 3),
            "train_loss": last["trainLoss"],
        }
    return {
        "label": cfg["label"],
        "target": cfg["targetFile"].split(".")[0],
        "batch": cfg["B"],
        "rollout": [cfg["Tmin"], cfg["Tmax"]],
        "pool": cfg["poolSize"],
        "iters": len(log),
        "train_s": round(d["trainMs"] / 1000, 2),
        "iters_per_s": round(len(log) / (d["trainMs"] / 1000), 1),
        "gpu_ms_per_iter_median": round(med, 2) if med else None,
        "gpu_ms_per_iter_p90": round(p90, 2) if p90 else None,
        "gpu_ms_per_step_median": round(med / t_mean, 3) if med else None,
        "memory_mb": round(d["totalBytes"] / 2**20, 1),
        "recognisable": rec,
        "sharp": sharp,
        "timing_only_dense": timing_only,
        "final": final,
        "kernels_ms_over_Tmax_steps": {
            k: round(v, 2) for k, v in d.get("kernels", {}).items()
        },
        "thetaSha": d.get("thetaSha"),
        "errors": d.get("errors", []),
    }


def cmd_summarize(files: list[Path], out: Path) -> None:
    rows = [summarize_run(json.loads(f.read_text())) for f in files]
    for r in rows:
        rec = r["recognisable"] or {}
        sh = r["sharp"] or {}
        fin = r["final"] or {"iou_T96": None, "iou_T300": None, "rgbErr_T96": None}
        print(
            f"{r['label']:>20}  B{r['batch']} T{r['rollout']} pool {r['pool']:>4}  {r['iters_per_s']:>5} it/s  "
            f"gpu {r['gpu_ms_per_iter_median']} ms/it (p90 {r['gpu_ms_per_iter_p90']})  mem {r['memory_mb']} MB  "
            f"recog it {rec.get('iter')} ({rec.get('train_s')} s)  sharp it {sh.get('iter')} ({sh.get('train_s')} s)  "
            f"final IoU {fin['iou_T96']}/{fin['iou_T300']} rgb {fin['rgbErr_T96']}"
        )
    out.write_text(
        json.dumps(
            {
                "criteria": {
                    "recognisable_iou": RECOGNISABLE_IOU,
                    "sharp_rgb": SHARP_RGB,
                },
                "runs": rows,
            },
            indent=1,
        )
    )


def main(argv: list[str]) -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("targets")
    a.add_argument("--out", type=Path, required=True)
    a = sub.add_parser("cases")
    a.add_argument("--out", type=Path, required=True)
    a.add_argument("--grid", type=int, default=72)
    a.add_argument("--target", default="gecko")
    a = sub.add_parser("compare")
    a.add_argument("--cases", type=Path, required=True)
    a.add_argument("--gpu", type=Path, required=True)
    a.add_argument("--out", type=Path, required=True)
    a = sub.add_parser("summarize")
    a.add_argument("files", type=Path, nargs="+")
    a.add_argument("--out", type=Path, required=True)
    a = sub.add_parser("png")
    a.add_argument("src", type=Path)
    a.add_argument("out", type=Path)
    a.add_argument("--grid", type=int, default=72)
    args = ap.parse_args(argv)
    torch.set_num_threads(max(1, torch.get_num_threads()))
    if args.cmd == "targets":
        cmd_targets(args.out)
    elif args.cmd == "cases":
        cmd_cases(args.out, args.grid, args.target)
    elif args.cmd == "compare":
        cmd_compare(args.cases, args.gpu, args.out)
    elif args.cmd == "summarize":
        cmd_summarize(args.files, args.out)
    elif args.cmd == "png":
        cmd_png(args.src, args.out, args.grid)


if __name__ == "__main__":
    main(sys.argv[1:])
