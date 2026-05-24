#!/usr/bin/env python
"""Extract a first-N-frames representative subset of a canonical capture.

Schema-corpus representative-subset methodology (sub-phase-mpm-multimaterial-stack-d
Stage 2, D10). Production canonical captures can be too large (MPM Stack-D's
canonical is ~1.05 GiB) to park at the backward-compat schema-corpus path
(``tests/fixtures/legacy-captures/``) cleanly -- the corpus exercises capture I/O
*schema* round-trip (spec section 2.12), NOT the full simulation content. This tool
produces a size-reduced REPRESENTATIVE SUBSET preserving the full schema structure
(every state + diagnostic field x the first N captured frames) via a deterministic
data-only transformation: read the source ``.h5`` via the canonical reader, re-emit
the first N frames through the canonical ``write_capture`` (correct layout + checksum
+ schema-validated manifest). No sim re-run; first-N-frames semantic.

The representative subset is a distinct artifact class from the production canonical
capture: same schema, reduced content, for corpus purposes only.

Usage:
    python -m scripts.extract_capture_subset \\
        --source captures/<sim>/<descriptor>.json \\
        --out-dir tests/fixtures/legacy-captures \\
        --out-stem phase-2-<sim>-representative \\
        --n-frames 5
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_TESTKIT = Path(__file__).resolve().parents[1]
if str(_TESTKIT) not in sys.path:
    sys.path.insert(0, str(_TESTKIT))

from capture import CaptureManifest, load_capture, write_capture  # noqa: E402


def extract_subset(source_manifest: Path, out_dir: Path, out_stem: str, n_frames: int) -> Path:
    """Write a first-``n_frames`` subset of ``source_manifest`` to ``out_dir``."""
    cap = load_capture(source_manifest)
    states = list(cap.steps())[:n_frames]
    if not states:
        raise ValueError(f"source capture {source_manifest} has no frames")
    last_step = int(states[-1].step)

    src = cap.manifest
    params = dict(src.config.get("params", {}))
    params["descriptor"] = out_stem
    params["representative_subset_of"] = params.get("descriptor", "") or src.config.get(
        "params", {}
    ).get("descriptor", "")
    params["representative_subset_first_n_frames"] = int(n_frames)
    config = dict(src.config)
    config["params"] = params

    run = dict(src.run)
    run["step_count"] = last_step

    manifest = CaptureManifest(
        schema_version=src.schema_version,
        sim=dict(src.sim),
        stack=dict(src.stack),
        config=config,
        run=run,
        payload={"format": "hdf5", "path": f"{out_stem}.h5", "checksum": "sha256:" + "0" * 64},
        determinism=dict(src.determinism),
    )
    return write_capture(states, manifest, out_dir)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m scripts.extract_capture_subset")
    p.add_argument("--source", required=True, type=Path)
    p.add_argument("--out-dir", required=True, type=Path)
    p.add_argument("--out-stem", required=True)
    p.add_argument("--n-frames", type=int, default=5)
    args = p.parse_args(argv)
    manifest_path = extract_subset(args.source, args.out_dir, args.out_stem, args.n_frames)
    print(f"wrote {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
