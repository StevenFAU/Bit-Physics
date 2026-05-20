"""OpenVDB export surface stub (charter § 7.1 deliverable D).

Phase 1 Stage 1 ships the import-and-call surface only. Implementation
deferred to a per-sim phase that needs VDB output (recommended:
eulerian-smoke for volume rendering; mpm-multimaterial for grid-side
fields).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

__all__ = ["ExportOptions", "VdbExportError", "export_volume_to_vdb"]


class VdbExportError(RuntimeError):
    """Raised when the VDB export path is invoked before implementation."""


@dataclass
class ExportOptions:
    voxel_size: float = 1.0
    grid_name: str = "density"


def export_volume_to_vdb(
    out_path: Path,
    volume: np.ndarray,
    options: ExportOptions | None = None,
) -> Path:
    """Phase 1 stub. Implementation deferred."""
    _ = (out_path, volume, options)
    raise VdbExportError(
        "common_py.vdb.export_volume_to_vdb is a Phase 1 Stage 1 surface "
        "stub; implementation is deferred to a subsequent per-sim "
        "implementation phase (see docs/common/py.md)."
    )
