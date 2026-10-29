"""Build the Grow Menagerie from training runs (rebuild-v2 04-neural-ca.md, M1).

For each run of ``packages/neural-ca/train-spike`` (``run-spike.mjs train``,
damage mode) listed in ``menagerie.toml``, this:

1. converts the trained parameter vector from the trainer's packing to the
   committed checkpoint's layout (``nca-layout.json``: ``w1.bias`` [128],
   ``w1.weight`` [128][48] interleaved channel*3 + filter, ``w2.weight``
   [16][128]), so the v2 page runs it through the gated kernel unchanged;
2. measures it with the package's NumPy reference of that kernel
   (``neural_ca.reference.nca_numpy``: same perception, MLP, PCG fire mask
   and alive mask) on the 64 x 64 dish: growth from the canonical seed, the
   long run, and regrowth after three standard cuts;
3. writes ``<id>.bin``, ``<id>-target.png`` and ``menagerie.json`` (the
   provenance the page shows) into ``packages/neural-ca/web/public/menagerie/``.

The committed checkpoint (``nca-weights.bin``, the gated disk) is measured the
same way and listed first; its bytes are not copied.

    uv run --no-sync python packages/neural-ca/menagerie/build.py --runs <dir with train-*.json>
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import sys
import tomllib
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
PUBLIC = REPO / "packages/neural-ca/web/public"
OUT = PUBLIC / "menagerie"
GATED = PUBLIC / "nca-weights.bin"
GATED_SHA = "c98a467879559bf215dd44713778868eeccdfc14599a873de05ebc9df59e4039"
sys.path.insert(0, str(HERE))

from targets import GRID, make_target  # noqa: E402

CN = 16
ALIVE = np.float32(0.1)
# Standard cuts (cells of the 64 x 64 dish, applied at step CUT_AT): the
# right half, the bottom half, and a disc through the middle.
CUT_AT = 400
REGROW = (200, 800)
SEEDS = (42, 7, 11)
LONG_RUN = 4000


def unpack(vec: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Trainer packing -> (w1 [128][48] interleaved, b1 [128], w2 [16][128])."""
    w1 = vec[0:6144].reshape(128, 3, CN).transpose(0, 2, 1).reshape(128, 48)
    b1 = vec[6144:6272]
    w2 = vec[6272:8320].reshape(128, 16).T
    return np.ascontiguousarray(w1), b1.copy(), np.ascontiguousarray(w2)


def to_layout(w1: np.ndarray, b1: np.ndarray, w2: np.ndarray) -> bytes:
    """The committed layout: w1.bias @0, w1.weight @128, w2.weight @6272 (little-endian f32)."""
    v = np.concatenate([b1.reshape(-1), w1.reshape(-1), w2.reshape(-1)]).astype("<f4")
    assert v.size == 8320
    return v.tobytes()


def from_layout(raw: bytes) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    v = np.frombuffer(raw, dtype="<f4")
    return (
        v[128:6272].reshape(128, 48).copy(),
        v[0:128].copy(),
        v[6272:8320].reshape(16, 128).copy(),
    )


# ------------------------------------------------------- reference stepping


class Reference:
    """The gated kernel's step (update then mask), in NumPy f32, from nca_numpy's pieces."""

    def __init__(
        self, w1: np.ndarray, b1: np.ndarray, w2: np.ndarray, grid: int = GRID
    ) -> None:
        from neural_ca.reference import nca_numpy as R

        self.R = R
        self.w1 = w1.astype(np.float32)
        self.b1 = b1.astype(np.float32)
        self.w2 = w2.astype(np.float32)
        self.g = grid

    def step(self, s: np.ndarray, t: int, seed: int, rate: float = 0.5) -> np.ndarray:
        R = self.R
        pre = R._alive_mask(s)
        p = R._perceive(s).reshape(48, -1)
        h = np.maximum(self.w1 @ p + self.b1[:, None], np.float32(0.0))
        dx = (self.w2 @ h).reshape(CN, self.g, self.g).astype(np.float32)
        fire = R._fire_field(self.g, t, seed, rate)
        s = (s + dx * fire[None]).astype(np.float32)
        post = R._alive_mask(s)
        return (s * (pre & post).astype(np.float32)[None]).astype(np.float32)

    def seed_state(self) -> np.ndarray:
        s = np.zeros((CN, self.g, self.g), dtype=np.float32)
        m = self.g // 2
        s[3:, m, m] = 1.0
        return s


