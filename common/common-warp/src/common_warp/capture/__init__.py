"""Capture I/O subsystem (Subsystem 2) — §1.9.1 surface.

``Capture`` (in-memory model) + ``write_capture`` / ``read_capture`` over
the canonical capture-v1 HDF5 + JSON-manifest format, delegating to the
Phase-0 testkit ``capture`` module so output is `compare_captures`-readable
(W-5 format-interoperability). ``read_manifest`` is a sidecar-only convenience.

**Naming-collision discipline (O-W1).** This is the project's HDF5 capture
I/O — wholly unrelated to Warp's ``wp.capture_*`` CUDA-graph capture. Never
alias the two.
"""

from __future__ import annotations

from .model import Capture
from .reader import read_capture, read_manifest
from .writer import write_capture

__all__ = ["Capture", "read_capture", "read_manifest", "write_capture"]
