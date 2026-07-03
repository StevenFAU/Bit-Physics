"""One-shot extractor for the live-gate-re-run asset (verification-demo-spec § 4).

Reads the COMMITTED canonical capture payload
(captures/mandelbulb-explorer-ref/de-probe-points-seed42.h5) and writes the
256 f64 canonical DE values + the 256 canonical probe points as a committed
JSON extract the web demo's data spine embeds directly (the values total
~2 KiB — small enough to inline in the generated module rather than fetch,
per spec § 4; JSON round-trips f64 exactly via shortest-repr):

    canonical-de-extract.json — values, points, sha256 of the little-endian
                                f64 byte streams, scale = max|DE|, n_outside,
                                source payload checksum (verbatim from the
                                committed capture manifest)

gen-verification.mjs re-encodes the JSON numbers to <f8 bytes and re-hashes
against this extract at every build, HARD-FAILing on drift, so the provenance
chain is: committed .h5 checksum (capture manifest) -> this extractor ->
extract sha -> build check (the rd2d extract-canonical-fields.py precedent).

Run from this directory with the repo venv (which carries h5py via testkit):

    uv run --no-sync python extract-canonical-de.py

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
CAPTURE_DIR = REPO / "captures" / "mandelbulb-explorer-ref"
MANIFEST = CAPTURE_DIR / "de-probe-points-seed42.json"
PAYLOAD = CAPTURE_DIR / "de-probe-points-seed42.h5"
GRID = 16


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
        de = np.asarray(h["steps/0/state/de"][()])
        points = np.asarray(h["steps/0/state/points"][()])
    if de.dtype != np.float64 or de.shape != (GRID, GRID):
        sys.exit(f"FAIL: de is {de.dtype} {de.shape}, want float64 ({GRID}, {GRID})")
    if points.dtype != np.float64 or points.shape != (GRID, GRID, 3):
        sys.exit(
            f"FAIL: points is {points.dtype} {points.shape}, want float64 ({GRID}, {GRID}, 3)"
        )

    de_flat = de.astype("<f8").ravel(order="C")
    pts_flat = points.astype("<f8").ravel(order="C")
    extract = {
        "_generated_by": "packages/mandelbulb-explorer/web/extract-canonical-de.py",
        "grid": [GRID, GRID],
        "de_values": de_flat.tolist(),
        "de_sha256": hashlib.sha256(de_flat.tobytes()).hexdigest(),
        "points": pts_flat.tolist(),
        "points_sha256": hashlib.sha256(pts_flat.tobytes()).hexdigest(),
        "scale_max_abs_de": float(np.abs(de_flat).max()),
        "n_outside_set": int((de_flat > 0).sum()),
        "extracted_from": str(PAYLOAD.relative_to(REPO)),
        "source_payload_sha256": manifest["payload"]["checksum"],
    }
    out = HERE / "canonical-de-extract.json"
    out.write_text(json.dumps(extract, indent=2) + "\n", encoding="utf-8")
    print(
        f"OK: {out.name} — 256 f64 DE values (sha {extract['de_sha256'][:12]}…), "
        f"scale {extract['scale_max_abs_de']:.6f}, n_outside {extract['n_outside_set']}"
    )


if __name__ == "__main__":
    main()