def cut_mask(kind: str, g: int = GRID) -> np.ndarray:
    yy, xx = np.mgrid[0:g, 0:g].astype(np.float32) + 0.5
    c = g / 2.0
    if kind == "right half":
        return xx > c
    if kind == "bottom half":
        return yy > c
    if kind == "middle disc":
        return (xx - c) ** 2 + (yy - c) ** 2 <= 9.0**2
    raise ValueError(kind)


CUTS = ("right half", "bottom half", "middle disc")


def iou(s: np.ndarray, target: np.ndarray) -> float:
    a = np.clip(s[3], 0, 1) > 0.5
    t = target[..., 3] > 0.5
    u = (a | t).sum()
    return float((a & t).sum() / u) if u else 0.0


def measure(ref: Reference, target: np.ndarray) -> dict:
    """Growth, the long run and regrowth, on the reference."""
    out: dict = {"growth_iou": {}, "regrow": {}}
    # growth + long run, mask seed 42 (the gate's)
    s = ref.seed_state()
    marks = {50, 100, 200, 300, 500, 1000, 2000, LONG_RUN}
    alive_log = []
    for t in range(LONG_RUN):
        s = ref.step(s, t, SEEDS[0])
        if (t + 1) in marks:
            out["growth_iou"][str(t + 1)] = round(iou(s, target), 4)
        if (t + 1) % 250 == 0:
            alive_log.append(int((s[3] > 0.1).sum()))
    out["alive_cells_every_250"] = alive_log
    out["alive_at_long_run"] = alive_log[-1]
    # regrowth: grow CUT_AT steps, cut, run on; compare with the uncut twin
    rows = []
    for seed in SEEDS:
        s = ref.seed_state()
        for t in range(CUT_AT):
            s = ref.step(s, t, seed)
        base = s
        twin = base.copy()
        twin_iou = {}
        for t in range(CUT_AT, CUT_AT + REGROW[-1]):
            twin = ref.step(twin, t, seed)
            if (t + 1 - CUT_AT) in REGROW:
                twin_iou[(t + 1 - CUT_AT)] = iou(twin, target)
        for kind in CUTS:
            c = base.copy()
            c[:, cut_mask(kind)] = 0.0
            after = {"cut": iou(c, target)}
            for t in range(CUT_AT, CUT_AT + REGROW[-1]):
                c = ref.step(c, t, seed)
                if (t + 1 - CUT_AT) in REGROW:
                    after[t + 1 - CUT_AT] = iou(c, target)
            rows.append(
                {
                    "seed": seed,
                    "cut": kind,
                    "iou_cut": after["cut"],
                    **{f"iou_{k}": after[k] for k in REGROW},
                    **{f"twin_{k}": twin_iou[k] for k in REGROW},
                }
            )
    out["regrow"]["rows"] = [
        {k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()}
        for r in rows
    ]
    for k in REGROW:
        out["regrow"][f"mean_iou_{k}"] = round(
            float(np.mean([r[f"iou_{k}"] for r in rows])), 4
        )
        out["regrow"][f"min_iou_{k}"] = round(
            float(np.min([r[f"iou_{k}"] for r in rows])), 4
        )
        out["regrow"][f"mean_twin_{k}"] = round(
            float(np.mean([r[f"twin_{k}"] for r in rows])), 4
        )
    out["regrow"]["mean_iou_cut"] = round(
        float(np.mean([r["iou_cut"] for r in rows])), 4
    )
    return out


# ------------------------------------------------------------------ build


def loss_curve(log: list, every: int = 100) -> list[list[float]]:
    """[iteration, mean loss over the preceding `every` iterations]."""
    rows = sorted(log, key=lambda r: r[0])
    out = []
    for i in range(0, len(rows), every):
        chunk = rows[i : i + every]
        out.append([chunk[-1][0] + 1, float(np.mean([r[2] for r in chunk]))])
    return [[int(a), float(f"{b:.4e}")] for a, b in out]


