"""Extractor for the neural-ca live-gate-re-run asset (verification-demo-spec § 4).

Reads the COMMITTED canonical capture payload
(captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000-wgsl.h5) and writes
ALL 21 captured RGBA frames (steps 0, 50, …, 1000) as one raw binary asset the
web demo fetches to score its own on-device rollout against — a client-side
mirror of the CI gate's full-sweep comparison (verify.py `_gate_neural_ca`
stacks every frame):

    public/neural-ca-canonical-frames.bin  — little-endian f32, frame-major:
                                             21 × rgba[64*64*4] row-major,
                                             clamped [0,1] to match main.ts's
                                             capture recorder (Math.min/max)
    public/neural-ca-canonical-frames.json — provenance sidecar: sha256 of the
                                             .bin, byte length, dtype, n_frames,
                                             the step list, layout, and the
                                             source payload checksum (verbatim
                                             from the committed capture manifest)

gen-verification.mjs re-hashes the committed .bin against the sidecar at every
build and HARD-FAILs on drift, so the provenance chain is: committed .h5
checksum (capture manifest) -> this extractor -> sidecar sha -> build check.
Node cannot read HDF5, so this two-part split (Python extract, Node re-hash) is
the same discipline the landed rd2d spine uses.

The frames are clamped to [0,1] here for the SAME reason main.ts clamps them in
captureCanonical: the gate compares the clamped rgba field, and the hidden
channels (4..15) are unbounded and NOT part of the rgba comparison. Only the
4 visible channels per cell are written.

Run from this directory with the repo venv (which carries h5py via testkit):

    uv run --no-sync python extract-canonical-frames.py

The kernel-side canonical artifacts are read-only inputs here (Lane-B § 6).
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import h5py
import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
CAPTURE_DIR = REPO / "captures" / "neural-ca-ref"
MANIFEST = CAPTURE_DIR / "growing-emoji-64sq-seed42-step1000-wgsl.json"
PAYLOAD = CAPTURE_DIR / "growing-emoji-64sq-seed42-step1000-wgsl.h5"
GRID = 64
CHANNELS = 4  # rgba only — the gate's compared field


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    committed_sha = "sha256:" + hashlib.sha256(PAYLOAD.read_bytes()).hexdigest()
    if committed_sha != manifest["payload"]["checksum"]:
        sys.exit(
            f"FAIL: payload sha {committed_sha} != manifest checksum "
            f"{manifest['payload']['checksum']} — refusing to extract from a "
            "payload that does not match its committed manifest"
        )

    with h5py.File(PAYLOAD, "r") as h:
        steps = sorted(int(k) for k in h["steps"].keys())
        frames = []
        for s in steps:
            rgba = np.asarray(h[f"steps/{s}/state/rgba"][()])
            if rgba.dtype != np.float32 or rgba.shape != (GRID, GRID, CHANNELS):
                sys.exit(
                    f"FAIL: steps/{s}/state/rgba is {rgba.dtype} {rgba.shape}, "
                    f"want float32 ({GRID}, {GRID}, {CHANNELS})"
                )
            frames.append(rgba)

    expected_steps = list(range(0, 1001, 50))
    if steps != expected_steps:
        sys.exit(f"FAIL: step list {steps} != expected {expected_steps}")

    # frame-major, row-major within each frame, clamped [0,1] (== main.ts:192)
    stacked = np.clip(np.stack(frames, axis=0), 0.0, 1.0).astype("<f4")
    blob = stacked.tobytes(order="C")

    out_bin = HERE / "public" / "neural-ca-canonical-frames.bin"
    out_bin.write_bytes(blob)

    sidecar = {
        "_generated_by": "packages/neural-ca/web/extract-canonical-frames.py",
        "asset": out_bin.name,
        "sha256": hashlib.sha256(blob).hexdigest(),
        "bytes": len(blob),
        "dtype": "<f4",
        "n_frames": len(steps),
        "steps": steps,
        "grid": [GRID, GRID],
        "channels": CHANNELS,
        "layout": f"frame-major: {len(steps)} × rgba[{GRID}*{GRID}*{CHANNELS}] row-major, clamped [0,1]",
        "extracted_from": str(PAYLOAD.relative_to(REPO)),
        "source_payload_sha256": manifest["payload"]["checksum"],
    }
    out_json = HERE / "public" / "neural-ca-canonical-frames.json"
    out_json.write_text(json.dumps(sidecar, indent=2) + "\n", encoding="utf-8")
    print(
        f"OK: {out_bin.name} ({len(blob)} bytes, {len(steps)} frames, "
        f"sha256 {sidecar['sha256'][:12]}…) + sidecar"
    )


if __name__ == "__main__":
    main()
