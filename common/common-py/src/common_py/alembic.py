"""Alembic export surface stub (charter § 7.1 deliverable D).

Phase 1 Stage 1 ships the import-and-call surface only; the actual
Alembic write path lands in a subsequent per-sim implementation phase
that needs it (recommended: mpm-multimaterial, which consumes
particle exports in DCC tools).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

__all__ = ["AlembicExportError", "ExportOptions", "export_particles_to_alembic"]


class AlembicExportError(RuntimeError):
    """Raised when the Alembic export path is invoked before implementation."""


@dataclass
class ExportOptions:
    fps: float = 24.0
    archive_name: str = "particles.abc"


def export_particles_to_alembic(
    out_dir: Path,
    positions_per_step: list[np.ndarray],
    options: ExportOptions | None = None,
) -> Path:
    """Phase 1 stub. Implementation deferred."""
    _ = (out_dir, positions_per_step, options)
    raise AlembicExportError(
        "common_py.alembic.export_particles_to_alembic is a Phase 1 Stage 1 "
        "surface stub; implementation is deferred to a subsequent per-sim "
        "implementation phase (see docs/common/py.md)."
    )