def png_bytes(rgba: np.ndarray) -> bytes:
    import io

    from PIL import Image

    img = Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument(
        "--runs",
        type=Path,
        required=True,
        help="directory with run-spike train-<label>.json files",
    )
    ap.add_argument("--out", type=Path, default=OUT)
    ap.add_argument("--only", nargs="*", default=None)
    a = ap.parse_args()
    spec = tomllib.loads((HERE / "menagerie.toml").read_text())
    a.out.mkdir(parents=True, exist_ok=True)
    prev = {}
    man_path = a.out / "menagerie.json"
    if man_path.exists():
        prev = {o["id"]: o for o in json.loads(man_path.read_text())["organisms"]}

    organisms = []
    # the committed, gated checkpoint first
    raw = GATED.read_bytes()
    if hashlib.sha256(raw).hexdigest() != GATED_SHA:
        raise SystemExit("nca-weights.bin is not the committed checkpoint")
    g = spec["gated"]
    if a.only is None or "disk" in a.only:
        from neural_ca.target import make_emoji_target

        ref = Reference(*from_layout(raw))
        tgt = make_emoji_target(GRID)
        print("disk (gated): measuring", flush=True)
        organisms.append(
            {
                **{k: g[k] for k in ("id", "name", "blurb")},
                "gated": True,
                "weights": "nca-weights.bin",
                "sha256": GATED_SHA,
                "target": "menagerie/disk-target.png",
                "training": {"regime": "persistent", "note": g["note"]},
                "measured": measure(ref, tgt),
            }
        )
        (a.out / "disk-target.png").write_bytes(png_bytes(tgt))
    else:
        organisms.append(prev["disk"])

    for o in spec["organism"]:
        oid = o["id"]
        if a.only is not None and oid not in a.only:
            if oid in prev:
                organisms.append(prev[oid])
            continue
        run = json.loads((a.runs / f"train-{o['run']}.json").read_text())
        if run.get("errors"):
            raise SystemExit(f"{oid}: the run logged GPU errors: {run['errors']}")
        cfg = run["config"]
        theta = np.frombuffer(base64.b64decode(run["theta"]), dtype="<f4")
        if hashlib.sha256(theta.tobytes()).hexdigest() != run["thetaSha"]:
            raise SystemExit(f"{oid}: theta sha mismatch")
        w1, b1, w2 = unpack(theta)
        blob = to_layout(w1, b1, w2)
        (a.out / f"{oid}.bin").write_bytes(blob)
        tgt = make_target(cfg["targetFile"].removesuffix(".f32"))
        (a.out / f"{oid}-target.png").write_bytes(png_bytes(tgt))
        print(f"{oid}: measuring", flush=True)
        m = measure(Reference(w1, b1, w2), tgt)
        log = run["log"]
        last = [r[2] for r in sorted(log, key=lambda r: r[0])[-200:]]
        organisms.append(
            {
                "id": oid,
                "name": o["name"],
                "blurb": o["blurb"],
                "gated": False,
                "weights": f"menagerie/{oid}.bin",
                "sha256": hashlib.sha256(blob).hexdigest(),
                "target": f"menagerie/{oid}-target.png",
                "training": {
                    "regime": "regenerating"
                    if cfg.get("damage", 0) > 0
                    else "persistent",
                    "trainer": "packages/neural-ca/train-spike (run-spike.mjs train; WGSL forward, backward and Adam in the browser)",
                    "target": f"packages/neural-ca/menagerie/targets.py {cfg['targetFile'].removesuffix('.f32')}",
                    "adapter": run["adapter"],
                    "grid": cfg["G"],
                    "batch": cfg["B"],
                    "pool": cfg["poolSize"],
                    "rollout": [cfg["Tmin"], cfg["Tmax"]],
                    "damaged_per_batch": cfg.get("damage", 0),
                    "iterations": cfg["iters"],
                    "lr": [cfg["lr"], cfg["lr"] * 0.1, cfg["decayAt"]],
                    "seed": cfg["seed"],
                    "train_seconds": round(run["trainMs"] / 1000, 1),
                    "final_loss_mean_last_200": float(f"{np.mean(last):.4e}"),
                    "loss_curve": loss_curve(log),
                    "theta_sha256": run["thetaSha"],
                },
                "measured": m,
            }
        )
        print(
            json.dumps(
                {
                    oid: {
                        "growth": m["growth_iou"],
                        "regrow200": m["regrow"]["mean_iou_200"],
                        "twin200": m["regrow"]["mean_twin_200"],
                        "alive_long": m["alive_at_long_run"],
                    }
                }
            ),
            flush=True,
        )

    manifest = {
        "_what": (
            "Grow Menagerie (rebuild-v2 M1): organisms the v2 page runs through the gated kernel "
            "(packages/neural-ca/typescript/src/nca_inference.wgsl) with their own weights. Built by "
            "packages/neural-ca/menagerie/build.py; measurements are the package's NumPy f32 reference of that kernel "
            "on the 64 x 64 dish (mask seed 42 for growth; seeds 42, 7, 11 for regrowth)."
        ),
        "layout": "nca-layout.json",
        "grid": GRID,
        "regrow_protocol": {
            "cut_at_step": CUT_AT,
            "cuts": list(CUTS),
            "measured_after": list(REGROW),
            "seeds": list(SEEDS),
            "iou": "alpha > 0.5 vs target alpha > 0.5",
        },
        "organisms": organisms,
    }
    man_path.write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"wrote {man_path}")


if __name__ == "__main__":
    main()
