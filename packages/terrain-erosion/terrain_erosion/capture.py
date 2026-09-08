"""Use the common testkit capture schema and HDF5 writer for browser evidence."""

from __future__ import annotations
import json
from pathlib import Path
import numpy as np
from capture import CaptureManifest, StepState, write_capture


def from_browser(bundle_path: Path, output: Path) -> Path:
    bundle = json.loads(bundle_path.read_text())
    manifest = CaptureManifest.from_dict(bundle["manifest"])
    steps = []
    for entry in bundle["steps"]:
        state = {
            name: np.asarray(
                item["data"], dtype=item["dtype"].replace("f", "float")
            ).reshape(item["shape"])
            for name, item in entry["state"].items()
        }
        # Derived scalar reservoirs expose the canonical Tier-2 tools without
        # making those tools understand the package's packed GPU layout.
        dam = state["dam"]
        state["dam_water"] = dam[..., 0] - dam[..., 15] - dam[..., 8] - dam[..., 13]
        state["dam_grain"] = (
            -dam[..., 5] + dam[..., 6] + dam[..., 3] - dam[..., 9] - dam[..., 14]
        )
        steps.append(
            StepState(step=entry["step"], state=state, diagnostics=entry["diagnostics"])
        )
    return write_capture(steps, manifest, output)
