"""One-shot extractor for the live-gate-re-run asset (verification-demo-spec § 4.2).

Reads the COMMITTED canonical capture payload
(captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.h5)
and writes the final captured frame's U and V fields as a raw binary asset the
web demo fetches to compute max_abs / max_rel against the f64 canonical
client-side:

    public/rd2d-canonical-step2000.bin   — little-endian f64, row-major,
                                           U[128*128] then V[128*128]
    public/rd2d-canonical-step2000.json  — provenance sidecar: sha256 of the
                                           .bin, byte length, layout, source
                                           payload checksum (verbatim from the
                                           committed capture manifest)

gen-verification.mjs re-hashes the committed .bin against the sidecar at every
build and HARD-FAILs on drift, so the provenance chain is: committed .h5
checksum (capture manifest) -> this extractor -> sidecar sha -> build check.

Run from this directory with the repo venv (which carries h5py via testkit):

    uv run --no-sync python extract-canonical-fields.py

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
CAPTURE_DIR = REPO / "captures" / "reaction-diffusion-2d-ref"
MANIFEST = CAPTURE_DIR / "gray-scott-lambda-128sq-seed42-step2000.json"
PAYLOAD = CAPTURE_DIR / "gray-scott-lambda-128sq-seed42-step2000.h5"
STEP = 2000
N = 128


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
        u = np.asarray(h[f"steps/{STEP}/state/U"][()])
        v = np.asarray(h[f"steps/{STEP}/state/V"][()])
    for name, arr in (("U", u), ("V", v)):
        if arr.dtype != np.float64 or arr.shape != (N, N):
            sys.exit(f"FAIL: field {name} is {arr.dtype} {arr.shape}, want float64 ({N}, {N})")

    blob = u.astype("<f8").tobytes(order="C") + v.astype("<f8").tobytes(order="C")
    out_bin = HERE / "public" / "rd2d-canonical-step2000.bin"
    out_bin.write_bytes(blob)

    sidecar = {
        "_generated_by": "packages/reaction-diffusion-2d/web/extract-canonical-fields.py",
        "asset": out_bin.name,
        "sha256": hashlib.sha256(blob).hexdigest(),
        "bytes": len(blob),
        "dtype": "<f8",
        "layout": f"U[{N}*{N}] ++ V[{N}*{N}], row-major",
        "step": STEP,
        "grid": [N, N],
        "extracted_from": str(PAYLOAD.relative_to(REPO)),
        "source_payload_sha256": manifest["payload"]["checksum"],
    }
    out_json = HERE / "public" / "rd2d-canonical-step2000.json"
    out_json.write_text(json.dumps(sidecar, indent=2) + "\n", encoding="utf-8")
    print(f"OK: {out_bin.name} ({len(blob)} bytes, sha256 {sidecar['sha256'][:12]}…) + sidecar")


if __name__ == "__main__":
    main()
