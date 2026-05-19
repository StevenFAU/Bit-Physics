"""Thin shim — registers the testkit's cubic-spline reference impl.

Phase 0 plan § 3.3.5: imports
`golden.reference_implementations.cubic_spline.evaluate` directly. No
local implementation is permitted (see the module docstring of
``evaluators/__init__.py``).
"""

from __future__ import annotations

from golden.reference_implementations.cubic_spline import evaluate

ALGORITHM_NAME = "cubic-spline-kernel-3d-monaghan"

__all__ = ["ALGORITHM_NAME", "evaluate"]
