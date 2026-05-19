"""Phase 0 Block 7 deliverable 0 — Python half of the h5wasm round-trip.

Reads ``preflight/out/preflight.h5`` (written by ``h5wasm-check.mjs``)
via h5py and asserts the values match exactly.
"""

from __future__ import annotations

import sys
from pathlib import Path

import h5py
import numpy as np

HERE = Path(__file__).resolve().parent
H5_PATH = HERE / "out" / "preflight.h5"
EXPECTED = np.array([1.5, -2.25, 3.125, 0.0], dtype=np.float64)


def main() -> int:
    if not H5_PATH.exists():
        print(f"preflight HDF5 file not found at {H5_PATH}", file=sys.stderr)
        print("did you run `node h5wasm-check.mjs` first?", file=sys.stderr)
        return 1
    with h5py.File(H5_PATH, "r") as h:
        if "test/data" not in h:
            print("missing dataset /test/data", file=sys.stderr)
            return 1
        actual = np.asarray(h["test/data"][()])
    if actual.dtype != EXPECTED.dtype:
        print(
            f"dtype mismatch: expected {EXPECTED.dtype}, got {actual.dtype}",
            file=sys.stderr,
        )
        return 1
    if actual.shape != EXPECTED.shape:
        print(
            f"shape mismatch: expected {EXPECTED.shape}, got {actual.shape}",
            file=sys.stderr,
        )
        return 1
    if not np.array_equal(actual, EXPECTED):
        print(
            f"value mismatch: expected {EXPECTED.tolist()}, got {actual.tolist()}",
            file=sys.stderr,
        )
        return 1
    print(f"read {H5_PATH}: values = {actual.tolist()} — match")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
