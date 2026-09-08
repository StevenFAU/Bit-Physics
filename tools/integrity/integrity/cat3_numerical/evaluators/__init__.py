"""Per-algorithm evaluator shims.

Each module imports the canonical reference implementation from the
testkit and registers it under a stable algorithm name. **Do not
re-implement** any algorithm here; Cat 6 (test-design fabrication)
would flag a duplicate Python kernel implementation in the repo.
"""

from __future__ import annotations

from . import cubic_spline, terrain_erosion

REGISTRY = {
    cubic_spline.ALGORITHM_NAME: cubic_spline.evaluate,
    terrain_erosion.ALGORITHM_NAME: terrain_erosion.evaluate,
}

__all__ = ["REGISTRY"]
